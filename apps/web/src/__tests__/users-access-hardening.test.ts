import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PERMISSIONS } from '$constants/permissions.constants';
import { ErrorCode } from '$types/api.types';

const mockRequireAuth = vi.fn();
const mockRequirePermission = vi.fn();
const mockCreateAuditLogWithHeaders = vi.fn();
const mockCreateUser = vi.fn();
const mockGenerateTemporaryPassword = vi.fn();
const mockInvalidateAllUserSessions = vi.fn();

const mockPrisma = {
  auditLog: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  user: {
    count: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('server-only', () => ({}));

vi.mock('$server/api-auth', () => ({
  requireAuth: mockRequireAuth,
  requirePermission: mockRequirePermission,
}));

vi.mock('$server/auth', () => ({
  createAuditLogWithHeaders: mockCreateAuditLogWithHeaders,
  createUser: mockCreateUser,
  generateTemporaryPassword: mockGenerateTemporaryPassword,
  invalidateAllUserSessions: mockInvalidateAllUserSessions,
  mapUserToUserType: (user: unknown) => user,
}));

vi.mock('$server/prisma', () => ({
  prisma: mockPrisma,
}));

const buildUser = (overrides: Record<string, unknown> = {}) => ({
  createdAt: new Date('2026-03-01T00:00:00.000Z'),
  deletedAt: null,
  email: 'user@example.com',
  firstName: 'Jean',
  id: 'user-1',
  isActive: true,
  isProtected: false,
  lastLoginAt: null,
  lastName: 'Dupont',
  mustChangePassword: false,
  passwordChangedAt: null,
  passwordHash: 'hash',
  permissions: {},
  role: 'USER',
  ...overrides,
});

describe('users access hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockRequireAuth.mockResolvedValue({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        passwordHash: undefined,
      }),
    });
    mockRequirePermission.mockReturnValue({ success: true });
  });

  it('uses users:update for profile updates without requiring edit_permissions', async () => {
    const existingUser = buildUser({ id: 'target-1' });

    mockPrisma.user.findUnique.mockResolvedValue(existingUser);
    mockPrisma.user.update.mockResolvedValue({
      ...existingUser,
      firstName: 'Jeanne',
    });

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: JSON.stringify({ firstName: 'Jeanne' }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockRequirePermission.mock.calls.map(([, key]) => key)).toEqual([
      PERMISSIONS.USERS.UPDATE,
    ]);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ firstName: 'Jeanne' }),
        where: { id: 'target-1' },
      }),
    );
  });

  it('allows permissions-only updates with users:edit_permissions only', async () => {
    const existingUser = buildUser({ id: 'target-1', permissions: {} });
    const nextPermissions = {
      [PERMISSIONS.DASHBOARD.VIEW]: true,
      [PERMISSIONS.USERS.VIEW]: true,
    };

    mockPrisma.user.findUnique.mockResolvedValue(existingUser);
    mockPrisma.user.update.mockResolvedValue({
      ...existingUser,
      permissions: nextPermissions,
    });

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: JSON.stringify({ permissions: nextPermissions }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockRequirePermission.mock.calls.map(([, key]) => key)).toEqual([
      PERMISSIONS.USERS.EDIT_PERMISSIONS,
    ]);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ permissions: nextPermissions }),
        where: { id: 'target-1' },
      }),
    );
    expect(mockInvalidateAllUserSessions).toHaveBeenCalledWith('target-1');
    expect(mockCreateAuditLogWithHeaders).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PERMISSION_UPDATE',
        category: 'PERMISSION',
        userId: 'viewer-1',
      }),
    );
  });

  it('rejects empty user patches before loading the target user', async () => {
    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: JSON.stringify({}),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(mockRequirePermission).not.toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('creates users with a temporary password that must be changed', async () => {
    const newUser = buildUser({
      email: 'new.user@example.com',
      firstName: 'New',
      id: 'new-user-1',
      lastName: 'User',
      mustChangePassword: true,
      role: 'USER',
    });

    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockGenerateTemporaryPassword.mockReturnValue('TempPassword1!');
    mockCreateUser.mockResolvedValue(newUser);

    const route = await import('$app/api/users/route');
    const response = await route.POST(
      new Request('http://localhost/api/users', {
        body: JSON.stringify({
          email: 'New.User@example.com',
          firstName: 'New',
          lastName: 'User',
          role: 'USER',
        }),
        method: 'POST',
      }) as never,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.temporaryPassword).toBe('TempPassword1!');
    expect(body.data.user).toMatchObject({
      email: 'new.user@example.com',
      id: 'new-user-1',
      mustChangePassword: true,
      role: 'USER',
    });
    expect(mockCreateUser).toHaveBeenCalledWith({
      email: 'new.user@example.com',
      firstName: 'New',
      lastName: 'User',
      password: 'TempPassword1!',
      role: 'USER',
    });
    expect(mockCreateAuditLogWithHeaders).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_CREATE',
        category: 'USER',
        metadata: expect.objectContaining({ createdUserId: 'new-user-1' }),
        userId: 'viewer-1',
      }),
    );
  });

  it('blocks non-protected users from modifying protected accounts', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(
      buildUser({
        id: 'target-1',
        isProtected: true,
        role: 'ADMIN',
      }),
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: JSON.stringify({ lastName: 'Martin' }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ErrorCode.FORBIDDEN);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('redacts ip and user-agent for other users when viewer is not protected', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(buildUser({ id: 'target-1' }));
    mockPrisma.auditLog.count.mockResolvedValue(1);
    mockPrisma.auditLog.findMany
      .mockResolvedValueOnce([
        {
          action: 'LOGIN_SUCCESS',
          category: 'AUTH',
          createdAt: new Date('2026-03-02T00:00:00.000Z'),
          description: 'Connexion reussie',
          id: 'log-1',
          ipAddress: '1.2.3.4',
          metadata: null,
          userAgent: 'TestAgent',
          userId: 'target-1',
        },
      ])
      .mockResolvedValueOnce([{ action: 'LOGIN_SUCCESS' }]);

    const route = await import('$app/api/users/[id]/audit/route');
    const response = await route.GET(
      new Request('http://localhost/api/users/target-1/audit') as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.logs[0].ipAddress).toBeNull();
    expect(body.data.logs[0].userAgent).toBeNull();
    expect(mockRequirePermission).toHaveBeenCalledWith(
      expect.any(Object),
      PERMISSIONS.USERS.VIEW,
    );
  });

  it('applies the pending status filter at query level', async () => {
    mockPrisma.user.count.mockResolvedValue(1);
    mockPrisma.user.findMany
      .mockResolvedValueOnce([
        buildUser({
          id: 'pending-1',
          mustChangePassword: true,
        }),
      ])
      .mockResolvedValueOnce([
        {
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
          isActive: true,
          lastLoginAt: null,
          mustChangePassword: true,
          role: 'USER',
        },
      ]);

    const route = await import('$app/api/users/route');
    const response = await route.GET(
      new Request('http://localhost/api/users?status=pending') as never,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.users).toHaveLength(1);
    expect(mockPrisma.user.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ mustChangePassword: true }),
      }),
    );
    expect(mockPrisma.user.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ mustChangePassword: true }),
      }),
    );
  });

  it('normalizes invalid users list pagination params', async () => {
    mockPrisma.user.count.mockResolvedValue(0);
    mockPrisma.user.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const route = await import('$app/api/users/route');
    const response = await route.GET(
      new Request('http://localhost/api/users?page=bad&limit=bad') as never,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.pagination).toEqual({
      limit: 25,
      page: 1,
      total: 0,
      totalPages: 0,
    });
    expect(mockPrisma.user.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        skip: 0,
        take: 25,
      }),
    );
  });

  it('normalizes invalid audit pagination params', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(buildUser({ id: 'target-1' }));
    mockPrisma.auditLog.count.mockResolvedValue(0);
    mockPrisma.auditLog.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const route = await import('$app/api/users/[id]/audit/route');
    const response = await route.GET(
      new Request(
        'http://localhost/api/users/target-1/audit?page=bad&pageSize=bad',
      ) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.pagination).toEqual({
      page: 1,
      pageSize: 50,
      total: 0,
      totalPages: 0,
    });
    expect(mockPrisma.auditLog.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        skip: 0,
        take: 50,
      }),
    );
  });
});
