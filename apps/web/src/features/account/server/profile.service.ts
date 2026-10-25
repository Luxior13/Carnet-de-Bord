import 'server-only';

import { PERMISSIONS } from '$constants/permissions.constants';
import { createAuditLogWithHeaders } from '$server/audit-log';
import { prisma } from '$server/prisma';
import { serviceErrors } from '$server/service-error';
import { authorizeUserAction } from '$server/user-action-authorization';
import { mapUserToUserType } from '$server/user-projection';
import type { SessionType, UserType } from '$types/auth.types';

const profileChanged = (): Error =>
  serviceErrors.conflict(
    'Votre profil a changé. Actualisez sa version avant de réessayer.',
  );

/**
 * Updates the signed-in account's first and last name against the version
 * the page loaded; the change and its audit share one transaction.
 */
export const updateOwnProfile = async (
  user: UserType,
  session: SessionType | null,
  input: { expectedUpdatedAt: Date; firstName: string; lastName: string },
): Promise<UserType> => {
  const { expectedUpdatedAt, firstName, lastName } = input;
  if (
    !user.updatedAt ||
    new Date(user.updatedAt).getTime() !== expectedUpdatedAt.getTime()
  ) {
    throw profileChanged();
  }

  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  if (firstName !== user.firstName) {
    before.firstName = user.firstName;
    after.firstName = firstName;
    changes.firstName = { from: user.firstName, to: firstName };
  }
  if (lastName !== user.lastName) {
    before.lastName = user.lastName;
    after.lastName = lastName;
    changes.lastName = { from: user.lastName, to: lastName };
  }

  const updatedUser = await prisma.$transaction(async (transaction) => {
    await authorizeUserAction(
      transaction,
      { actorId: user.id, session },
      PERMISSIONS.ACCOUNT.UPDATE_PROFILE,
    );
    const current = await transaction.user.findUnique({
      where: { id: user.id },
    });
    if (!current || current.updatedAt.getTime() !== expectedUpdatedAt.getTime())
      throw profileChanged();
    if (firstName === current.firstName && lastName === current.lastName)
      return current;
    const result = await transaction.user.updateMany({
      data: { firstName, lastName },
      where: { id: user.id, updatedAt: expectedUpdatedAt },
    });
    if (result.count !== 1) throw profileChanged();
    const updatedProfile = await transaction.user.findUnique({
      where: { id: user.id },
    });
    if (!updatedProfile) throw profileChanged();

    await createAuditLogWithHeaders(
      {
        action: 'USER_UPDATE',
        category: 'USER',
        description: 'Profil mis à jour',
        metadata: {
          after,
          before,
          changes,
          pageKey: 'account',
          pageLabel: 'Mon compte',
          poleKey: 'account',
          poleLabel: 'Espace personnel',
          tabKey: 'profile',
          tabLabel: 'Profil',
        },
        targetUserId: user.id,
        userId: user.id,
      },
      { client: transaction, required: true },
    );

    return updatedProfile;
  });

  return mapUserToUserType(updatedUser);
};
