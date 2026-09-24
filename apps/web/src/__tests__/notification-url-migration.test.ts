import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('$server/prisma', () => ({ prisma: {} }));

import {
  createNotification,
  NotificationDedupeConflictError,
} from '$server/notifications';

const stored = {
  body: 'Message',
  createdById: null,
  dedupeKey: 'migration:item-1',
  expiresAt: null,
  href: '/administration/utilisateurs/user-1?section=security',
  id: 'notification-1',
  severity: 'INFO' as const,
  title: 'Information',
  type: 'test',
};
const upsert = vi.fn();
const create = vi.fn();
const createMany = vi.fn();
const client = {
  notification: { create, upsert },
  notificationRecipient: { createMany },
} as unknown as Parameters<typeof createNotification>[1];
const input = {
  body: stored.body,
  recipientUserIds: ['user-1'],
  title: stored.title,
  type: stored.type,
};

describe('notification links across page migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsert.mockResolvedValue(stored);
    create.mockResolvedValue({ id: stored.id });
    createMany.mockResolvedValue({ count: 1 });
  });

  it('writes canonical links even when a caller still uses an old destination', async () => {
    await createNotification({ ...input, href: stored.href }, client);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          href: '/systeme/utilisateurs/user-1?section=security',
        }),
      }),
    );
  });

  it.each([stored.href, '/systeme/utilisateurs/user-1?section=security'])(
    'keeps a retry idempotent across the migration: %s',
    async (href) => {
      await expect(
        createNotification(
          { ...input, dedupeKey: stored.dedupeKey, href },
          client,
        ),
      ).resolves.toMatchObject({ id: stored.id });
      expect(create).not.toHaveBeenCalled();
    },
  );

  it('still rejects a different destination under the same dedupe key', async () => {
    await expect(
      createNotification(
        {
          ...input,
          dedupeKey: stored.dedupeKey,
          href: '/systeme/utilisateurs/user-2?section=security',
        },
        client,
      ),
    ).rejects.toBeInstanceOf(NotificationDedupeConflictError);
    expect(createMany).not.toHaveBeenCalled();
  });
});
