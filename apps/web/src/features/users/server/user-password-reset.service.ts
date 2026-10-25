import 'server-only';

import { FEATURES } from '$constants/feature-registry.constants';
import { isSecurityVersionMismatchError } from '$server/auth-errors';
import { resetUserPassword } from '$server/password';
import { prisma } from '$server/prisma';
import { assertRecentSensitiveActionProof } from '$server/sensitive-action';
import { serviceErrors } from '$server/service-error';
import type { SessionType, UserType } from '$types/auth.types';

const USERS_SECURITY_AUDIT_LOCATION = {
  ...FEATURES.users.audit,
  tabKey: 'security',
  tabLabel: 'Sécurité',
} as const;

/**
 * Gives another account a temporary password shown once. The root's password
 * and any ADMIN's are out of reach of a delegated actor. Password, lock reset,
 * session revocation and audit are atomic. Throws `ServiceError` refusals.
 */
export const resetPasswordForActor = async (
  { actor, session }: { actor: UserType; session: SessionType | null },
  userId: string,
): Promise<string> => {
  const existingUser = await prisma.user.findUnique({
    select: {
      firstName: true,
      id: true,
      isProtected: true,
      lastName: true,
      loginName: true,
      role: true,
      securityVersion: true,
      updatedAt: true,
    },
    where: { deletedAt: null, id: userId },
  });
  if (!existingUser) throw serviceErrors.notFound('Utilisateur non trouvé');
  if (existingUser.id === actor.id) {
    throw serviceErrors.forbidden(
      'Utilisez le changement de mot de passe pour votre propre compte',
    );
  }
  if (existingUser.isProtected) {
    throw serviceErrors.forbidden(
      'Le mot de passe du compte racine ne peut être modifié que par son propriétaire',
    );
  }
  if (existingUser.role === 'ADMIN' && !actor.isProtected) {
    throw serviceErrors.forbidden(
      'Vous ne pouvez pas réinitialiser le mot de passe de ce compte',
    );
  }
  assertRecentSensitiveActionProof(session);

  const targetName =
    existingUser.firstName && existingUser.lastName
      ? `${existingUser.firstName} ${existingUser.lastName}`
      : existingUser.loginName;

  try {
    return await resetUserPassword(
      userId,
      {
        action: 'PASSWORD_RESET',
        category: 'AUTH',
        description: `Mot de passe réinitialisé pour: ${existingUser.loginName}`,
        metadata: {
          passwordReset: true,
          ...USERS_SECURITY_AUDIT_LOCATION,
          targetName,
        },
        targetUserId: userId,
        userId: actor.id,
      },
      {
        authority: { actorId: actor.id, authorization: actor, session },
        expectedRole: existingUser.role,
        expectedSecurityVersion: existingUser.securityVersion,
        expectedUpdatedAt: existingUser.updatedAt,
      },
    );
  } catch (error) {
    if (isSecurityVersionMismatchError(error)) {
      throw serviceErrors.conflict(
        'La sécurité ou le rôle de ce compte a changé. Rechargez la fiche avant de réessayer.',
      );
    }
    throw error;
  }
};
