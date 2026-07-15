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
  $transaction: vi.fn(),
  auditLog: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  loginNameReservation: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  session: {
    deleteMany: vi.fn(),
  },
  user: {
    count: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    groupBy: vi.fn(),
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
  mapUserToUserType: (user: unknown): unknown => user,
}));

vi.mock('$server/prisma', () => ({
  prisma: mockPrisma,
}));

const buildUser = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  contactEmail: 'user@example.com',
  contactEmailVerifiedAt: null,
  createdAt: new Date('2026-03-01T00:00:00.000Z'),
  deletedAt: null,
  firstName: 'Jean',
  id: 'user-1',
  isActive: true,
  isProtected: false,
  lastLoginAt: null,
  lastName: 'Dupont',
  loginName: 'user.test',
  mustChangePassword: false,
  passwordChangedAt: null,
  passwordHash: 'hash',
  permissions: {},
  role: 'USER',
  updatedAt: new Date('2026-03-01T00:00:00.000Z'),
  ...overrides,
});

const USER_REVISION = '2026-03-01T00:00:00.000Z';
const SYSTEM_SAFE_AUDIT_METADATA = {
  pageKey: 'users',
  pageLabel: 'Utilisateurs & permissions',
  poleKey: 'system',
  poleLabel: 'Système',
  tabKey: 'profile',
  tabLabel: 'Profil',
};
const SYSTEM_SENSITIVE_AUDIT_METADATA = {
  ...SYSTEM_SAFE_AUDIT_METADATA,
  after: { contactEmail: 'new@example.com' },
  before: { contactEmail: 'old@example.com' },
  changes: ['contactEmail'],
  requestId: 'private-request-id',
};

const stringifyRequestBody = (body: Record<string, unknown>): string =>
  JSON.stringify({
    ...('permissions' in body ? { expectedUpdatedAt: USER_REVISION } : {}),
    ...body,
  });

describe('users access hardening', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockPrisma.$transaction.mockImplementation(
      async (callback: (client: typeof mockPrisma) => unknown) =>
        callback(mockPrisma),
    );

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
    mockPrisma.loginNameReservation.findUnique.mockResolvedValue(null);
    mockPrisma.user.groupBy.mockResolvedValue([]);
  });

  it('uses users:update_profile for profile updates without requiring edit_permissions', async () => {
    const existingUser = buildUser({ id: 'target-1' });

    mockPrisma.user.findUnique.mockResolvedValue(existingUser);
    mockPrisma.user.update.mockResolvedValue({
      ...existingUser,
      firstName: 'Jeanne',
    });

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({ firstName: 'Jeanne' }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.user.permissions).toBeNull();
    expect(mockRequirePermission.mock.calls.map(([, key]) => key)).toEqual([
      PERMISSIONS.USERS.UPDATE_PROFILE,
    ]);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ firstName: 'Jeanne' }),
        where: expect.objectContaining({ id: 'target-1' }),
      }),
    );
  });

  it('uses users:update_login to let a non-protected admin rename a standard user', async () => {
    const actor = buildUser({
      deletedAt: undefined,
      id: 'admin-1',
      isProtected: false,
      passwordHash: undefined,
      permissions: { [PERMISSIONS.USERS.UPDATE_LOGIN]: true },
      role: 'ADMIN',
    });
    const existingUser = buildUser({ id: 'target-1', role: 'USER' });

    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: actor,
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);
    mockPrisma.user.update.mockResolvedValueOnce({
      ...existingUser,
      loginName: 'nouveau.login',
    });

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          expectedUpdatedAt: USER_REVISION,
          loginName: 'nouveau.login',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(200);
    expect(mockRequirePermission).toHaveBeenCalledWith(
      actor,
      PERMISSIONS.USERS.UPDATE_LOGIN,
    );
    expect(mockPrisma.loginNameReservation.create).toHaveBeenCalledWith({
      data: { loginName: 'nouveau.login', userId: 'target-1' },
    });
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          loginName: 'nouveau.login',
          securityVersion: { increment: 1 },
        }),
      }),
    );
    expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'target-1' },
    });
  });

  it('rejects login-name updates when users:update_login is denied', async () => {
    const actor = buildUser({
      deletedAt: undefined,
      id: 'admin-1',
      isProtected: false,
      passwordHash: undefined,
      permissions: { [PERMISSIONS.USERS.UPDATE_LOGIN]: false },
      role: 'ADMIN',
    });

    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: actor,
    });
    mockRequirePermission.mockImplementation((_user, permissionKey) =>
      permissionKey === PERMISSIONS.USERS.UPDATE_LOGIN
        ? {
            response: Response.json(
              {
                error: { code: ErrorCode.FORBIDDEN, message: 'Interdit' },
                success: false,
              },
              { status: 403 },
            ),
            success: false,
          }
        : { success: true },
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          expectedUpdatedAt: USER_REVISION,
          loginName: 'nouveau.login',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe(ErrorCode.FORBIDDEN);
    expect(mockRequirePermission).toHaveBeenCalledWith(
      actor,
      PERMISSIONS.USERS.UPDATE_LOGIN,
    );
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockPrisma.session.deleteMany).not.toHaveBeenCalled();
  });

  it('keeps self login-name updates forbidden despite users:update_login', async () => {
    const actor = buildUser({
      deletedAt: undefined,
      id: 'admin-1',
      isProtected: false,
      passwordHash: undefined,
      permissions: { [PERMISSIONS.USERS.UPDATE_LOGIN]: true },
      role: 'ADMIN',
    });

    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: actor,
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(
      buildUser({ id: 'admin-1', role: 'ADMIN' }),
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/admin-1', {
        body: stringifyRequestBody({
          expectedUpdatedAt: USER_REVISION,
          loginName: 'mon.nouvel.identifiant',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'admin-1' }) },
    );

    expect(response.status).toBe(403);
    expect(mockRequirePermission).toHaveBeenCalledWith(
      actor,
      PERMISSIONS.USERS.UPDATE_LOGIN,
    );
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockPrisma.session.deleteMany).not.toHaveBeenCalled();
  });

  it('keeps self identity updates on the dedicated personal-account route', async () => {
    const actor = buildUser({
      deletedAt: undefined,
      id: 'admin-1',
      isProtected: false,
      passwordHash: undefined,
      permissions: { [PERMISSIONS.USERS.UPDATE_PROFILE]: true },
      role: 'ADMIN',
    });

    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: actor,
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(
      buildUser({ id: 'admin-1', role: 'ADMIN' }),
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/admin-1', {
        body: stringifyRequestBody({ firstName: 'Nouveau' }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'admin-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe(ErrorCode.FORBIDDEN);
    expect(body.error.message).toContain('Utilisez Mon compte');
    expect(mockRequirePermission).toHaveBeenCalledWith(
      actor,
      PERMISSIONS.USERS.UPDATE_PROFILE,
    );
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: 'another administrator',
      target: buildUser({ id: 'target-admin', role: 'ADMIN' }),
    },
    {
      label: 'the protected root account',
      target: buildUser({
        id: 'root-1',
        isProtected: true,
        role: 'ADMIN',
      }),
    },
  ])(
    'keeps login-name updates forbidden for $label despite users:update_login',
    async ({ target }) => {
      const actor = buildUser({
        deletedAt: undefined,
        id: 'admin-1',
        isProtected: false,
        passwordHash: undefined,
        permissions: { [PERMISSIONS.USERS.UPDATE_LOGIN]: true },
        role: 'ADMIN',
      });

      mockRequireAuth.mockResolvedValueOnce({
        session: null,
        success: true,
        user: actor,
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce(target);

      const route = await import('$app/api/users/[id]/route');
      const response = await route.PATCH(
        new Request(`http://localhost/api/users/${String(target.id)}`, {
          body: stringifyRequestBody({
            expectedUpdatedAt: USER_REVISION,
            loginName: 'nouveau.login',
          }),
          method: 'PATCH',
        }) as never,
        { params: Promise.resolve({ id: String(target.id) }) },
      );

      expect(response.status).toBe(403);
      expect(mockRequirePermission).toHaveBeenCalledWith(
        actor,
        PERMISSIONS.USERS.UPDATE_LOGIN,
      );
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockPrisma.session.deleteMany).not.toHaveBeenCalled();
    },
  );

  it('returns 409 when a concurrent login-name update hits the unique constraint', async () => {
    const existingUser = buildUser({ id: 'target-1' });
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        isProtected: true,
        passwordHash: undefined,
        role: 'ADMIN',
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);
    mockPrisma.user.update.mockRejectedValueOnce({ code: 'P2002' });

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          expectedUpdatedAt: USER_REVISION,
          loginName: 'next.user',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toEqual({
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Cet identifiant est déjà utilisé',
    });
  });

  it('redacts permission overrides from user detail without view-access permission', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(
      buildUser({
        id: 'target-1',
        permissions: { [PERMISSIONS.USERS.DELETE]: true },
      }),
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.GET(
      new Request('http://localhost/api/users/target-1') as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.user.contactEmail).toBeNull();
    expect(body.data.user.contactEmailVerifiedAt).toBeNull();
    expect(body.data.user.permissions).toBeNull();
    expect(body.data.user.role).toBe('USER');
    expect(body.data.user.isActive).toBe(true);
  });

  it('returns contact details from user detail with view_contact permission', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        passwordHash: undefined,
        permissions: {
          [PERMISSIONS.USERS.VIEW]: true,
          [PERMISSIONS.USERS.VIEW_CONTACT]: true,
        },
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(
      buildUser({
        contactEmail: 'visible@example.com',
        contactEmailVerifiedAt: new Date('2026-03-01T00:00:00.000Z'),
        id: 'target-1',
      }),
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.GET(
      new Request('http://localhost/api/users/target-1') as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.user.contactEmail).toBe('visible@example.com');
    expect(body.data.user.contactEmailVerifiedAt).toBe(
      '2026-03-01T00:00:00.000Z',
    );
  });

  it('returns permission overrides from user detail with view-access permission', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        passwordHash: undefined,
        permissions: {
          [PERMISSIONS.USERS.VIEW]: true,
          [PERMISSIONS.USERS.VIEW_ACCESS]: true,
        },
      }),
    });
    const targetPermissions = {
      [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false,
      [PERMISSIONS.USERS.DELETE]: true,
    };
    mockPrisma.user.findUnique.mockResolvedValueOnce(
      buildUser({ id: 'target-1', permissions: targetPermissions }),
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.GET(
      new Request('http://localhost/api/users/target-1') as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.user.permissions).toEqual({
      [PERMISSIONS.USERS.DELETE]: true,
    });
  });

  it('returns only personal-account overrides with account-policy read access', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        passwordHash: undefined,
        permissions: {
          [PERMISSIONS.USERS.VIEW]: true,
          [PERMISSIONS.USERS.VIEW_ACCOUNT_POLICY]: true,
        },
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(
      buildUser({
        id: 'target-1',
        permissions: {
          [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false,
          [PERMISSIONS.SYSTEM.SETTINGS]: true,
        },
      }),
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.GET(
      new Request('http://localhost/api/users/target-1') as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.user.permissions).toEqual({
      [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false,
    });
  });

  it('allows permissions-only updates with users:edit_permissions only', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        passwordHash: undefined,
        permissions: {
          [PERMISSIONS.USERS.EDIT_PERMISSIONS]: true,
          [PERMISSIONS.USERS.VIEW]: true,
          [PERMISSIONS.USERS.VIEW_ACCESS]: true,
        },
      }),
    });
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
        body: stringifyRequestBody({
          permissions: nextPermissions,
          permissionScope: 'access',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.user.permissions).toEqual(nextPermissions);
    expect(mockRequirePermission.mock.calls.map(([, key]) => key)).toEqual([
      PERMISSIONS.USERS.EDIT_PERMISSIONS,
    ]);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ permissions: nextPermissions }),
        where: expect.objectContaining({ id: 'target-1' }),
      }),
    );
    expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'target-1' },
    });
    expect(mockCreateAuditLogWithHeaders).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PERMISSION_UPDATE',
        category: 'PERMISSION',
        userId: 'viewer-1',
      }),
      { client: mockPrisma, required: true },
    );
  });

  it('audits personal account permission updates on the personal account tab', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        passwordHash: undefined,
        permissions: {
          [PERMISSIONS.USERS.MANAGE_ACCOUNT_POLICY]: true,
          [PERMISSIONS.USERS.VIEW]: true,
          [PERMISSIONS.USERS.VIEW_ACCOUNT_POLICY]: true,
        },
      }),
    });
    const existingUser = buildUser({ id: 'target-1', permissions: {} });
    const nextPermissions = {
      [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false,
    };

    mockPrisma.user.findUnique.mockResolvedValue(existingUser);
    mockPrisma.user.update.mockResolvedValue({
      ...existingUser,
      permissions: nextPermissions,
    });

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          permissions: nextPermissions,
          permissionScope: 'account',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockRequirePermission).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'viewer-1' }),
      PERMISSIONS.USERS.MANAGE_ACCOUNT_POLICY,
    );
    expect(mockCreateAuditLogWithHeaders).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PERMISSION_UPDATE',
        category: 'PERMISSION',
        metadata: expect.objectContaining({
          tabKey: 'account',
          tabLabel: 'Autonomie du compte',
        }),
        targetUserId: 'target-1',
      }),
      { client: mockPrisma, required: true },
    );
  });

  it('persists only configurable personal permissions from a mixed payload', async () => {
    const existingUser = buildUser({ id: 'target-1', permissions: {} });
    const requestedPermissions = {
      [PERMISSIONS.ACCOUNT.CHANGE_PASSWORD]: false,
      [PERMISSIONS.ACCOUNT.MANAGE_SESSIONS]: false,
      [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false,
      [PERMISSIONS.ACCOUNT.VIEW_PROFILE]: false,
      [PERMISSIONS.ACCOUNT.VIEW_SECURITY]: false,
    };
    const persistedPermissions = {
      [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false,
    };

    mockPrisma.user.findUnique.mockResolvedValue(existingUser);
    mockPrisma.user.update.mockResolvedValue({
      ...existingUser,
      permissions: persistedPermissions,
    });

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          permissions: requestedPermissions,
          permissionScope: 'account',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { permissions: persistedPermissions },
        where: expect.objectContaining({ id: 'target-1' }),
      }),
    );
    expect(mockPrisma.session.deleteMany).not.toHaveBeenCalled();
    expect(mockCreateAuditLogWithHeaders).toHaveBeenCalledTimes(1);
  });

  it('ignores an essential-only personal permission payload without side effects', async () => {
    const existingUser = buildUser({ id: 'target-1', permissions: null });
    const requestedPermissions = {
      [PERMISSIONS.ACCOUNT.CHANGE_PASSWORD]: false,
      [PERMISSIONS.ACCOUNT.MANAGE_SESSIONS]: false,
      [PERMISSIONS.ACCOUNT.VIEW_PROFILE]: false,
      [PERMISSIONS.ACCOUNT.VIEW_SECURITY]: false,
    };

    mockPrisma.user.findUnique.mockResolvedValue(existingUser);

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          permissions: requestedPermissions,
          permissionScope: 'account',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.user.permissions).toBeNull();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.session.deleteMany).not.toHaveBeenCalled();
    expect(mockInvalidateAllUserSessions).not.toHaveBeenCalled();
    expect(mockCreateAuditLogWithHeaders).not.toHaveBeenCalled();
  });

  it('merges account overrides without overwriting access overrides', async () => {
    const existingUser = buildUser({
      id: 'target-1',
      permissions: {
        [PERMISSIONS.USERS.VIEW]: false,
      },
    });
    const mergedPermissions = {
      [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false,
      [PERMISSIONS.USERS.VIEW]: false,
    };

    mockPrisma.user.findUnique.mockResolvedValue(existingUser);
    mockPrisma.user.update.mockResolvedValue({
      ...existingUser,
      permissions: mergedPermissions,
    });

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          permissions: { [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false },
          permissionScope: 'account',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ permissions: mergedPermissions }),
      }),
    );
    expect(mockPrisma.session.deleteMany).not.toHaveBeenCalled();
  });

  it('does not reject an account-policy change because of an untouched access grant', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        passwordHash: undefined,
        permissions: {
          [PERMISSIONS.USERS.MANAGE_ACCOUNT_POLICY]: true,
          [PERMISSIONS.USERS.VIEW]: true,
          [PERMISSIONS.USERS.VIEW_ACCOUNT_POLICY]: true,
        },
      }),
    });
    const existingUser = buildUser({
      id: 'target-1',
      permissions: { [PERMISSIONS.SYSTEM.SETTINGS]: true },
    });
    const mergedPermissions = {
      [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false,
      [PERMISSIONS.SYSTEM.SETTINGS]: true,
    };
    mockPrisma.user.findUnique.mockResolvedValue(existingUser);
    mockPrisma.user.update.mockResolvedValue({
      ...existingUser,
      permissions: mergedPermissions,
    });

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          permissions: { [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false },
          permissionScope: 'account',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { permissions: mergedPermissions } }),
    );
  });

  it('merges access overrides without overwriting account overrides', async () => {
    const existingUser = buildUser({
      id: 'target-1',
      permissions: {
        [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false,
        [PERMISSIONS.USERS.VIEW]: false,
      },
    });
    const mergedPermissions = {
      [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false,
      [PERMISSIONS.DASHBOARD.VIEW]: false,
    };

    mockPrisma.user.findUnique.mockResolvedValue(existingUser);
    mockPrisma.user.update.mockResolvedValue({
      ...existingUser,
      permissions: mergedPermissions,
    });

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          permissions: { [PERMISSIONS.DASHBOARD.VIEW]: false },
          permissionScope: 'access',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ permissions: mergedPermissions }),
      }),
    );
    expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'target-1' },
    });
  });

  it('rejects permission keys outside the declared scope', async () => {
    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          permissions: { [PERMISSIONS.USERS.VIEW]: true },
          permissionScope: 'account',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(body.error.details.permissions).toEqual([
      `Permission hors scope: ${PERMISSIONS.USERS.VIEW}`,
    ]);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('requires an explicit permission payload when a scope is provided', async () => {
    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({ permissionScope: 'account' }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(400);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('requires a client revision for permission updates', async () => {
    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: JSON.stringify({
          permissions: { [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false },
          permissionScope: 'account',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.details.expectedUpdatedAt).toEqual([
      'La version de la fiche est requise pour modifier les informations sensibles',
    ]);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('does not let a legacy payload bypass account-policy authorization', async () => {
    const existingUser = buildUser({ id: 'target-1', permissions: null });
    mockPrisma.user.findUnique.mockResolvedValue(existingUser);
    mockRequirePermission.mockImplementation((_user, permissionKey) =>
      permissionKey === PERMISSIONS.USERS.MANAGE_ACCOUNT_POLICY
        ? {
            response: Response.json(
              {
                error: { code: ErrorCode.FORBIDDEN, message: 'Interdit' },
                success: false,
              },
              { status: 403 },
            ),
            success: false,
          }
        : { success: true },
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          permissions: { [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false },
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(403);
    expect(mockRequirePermission).toHaveBeenCalledWith(
      expect.anything(),
      PERMISSIONS.USERS.MANAGE_ACCOUNT_POLICY,
    );
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('redacts permission overrides from no-op PATCH responses', async () => {
    const existingUser = buildUser({
      id: 'target-1',
      permissions: { [PERMISSIONS.USERS.DELETE]: true },
    });
    mockPrisma.user.findUnique.mockResolvedValue(existingUser);

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({ firstName: existingUser.firstName }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.user.permissions).toBeNull();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('revokes existing sessions when the login name changes', async () => {
    const existingUser = buildUser({ id: 'target-1' });
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        isProtected: true,
        passwordHash: undefined,
        role: 'ADMIN',
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);
    mockPrisma.user.update.mockResolvedValue({
      ...existingUser,
      loginName: 'nouveau.login',
    });

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          expectedUpdatedAt: USER_REVISION,
          loginName: 'nouveau.login',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'target-1' },
    });
    expect(mockPrisma.loginNameReservation.create).toHaveBeenCalledWith({
      data: {
        loginName: 'nouveau.login',
        userId: 'target-1',
      },
    });
  });

  it('rejects a login name permanently reserved by another user', async () => {
    const existingUser = buildUser({ id: 'target-1' });
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        isProtected: true,
        passwordHash: undefined,
        role: 'ADMIN',
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);
    mockPrisma.loginNameReservation.findUnique.mockResolvedValueOnce({
      loginName: 'retired.login',
      userId: 'other-user',
    });

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          expectedUpdatedAt: USER_REVISION,
          loginName: 'retired.login',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toEqual({
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Cet identifiant est déjà utilisé',
    });
    expect(mockPrisma.loginNameReservation.create).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockPrisma.session.deleteMany).not.toHaveBeenCalled();
  });

  it('allows a user to return to one of its own reserved login names', async () => {
    const existingUser = buildUser({ id: 'target-1' });
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        isProtected: true,
        passwordHash: undefined,
        role: 'ADMIN',
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);
    mockPrisma.loginNameReservation.findUnique.mockResolvedValueOnce({
      loginName: 'former.login',
      userId: 'target-1',
    });
    mockPrisma.user.update.mockResolvedValueOnce({
      ...existingUser,
      loginName: 'former.login',
    });

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          expectedUpdatedAt: USER_REVISION,
          loginName: 'former.login',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.loginNameReservation.create).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          loginName: 'former.login',
          securityVersion: { increment: 1 },
        }),
      }),
    );
  });

  it('rejects self login-name updates even for the protected superadmin', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        isProtected: true,
        passwordHash: undefined,
        role: 'ADMIN',
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(
      buildUser({ id: 'viewer-1' }),
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/viewer-1', {
        body: stringifyRequestBody({
          expectedUpdatedAt: USER_REVISION,
          loginName: 'my.new.login',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'viewer-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe(ErrorCode.FORBIDDEN);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockPrisma.session.deleteMany).not.toHaveBeenCalled();
  });

  it('rejects self contact-email updates through delegated administration', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        passwordHash: undefined,
        permissions: { [PERMISSIONS.USERS.UPDATE_CONTACT]: true },
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(
      buildUser({ id: 'viewer-1' }),
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/viewer-1', {
        body: stringifyRequestBody({
          contactEmail: 'me@example.com',
          expectedUpdatedAt: USER_REVISION,
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'viewer-1' }) },
    );

    expect(response.status).toBe(403);
    expect(mockRequirePermission).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'viewer-1' }),
      PERMISSIONS.USERS.UPDATE_CONTACT,
    );
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockPrisma.session.deleteMany).not.toHaveBeenCalled();
  });

  it('requires users:update_contact to change another account contact email', async () => {
    mockRequirePermission.mockImplementation((_user, permissionKey) =>
      permissionKey === PERMISSIONS.USERS.UPDATE_CONTACT
        ? {
            response: Response.json(
              {
                error: { code: ErrorCode.FORBIDDEN, message: 'Interdit' },
                success: false,
              },
              { status: 403 },
            ),
            success: false,
          }
        : { success: true },
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          contactEmail: 'contact@example.com',
          expectedUpdatedAt: USER_REVISION,
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(403);
    expect(mockRequirePermission).toHaveBeenCalledWith(
      expect.anything(),
      PERMISSIONS.USERS.UPDATE_CONTACT,
    );
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('clears contact verification without revoking sessions when contact email changes', async () => {
    const existingUser = buildUser({
      contactEmail: 'old@example.com',
      contactEmailVerifiedAt: new Date('2026-02-01T00:00:00.000Z'),
      id: 'target-1',
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);
    mockPrisma.user.update.mockResolvedValueOnce({
      ...existingUser,
      contactEmail: 'new@example.com',
      contactEmailVerifiedAt: null,
    });

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          contactEmail: 'New@Example.com',
          expectedUpdatedAt: USER_REVISION,
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(200);
    expect(mockRequirePermission).toHaveBeenCalledWith(
      expect.anything(),
      PERMISSIONS.USERS.UPDATE_CONTACT,
    );
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          contactEmail: 'new@example.com',
          contactEmailVerifiedAt: null,
        },
        where: expect.objectContaining({
          id: 'target-1',
          updatedAt: new Date(USER_REVISION),
        }),
      }),
    );
    expect(mockPrisma.session.deleteMany).not.toHaveBeenCalled();
    expect(mockCreateAuditLogWithHeaders).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_UPDATE',
        metadata: expect.objectContaining({
          after: { contactEmail: 'new@example.com' },
          before: { contactEmail: 'old@example.com' },
          changes: ['contactEmail'],
        }),
      }),
      { client: mockPrisma, required: true },
    );
  });

  it('returns a conflict instead of overwriting a concurrent update', async () => {
    const existingUser = buildUser({ id: 'target-1' });
    mockPrisma.user.findUnique.mockResolvedValue(existingUser);
    mockPrisma.user.update.mockRejectedValue({ code: 'P2025' });

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({ firstName: 'Jeanne' }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe(ErrorCode.CONFLICT);
    expect(mockCreateAuditLogWithHeaders).not.toHaveBeenCalled();
  });

  it('rejects a permission save based on a stale client revision', async () => {
    const existingUser = buildUser({
      id: 'target-1',
      updatedAt: new Date('2026-03-02T00:00:00.000Z'),
    });
    mockPrisma.user.findUnique.mockResolvedValue(existingUser);

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          permissions: { [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false },
          permissionScope: 'account',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe(ErrorCode.CONFLICT);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects self permission updates for non-protected users', async () => {
    const existingUser = buildUser({ id: 'viewer-1', permissions: {} });
    const nextPermissions = {
      [PERMISSIONS.USERS.DELETE]: true,
      [PERMISSIONS.USERS.EDIT_PERMISSIONS]: true,
    };

    mockPrisma.user.findUnique.mockResolvedValue(existingUser);

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/viewer-1', {
        body: stringifyRequestBody({ permissions: nextPermissions }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'viewer-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ErrorCode.FORBIDDEN);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockInvalidateAllUserSessions).not.toHaveBeenCalled();
    expect(mockCreateAuditLogWithHeaders).not.toHaveBeenCalled();
  });

  it('rejects unknown permission keys before loading the target user', async () => {
    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          permissions: {
            [PERMISSIONS.USERS.VIEW]: true,
            'users:ghost': true,
          },
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(body.error.details.permissions).toEqual([
      'Permission inconnue: users:ghost',
    ]);
    expect(mockRequirePermission).not.toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('does not update permissions when only the key order changes', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        passwordHash: undefined,
        permissions: {
          [PERMISSIONS.USERS.EDIT_PERMISSIONS]: true,
          [PERMISSIONS.USERS.VIEW]: true,
          [PERMISSIONS.USERS.VIEW_ACCESS]: true,
        },
      }),
    });
    const existingPermissions = {
      [PERMISSIONS.USERS.VIEW]: true,
      [PERMISSIONS.DASHBOARD.VIEW]: true,
    };
    const nextPermissions = {
      [PERMISSIONS.DASHBOARD.VIEW]: true,
      [PERMISSIONS.USERS.VIEW]: true,
    };
    const existingUser = buildUser({
      id: 'target-1',
      permissions: existingPermissions,
    });

    mockPrisma.user.findUnique.mockResolvedValue(existingUser);

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({ permissions: nextPermissions }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockInvalidateAllUserSessions).not.toHaveBeenCalled();
    expect(mockCreateAuditLogWithHeaders).not.toHaveBeenCalled();
  });

  it('rejects permission escalation when granting a permission the actor does not own', async () => {
    const existingUser = buildUser({ id: 'target-1', permissions: {} });

    mockPrisma.user.findUnique.mockResolvedValue(existingUser);

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          permissions: {
            [PERMISSIONS.USERS.DELETE]: true,
          },
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ErrorCode.FORBIDDEN);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockInvalidateAllUserSessions).not.toHaveBeenCalled();
    expect(mockCreateAuditLogWithHeaders).not.toHaveBeenCalled();
  });

  it.each([
    {
      existingPermissions: {
        [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false,
      },
      label: 'an empty override object',
      nextPermissions: {},
    },
    {
      existingPermissions: {
        [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false,
      },
      label: 'null overrides',
      nextPermissions: null,
    },
    {
      existingPermissions: {
        [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false,
        [PERMISSIONS.DASHBOARD.VIEW]: false,
      },
      label: 'removing a false override while retaining another override',
      nextPermissions: {
        [PERMISSIONS.DASHBOARD.VIEW]: false,
      },
    },
  ])(
    'rejects effective permission escalation through $label',
    async ({ existingPermissions, nextPermissions }) => {
      mockRequireAuth.mockResolvedValueOnce({
        session: null,
        success: true,
        user: buildUser({
          deletedAt: undefined,
          id: 'viewer-1',
          passwordHash: undefined,
          permissions: {
            [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false,
            [PERMISSIONS.USERS.EDIT_PERMISSIONS]: true,
          },
        }),
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce(
        buildUser({
          id: 'target-1',
          permissions: existingPermissions,
        }),
      );

      const route = await import('$app/api/users/[id]/route');
      const response = await route.PATCH(
        new Request('http://localhost/api/users/target-1', {
          body: stringifyRequestBody({ permissions: nextPermissions }),
          method: 'PATCH',
        }) as never,
        { params: Promise.resolve({ id: 'target-1' }) },
      );

      expect(response.status).toBe(403);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockCreateAuditLogWithHeaders).not.toHaveBeenCalled();
    },
  );

  it('audits inactive account reactivation as USER_ACTIVATE', async () => {
    const existingUser = buildUser({
      id: 'target-1',
      isActive: false,
    });

    mockPrisma.user.findUnique.mockResolvedValue(existingUser);
    mockPrisma.user.update.mockResolvedValue({
      ...existingUser,
      isActive: true,
    });

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({ isActive: true }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockCreateAuditLogWithHeaders).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_ACTIVATE',
        category: 'USER',
        targetUserId: 'target-1',
        userId: 'viewer-1',
      }),
      { client: mockPrisma, required: true },
    );
  });

  it('rejects member profile fields on user account patches', async () => {
    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          staffProfile: {
            department: ' Staff ',
            displayName: ' Coach Lux ',
          },
        }),
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

  it('rejects null required identity fields on user patches', async () => {
    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({ firstName: null }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(400);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects empty user patches before loading the target user', async () => {
    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({}),
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
      contactEmail: 'new.user@example.com',
      firstName: 'New',
      id: 'new-user-1',
      lastName: 'User',
      loginName: 'new.user',
      mustChangePassword: true,
      role: 'USER',
    });

    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockGenerateTemporaryPassword.mockReturnValue('TempPassword1!');
    mockCreateUser.mockResolvedValue(newUser);

    const route = await import('$app/api/users/route');
    const response = await route.POST(
      new Request('http://localhost/api/users', {
        body: stringifyRequestBody({
          contactEmail: 'New.User@example.com',
          firstName: 'New',
          lastName: 'User',
          loginName: 'New.User',
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
      contactEmail: 'new.user@example.com',
      id: 'new-user-1',
      loginName: 'new.user',
      mustChangePassword: true,
      role: 'USER',
    });
    expect(mockCreateUser).toHaveBeenCalledWith(
      {
        contactEmail: 'new.user@example.com',
        firstName: 'New',
        lastName: 'User',
        loginName: 'new.user',
        password: 'TempPassword1!',
        role: 'USER',
      },
      expect.any(Function),
    );
    const auditFactory = mockCreateUser.mock.calls[0]?.[1] as
      ((user: typeof newUser) => Record<string, unknown>) | undefined;
    expect(auditFactory?.(newUser)).toEqual(
      expect.objectContaining({
        action: 'USER_CREATE',
        category: 'USER',
        metadata: expect.objectContaining({ createdUserId: 'new-user-1' }),
        userId: 'viewer-1',
      }),
    );
    expect(mockCreateAuditLogWithHeaders).not.toHaveBeenCalled();
  });

  it('returns 409 when concurrent user creation hits the login-name unique constraint', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockGenerateTemporaryPassword.mockReturnValue('TempPassword1!');
    mockCreateUser.mockRejectedValueOnce({ code: 'P2002' });

    const route = await import('$app/api/users/route');
    const response = await route.POST(
      new Request('http://localhost/api/users', {
        body: stringifyRequestBody({
          contactEmail: 'race@example.com',
          firstName: 'Race',
          lastName: 'Condition',
          loginName: 'race.condition',
          role: 'USER',
        }),
        method: 'POST',
      }) as never,
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toEqual({
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Cet identifiant est déjà utilisé',
    });
  });

  it('keeps unexpected user creation failures as internal errors', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockGenerateTemporaryPassword.mockReturnValue('TempPassword1!');
    mockCreateUser.mockRejectedValueOnce(new Error('database unavailable'));

    const route = await import('$app/api/users/route');
    const response = await route.POST(
      new Request('http://localhost/api/users', {
        body: stringifyRequestBody({
          contactEmail: 'failure@example.com',
          firstName: 'Failure',
          lastName: 'Case',
          loginName: 'failure.case',
          role: 'USER',
        }),
        method: 'POST',
      }) as never,
    );

    expect(response.status).toBe(500);
  });

  it('applies the same 50-character identity limit when creating users', async () => {
    const route = await import('$app/api/users/route');
    const response = await route.POST(
      new Request('http://localhost/api/users', {
        body: stringifyRequestBody({
          contactEmail: 'new.user@example.com',
          firstName: 'A'.repeat(51),
          lastName: 'User',
          loginName: 'new.user',
          role: 'USER',
        }),
        method: 'POST',
      }) as never,
    );

    expect(response.status).toBe(400);
    expect(mockCreateUser).not.toHaveBeenCalled();
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
        body: stringifyRequestBody({ lastName: 'Martin' }),
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

  it('blocks every other actor from changing the root profile', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'other-protected-actor',
        isProtected: true,
        passwordHash: undefined,
        role: 'ADMIN',
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(
      buildUser({
        id: 'root-owner',
        isProtected: true,
        role: 'ADMIN',
      }),
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/root-owner', {
        body: stringifyRequestBody({ lastName: 'Intruder' }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'root-owner' }) },
    );

    expect(response.status).toBe(403);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('blocks sensitive root changes even from the root session', async () => {
    const root = buildUser({
      id: 'root-owner',
      isProtected: true,
      role: 'ADMIN',
    });
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: { ...root, deletedAt: undefined, passwordHash: undefined },
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(root);

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/root-owner', {
        body: stringifyRequestBody({
          expectedUpdatedAt: USER_REVISION,
          isActive: false,
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'root-owner' }) },
    );

    expect(response.status).toBe(403);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('keeps protected accounts active and administrative even for protected actors', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'superadmin-1',
        isProtected: true,
        passwordHash: undefined,
        role: 'ADMIN',
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValue(
      buildUser({
        id: 'protected-2',
        isProtected: true,
        role: 'ADMIN',
      }),
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/protected-2', {
        body: stringifyRequestBody({
          expectedUpdatedAt: USER_REVISION,
          isActive: false,
          role: 'USER',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'protected-2' }) },
    );

    expect(response.status).toBe(403);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('blocks non-protected users from changing admin access fields', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(
      buildUser({
        id: 'admin-1',
        isProtected: false,
        role: 'ADMIN',
      }),
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/admin-1', {
        body: stringifyRequestBody({ isActive: false }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'admin-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ErrorCode.FORBIDDEN);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockInvalidateAllUserSessions).not.toHaveBeenCalled();
  });

  it('blocks non-protected users from deleting admin accounts', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(
      buildUser({
        id: 'admin-1',
        isProtected: false,
        role: 'ADMIN',
      }),
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.DELETE(
      new Request('http://localhost/api/users/admin-1', {
        method: 'DELETE',
      }) as never,
      { params: Promise.resolve({ id: 'admin-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ErrorCode.FORBIDDEN);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockInvalidateAllUserSessions).not.toHaveBeenCalled();
  });

  it('soft-deletes users, revokes sessions and writes audit in one transaction', async () => {
    const existingUser = buildUser({ id: 'target-1' });
    mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);
    mockPrisma.user.update.mockResolvedValueOnce({
      ...existingUser,
      deletedAt: new Date(),
      isActive: false,
    });
    mockPrisma.session.deleteMany.mockResolvedValueOnce({ count: 2 });

    const route = await import('$app/api/users/[id]/route');
    const response = await route.DELETE(
      new Request('http://localhost/api/users/target-1', {
        method: 'DELETE',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      data: {
        deletedAt: expect.any(Date),
        isActive: false,
        securityVersion: { increment: 1 },
      },
      where: { id: 'target-1' },
    });
    expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'target-1' },
    });
    expect(mockCreateAuditLogWithHeaders).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_DELETE',
        targetUserId: 'target-1',
      }),
      { client: mockPrisma, required: true },
    );
  });

  it('redacts ip and user-agent for other users when viewer is not protected', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(buildUser({ id: 'target-1' }));
    mockPrisma.auditLog.count.mockResolvedValue(1);
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([
      {
        action: 'LOGIN_SUCCESS',
        category: 'AUTH',
        createdAt: new Date('2026-03-02T00:00:00.000Z'),
        description: 'Connexion reussie',
        id: 'log-1',
        ipAddress: '1.2.3.4',
        metadata: SYSTEM_SENSITIVE_AUDIT_METADATA,
        userAgent: 'TestAgent',
        userId: 'target-1',
      },
    ]);

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
      PERMISSIONS.USERS.VIEW_ACTIVITY,
    );
  });

  it('allows users to view their own audit logs with personal activity permission', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'target-1',
        passwordHash: undefined,
        permissions: {},
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValue(buildUser({ id: 'target-1' }));
    mockPrisma.auditLog.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([
      {
        action: 'USER_UPDATE',
        category: 'USER',
        createdAt: new Date('2026-03-02T00:00:00.000Z'),
        description: 'Profil mis a jour',
        id: 'log-1',
        ipAddress: '1.2.3.4',
        metadata: {
          pageLabel: 'Mon compte',
          poleLabel: 'Espace personnel',
          tabLabel: 'Profil',
        },
        targetUserId: 'target-1',
        userAgent: 'TestAgent',
        userId: 'target-1',
      },
    ]);

    const route = await import('$app/api/users/[id]/audit/route');
    const response = await route.GET(
      new Request('http://localhost/api/users/target-1/audit') as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.logs[0].ipAddress).toBe('1.2.3.4');
    expect(body.data.logs[0].userAgent).toBe('TestAgent');
    expect(mockRequirePermission).toHaveBeenCalledWith(
      expect.any(Object),
      PERMISSIONS.ACCOUNT.VIEW_ACTIVITY,
    );
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ userId: 'target-1' }, { targetUserId: 'target-1' }],
        },
      }),
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
    expect(body.data.users[0].permissions).toBeNull();
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

  it('limits users list search input before querying', async () => {
    mockPrisma.user.count.mockResolvedValue(0);
    mockPrisma.user.findMany.mockResolvedValueOnce([]);
    const longSearch = 'a'.repeat(140);

    const route = await import('$app/api/users/route');
    const response = await route.GET(
      new Request(`http://localhost/api/users?search=${longSearch}`) as never,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockPrisma.user.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              loginName: expect.objectContaining({
                contains: 'a'.repeat(100),
              }),
            }),
            expect.objectContaining({
              firstName: expect.objectContaining({
                contains: 'a'.repeat(100),
              }),
            }),
          ]),
        }),
      }),
    );
  });

  it('hides contact data and excludes it from search without view_contact', async () => {
    mockPrisma.user.count.mockResolvedValue(1);
    mockPrisma.user.findMany.mockResolvedValueOnce([
      buildUser({
        contactEmail: 'private@example.com',
        contactEmailVerifiedAt: new Date('2026-03-01T00:00:00.000Z'),
      }),
    ]);

    const route = await import('$app/api/users/route');
    const response = await route.GET(
      new Request('http://localhost/api/users?search=private') as never,
    );
    const body = await response.json();
    const listQuery = mockPrisma.user.findMany.mock.calls[0]?.[0];

    expect(response.status).toBe(200);
    expect(body.data.users[0]).toMatchObject({
      contactEmail: null,
      contactEmailVerifiedAt: null,
    });
    expect(
      listQuery.where.OR.some(
        (filter: Record<string, unknown>) => 'contactEmail' in filter,
      ),
    ).toBe(false);
  });

  it('returns and searches contact data with view_contact', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        passwordHash: undefined,
        permissions: {
          [PERMISSIONS.USERS.VIEW]: true,
          [PERMISSIONS.USERS.VIEW_CONTACT]: true,
        },
      }),
    });
    mockPrisma.user.count.mockResolvedValue(1);
    mockPrisma.user.findMany.mockResolvedValueOnce([
      buildUser({ contactEmail: 'visible@example.com' }),
    ]);

    const route = await import('$app/api/users/route');
    const response = await route.GET(
      new Request('http://localhost/api/users?search=visible') as never,
    );
    const body = await response.json();
    const listQuery = mockPrisma.user.findMany.mock.calls[0]?.[0];

    expect(response.status).toBe(200);
    expect(body.data.users[0].contactEmail).toBe('visible@example.com');
    expect(listQuery.where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contactEmail: expect.objectContaining({ contains: 'visible' }),
        }),
      ]),
    );
  });

  it('returns personal dashboard data without querying managed users', async () => {
    const route = await import('$app/api/dashboard/route');
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.users).toEqual({
      active: 1,
      inactive: 0,
      recentLogins: 0,
      total: 1,
    });
    expect(body.data.recentActivity).toEqual([]);
    expect(mockPrisma.user.groupBy).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it('keeps user stats but hides recent activity without audit permission', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        passwordHash: undefined,
        permissions: { [PERMISSIONS.USERS.VIEW]: true },
      }),
    });
    mockPrisma.user.groupBy.mockResolvedValueOnce([
      { _count: { _all: 3 }, isActive: true },
      { _count: { _all: 1 }, isActive: false },
    ]);
    mockPrisma.user.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(3);
    const route = await import('$app/api/dashboard/route');
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.users).toEqual({
      active: 3,
      inactive: 1,
      recentLogins: 3,
      total: 4,
    });
    expect(body.data.security).toEqual({
      lockedUsers: 1,
      pendingPassword: 2,
    });
    expect(body.data.recentActivity).toEqual([]);
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.user.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['isActive'],
        where: { deletedAt: null },
      }),
    );
    expect(mockPrisma.auditLog.findMany).not.toHaveBeenCalled();
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

  it('loads the system activity journal with cursor pagination and masked ip', async () => {
    mockPrisma.auditLog.findMany.mockReset();
    mockPrisma.user.findMany.mockReset();
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([
      {
        action: 'LOGIN_SUCCESS',
        category: 'AUTH',
        createdAt: new Date('2026-03-03T10:00:00.000Z'),
        description: 'Connexion reussie',
        id: 'log-3',
        ipAddress: '1.2.3.4',
        metadata: SYSTEM_SENSITIVE_AUDIT_METADATA,
        targetUserId: 'target-1',
        userId: 'actor-1',
      },
      {
        action: 'USER_UPDATE',
        category: 'USER',
        createdAt: new Date('2026-03-03T09:00:00.000Z'),
        description: 'Utilisateur modifie',
        id: 'log-2',
        ipAddress: '5.6.7.8',
        metadata: { targetName: 'Nom archive' },
        targetUserId: 'deleted-target',
        userId: null,
      },
      {
        action: 'LOGOUT',
        category: 'AUTH',
        createdAt: new Date('2026-03-03T08:00:00.000Z'),
        description: 'Deconnexion',
        id: 'log-1',
        ipAddress: null,
        metadata: null,
        targetUserId: null,
        userId: 'actor-1',
      },
    ]);
    mockPrisma.user.findMany.mockResolvedValueOnce([
      {
        firstName: 'Alice',
        id: 'actor-1',
        lastName: 'Admin',
        loginName: 'alice.admin',
      },
      {
        firstName: 'Bob',
        id: 'target-1',
        lastName: 'User',
        loginName: 'bob.user',
      },
    ]);

    const route = await import('$app/api/systeme/journal-activite/route');
    const response = await route.GET(
      new Request(
        'http://localhost/api/systeme/journal-activite?limit=2&period=7d&category=AUTH&action=LOGIN_SUCCESS&cursor=log-4',
      ) as never,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body.success).toBe(true);
    expect(body.data.logs).toHaveLength(2);
    expect(body.data.nextCursor).toBe('log-2');
    expect(body.data.logs[0]).toMatchObject({
      actorName: 'Alice Admin',
      ipAddress: null,
      metadata: SYSTEM_SAFE_AUDIT_METADATA,
      targetName: 'Bob User',
    });
    expect(body.data.logs[0].metadata).not.toHaveProperty('before');
    expect(body.data.logs[0].metadata).not.toHaveProperty('after');
    expect(body.data.logs[0].metadata).not.toHaveProperty('changes');
    expect(body.data.logs[1]).toMatchObject({
      actorName: null,
      ipAddress: null,
      targetName: 'Nom archive',
    });
    expect(mockRequirePermission).toHaveBeenCalledWith(
      expect.any(Object),
      PERMISSIONS.SYSTEM.AUDIT,
    );
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: 'log-4' },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 1,
        take: 3,
        where: {
          AND: expect.arrayContaining([
            { action: 'LOGIN_SUCCESS' },
            { category: 'AUTH' },
            expect.objectContaining({
              createdAt: expect.objectContaining({ gte: expect.any(Date) }),
            }),
          ]),
        },
      }),
    );
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: {
            in: expect.arrayContaining(['actor-1', 'target-1']),
          },
        },
      }),
    );
  });

  it('rejects global journal access with only user activity permission', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        permissions: {
          [PERMISSIONS.SYSTEM.AUDIT]: false,
          [PERMISSIONS.USERS.VIEW_ACTIVITY]: true,
        },
      }),
    });
    mockRequirePermission.mockReturnValueOnce({
      response: Response.json(
        {
          error: { code: ErrorCode.FORBIDDEN, message: 'Accès refusé' },
          success: false,
        },
        { status: 403 },
      ),
      success: false,
    });

    const route = await import('$app/api/systeme/journal-activite/route');
    const response = await route.GET(
      new Request('http://localhost/api/systeme/journal-activite') as never,
    );

    expect(response.status).toBe(403);
    expect(mockRequirePermission).toHaveBeenCalledWith(
      expect.objectContaining({
        permissions: expect.objectContaining({
          [PERMISSIONS.USERS.VIEW_ACTIVITY]: true,
        }),
      }),
      PERMISSIONS.SYSTEM.AUDIT,
    );
    expect(mockPrisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it('separates connection logs from default system activity filters', async () => {
    mockPrisma.auditLog.findMany.mockReset();
    mockPrisma.user.findMany.mockReset();
    mockPrisma.auditLog.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockPrisma.user.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const route = await import('$app/api/systeme/journal-activite/route');

    await route.GET(
      new Request('http://localhost/api/systeme/journal-activite') as never,
    );

    await route.GET(
      new Request(
        'http://localhost/api/systeme/journal-activite?logType=connections&action=USER_UPDATE&category=USER&poleKey=system&pageKey=authentication',
      ) as never,
    );

    await route.GET(
      new Request(
        'http://localhost/api/systeme/journal-activite?logType=connections&connectionAction=LOGIN_FAILED',
      ) as never,
    );

    expect(mockPrisma.auditLog.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          AND: expect.arrayContaining([
            {
              action: {
                notIn: [
                  'ACCOUNT_LOCKED',
                  'LOGIN_FAILED',
                  'LOGIN_SUCCESS',
                  'LOGOUT',
                ],
              },
            },
          ]),
        },
      }),
    );
    expect(mockPrisma.auditLog.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          AND: expect.arrayContaining([
            {
              action: {
                in: [
                  'ACCOUNT_LOCKED',
                  'LOGIN_FAILED',
                  'LOGIN_SUCCESS',
                  'LOGOUT',
                ],
              },
            },
          ]),
        },
      }),
    );
    const connectionsCall = mockPrisma.auditLog.findMany.mock.calls[1]?.[0] as
      { where?: { AND?: unknown[] } } | undefined;
    const connectionsFilters = connectionsCall?.where?.AND ?? [];

    expect(connectionsFilters).not.toEqual(
      expect.arrayContaining([{ action: 'USER_UPDATE' }]),
    );
    expect(connectionsFilters).not.toEqual(
      expect.arrayContaining([{ category: 'USER' }]),
    );
    expect(connectionsFilters).not.toEqual(
      expect.arrayContaining([{ poleKey: 'system' }]),
    );
    expect(connectionsFilters).not.toEqual(
      expect.arrayContaining([{ pageKey: 'authentication' }]),
    );
    expect(mockPrisma.auditLog.findMany).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        where: {
          AND: expect.arrayContaining([{ action: 'LOGIN_FAILED' }]),
        },
      }),
    );
  });

  it('keeps system activity journal ip visible for protected viewers', async () => {
    mockPrisma.auditLog.findMany.mockReset();
    mockPrisma.user.findMany.mockReset();
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'protected-1',
        isProtected: true,
        passwordHash: undefined,
      }),
    });
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([
      {
        action: 'LOGIN_FAILED',
        category: 'AUTH',
        createdAt: new Date('2026-03-03T10:00:00.000Z'),
        description: 'Connexion echouee',
        id: 'log-1',
        ipAddress: '1.2.3.4',
        metadata: SYSTEM_SENSITIVE_AUDIT_METADATA,
        targetUserId: null,
        userId: null,
      },
    ]);
    mockPrisma.user.findMany.mockResolvedValueOnce([]);

    const route = await import('$app/api/systeme/journal-activite/route');
    const response = await route.GET(
      new Request('http://localhost/api/systeme/journal-activite') as never,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.logs[0].ipAddress).toBe('1.2.3.4');
    expect(body.data.logs[0].metadata).toEqual(SYSTEM_SENSITIVE_AUDIT_METADATA);
  });
});
