import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PERMISSIONS } from '$constants/permissions.constants';

const mockRequireAuth = vi.fn();
const mockRequirePermission = vi.fn();
const mockCreateAuditLog = vi.fn();
const mockGetAuditRequestContext = vi.fn();
const mockPrisma = {
  auditLog: {
    count: vi.fn(),
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  systemSetting: {
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

vi.mock('server-only', () => ({}));
vi.mock('$env', () => ({
  env: {
    MFA_ENCRYPTION_KEY_V1: 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=',
  },
}));
vi.mock('$server/api-auth', () => ({
  requireAuth: mockRequireAuth,
  requirePermission: mockRequirePermission,
}));
vi.mock('$server/auth', () => ({
  createAuditLog: mockCreateAuditLog,
  getAuditRequestContext: mockGetAuditRequestContext,
}));
vi.mock('$server/prisma', () => ({ prisma: mockPrisma }));

const buildLog = (
  description = 'Profil mis à jour',
  overrides: Record<string, unknown> = {},
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
  ...overrides,
});

describe('managed user audit server pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      session: {
        criticalMfaVerifiedAt: new Date(),
        mfaVerifiedAt: new Date(),
        passwordReauthenticatedAt: new Date(),
      },
      success: true,
      user: {
        id: 'root-1',
        isProtected: true,
        permissions: {},
        role: 'ADMIN',
      },
    });
    mockRequirePermission.mockReturnValue({ success: true });
    mockCreateAuditLog.mockResolvedValue(undefined);
    mockGetAuditRequestContext.mockResolvedValue({
      ipAddress: '203.0.113.20',
      requestId: 'request-export-1',
      userAgent: 'Test browser',
    });
    mockPrisma.systemSetting.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'target-1',
      isProtected: false,
    });
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

  it('uses the reviewed default page size when no value is stored', async () => {
    const route = await import('$app/api/users/[id]/audit/route');
    const response = await route.GET(
      new Request(
        'http://localhost/api/users/target-1/audit?includeStats=false',
      ) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.pagination).toMatchObject({ page: 1, pageSize: 25 });
    expect(mockPrisma.systemSetting.findUnique).toHaveBeenCalledWith({
      select: { value: true },
      where: { key: 'ui.defaultPageSize' },
    });
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 26 }),
    );
  });

  it('excludes protected-account events from every normal-user audit projection', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: {
        criticalMfaVerifiedAt: new Date(),
        mfaVerifiedAt: new Date(),
        passwordReauthenticatedAt: new Date(),
      },
      success: true,
      user: {
        id: 'admin-1',
        isProtected: false,
        permissions: {},
        role: 'ADMIN',
      },
    });
    const route = await import('$app/api/users/[id]/audit/route');
    const response = await route.GET(
      new Request(
        'http://localhost/api/users/target-1/audit?includeFacets=true',
      ) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(200);
    const containsProtectedAccountExclusion = (where: unknown): boolean =>
      JSON.stringify(where).includes('"isProtected":true');
    expect(
      mockPrisma.auditLog.findMany.mock.calls.every(([query]) =>
        containsProtectedAccountExclusion(query?.where),
      ),
    ).toBe(true);
    expect(
      mockPrisma.auditLog.count.mock.calls.every(([query]) =>
        containsProtectedAccountExclusion(query?.where),
      ),
    ).toBe(true);
    expect(
      mockPrisma.auditLog.groupBy.mock.calls.every(([query]) =>
        containsProtectedAccountExclusion(query?.where),
      ),
    ).toBe(true);

    mockPrisma.auditLog.findMany.mockClear();
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: {
        id: 'root-1',
        isProtected: true,
        permissions: {},
        role: 'ADMIN',
      },
    });
    const rootResponse = await route.GET(
      new Request(
        'http://localhost/api/users/target-1/audit?includeStats=false',
      ) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(rootResponse.status).toBe(200);
    expect(
      containsProtectedAccountExclusion(
        mockPrisma.auditLog.findMany.mock.calls[0]?.[0]?.where,
      ),
    ).toBe(false);
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
    expect(body.data).toMatchObject({
      hasMore: false,
      nextCursor: null,
      snapshotAt: expect.any(String),
    });
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
        take: 51,
        where: {
          AND: [
            {
              AND: [
                { targetUserId: 'target-1' },
                { createdAt: { gte: expect.any(Date) } },
                { poleKey: 'system' },
                { pageKey: 'users' },
              ],
            },
            { createdAt: { lte: expect.any(Date) } },
          ],
        },
      }),
    );
    expect(mockPrisma.auditLog.findMany.mock.calls[0]?.[0]).not.toHaveProperty(
      'skip',
    );
    expect(
      mockPrisma.auditLog.count.mock.calls.filter(
        ([query]) => query?.take === 100_001,
      ),
    ).toHaveLength(3);
  });

  it('uses a signed stable keyset cursor and performs no counts on load-more', async () => {
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([
      buildLog('Journal 3', {
        createdAt: new Date('2026-07-15T10:00:00.000Z'),
        id: 'log-c',
      }),
      buildLog('Journal 2', {
        createdAt: new Date('2026-07-15T10:00:00.000Z'),
        id: 'log-b',
      }),
      buildLog('Sentinelle', {
        createdAt: new Date('2026-07-15T09:00:00.000Z'),
        id: 'log-a',
      }),
    ]);
    const route = await import('$app/api/users/[id]/audit/route');
    const firstResponse = await route.GET(
      new Request(
        'http://localhost/api/users/target-1/audit?pageSize=2&includeStats=false',
      ) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const firstBody = await firstResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(firstBody.data.logs.map((log: { id: string }) => log.id)).toEqual([
      'log-c',
      'log-b',
    ]);
    expect(firstBody.data.hasMore).toBe(true);
    expect(firstBody.data.nextCursor).toMatch(/^[^.]+\.[^.]+$/);
    expect(firstBody.data.snapshotAt).toEqual(expect.any(String));
    expect(mockPrisma.auditLog.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 3 }),
    );

    mockPrisma.auditLog.count.mockClear();
    mockPrisma.auditLog.groupBy.mockReset();
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([
      buildLog('Journal 1', {
        createdAt: new Date('2026-07-15T09:00:00.000Z'),
        id: 'log-a',
      }),
    ]);

    const nextResponse = await route.GET(
      new Request(
        `http://localhost/api/users/target-1/audit?pageSize=2&includeStats=true&includeFacets=true&cursor=${encodeURIComponent(firstBody.data.nextCursor)}`,
      ) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const nextBody = await nextResponse.json();

    expect(nextResponse.status).toBe(200);
    expect(nextBody.data).toMatchObject({
      facets: null,
      hasMore: false,
      nextCursor: null,
      snapshotAt: firstBody.data.snapshotAt,
      stats: null,
    });
    expect(mockPrisma.auditLog.count).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.groupBy).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        take: 3,
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: [
                {
                  createdAt: {
                    lt: new Date('2026-07-15T10:00:00.000Z'),
                  },
                },
                {
                  createdAt: new Date('2026-07-15T10:00:00.000Z'),
                  id: { lt: 'log-b' },
                },
              ],
            }),
          ]),
        }),
      }),
    );
    expect(
      mockPrisma.auditLog.findMany.mock.calls.at(-1)?.[0],
    ).not.toHaveProperty('skip');
  });

  it('rejects tampered cursors and cursors replayed with other filters', async () => {
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([
      buildLog('Journal 2', { id: 'log-b' }),
      buildLog('Sentinelle', {
        createdAt: new Date('2026-07-15T09:00:00.000Z'),
        id: 'log-a',
      }),
    ]);
    const route = await import('$app/api/users/[id]/audit/route');
    const firstResponse = await route.GET(
      new Request(
        'http://localhost/api/users/target-1/audit?pageSize=1&includeStats=false',
      ) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const firstBody = await firstResponse.json();
    const cursor = String(firstBody.data.nextCursor);

    mockPrisma.auditLog.findMany.mockClear();

    const tamperedResponse = await route.GET(
      new Request(
        `http://localhost/api/users/target-1/audit?pageSize=1&cursor=${encodeURIComponent(`${cursor}x`)}`,
      ) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const replayedResponse = await route.GET(
      new Request(
        `http://localhost/api/users/target-1/audit?pageSize=1&scope=on&cursor=${encodeURIComponent(cursor)}`,
      ) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(tamperedResponse.status).toBe(400);
    expect(replayedResponse.status).toBe(400);
    expect(mockPrisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it('streams the complete filtered CSV through the protected API', async () => {
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([
      buildLog(' \n=HYPERLINK("https://example.test")'),
    ]);
    const route = await import('$app/api/users/[id]/audit/route');
    const response = await route.GET(
      new Request(
        'http://localhost/api/users/target-1/audit?format=csv&scope=on&period=7',
      ) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(mockCreateAuditLog).toHaveBeenCalledTimes(1);
    expect(mockCreateAuditLog).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: 'AUDIT_EXPORT',
        metadata: expect.objectContaining({ phase: 'started', rowCount: 0 }),
      }),
    );
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
    expect(response.headers.get('content-disposition')).toContain('attachment');
    expect(response.headers.get('x-export-max-rows')).toBe('50000');
    expect(response.headers.get('x-export-truncated')).toBe('false');
    expect(csv).toContain('Date;Action;Catégorie');
    expect(csv).toContain("' \n=HYPERLINK");
    expect(mockRequirePermission).toHaveBeenCalledWith(
      expect.any(Object),
      PERMISSIONS.USERS.EXPORT_ACTIVITY,
    );
    expect(mockPrisma.auditLog.count).toHaveBeenCalledWith({
      take: 50_001,
      where: {
        AND: [
          expect.objectContaining({ AND: expect.any(Array) }),
          { createdAt: { lte: expect.any(Date) } },
        ],
      },
    });
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 500,
        where: expect.objectContaining({ AND: expect.any(Array) }),
      }),
    );
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AUDIT_EXPORT',
        category: 'SYSTEM',
        ipAddress: '203.0.113.20',
        metadata: expect.objectContaining({
          format: 'csv',
          phase: 'completed',
          rowCount: 1,
          truncated: false,
        }),
        requestId: 'request-export-1',
        targetUserId: 'target-1',
        userAgent: 'Test browser',
        userId: 'root-1',
      }),
    );
  });

  it('requires a recent step-up proof before preparing the export', async () => {
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
    const route = await import('$app/api/users/[id]/audit/route');
    const response = await route.GET(
      new Request(
        'http://localhost/api/users/target-1/audit?format=csv',
      ) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: 'REAUTHENTICATION_REQUIRED' },
      success: false,
    });
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.count).not.toHaveBeenCalled();
    expect(mockGetAuditRequestContext).not.toHaveBeenCalled();
    expect(mockCreateAuditLog).not.toHaveBeenCalled();
  });

  it('announces a truncated snapshot and keeps an audit trace when cancelled', async () => {
    mockPrisma.auditLog.count.mockResolvedValueOnce(50_001);
    const route = await import('$app/api/users/[id]/audit/route');
    const response = await route.GET(
      new Request(
        'http://localhost/api/users/target-1/audit?format=csv',
      ) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('x-export-truncated')).toBe('true');

    await response.body?.cancel();

    expect(mockCreateAuditLog).toHaveBeenCalledTimes(1);
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AUDIT_EXPORT',
        metadata: expect.objectContaining({
          phase: 'started',
          truncated: true,
        }),
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
