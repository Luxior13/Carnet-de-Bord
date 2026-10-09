import { Prisma } from '@prisma/client';

import { prisma } from '../src/shared/server/prisma';
import { getSystemSettingValue } from '../src/shared/server/system-settings';

const DAY_MS = 86_400_000;

try {
  const now = new Date();
  const auditRetentionDays = await getSystemSettingValue('audit.retentionDays');

  const results = await prisma.$transaction(
    async (transaction) => {
      const auditRows = await transaction.$queryRaw<
        Array<{ deletedCount: bigint }>
      >`
      SELECT "public"."purge_expired_audit_logs"(${auditRetentionDays}) AS "deletedCount"
    `;
      const loginChallenges = await transaction.mfaLoginChallenge.deleteMany({
        where: { expiresAt: { lt: now } },
      });
      const totpEnrollments = await transaction.totpEnrollment.deleteMany({
        where: { expiresAt: { lt: now } },
      });
      const sessions = await transaction.session.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: now } }, { idleExpiresAt: { lt: now } }],
        },
      });
      const rateLimits = await transaction.rateLimit.deleteMany({
        where: {
          OR: [
            { blockedUntil: { lt: now } },
            {
              blockedUntil: null,
              updatedAt: { lt: new Date(now.getTime() - DAY_MS) },
            },
          ],
        },
      });

      return {
        auditRows,
        loginChallenges,
        rateLimits,
        sessions,
        totpEnrollments,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: 60_000,
    },
  );
  const { auditRows, loginChallenges, rateLimits, sessions, totpEnrollments } =
    results;
  // CLI output is consumed by the maintenance scheduler.
  // eslint-disable-next-line no-console
  console.info('Maintenance completed', {
    auditLogs: Number(auditRows[0]?.deletedCount ?? 0n),
    loginChallenges: loginChallenges.count,
    rateLimits: rateLimits.count,
    sessions: sessions.count,
    totpEnrollments: totpEnrollments.count,
  });
} finally {
  await prisma.$disconnect();
}
