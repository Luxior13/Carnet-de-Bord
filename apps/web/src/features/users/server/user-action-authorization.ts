import 'server-only';

import type { Prisma, User } from '@prisma/client';

import {
  hasPermission,
  isKnownPermissionKey,
  type PermissionsData,
} from '$constants/permissions.constants';
import { ErrorCode } from '$types/api.types';
import type { SessionType } from '$types/auth.types';

export type UserActionAuthority = {
  actorId: string;
  session: Pick<SessionType, 'securityVersion' | 'token'> | null;
};

export class UserActionAuthorizationError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: 401 | 403,
  ) {
    super(message);
    this.name = 'UserActionAuthorizationError';
  }
}

/** Shared transaction boundary for creation and managed-session operations only. */
export async function authorizeUserAction(
  transaction: Prisma.TransactionClient,
  authority: UserActionAuthority,
  permission: string,
  targetId = authority.actorId,
): Promise<{
  checkedAt: Date;
  session: SessionType;
  user: Pick<
    User,
    | 'deletedAt'
    | 'isActive'
    | 'isProtected'
    | 'mustChangePassword'
    | 'permissions'
    | 'role'
    | 'securityVersion'
  >;
}> {
  // Fixed order covers administrators acting on one another. This lock also
  // remains compatible with the foreign-key checks used by audit inserts.
  await transaction.$queryRaw`
    SELECT "id" FROM "User"
    WHERE "id" = ${authority.actorId} OR "id" = ${targetId}
    ORDER BY "id"
    FOR NO KEY UPDATE
  `;
  const user = await transaction.user.findUnique({
    select: {
      deletedAt: true,
      isActive: true,
      isProtected: true,
      mustChangePassword: true,
      permissions: true,
      role: true,
      securityVersion: true,
    },
    where: { id: authority.actorId },
  });
  const source = authority.session;
  if (
    !source ||
    !user ||
    !user.isActive ||
    user.deletedAt ||
    user.securityVersion !== source.securityVersion
  ) {
    throw new UserActionAuthorizationError(
      ErrorCode.UNAUTHORIZED,
      'Votre session a expiré. Veuillez vous reconnecter.',
      401,
    );
  }
  // Logout can delete the source without changing User. Keep it stable too.
  await transaction.$queryRaw`
    SELECT "id" FROM "Session"
    WHERE "token" = ${source.token} AND "userId" = ${authority.actorId}
    FOR SHARE
  `;
  const checkedAt = new Date();
  const session = await transaction.session.findFirst({
    where: {
      expiresAt: { gt: checkedAt },
      idleExpiresAt: { gt: checkedAt },
      securityVersion: source.securityVersion,
      token: source.token,
      userId: authority.actorId,
    },
  });
  if (!session)
    throw new UserActionAuthorizationError(
      ErrorCode.UNAUTHORIZED,
      'Votre session a expiré. Veuillez vous reconnecter.',
      401,
    );
  if (user.mustChangePassword)
    throw new UserActionAuthorizationError(
      ErrorCode.PASSWORD_CHANGE_REQUIRED,
      'Vous devez changer votre mot de passe temporaire avant de continuer',
      403,
    );
  if (
    !(user.isProtected && isKnownPermissionKey(permission)) &&
    !hasPermission(
      user.role,
      permission,
      user.permissions as PermissionsData | null,
    )
  ) {
    throw new UserActionAuthorizationError(
      ErrorCode.FORBIDDEN,
      "Vous n'avez pas la permission d'effectuer cette action",
      403,
    );
  }

  return { checkedAt, session, user };
}
