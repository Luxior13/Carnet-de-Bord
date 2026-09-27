import 'server-only';

import type { Prisma } from '@prisma/client';

import { getSystemSettingValue } from './system-settings';

const DAY_MS = 86_400_000;

/** Shared by setting mutations and cleanup, including before the first setting row exists. */
export const lockNotificationRetention = async (
  transaction: Pick<Prisma.TransactionClient, '$queryRaw'>,
): Promise<void> => {
  await transaction.$queryRaw`
    SELECT pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('system-setting:notifications.retentionDays', 0)
    )::text
  `;
};

/** Caller must use a ReadCommitted transaction so the read after waiting sees the latest commit. */
export const purgeExpiredNotifications = async (
  transaction: Prisma.TransactionClient,
  now: Date,
): Promise<{ count: number }> => {
  await lockNotificationRetention(transaction);
  const retentionDays = await getSystemSettingValue(
    'notifications.retentionDays',
    transaction,
  );

  return transaction.notification.deleteMany({
    where: {
      OR: [
        { createdAt: { lt: new Date(now.getTime() - retentionDays * DAY_MS) } },
        { expiresAt: { lt: now } },
      ],
    },
  });
};
