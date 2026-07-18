import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAuditLogWithHeaders: vi.fn(),
  createNotification: vi.fn(),
  requireAuth: vi.fn(),
  requirePermission: vi.fn(),
  requireRecentSensitiveActionProof: vi.fn(),
  transaction: vi.fn(),
  userCount: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('$env', () => ({
  env: {
    MFA_ENCRYPTION_KEY_V1: 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=',
  },
}));
vi.mock('$server/api-auth', () => ({
  requireAuth: mocks.requireAuth,
  requirePermission: mocks.requirePermission,
}));
vi.mock('$server/auth', () => ({
  createAuditLogWithHeaders: mocks.createAuditLogWithHeaders,
}));
vi.mock('$server/notifications', async (importOriginal) => ({
  ...(await importOriginal<typeof import('$server/notifications')>()),
  createNotification: mocks.createNotification,
}));
vi.mock('$server/prisma', () => ({
  prisma: {
    $transaction: mocks.transaction,
    notificationRecipient: {
      count: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    user: { count: mocks.userCount },
  },
}));
vi.mock('$server/sensitive-action', () => ({
  requireRecentSensitiveActionProof: mocks.requireRecentSensitiveActionProof,
}));
vi.mock('$server/system-settings', () => ({
  getSystemSettingValue: vi.fn(),
}));

const actor = {
  id: 'admin-1',
  isProtected: false,
  permissions: null,
  role: 'ADMIN',
};

const createRequest = (body: Record<string, unknown>): NextRequest =>
  new NextRequest('http://localhost/api/notifications', {
    body: JSON.stringify({
      body: 'Corps de la notification',
      recipientUserIds: ['user-1'],
      title: 'Titre',
      type: 'account.info',
      ...body,
    }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

describe('notification send route security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      session: { id: 'session-1' },
      success: true,
      user: actor,
    });
    mocks.requirePermission.mockReturnValue({ success: true });
    mocks.requireRecentSensitiveActionProof.mockReturnValue({ success: true });
    mocks.userCount.mockResolvedValue(1);
    mocks.createNotification.mockResolvedValue({
      id: 'notification-1',
      recipientCount: 1,
    });
    mocks.transaction.mockImplementation(
      async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback({}),
    );
  });

  it.each([
    '/\\evil.example/path',
    '/\\\\evil.example/path',
    '/%5C%5Cevil.example/path',
    '/api/users',
    '/mon-compte/../administration',
  ])('rejects the unsafe href %s before querying recipients', async (href) => {
    const { POST } = await import('$app/api/notifications/route');
    const response = await POST(createRequest({ href }));

    expect(response.status).toBe(400);
    expect(mocks.userCount).not.toHaveBeenCalled();
    expect(mocks.createNotification).not.toHaveBeenCalled();
  });

  it('namespaces a human dedupe key and preserves the verified author', async () => {
    const { POST } = await import('$app/api/notifications/route');
    const response = await POST(
      createRequest({
        dedupeKey: 'account:user-1:welcome',
        href: '/mon-compte',
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        createdById: actor.id,
        dedupeKey: `human.${actor.id}:account:user-1:welcome`,
        href: '/mon-compte',
      }),
      expect.anything(),
    );
  });

  it('returns 409 when a dedupe key belongs to another payload or author', async () => {
    const { NotificationDedupeConflictError } =
      await import('$server/notifications');
    mocks.createNotification.mockRejectedValueOnce(
      new NotificationDedupeConflictError(),
    );
    const { POST } = await import('$app/api/notifications/route');
    const response = await POST(createRequest({ dedupeKey: 'account:user-1' }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe('CONFLICT');
    expect(mocks.createAuditLogWithHeaders).not.toHaveBeenCalled();
  });

  it('rejects non-canonical human dedupe keys', async () => {
    const { POST } = await import('$app/api/notifications/route');
    const response = await POST(createRequest({ dedupeKey: 'UPPER CASE' }));

    expect(response.status).toBe(400);
    expect(mocks.userCount).not.toHaveBeenCalled();
  });
});
