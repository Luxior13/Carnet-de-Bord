import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PERMISSIONS } from '$constants/permissions.constants';

const mockRequireAuth = vi.fn();
const mockRequirePermission = vi.fn();
const mockPrisma = {
  auditLog: {
    count: vi.fn(),
    findMany: vi.fn(),
    groupBy: vi.fn(),
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
vi.mock('$server/prisma', () => ({ prisma: mockPrisma }));

const buildLog = (
  description = 'Profil mis à jour',
): Record<string, unknown> => ({
  action: 'USER_UPDATE',
  category: 'USER',
  createdAt: new Date('2026-07-15T10:00:00.000Z'),
  description,
  id: 'log-1',
  ipAddress: '203.0.113.10',
  metadata: {
    pageKey: 'users',
    pageLabel: 'Utilisateurs',
    poleKey: 'system',
    poleLabel: 'Système',
    tabKey: 'profile',
    tabLabel: 'Profil',
  },
  pageKey: 'users',
  poleKey: 'system',
  tabKey: 'profile',
  targetUserId: 'target-1',
  userAgent: 'Browser',
  userId: 'admin-1',
});

describe('managed user audit server pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      session: null,
      success: true,
      user: {
        id: 'root-1',
        isProtected: true,
        permissions: {},
        role: 'ADMIN',
      },
    });
    mockRequirePermission.mockReturnValue({ success: true });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'target-1' });
    mockPrisma.auditLog.count.mockResolvedValue(1);
    mockPrisma.auditLog.findMany.mockResolvedValue([buildLog()]);
    mockPrisma.auditLog.groupBy
      .mockResolvedValueOnce([{ _count: { _all: 1 }, poleKey: 'system' }])
      .mockResolvedValueOnce([
        {
          _count: { _all: 1 },
          pageKey: 'users',
          poleKey: 'system',
        },
      ]);
  });

  it('applies scope, period and location filters before returning page one', async () => {
    const route = await import('$app/api/users/[id]/audit/route');
    const response = await route.GET(
      new Request(
        'http://localhost/api/users/target-1/audit?page=1&pageSize=50&scope=on&period=30&poleKey=system&pageKey=users&includeFacets=true',
      ) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.logs).toHaveLength(1);
    expect(body.data.pagination).toMatchObject({ page: 1, pageSize: 50 });
    expect(body.data.facets).toEqual({
      pages: {
        options: [{ count: 1, poleValue: 'system', value: 'users' }],
        total: 1,
      },
      poles: {
        options: [{ count: 1, value: 'system' }],
        total: 1,
      },
      scopes: { all: 1, by: 1, on: 1 },
    });
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 50,
        where: {
          AND: [
            {
              OR: [{ userId: 'target-1' }, { targetUserId: 'target-1' }],
            },
            { createdAt: { gte: expect.any(Date) } },
            { targetUserId: 'target-1' },
            { poleKey: 'system' },
            { pageKey: 'users' },
          ],
        },
      }),
    );
  });

  it('streams the complete filtered CSV through the protected API', async () => {
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([
      buildLog('=HYPERLINK("https://example.test")'),
    ]);
    const route = await import('$app/api/users/[id]/audit/route');
    const response = await route.GET(
      new Request(
        'http://localhost/api/users/target-1/audit?format=csv&scope=on&period=7',
      ) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
    expect(response.headers.get('content-disposition')).toContain('attachment');
    expect(csv).toContain('Date;Action;Catégorie');
    expect(csv).toContain("'=HYPERLINK");
    expect(mockRequirePermission).toHaveBeenCalledWith(
      expect.any(Object),
      PERMISSIONS.USERS.EXPORT,
    );
    expect(mockPrisma.auditLog.count).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 500,
        where: expect.objectContaining({ AND: expect.any(Array) }),
      }),
    );
  });

  it('requires the dedicated export permission for another account', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: {
        id: 'admin-1',
        isProtected: false,
        permissions: {},
        role: 'ADMIN',
      },
    });
    mockRequirePermission
      .mockReturnValueOnce({ success: true })
      .mockReturnValueOnce({
        response: new Response(
          JSON.stringify({
            error: { code: 'FORBIDDEN', message: 'Export interdit' },
            success: false,
          }),
          { status: 403 },
        ),
        success: false,
      });
    const route = await import('$app/api/users/[id]/audit/route');
    const response = await route.GET(
      new Request(
        'http://localhost/api/users/target-1/audit?format=csv',
      ) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(403);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.findMany).not.toHaveBeenCalled();
  });
});
