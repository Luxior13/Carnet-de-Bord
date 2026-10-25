import 'server-only';

import { PERMISSIONS } from '$constants/permissions.constants';
import { createAuditLogWithHeaders } from '$server/audit-log';
import { verifyPassword } from '$server/password';
import { prisma } from '$server/prisma';
import {
  clearRateLimit,
  reserveSensitiveActionRateLimit,
} from '$server/rate-limiter';
import { serviceErrors } from '$server/service-error';
import { authorizeUserAction } from '$server/user-action-authorization';
import { mapUserToUserType } from '$server/user-projection';
import type { SessionType, UserType } from '$types/auth.types';

const accountChanged = (): Error =>
  serviceErrors.conflict(
    'Votre compte a changé. Actualisez sa version avant de réessayer.',
  );

const isOptimisticConflict = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 'P2025';

/**
 * Replaces the signed-in account's own contact address after a password
 * proof. A changed address is no longer verified; the update and its audit
 * share one transaction, against the version the dialog was opened on.
 */
export const updateOwnContactEmail = async (
  userId: string,
  session: SessionType | null,
  input: {
    contactEmail: null | string;
    currentPassword: string;
    expectedUpdatedAt: Date;
  },
): Promise<UserType> => {
  const rateLimitKey = `account-reauth:${userId}`;
  const rateLimit = await reserveSensitiveActionRateLimit(rateLimitKey);
  if (!rateLimit.allowed) throw serviceErrors.rateLimited(rateLimit.retryAfter);

  const storedUser = await prisma.user.findUnique({
    where: { deletedAt: null, id: userId },
  });
  if (!storedUser) throw serviceErrors.notFound('Utilisateur non trouvé');

  // The version belongs to the open dialog, not to this freshly read row.
  // Check it before a no-op too: recovery after an ambiguous response must
  // explicitly reload the current account instead of silently accepting it.
  if (storedUser.updatedAt.getTime() !== input.expectedUpdatedAt.getTime())
    throw accountChanged();

  if (!(await verifyPassword(input.currentPassword, storedUser.passwordHash)))
    throw serviceErrors.validation('Le mot de passe actuel est incorrect');
  // A valid proof releases the sensitive-action quota. Invalid attempts stay
  // reserved and therefore cannot race past the hash verification.
  await clearRateLimit(rateLimitKey);

  const nextContactEmail =
    input.contactEmail === null || input.contactEmail.length === 0
      ? null
      : input.contactEmail.toLowerCase();

  try {
    const updatedUser = await prisma.$transaction(async (transaction) => {
      await authorizeUserAction(
        transaction,
        { actorId: userId, session },
        PERMISSIONS.ACCOUNT.UPDATE_CONTACT,
      );
      const current = await transaction.user.findUnique({
        where: { id: userId },
      });
      if (
        !current ||
        current.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()
      )
        throw accountChanged();
      if (nextContactEmail === current.contactEmail) return current;
      const nextUser = await transaction.user.update({
        data: { contactEmail: nextContactEmail, contactEmailVerifiedAt: null },
        where: { id: userId, updatedAt: input.expectedUpdatedAt },
      });

      await createAuditLogWithHeaders(
        {
          action: 'USER_UPDATE',
          category: 'USER',
          description: 'Adresse de contact mise à jour',
          metadata: {
            after: { contactEmail: nextContactEmail },
            before: { contactEmail: storedUser.contactEmail },
            changes: {
              contactEmail: {
                from: storedUser.contactEmail,
                to: nextContactEmail,
              },
            },
            contactEmailVerificationReset:
              storedUser.contactEmailVerifiedAt !== null,
            pageKey: 'account',
            pageLabel: 'Mon compte',
            poleKey: 'account',
            poleLabel: 'Espace personnel',
            tabKey: 'profile',
            tabLabel: 'Profil',
          },
          targetUserId: userId,
          userId,
        },
        { client: transaction, required: true },
      );

      return nextUser;
    });

    return mapUserToUserType(updatedUser);
  } catch (error) {
    if (isOptimisticConflict(error)) throw accountChanged();
    throw error;
  }
};
