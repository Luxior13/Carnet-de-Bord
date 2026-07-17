import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAuditLogWithHeaders: vi.fn(),
  createNotification: vi.fn(),
  findMany: vi.fn(),
  notificationCount: vi.fn(),
  recipientUpdateMany: vi.fn(),
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

vi.mock('$server/notifications', () => ({
  createNotification: mocks.createNotification,
}));

vi.mock('$server/prisma', () => ({
  prisma: {
    $transaction: mocks.transaction,
    notificationRecipient: {
      count: mocks.notificationCount,
      findMany: mocks.findMany,
      updateMany: mocks.recipientUpdateMany,
    },
    user: { count: mocks.userCount },
  },
}));

vi.mock('$server/sensitive-action', () => ({
  requireRecentSensitiveActionProof: mocks.requireRecentSensitiveActionProof,
}));

const currentUser = {
  id: 'user-current',
  isProtected: false,
  permissions: { 'notifications:view': true },
  role: 'USER',
};

describe('personal notification routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      session: { id: 'session-current' },
      success: true,
      user: currentUser,
    });
    mocks.requirePermission.mockReturnValue({ success: true });
    mocks.notificationCount.mockResolvedValue(3);
    mocks.findMany.mockResolvedValue([
      {
        archivedAt: null,
        createdAt: new Date('2026-07-17T12:00:00.000Z'),
        notification: {
          body: 'Message personnel',
          href: '/mon-compte',
          id: 'notification-1',
          severity: 'INFO',
          title: 'Information',
          type: 'account.info',
        },
        notificationId: 'notification-1',
        readAt: null,
      },
    ]);
    mocks.recipientUpdateMany.mockResolvedValue({ count: 1 });
  });

  it('returns unread notifications only for the authenticated recipient', async () => {
    const { GET } = await import('$app/api/notifications/route');
    const response = await GET(
      new NextRequest(
        'http://localhost/api/notifications?status=unread&limit=20',
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          archivedAt: null,
          readAt: null,
          userId: currentUser.id,
        }),
      }),
    );
    expect(body.data.items[0]).toMatchObject({
      archivedAt: null,
      id: 'notification-1',
      readAt: null,
    });
    expect(body.data.unreadCount).toBe(3);
  });

  it('uses the archived recipient index scope for the archive view', async () => {
    const { GET } = await import('$app/api/notifications/route');
    const response = await GET(
      new NextRequest('http://localhost/api/notifications?status=archived'),
    );

    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          archivedAt: { not: null },
          userId: currentUser.id,
        }),
      }),
    );
  });

  it('rejects an unknown list filter before querying the database', async () => {
    const { GET } = await import('$app/api/notifications/route');
    const response = await GET(
      new NextRequest('http://localhost/api/notifications?status=everything'),
    );

    expect(response.status).toBe(400);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('marks all active personal notifications as read without touching others', async () => {
    const { PATCH } = await import('$app/api/notifications/route');
    const response = await PATCH(
      new NextRequest('http://localhost/api/notifications', {
        body: JSON.stringify({ action: 'read_all' }),
        headers: { 'content-type': 'application/json' },
        method: 'PATCH',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.recipientUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          archivedAt: null,
          readAt: null,
          userId: currentUser.id,
        }),
      }),
    );
    expect(body.data.updatedCount).toBe(1);
  });

  it('archives only the matching recipient row for the current user', async () => {
    const { PATCH } = await import('$app/api/notifications/[id]/route');
    const response = await PATCH(
      new NextRequest('http://localhost/api/notifications/notification-1', {
        body: JSON.stringify({ action: 'archive' }),
        headers: { 'content-type': 'application/json' },
        method: 'PATCH',
      }),
      { params: Promise.resolve({ id: 'notification-1' }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.recipientUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          notificationId: 'notification-1',
          userId: currentUser.id,
        },
      }),
    );
  });
});
