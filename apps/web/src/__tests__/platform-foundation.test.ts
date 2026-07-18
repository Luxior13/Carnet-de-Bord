import { readFileSync } from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  isSystemSettingKey,
  parseSystemSettingValue,
  SYSTEM_SETTING_DEFINITIONS,
} from '$constants/system-settings.constants';

const mocks = vi.hoisted(() => ({
  auditLogDeleteMany: vi.fn(),
  backgroundJobDeleteMany: vi.fn(),
  challengeDeleteMany: vi.fn(),
  createAuditLog: vi.fn(),
  enrollmentDeleteMany: vi.fn(),
  jobCreate: vi.fn(),
  jobUpdateMany: vi.fn(),
  jobUpsert: vi.fn(),
  notificationDeleteMany: vi.fn(),
  queryRaw: vi.fn(),
  rateLimitDeleteMany: vi.fn(),
  sessionDeleteMany: vi.fn(),
  settingFindUnique: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('$server/auth', () => ({ createAuditLog: mocks.createAuditLog }));
vi.mock('$server/prisma', () => ({
  prisma: {
    $queryRaw: mocks.queryRaw,
    $transaction: mocks.transaction,
    auditLog: { deleteMany: mocks.auditLogDeleteMany },
    backgroundJob: {
      create: mocks.jobCreate,
      deleteMany: mocks.backgroundJobDeleteMany,
      updateMany: mocks.jobUpdateMany,
      upsert: mocks.jobUpsert,
    },
    mfaLoginChallenge: { deleteMany: mocks.challengeDeleteMany },
    notification: { deleteMany: mocks.notificationDeleteMany },
    rateLimit: { deleteMany: mocks.rateLimitDeleteMany },
    session: { deleteMany: mocks.sessionDeleteMany },
    systemSetting: { findUnique: mocks.settingFindUnique },
    totpEnrollment: { deleteMany: mocks.enrollmentDeleteMany },
  },
}));

describe('notification foundation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deduplicates recipients and notification production', async () => {
    const notificationUpsert = vi.fn().mockResolvedValue({
      body: 'Corps',
      createdById: null,
      dedupeKey: 'event:item-1',
      expiresAt: null,
      href: null,
      id: 'notice-1',
      severity: 'INFO',
      title: 'Titre',
      type: 'item.updated',
    });
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
      expect.objectContaining({
        select: expect.objectContaining({ createdById: true, id: true }),
        where: { dedupeKey: 'event:item-1' },
      }),
    );
    expect(recipientCreateMany).toHaveBeenCalledWith({
      data: [
        { notificationId: 'notice-1', userId: 'user-1' },
        { notificationId: 'notice-1', userId: 'user-2' },
      ],
      skipDuplicates: true,
    });
  });

  it('rejects a dedupe collision with a different payload or author', async () => {
    const notificationUpsert = vi.fn().mockResolvedValue({
      body: 'Ancien corps',
      createdById: 'actor-2',
      dedupeKey: 'event:item-1',
      expiresAt: null,
      href: '/mon-compte',
      id: 'notice-1',
      severity: 'INFO',
      title: 'Ancien titre',
      type: 'item.updated',
    });
    const recipientCreateMany = vi.fn();
    const { createNotification, NotificationDedupeConflictError } =
      await import('$server/notifications');

    await expect(
      createNotification(
        {
          body: 'Nouveau corps',
          createdById: 'actor-1',
          dedupeKey: 'event:item-1',
          href: '/mon-compte',
          recipientUserIds: ['user-1'],
          title: 'Nouveau titre',
          type: 'item.updated',
        },
        {
          notification: {
            create: vi.fn(),
            upsert: notificationUpsert,
          },
          notificationRecipient: { createMany: recipientCreateMany },
        } as never,
      ),
    ).rejects.toBeInstanceOf(NotificationDedupeConflictError);
    expect(recipientCreateMany).not.toHaveBeenCalled();
  });

  it('treats the author as part of the dedupe provenance', async () => {
    const notificationUpsert = vi.fn().mockResolvedValue({
      body: 'Corps',
      createdById: 'actor-2',
      dedupeKey: 'event:item-1',
      expiresAt: null,
      href: '/mon-compte',
      id: 'notice-1',
      severity: 'INFO',
      title: 'Titre',
      type: 'item.updated',
    });
    const recipientCreateMany = vi.fn();
    const { createNotification, NotificationDedupeConflictError } =
      await import('$server/notifications');

    await expect(
      createNotification(
        {
          body: 'Corps',
          createdById: 'actor-1',
          dedupeKey: 'event:item-1',
          href: '/mon-compte',
          recipientUserIds: ['user-1'],
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
      ),
    ).rejects.toBeInstanceOf(NotificationDedupeConflictError);
    expect(recipientCreateMany).not.toHaveBeenCalled();
  });

  it('rejects unsafe destinations and unnamespaced dedupe keys in the shared writer', async () => {
    const notificationCreate = vi.fn();
    const client = {
      notification: {
        create: notificationCreate,
        upsert: vi.fn(),
      },
      notificationRecipient: { createMany: vi.fn() },
    } as never;
    const { createNotification } = await import('$server/notifications');

    await expect(
      createNotification(
        {
          body: 'Corps',
          href: '/\\evil.example/path',
          recipientUserIds: ['user-1'],
          title: 'Titre',
          type: 'item.updated',
        },
        client,
      ),
    ).rejects.toThrow('known internal page');
    await expect(
      createNotification(
        {
          body: 'Corps',
          dedupeKey: 'missing-namespace',
          recipientUserIds: ['user-1'],
          title: 'Titre',
          type: 'item.updated',
        },
        client,
      ),
    ).rejects.toThrow('must be namespaced');
    expect(notificationCreate).not.toHaveBeenCalled();
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

  it('falls back to the reviewed default when stored JSON is invalid', async () => {
    const consoleWarn = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const { getSystemSettingValue } = await import('$server/system-settings');

    await expect(
      getSystemSettingValue('audit.retentionDays', {
        systemSetting: {
          findUnique: vi.fn().mockResolvedValue({ value: -1 }),
        },
      } as never),
    ).resolves.toBe(1_095);
    expect(consoleWarn).toHaveBeenCalledOnce();
    consoleWarn.mockRestore();
  });
});

describe('durable background-job foundation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const deletion of [
      mocks.auditLogDeleteMany,
      mocks.backgroundJobDeleteMany,
      mocks.challengeDeleteMany,
      mocks.enrollmentDeleteMany,
      mocks.notificationDeleteMany,
      mocks.rateLimitDeleteMany,
      mocks.sessionDeleteMany,
    ]) {
      deletion.mockResolvedValue({ count: 0 });
    }
    mocks.transaction.mockImplementation(
      async (work: ((client: unknown) => unknown) | Promise<unknown>[]) =>
        Array.isArray(work)
          ? Promise.all(work)
          : work({
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

  it('does not accumulate abort listeners while the worker is idle', () => {
    // The path is a fixed test fixture resolved from this test module.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const workerSource = readFileSync(
      new URL('../../scripts/run-worker.ts', import.meta.url),
      'utf8',
    );

    expect(workerSource).toContain('if (signal.aborted)');
    expect(workerSource).toContain(
      "signal.removeEventListener('abort', finish)",
    );
  });

  it('claims work through one transactional skip-locked reservation', async () => {
    const storedJob = {
      attempts: 1,
      id: 'job-1',
      maxAttempts: 5,
      type: 'platform.cleanup',
    };
    mocks.queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([storedJob]);
    const { claimNextBackgroundJob } = await import('$server/background-jobs');

    await expect(
      claimNextBackgroundJob('worker-1', { types: ['platform.cleanup'] }),
    ).resolves.toBe(storedJob);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.queryRaw).toHaveBeenCalledTimes(2);
  });

  it('closes and audits an exhausted job whose worker lease expired', async () => {
    const recoveredJob = {
      attempts: 5,
      id: 'expired-job-1',
      maxAttempts: 5,
      status: 'FAILED',
      type: 'platform.cleanup',
    };
    mocks.queryRaw
      .mockResolvedValueOnce([recoveredJob])
      .mockResolvedValueOnce([]);
    const { claimNextBackgroundJob } = await import('$server/background-jobs');

    await expect(claimNextBackgroundJob('worker-1')).resolves.toBeNull();
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BACKGROUND_JOB_UPDATE',
        metadata: expect.objectContaining({
          attempts: 5,
          jobId: 'expired-job-1',
          maxAttempts: 5,
          phase: 'terminal_failure',
          reason: 'lease_expired',
          status: 'FAILED',
          type: 'platform.cleanup',
        }),
      }),
      expect.any(Object),
    );
    const recoverySql = (
      mocks.queryRaw.mock.calls[0]?.[0] as TemplateStringsArray
    ).join(' ');
    expect(recoverySql).toContain('"completedAt"');
    expect(recoverySql).toContain('RETURNING');
  });

  it('atomically audits a handler failure on the final attempt', async () => {
    mocks.jobUpdateMany.mockResolvedValueOnce({ count: 1 });
    const { failBackgroundJob } = await import('$server/background-jobs');

    await expect(
      failBackgroundJob(
        {
          attempts: 5,
          id: 'failed-job-1',
          maxAttempts: 5,
          type: 'platform.cleanup',
        },
        'worker-1',
        new Error('terminal failure'),
      ),
    ).resolves.toBe(true);
    expect(mocks.jobUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          completedAt: expect.any(Date),
          status: 'FAILED',
        }),
      }),
    );
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BACKGROUND_JOB_UPDATE',
        metadata: expect.objectContaining({
          jobId: 'failed-job-1',
          phase: 'terminal_failure',
          reason: 'handler_error',
          status: 'FAILED',
        }),
      }),
      expect.any(Object),
    );
  });

  it('applies every validated retention policy, including audit logs', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-18T12:00:00.000Z'));
    mocks.settingFindUnique.mockImplementation(
      ({ where }: { where: { key: string } }) =>
        Promise.resolve({
          value:
            where.key === 'audit.retentionDays'
              ? 365
              : where.key === 'notifications.retentionDays'
                ? 60
                : 14,
        }),
    );
    const { BACKGROUND_JOB_HANDLERS } =
      await import('$server/background-job-runner');
    const cleanup = BACKGROUND_JOB_HANDLERS.get('platform.cleanup');

    expect(cleanup).toBeDefined();
    await cleanup?.(
      {},
      { jobId: 'cleanup-1', signal: new AbortController().signal },
    );

    expect(mocks.auditLogDeleteMany).toHaveBeenCalledWith({
      where: {
        createdAt: {
          lt: new Date('2025-07-18T12:00:00.000Z'),
        },
      },
    });
    expect(mocks.notificationDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.any(Object) }),
    );
    expect(mocks.backgroundJobDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.any(Object) }),
    );
    vi.useRealTimers();
  });
});
