import 'server-only';

import { createAuditLogWithHeaders } from '$server/audit-log';
import { prisma } from '$server/prisma';
import { serviceErrors } from '$server/service-error';
import type { SessionType } from '$types/auth.types';

export type AccountSessionInfo = {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  idleExpiresAt: Date;
  ipAddress: string | null;
  isCurrent: boolean;
  lastSeenAt: Date;
  rememberMe: boolean;
  userAgent: string | null;
};

const ACCOUNT_SECURITY_AUDIT_LOCATION = {
  pageKey: 'account',
  pageLabel: 'Mon compte',
  poleKey: 'account',
  poleLabel: 'Espace personnel',
  tabKey: 'security',
  tabLabel: 'Sécurité',
} as const;

/**
 * Lists the account's live sessions after removing its expired or obsolete
 * ones. Both statements are bound to the authenticated security state, so an
 * older request cannot delete a session issued after a rotation.
 */
export const listAccountSessions = async (
  userId: string,
  currentSession: SessionType,
): Promise<AccountSessionInfo[]> => {
  const now = new Date();
  const userScope = {
    is: {
      deletedAt: null,
      id: userId,
      isActive: true,
      securityVersion: currentSession.securityVersion,
    },
  };
  await prisma.session.deleteMany({
    where: {
      OR: [
        { expiresAt: { lte: now } },
        { idleExpiresAt: { lte: now } },
        { securityVersion: { not: currentSession.securityVersion } },
      ],
      user: userScope,
      userId,
    },
  });

  const sessions = await prisma.session.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      createdAt: true,
      expiresAt: true,
      id: true,
      idleExpiresAt: true,
      ipAddress: true,
      lastSeenAt: true,
      rememberMe: true,
      token: true,
      userAgent: true,
    },
    where: {
      expiresAt: { gt: now },
      idleExpiresAt: { gt: now },
      securityVersion: currentSession.securityVersion,
      user: userScope,
      userId,
    },
  });

  return sessions.map(({ token, ...session }) => ({
    ...session,
    isCurrent: token === currentSession.token,
  }));
};

/**
 * Revokes one other session (\`sessionId\`) or every other session. The
 * current session ends only through logout.
 */
export const revokeAccountSessions = async (
  userId: string,
  currentSession: SessionType,
  sessionId: string | null,
): Promise<void> => {
  await prisma.$transaction(async (transaction) => {
    // Serialize with session creation, security rotations and other
    // revocations. NO KEY UPDATE also permits the foreign-key checks used by
    // audit inserts.
    const authorizedUsers = await transaction.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "User"
      WHERE "id" = ${userId}
        AND "deletedAt" IS NULL
        AND "isActive" = TRUE
        AND "securityVersion" = ${currentSession.securityVersion}
      FOR NO KEY UPDATE
    `;
    // Read deadlines after the lock: waiting must not extend authorization.
    const revalidatedAt = new Date();
    const sourceSession =
      authorizedUsers.length === 1
        ? await transaction.session.findFirst({
            select: { id: true },
            where: {
              expiresAt: { gt: revalidatedAt },
              idleExpiresAt: { gt: revalidatedAt },
              securityVersion: currentSession.securityVersion,
              token: currentSession.token,
              userId,
            },
          })
        : null;
    if (!sourceSession) {
      throw serviceErrors.unauthorized(
        'Votre session a expiré. Veuillez vous reconnecter.',
      );
    }

    if (sessionId) {
      const sessionToDelete = await transaction.session.findFirst({
        select: { id: true, token: true },
        where: { id: sessionId, userId },
      });
      if (!sessionToDelete) throw serviceErrors.notFound('Session non trouvée');
      if (sessionToDelete.token === currentSession.token) {
        throw serviceErrors.forbidden(
          'Utilisez la déconnexion pour terminer votre session actuelle',
        );
      }

      const deleted = await transaction.session.deleteMany({
        where: { id: sessionId, NOT: { token: currentSession.token }, userId },
      });
      if (deleted.count !== 1)
        throw serviceErrors.notFound('Session non trouvée');

      await createAuditLogWithHeaders(
        {
          action: 'SESSION_INVALIDATE',
          category: 'AUTH',
          description: 'Session révoquée',
          metadata: { ...ACCOUNT_SECURITY_AUDIT_LOCATION, revokedSessions: 1 },
          targetUserId: userId,
          userId,
        },
        { client: transaction, required: true },
      );

      return;
    }

    const deleteResult = await transaction.session.deleteMany({
      where: { NOT: { token: currentSession.token }, userId },
    });
    await createAuditLogWithHeaders(
      {
        action: 'SESSION_INVALIDATE',
        category: 'AUTH',
        description: 'Toutes les autres sessions révoquées',
        metadata: {
          ...ACCOUNT_SECURITY_AUDIT_LOCATION,
          revokedSessions: deleteResult.count,
        },
        targetUserId: userId,
        userId,
      },
      { client: transaction, required: true },
    );
  });
};
