import 'server-only';

import { createHash } from 'node:crypto';

import { Prisma } from '@prisma/client';

import { FEATURES } from '$constants/feature-registry.constants';
import { createAuditLogWithHeaders } from '$server/auth';
import { prisma } from '$server/prisma';

type DeleteUserPermanentlyOptions = {
  actorId: string;
  actorIsProtected: boolean;
  expectedSecurityVersion: number;
  expectedUpdatedAt: Date;
  userId: string;
};

export class UserDeletionStateChangedError extends Error {
  constructor() {
    super('User state changed during irreversible deletion');
    this.name = 'UserDeletionStateChangedError';
  }
}

const getDeletedLoginName = (userId: string): string =>
  `deleted:${createHash('sha256').update(userId).digest('hex').slice(0, 32)}`;

export const deleteUserPermanently = async ({
  actorId,
  actorIsProtected,
  expectedSecurityVersion,
  expectedUpdatedAt,
  userId,
}: DeleteUserPermanentlyOptions): Promise<void> => {
  const deletedAt = new Date();
  const deletedLoginName = getDeletedLoginName(userId);

  await prisma.$transaction(async (transaction) => {
    // Capture the durable identity snapshot before anonymization. Any
    // concurrent-state failure rolls this audit event back with the mutation.
    await createAuditLogWithHeaders(
      {
        action: 'USER_DELETE',
        category: 'USER',
        description: 'Utilisateur supprimé définitivement',
        metadata: {
          deletedUserId: userId,
          deletionVersion: 1,
          irreversible: true,
          ...FEATURES.users.audit,
          tabKey: 'security',
          tabLabel: 'Sécurité',
        },
        targetUserId: userId,
        userId: actorId,
      },
      { client: transaction, required: true },
    );

    const deletedUser = await transaction.user.updateMany({
      data: {
        contactEmail: null,
        contactEmailVerifiedAt: null,
        deletedAt,
        failedLoginAttempts: 0,
        firstName: 'Compte',
        isActive: false,
        isProtected: false,
        lastLoginAt: null,
        lastName: 'supprimé',
        lockedUntil: null,
        loginName: deletedLoginName,
        mfaEnabledAt: null,
        mustChangePassword: false,
        passwordChangedAt: null,
        passwordHash: `!${deletedLoginName}`,
        permissions: Prisma.DbNull,
        role: 'USER',
        securityVersion: { increment: 1 },
      },
      where: {
        deletedAt: null,
        id: userId,
        isActive: false,
        isProtected: false,
        ...(actorIsProtected ? {} : { role: 'USER' as const }),
        securityVersion: expectedSecurityVersion,
        updatedAt: expectedUpdatedAt,
      },
    });
    if (deletedUser.count !== 1) {
      throw new UserDeletionStateChangedError();
    }

    await transaction.archivedStaffProfile.deleteMany({
      where: { userId },
    });
    await transaction.mfaLoginChallenge.deleteMany({ where: { userId } });
    await transaction.mfaRecoveryCode.deleteMany({ where: { userId } });
    await transaction.notificationRecipient.deleteMany({ where: { userId } });
    await transaction.session.deleteMany({ where: { userId } });
    await transaction.totpCredential.deleteMany({ where: { userId } });
    await transaction.totpEnrollment.deleteMany({ where: { userId } });
  });
};
