import 'server-only';

import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { updateUserPassword, verifyPassword } from '$server/password';
import { validateNewPassword } from '$server/password-policy';
import { prisma } from '$server/prisma';
import {
  clearRateLimit,
  reserveSensitiveActionRateLimit,
} from '$server/rate-limiter';
import { ServiceError, serviceErrors } from '$server/service-error';
import { ErrorCode } from '$types/api.types';
import type { SessionType, UserType } from '$types/auth.types';

/**
 * Changes the signed-in account's password. A temporary password needs no
 * current-password proof; otherwise the proof goes through the shared
 * reauthentication quota. The change, the revocation of the other sessions
 * and the audit are one transaction.
 */
export const changeOwnPassword = async (
  user: UserType,
  session: SessionType,
  input: {
    confirmPassword: string;
    currentPassword?: string;
    newPassword: string;
  },
): Promise<void> => {
  const { confirmPassword, currentPassword, newPassword } = input;
  const rateLimitKey = `account-reauth:${user.id}`;

  if (
    !user.mustChangePassword &&
    !user.isProtected &&
    !hasPermission(
      user.role,
      PERMISSIONS.ACCOUNT.CHANGE_PASSWORD,
      user.permissions,
    )
  ) {
    throw serviceErrors.forbidden(
      "Vous n'avez pas la permission de changer ce mot de passe",
    );
  }

  const passwordValidation = validateNewPassword(newPassword, user);
  if (!passwordValidation.isValid) {
    throw new ServiceError(
      ErrorCode.VALIDATION_ERROR,
      passwordValidation.errors[0] ?? 'Mot de passe invalide',
      400,
      { details: { password: passwordValidation.errors } },
    );
  }
  if (newPassword !== confirmPassword)
    throw serviceErrors.validation('Les mots de passe ne correspondent pas');

  const storedUser = await prisma.user.findUnique({
    select: { passwordHash: true },
    where: { id: user.id },
  });
  if (!storedUser) throw serviceErrors.notFound('Utilisateur non trouvé');

  if (!user.mustChangePassword) {
    if (!currentPassword)
      throw serviceErrors.validation('Le mot de passe actuel est requis');
    const rateLimit = await reserveSensitiveActionRateLimit(rateLimitKey, {
      actorUserId: user.id,
      proof: 'password',
      step: 'password_change',
      targetUserId: user.id,
    });
    if (!rateLimit.allowed)
      throw serviceErrors.rateLimited(rateLimit.retryAfter);
    if (!(await verifyPassword(currentPassword, storedUser.passwordHash)))
      throw serviceErrors.validation('Le mot de passe actuel est incorrect');
    // A correct proof releases the shared account reauthentication quota.
    // The transactional cleanup in updateUserPassword remains an idempotent
    // safety net if this request proceeds to the password mutation.
    await clearRateLimit(rateLimitKey);
  }

  if (await verifyPassword(newPassword, storedUser.passwordHash)) {
    throw serviceErrors.validation(
      "Le nouveau mot de passe doit être différent de l'actuel",
    );
  }

  await updateUserPassword(user.id, newPassword, {
    audit: {
      action: 'PASSWORD_CHANGE',
      category: 'AUTH',
      description: 'Mot de passe modifié',
      metadata: {
        pageKey: 'account',
        pageLabel: 'Mon compte',
        passwordChange: true,
        poleKey: 'account',
        poleLabel: 'Espace personnel',
        tabKey: 'security',
        tabLabel: 'Sécurité',
      },
      targetUserId: user.id,
      userId: user.id,
    },
    currentSessionToken: session.token,
    expectedSecurityVersion: session.securityVersion,
    rateLimitKey,
  });
};
