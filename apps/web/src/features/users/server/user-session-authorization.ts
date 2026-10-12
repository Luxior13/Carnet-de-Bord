import 'server-only';

import type { Prisma } from '@prisma/client';
import type { NextResponse } from 'next/server';

import type { PermissionsData } from '$constants/permissions.constants';
import { requirePermission } from '$server/api-auth';
import { apiError } from '$server/api-response';
import { type ApiErrorResponse, ErrorCode } from '$types/api.types';
import type { SessionType, UserType } from '$types/auth.types';

/** Revalidate administrative session access inside the operation's transaction. */
export async function authorizeManagedSessions(
  transaction: Prisma.TransactionClient,
  actor: UserType,
  source: SessionType | null,
  targetId: string,
  permission: string,
): Promise<
  | { response: NextResponse<ApiErrorResponse>; success: false }
  | { checkedAt: Date; session: SessionType; success: true; user: UserType }
> {
  // Fixed order also covers two administrators acting on one another.
  // NO KEY UPDATE remains compatible with audit foreign-key checks.
  await transaction.$queryRaw`
    SELECT "id" FROM "User"
    WHERE "id" = ${actor.id} OR "id" = ${targetId}
    ORDER BY "id"
    FOR NO KEY UPDATE
  `;
  const currentActor = await transaction.user.findUnique({
    select: {
      deletedAt: true,
      isActive: true,
      isProtected: true,
      mustChangePassword: true,
      permissions: true,
      role: true,
      securityVersion: true,
    },
    where: { id: actor.id },
  });
  if (
    !source ||
    !currentActor ||
    !currentActor.isActive ||
    currentActor.deletedAt ||
    currentActor.securityVersion !== source.securityVersion
  ) {
    return {
      response: apiError(
        ErrorCode.UNAUTHORIZED,
        'Votre session a expiré. Veuillez vous reconnecter.',
        401,
      ),
      success: false,
    };
  }
  // Logout can delete the source without changing User; keep that row stable too.
  await transaction.$queryRaw`
    SELECT "id" FROM "Session"
    WHERE "token" = ${source.token} AND "userId" = ${actor.id}
    FOR SHARE
  `;
  const checkedAt = new Date();
  const currentSession = await transaction.session.findFirst({
    where: {
      expiresAt: { gt: checkedAt },
      idleExpiresAt: { gt: checkedAt },
      securityVersion: source.securityVersion,
      token: source.token,
      userId: actor.id,
    },
  });
  if (!currentSession) {
    return {
      response: apiError(
        ErrorCode.UNAUTHORIZED,
        'Votre session a expiré. Veuillez vous reconnecter.',
        401,
      ),
      success: false,
    };
  }
  if (currentActor.mustChangePassword) {
    return {
      response: apiError(
        ErrorCode.PASSWORD_CHANGE_REQUIRED,
        'Vous devez changer votre mot de passe temporaire avant de continuer',
        403,
      ),
      success: false,
    };
  }
  const currentUser = {
    ...actor,
    ...currentActor,
    permissions: currentActor.permissions as PermissionsData | null,
  };
  const allowed = requirePermission(currentUser, permission);
  if (!allowed.success) return allowed;

  return {
    checkedAt,
    session: currentSession,
    success: true,
    user: currentUser,
  };
}
