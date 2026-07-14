import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PERMISSIONS } from '$constants/permissions.constants';

const mockRequireAuth = vi.fn();
const mockRequirePermission = vi.fn();

const mockPrisma = {
  auditLog: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

vi.mock('server-only', () => ({}));

vi.mock('$server/api-auth', () => ({
  requireAuth: mockRequireAuth,
  requirePermission: mockRequirePermission,
}));

vi.mock('$server/prisma', () => ({
  prisma: mockPrisma,
}));

const SAFE_CONTEXT_METADATA = {
  pageKey: 'users',
  pageLabel: 'Users and permissions',
  poleKey: 'system',
  poleLabel: 'System',
  tabKey: 'profile',
  tabLabel: 'Profile',
};

const SENSITIVE_METADATA = {
  ...SAFE_CONTEXT_METADATA,
  after: { email: 'new@example.com' },
  before: { email: 'old@example.com' },
  changes: ['email'],
  requestId: 'private-request-id',
  targetName: 'Target User',
};

const buildLog = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  action: 'USER_UPDATE',
  category: 'USER',
  createdAt: new Date('2026-07-14T08:00:00.000Z'),
  description: 'User updated',
  id: 'log-1',
  ipAddress: '203.0.113.10',
  metadata: SENSITIVE_METADATA,
  targetUserId: 'target-1',
  userAgent: 'Sensitive browser details',
  userId: 'admin-1',
  ...overrides,
});

const setViewer = ({
  id,
  isProtected = false,
}: {
  id: string;
  isProtected?: boolean;
}): void => {
  mockRequireAuth.mockResolvedValueOnce({
    session: null,
    success: true,
    user: {
      id,
      isProtected,
      permissions: {},
      role: isProtected ? 'ADMIN' : 'USER',
    },
  });
};

const getAudit = async (targetUserId: string): Promise<Response> => {
  const route = await import('$app/api/users/[id]/audit/route');

  return route.GET(
    new Request(`http://localhost/api/users/${targetUserId}/audit`) as never,
    { params: Promise.resolve({ id: targetUserId }) },
  );
};

describe('user audit detail redaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockRequirePermission.mockReturnValue({ success: true });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'target-1' });
    mockPrisma.auditLog.count.mockResolvedValue(1);
  });

  it('keeps complete details for a personal log produced by the user', async () => {
    setViewer({ id: 'target-1' });
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([
      buildLog({ userId: 'target-1' }),
    ]);

    const response = await getAudit('target-1');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.logs[0]).toMatchObject({
      ipAddress: '203.0.113.10',
      metadata: SENSITIVE_METADATA,
      userAgent: 'Sensitive browser details',
      userId: 'target-1',
    });
    expect(mockRequirePermission).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'target-1' }),
      PERMISSIONS.ACCOUNT.VIEW_ACTIVITY,
    );
  });

  it('redacts an administrator log targeting the personal audit', async () => {
    setViewer({ id: 'target-1' });
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([buildLog()]);

    const response = await getAudit('target-1');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.logs[0]).toMatchObject({
      ipAddress: null,
      targetUserId: 'target-1',
      userAgent: null,
      userId: 'admin-1',
    });
    expect(body.data.logs[0].metadata).toEqual(SAFE_CONTEXT_METADATA);
    expect(body.data.logs[0].metadata).not.toHaveProperty('after');
    expect(body.data.logs[0].metadata).not.toHaveProperty('before');
    expect(body.data.logs[0].metadata).not.toHaveProperty('changes');
    expect(body.data.logs[0].metadata).not.toHaveProperty('requestId');
    expect(body.data.logs[0].metadata).not.toHaveProperty('targetName');
  });

  it('shows a sanitized hostile login source without attributing it to the user', async () => {
    setViewer({ id: 'target-1' });
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([
      buildLog({
        action: 'LOGIN_FAILED',
        category: 'AUTH',
        targetUserId: 'target-1',
        userId: null,
      }),
    ]);

    const response = await getAudit('target-1');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.logs[0]).toMatchObject({
      ipAddress: '203.0.113.10',
      targetUserId: 'target-1',
      userAgent: 'Sensitive browser details',
      userId: null,
    });
    expect(body.data.logs[0].metadata).toEqual(SAFE_CONTEXT_METADATA);
    expect(body.data.logs[0].metadata).not.toHaveProperty('after');
  });

  it('redacts raw details for a non-protected reader of another audit', async () => {
    setViewer({ id: 'viewer-1' });
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([
      buildLog({ userId: 'target-1' }),
    ]);

    const response = await getAudit('target-1');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.logs[0]).toMatchObject({
      ipAddress: null,
      userAgent: null,
      userId: 'target-1',
    });
    expect(body.data.logs[0].metadata).toEqual(SAFE_CONTEXT_METADATA);
    expect(body.data.logs[0].metadata).not.toHaveProperty('before');
    expect(mockRequirePermission).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'viewer-1' }),
      PERMISSIONS.USERS.VIEW_ACTIVITY,
    );
  });

  it('keeps complete details for a protected reader', async () => {
    setViewer({ id: 'root-1', isProtected: true });
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([buildLog()]);

    const response = await getAudit('target-1');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.logs[0]).toMatchObject({
      ipAddress: '203.0.113.10',
      metadata: SENSITIVE_METADATA,
      userAgent: 'Sensitive browser details',
    });
  });
});
