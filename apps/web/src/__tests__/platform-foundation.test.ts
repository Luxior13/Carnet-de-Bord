import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  isSystemSettingKey,
  parseSystemSettingValue,
  SYSTEM_SETTING_DEFINITIONS,
} from '$constants/system-settings.constants';

const mocks = vi.hoisted(() => ({
  executeRaw: vi.fn(),
  jobCreate: vi.fn(),
  jobUpdateMany: vi.fn(),
  jobUpsert: vi.fn(),
  queryRaw: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('$server/prisma', () => ({
  prisma: {
    $executeRaw: mocks.executeRaw,
    $queryRaw: mocks.queryRaw,
    $transaction: mocks.transaction,
    backgroundJob: {
      create: mocks.jobCreate,
      updateMany: mocks.jobUpdateMany,
      upsert: mocks.jobUpsert,
    },
  },
}));

describe('notification foundation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deduplicates recipients and notification production', async () => {
    const notificationUpsert = vi.fn().mockResolvedValue({ id: 'notice-1' });
    const recipientCreateMany = vi.fn().mockResolvedValue({ count: 2 });
    const { createNotification } = await import('$server/notifications');

    const result = await createNotification(
      {
        body: 'Corps',
        dedupeKey: 'event:item-1',
        recipientUserIds: ['user-1', 'user-1', 'user-2'],
        title: 'Titre',
        type: 'item.updated',
      },
      {
        notification: {
          create: vi.fn(),
          upsert: notificationUpsert,
        },
        notificationRecipient: { createMany: recipientCreateMany },
      } as never,
    );

    expect(result).toEqual({ id: 'notice-1', recipientCount: 2 });
    expect(notificationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { dedupeKey: 'event:item-1' } }),
    );
    expect(recipientCreateMany).toHaveBeenCalledWith({
      data: [
        { notificationId: 'notice-1', userId: 'user-1' },
        { notificationId: 'notice-1', userId: 'user-2' },
      ],
      skipDuplicates: true,
    });
  });

  it('rejects empty recipient fan-out before writing', async () => {
    const { createNotification } = await import('$server/notifications');

    await expect(
      createNotification(
        {
          body: 'Corps',
          recipientUserIds: [],
          title: 'Titre',
          type: 'item.updated',
        },
        {} as never,
      ),
    ).rejects.toThrow('at least one recipient');
  });
});

describe('system setting foundation', () => {
  it('keeps a closed, validated and defaulted setting catalog', () => {
    expect(isSystemSettingKey('ui.defaultPageSize')).toBe(true);
    expect(isSystemSettingKey('unknown.setting')).toBe(false);
    expect(SYSTEM_SETTING_DEFINITIONS['ui.defaultPageSize'].defaultValue).toBe(
      25,
    );
    expect(parseSystemSettingValue('ui.defaultPageSize', 50)).toBe(50);
    expect(() =>
      parseSystemSettingValue('ui.defaultPageSize', 1_000),
    ).toThrow();
  });

  it('fails optimistic updates when the stored version moved', async () => {
    const { SystemSettingConflictError, updateSystemSetting } =
      await import('$server/system-settings');

    await expect(
      updateSystemSetting(
        {
          expectedVersion: 2,
          key: 'ui.defaultPageSize',
          updatedById: 'root-1',
          value: 50,
        },
        {
          systemSetting: {
            findUnique: vi.fn(),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        } as never,
      ),
    ).rejects.toBeInstanceOf(SystemSettingConflictError);
  });
});

describe('durable background-job foundation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(
      async (callback: (client: unknown) => unknown) =>
        callback({
          $executeRaw: mocks.executeRaw,
          $queryRaw: mocks.queryRaw,
          backgroundJob: {
            create: mocks.jobCreate,
            updateMany: mocks.jobUpdateMany,
            upsert: mocks.jobUpsert,
          },
        }),
    );
  });

  it('uses a durable dedupe key when enqueueing work', async () => {
    const storedJob = { id: 'job-1', type: 'platform.cleanup' };
    mocks.jobUpsert.mockResolvedValueOnce(storedJob);
    const { enqueueBackgroundJob } = await import('$server/background-jobs');

    await expect(
      enqueueBackgroundJob({
        dedupeKey: 'cleanup:2026-07-17',
        payload: {},
        type: 'platform.cleanup',
      }),
    ).resolves.toBe(storedJob);
    expect(mocks.jobUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {},
        where: { dedupeKey: 'cleanup:2026-07-17' },
      }),
    );
  });

  it('claims work through one transactional skip-locked reservation', async () => {
    const storedJob = {
      attempts: 1,
      id: 'job-1',
      maxAttempts: 5,
      type: 'platform.cleanup',
    };
    mocks.executeRaw.mockResolvedValueOnce(0);
    mocks.queryRaw.mockResolvedValueOnce([storedJob]);
    const { claimNextBackgroundJob } = await import('$server/background-jobs');

    await expect(
      claimNextBackgroundJob('worker-1', { types: ['platform.cleanup'] }),
    ).resolves.toBe(storedJob);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.executeRaw).toHaveBeenCalledTimes(1);
    expect(mocks.queryRaw).toHaveBeenCalledTimes(1);
  });
});
