import { prisma } from '../src/shared/server/prisma';
import { getSystemSettingValue } from '../src/shared/server/system-settings';

const DAY_MS = 86_400_000;

try {
  const now = new Date();
  const [auditRetentionDays, notificationRetentionDays] = await Promise.all([
    getSystemSettingValue('audit.retentionDays'),
    getSystemSettingValue('notifications.retentionDays'),
  ]);
  const notificationCutoff = new Date(
    now.getTime() - notificationRetentionDays * DAY_MS,
  );

  const results = await prisma.$transaction([
    prisma.$queryRaw<Array<{ deletedCount: bigint }>>`
      SELECT "public"."purge_expired_audit_logs"(${auditRetentionDays}) AS "deletedCount"
    `,
    prisma.notification.deleteMany({
      where: {
        OR: [
          { createdAt: { lt: notificationCutoff } },
          { expiresAt: { lt: now } },
        ],
      },
    }),
    prisma.mfaLoginChallenge.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.totpEnrollment.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.session.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { idleExpiresAt: { lt: now } }],
      },
    }),
    prisma.rateLimit.deleteMany({
      where: {
        OR: [
          { blockedUntil: { lt: now } },
          {
            blockedUntil: null,
            updatedAt: { lt: new Date(now.getTime() - DAY_MS) },
          },
        ],
      },
    }),
  ]);

  const [
    auditRows,
    notifications,
    loginChallenges,
    totpEnrollments,
    sessions,
    rateLimits,
  ] = results;
  console.info('Maintenance completed', {
    auditLogs: Number(auditRows[0]?.deletedCount ?? 0n),
    loginChallenges: loginChallenges.count,
    notifications: notifications.count,
    rateLimits: rateLimits.count,
    sessions: sessions.count,
    totpEnrollments: totpEnrollments.count,
  });
} finally {
  await prisma.$disconnect();
}
