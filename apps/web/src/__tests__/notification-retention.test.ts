import type { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ readSetting: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('$server/system-settings', () => ({
  getSystemSettingValue: mocks.readSetting,
}));

import { purgeExpiredNotifications } from '$server/notification-retention';

describe('notification retention cleanup', () => {
  it('waits for the setting lock before reading retention and deleting, including individual expirations', async () => {
    let release!: () => void;
    const lock = new Promise<void>((resolve) => {
      release = resolve;
    });
    const transaction = {
      $queryRaw: vi.fn(() => lock),
      notification: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
    };
    mocks.readSetting.mockResolvedValue(365);
    const now = new Date('2026-09-27T12:00:00Z');
    const pending = purgeExpiredNotifications(
      transaction as unknown as Prisma.TransactionClient,
      now,
    );
    expect(mocks.readSetting).not.toHaveBeenCalled();
    expect(transaction.notification.deleteMany).not.toHaveBeenCalled();
    release();
    await expect(pending).resolves.toEqual({ count: 2 });
    expect(mocks.readSetting).toHaveBeenCalledWith(
      'notifications.retentionDays',
      transaction,
    );
    expect(transaction.notification.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { createdAt: { lt: new Date(now.getTime() - 365 * 86_400_000) } },
          { expiresAt: { lt: now } },
        ],
      },
    });
  });
});
