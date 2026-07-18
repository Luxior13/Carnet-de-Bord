import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PERMISSIONS } from '$constants/permissions.constants';
import { ErrorCode } from '$types/api.types';

const mockRequireAuth = vi.fn();
const mockRequirePermission = vi.fn();
const mockCreateAuditLog = vi.fn();
const mockCreateAuditLogWithHeaders = vi.fn();
const mockGetAuditRequestContext = vi.fn();
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
    updateMany: vi.fn(),
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
  createAuditLogWithHeaders: mockCreateAuditLogWithHeaders,
  createUser: mockCreateUser,
  generateTemporaryPassword: mockGenerateTemporaryPassword,
  getAuditRequestContext: mockGetAuditRequestContext,
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
  mfaEnabledAt: null,
  mustChangePassword: false,
  passwordChangedAt: null,
  passwordHash: 'hash',
  permissions: {},
  role: 'USER',
  securityVersion: 3,
  updatedAt: new Date('2026-03-01T00:00:00.000Z'),
  ...overrides,
});

const USER_REVISION = '2026-03-01T00:00:00.000Z';
const SYSTEM_SAFE_AUDIT_METADATA = {
  pageKey: 'users',
  pageLabel: 'Utilisateurs',
  poleKey: 'system',
  poleLabel: 'Système',
  tabKey: 'profile',
  tabLabel: 'Profil',
};
const SYSTEM_SENSITIVE_AUDIT_METADATA = {
  ...SYSTEM_SAFE_AUDIT_METADATA,
  after: {
    contactEmail: 'new@example.com',
    firstName: 'Jeanne',
    isActive: true,
  },
  before: {
    contactEmail: 'old@example.com',
    firstName: 'Jean',
    isActive: false,
  },
  changes: ['contactEmail', 'firstName', 'isActive'],
  requestId: 'private-request-id',
};

const stringifyRequestBody = (body: Record<string, unknown>): string =>
  JSON.stringify({
    ...('permissions' in body ? { expectedUpdatedAt: USER_REVISION } : {}),
    ...body,
  });

const buildRecentSensitiveSession = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  criticalMfaVerifiedAt: new Date(),
  mfaVerifiedAt: new Date(),
  passwordReauthenticatedAt: new Date(),
  ...overrides,
});

const denyPermission = (deniedPermissionKey: string): void => {
  mockRequirePermission.mockImplementation((_user, permissionKey) =>
    permissionKey === deniedPermissionKey
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
};

describe('users access hardening', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockPrisma.$transaction.mockImplementation(
      async (callback: (client: typeof mockPrisma) => unknown) =>
        callback(mockPrisma),
    );

    mockRequireAuth.mockResolvedValue({
      session: buildRecentSensitiveSession(),
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        passwordHash: undefined,
      }),
    });
    mockRequirePermission.mockReturnValue({ success: true });
    mockCreateAuditLog.mockResolvedValue(undefined);
    mockGetAuditRequestContext.mockResolvedValue({
      ipAddress: '203.0.113.5',
      requestId: 'request-test',
      userAgent: 'TestAgent',
    });
    mockPrisma.loginNameReservation.findUnique.mockResolvedValue(null);
    mockPrisma.user.groupBy.mockResolvedValue([]);
    mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });
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
      session: buildRecentSensitiveSession(),
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

  it('requires a recent MFA proof before a sensitive account patch', async () => {
    const actor = buildUser({
      deletedAt: undefined,
      id: 'admin-1',
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
      buildUser({ id: 'target-1' }),
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
    expect(body.error.code).toBe(ErrorCode.REAUTHENTICATION_REQUIRED);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockPrisma.session.deleteMany).not.toHaveBeenCalled();
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
      session: buildRecentSensitiveSession(),
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
        permissions: { [PERMISSIONS.USERS.ARCHIVE]: true },
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
    expect(body.data.user).toMatchObject({
      failedLoginAttempts: 0,
      lockedUntil: null,
      mfaEnabledAt: null,
      mustChangePassword: false,
      passwordChangedAt: null,
      securityDetailsVisible: false,
    });
  });

  it('returns account security details only with view-security permission', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        passwordHash: undefined,
        permissions: {
          [PERMISSIONS.USERS.VIEW]: true,
          [PERMISSIONS.USERS.VIEW_SECURITY]: true,
        },
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(
      buildUser({
        failedLoginAttempts: 4,
        id: 'target-1',
        lockedUntil: new Date('2026-03-03T00:00:00.000Z'),
        mfaEnabledAt: new Date('2026-03-02T00:00:00.000Z'),
        mustChangePassword: true,
        passwordChangedAt: new Date('2026-03-01T12:00:00.000Z'),
      }),
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.GET(
      new Request('http://localhost/api/users/target-1') as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.user).toMatchObject({
      failedLoginAttempts: 4,
      lockedUntil: '2026-03-03T00:00:00.000Z',
      mfaEnabledAt: '2026-03-02T00:00:00.000Z',
      mustChangePassword: true,
      passwordChangedAt: '2026-03-01T12:00:00.000Z',
      securityDetailsVisible: true,
    });
  });

  it('exposes critical-access readiness without exposing MFA details', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        passwordHash: undefined,
        permissions: {
          [PERMISSIONS.USERS.GRANT_ACCESS]: true,
          [PERMISSIONS.USERS.VIEW]: true,
          [PERMISSIONS.USERS.VIEW_ACCESS]: true,
        },
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(
      buildUser({
        id: 'target-1',
        mfaEnabledAt: new Date('2026-03-02T00:00:00.000Z'),
        totpCredential: { userId: 'target-1' },
      }),
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.GET(
      new Request('http://localhost/api/users/target-1') as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.user.criticalAccessReady).toBe(true);
    expect(body.data.user.mfaEnabledAt).toBeNull();
    expect(body.data.user.securityDetailsVisible).toBe(false);
  });

  it('hides critical-access readiness without effective grant access', async () => {
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
    mockPrisma.user.findUnique.mockResolvedValueOnce(
      buildUser({
        id: 'target-1',
        mfaEnabledAt: new Date('2026-03-02T00:00:00.000Z'),
        totpCredential: { userId: 'target-1' },
      }),
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.GET(
      new Request('http://localhost/api/users/target-1') as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.user).not.toHaveProperty('criticalAccessReady');
  });

  it('keeps the protected account visible but redacts its identity for another user', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'admin-1',
        passwordHash: undefined,
        permissions: {
          [PERMISSIONS.USERS.VIEW]: true,
          [PERMISSIONS.USERS.VIEW_ACCESS]: true,
          [PERMISSIONS.USERS.VIEW_CONTACT]: true,
          [PERMISSIONS.USERS.VIEW_SECURITY]: true,
        },
        role: 'ADMIN',
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(
      buildUser({
        contactEmail: 'root-secret@example.com',
        failedLoginAttempts: 2,
        firstName: 'Identite',
        id: 'root-1',
        isProtected: true,
        lastLoginAt: new Date('2026-03-03T00:00:00.000Z'),
        lastName: 'Secrete',
        loginName: 'root.secret',
        mfaEnabledAt: new Date('2026-03-02T00:00:00.000Z'),
        permissions: { [PERMISSIONS.SETTINGS.VIEW]: true },
        role: 'ADMIN',
        totpCredential: { userId: 'root-1' },
      }),
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.GET(
      new Request('http://localhost/api/users/root-1') as never,
      { params: Promise.resolve({ id: 'root-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.user).toMatchObject({
      contactEmail: null,
      contactEmailVerifiedAt: null,
      failedLoginAttempts: 0,
      firstName: 'Compte',
      identityDetailsVisible: false,
      lastLoginAt: null,
      lastName: 'racine',
      lockedUntil: null,
      loginName: '••••••••',
      mfaEnabledAt: null,
      mustChangePassword: false,
      passwordChangedAt: null,
      permissions: null,
      securityDetailsVisible: false,
    });
    expect(body.data.user).not.toHaveProperty('criticalAccessReady');
    expect(JSON.stringify(body)).not.toContain('root.secret');
    expect(JSON.stringify(body)).not.toContain('root-secret@example.com');
    expect(JSON.stringify(body)).not.toContain('Identite');
  });

  it('returns the protected identity to its owner', async () => {
    const rootUser = buildUser({
      contactEmail: 'root@example.com',
      deletedAt: undefined,
      firstName: 'Root',
      id: 'root-1',
      isProtected: true,
      lastName: 'Owner',
      loginName: 'root.owner',
      passwordHash: undefined,
      role: 'ADMIN',
    });
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: rootUser,
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(rootUser);

    const route = await import('$app/api/users/[id]/route');
    const response = await route.GET(
      new Request('http://localhost/api/users/root-1') as never,
      { params: Promise.resolve({ id: 'root-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.user).toMatchObject({
      contactEmail: 'root@example.com',
      firstName: 'Root',
      identityDetailsVisible: true,
      lastName: 'Owner',
      loginName: 'root.owner',
    });
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
      [PERMISSIONS.USERS.ARCHIVE]: true,
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
      [PERMISSIONS.USERS.ARCHIVE]: true,
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
          [PERMISSIONS.SETTINGS.VIEW]: true,
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

  it('allows effective access grants with users:grant_access', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: buildRecentSensitiveSession(),
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        passwordHash: undefined,
        permissions: {
          [PERMISSIONS.USERS.GRANT_ACCESS]: true,
          [PERMISSIONS.USERS.VIEW]: true,
          [PERMISSIONS.USERS.VIEW_ACCESS]: true,
        },
      }),
    });
    const existingUser = buildUser({ id: 'target-1', permissions: {} });
    const nextPermissions = {
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
      PERMISSIONS.USERS.GRANT_ACCESS,
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
        metadata: expect.objectContaining({
          effectivelyGrantedPermissionKeys: expect.arrayContaining([
            PERMISSIONS.USERS.VIEW,
          ]),
          effectivelyRevokedPermissionKeys: [],
        }),
        userId: 'viewer-1',
      }),
      { client: mockPrisma, required: true },
    );
  });

  it('allows an ordinary access grant without password or critical MFA proof', async () => {
    const existingUser = buildUser({ id: 'target-1', permissions: {} });
    const nextPermissions = { [PERMISSIONS.USERS.VIEW]: true };
    mockRequireAuth.mockResolvedValueOnce({
      session: buildRecentSensitiveSession({
        criticalMfaVerifiedAt: null,
        passwordReauthenticatedAt: null,
      }),
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        passwordHash: undefined,
        permissions: {
          [PERMISSIONS.USERS.GRANT_ACCESS]: true,
          [PERMISSIONS.USERS.VIEW]: true,
          [PERMISSIONS.USERS.VIEW_ACCESS]: true,
        },
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);
    mockPrisma.user.update.mockResolvedValueOnce({
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
    expect(response.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ permissions: nextPermissions }),
      }),
    );
  });

  it('rejects an access grant when users:grant_access is denied', async () => {
    denyPermission(PERMISSIONS.USERS.GRANT_ACCESS);

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          permissions: { [PERMISSIONS.USERS.VIEW]: true },
          permissionScope: 'access',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(403);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('allows effective access revocations with users:revoke_access only', async () => {
    const actor = buildUser({
      deletedAt: undefined,
      id: 'revoker-1',
      passwordHash: undefined,
      permissions: {
        [PERMISSIONS.USERS.REVOKE_ACCESS]: true,
        [PERMISSIONS.USERS.VIEW]: true,
        [PERMISSIONS.USERS.VIEW_ACCESS]: true,
      },
    });
    const existingUser = buildUser({
      id: 'target-1',
      permissions: { [PERMISSIONS.USERS.VIEW]: true },
    });

    mockRequireAuth.mockResolvedValueOnce({
      session: buildRecentSensitiveSession(),
      success: true,
      user: actor,
    });
    mockPrisma.user.findUnique.mockResolvedValue(existingUser);
    mockPrisma.user.update.mockResolvedValue({
      ...existingUser,
      permissions: null,
    });

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          permissions: {},
          permissionScope: 'access',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(200);
    expect(mockRequirePermission.mock.calls.map(([, key]) => key)).toEqual([
      PERMISSIONS.USERS.REVOKE_ACCESS,
    ]);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ permissions: null }),
      }),
    );
    expect(mockCreateAuditLogWithHeaders).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          effectivelyGrantedPermissionKeys: [],
          effectivelyRevokedPermissionKeys: expect.arrayContaining([
            PERMISSIONS.USERS.VIEW,
          ]),
        }),
      }),
      { client: mockPrisma, required: true },
    );
  });

  it('rejects an access revocation when users:revoke_access is denied', async () => {
    const actor = buildUser({
      deletedAt: undefined,
      id: 'grantor-1',
      passwordHash: undefined,
      permissions: {
        [PERMISSIONS.USERS.GRANT_ACCESS]: true,
        [PERMISSIONS.USERS.VIEW]: true,
        [PERMISSIONS.USERS.VIEW_ACCESS]: true,
      },
    });
    mockRequireAuth.mockResolvedValueOnce({
      session: buildRecentSensitiveSession(),
      success: true,
      user: actor,
    });
    mockPrisma.user.findUnique.mockResolvedValue(
      buildUser({
        id: 'target-1',
        permissions: { [PERMISSIONS.USERS.VIEW]: true },
      }),
    );
    denyPermission(PERMISSIONS.USERS.REVOKE_ACCESS);

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          permissions: {},
          permissionScope: 'access',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(403);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('requires users:delegate_access to grant permission-management rights', async () => {
    const actor = buildUser({
      deletedAt: undefined,
      id: 'grantor-1',
      passwordHash: undefined,
      permissions: {
        [PERMISSIONS.USERS.GRANT_ACCESS]: true,
        [PERMISSIONS.USERS.VIEW]: true,
        [PERMISSIONS.USERS.VIEW_ACCESS]: true,
      },
    });
    const nextPermissions = {
      [PERMISSIONS.USERS.GRANT_ACCESS]: true,
      [PERMISSIONS.USERS.VIEW]: true,
      [PERMISSIONS.USERS.VIEW_ACCESS]: true,
    };
    mockRequireAuth.mockResolvedValueOnce({
      session: buildRecentSensitiveSession(),
      success: true,
      user: actor,
    });
    mockPrisma.user.findUnique.mockResolvedValue(
      buildUser({
        id: 'target-1',
        mfaEnabledAt: new Date(),
        totpCredential: { userId: 'target-1' },
      }),
    );
    denyPermission(PERMISSIONS.USERS.DELEGATE_ACCESS);

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

    expect(response.status).toBe(403);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('lets a delegated manager grant grant/revoke rights without propagating delegation', async () => {
    const actor = buildUser({
      deletedAt: undefined,
      id: 'admin-1',
      passwordHash: undefined,
      role: 'ADMIN',
    });
    const existingUser = buildUser({
      id: 'target-1',
      mfaEnabledAt: new Date(),
      totpCredential: { userId: 'target-1' },
    });
    const nextPermissions = {
      [PERMISSIONS.USERS.GRANT_ACCESS]: true,
      [PERMISSIONS.USERS.REVOKE_ACCESS]: true,
      [PERMISSIONS.USERS.VIEW]: true,
      [PERMISSIONS.USERS.VIEW_ACCESS]: true,
    };
    mockRequireAuth.mockResolvedValueOnce({
      session: buildRecentSensitiveSession(),
      success: true,
      user: actor,
    });
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

    expect(response.status).toBe(200);
    expect(mockRequirePermission.mock.calls.map(([, key]) => key)).toEqual([
      PERMISSIONS.USERS.DELEGATE_ACCESS,
      PERMISSIONS.USERS.GRANT_ACCESS,
    ]);
    expect(nextPermissions).not.toHaveProperty(
      PERMISSIONS.USERS.DELEGATE_ACCESS,
    );
  });

  it('reserves changes to users:delegate_access itself to the root account', async () => {
    const actor = buildUser({
      deletedAt: undefined,
      id: 'admin-1',
      passwordHash: undefined,
      role: 'ADMIN',
    });
    const nextPermissions = {
      [PERMISSIONS.USERS.DELEGATE_ACCESS]: true,
      [PERMISSIONS.USERS.GRANT_ACCESS]: true,
      [PERMISSIONS.USERS.REVOKE_ACCESS]: true,
      [PERMISSIONS.USERS.VIEW]: true,
      [PERMISSIONS.USERS.VIEW_ACCESS]: true,
    };
    mockRequireAuth.mockResolvedValueOnce({
      session: buildRecentSensitiveSession(),
      success: true,
      user: actor,
    });
    mockPrisma.user.findUnique.mockResolvedValue(
      buildUser({
        id: 'target-1',
        mfaEnabledAt: new Date(),
        totpCredential: { userId: 'target-1' },
      }),
    );

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

    expect(response.status).toBe(403);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('lets the root account explicitly grant users:delegate_access', async () => {
    const actor = buildUser({
      deletedAt: undefined,
      id: 'root-1',
      isProtected: true,
      passwordHash: undefined,
      role: 'ADMIN',
    });
    const existingUser = buildUser({
      id: 'target-1',
      mfaEnabledAt: new Date(),
      totpCredential: { userId: 'target-1' },
    });
    const nextPermissions = {
      [PERMISSIONS.USERS.DELEGATE_ACCESS]: true,
      [PERMISSIONS.USERS.GRANT_ACCESS]: true,
      [PERMISSIONS.USERS.REVOKE_ACCESS]: true,
      [PERMISSIONS.USERS.VIEW]: true,
      [PERMISSIONS.USERS.VIEW_ACCESS]: true,
    };
    mockRequireAuth.mockResolvedValueOnce({
      session: buildRecentSensitiveSession({ criticalMfaVerifiedAt: null }),
      success: true,
      user: actor,
    });
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

    expect(response.status).toBe(200);
    expect(mockRequirePermission.mock.calls.map(([, key]) => key)).toEqual([
      PERMISSIONS.USERS.DELEGATE_ACCESS,
      PERMISSIONS.USERS.GRANT_ACCESS,
    ]);
  });

  it('audits personal account permission updates on the personal account tab', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: buildRecentSensitiveSession({
        criticalMfaVerifiedAt: null,
        passwordReauthenticatedAt: null,
      }),
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        passwordHash: undefined,
        permissions: {
          [PERMISSIONS.USERS.UPDATE_ACCOUNT_POLICY]: true,
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
      PERMISSIONS.USERS.UPDATE_ACCOUNT_POLICY,
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

  it('rejects a mixed account payload containing baseline permissions', async () => {
    const requestedPermissions = {
      [PERMISSIONS.ACCOUNT.CHANGE_PASSWORD]: false,
      [PERMISSIONS.ACCOUNT.MANAGE_SESSIONS]: false,
      [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false,
      [PERMISSIONS.ACCOUNT.VIEW_PROFILE]: false,
      [PERMISSIONS.ACCOUNT.VIEW_SECURITY]: false,
    };

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

    expect(response.status).toBe(400);
    expect(body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects an essential-only personal permission payload', async () => {
    const requestedPermissions = {
      [PERMISSIONS.ACCOUNT.CHANGE_PASSWORD]: false,
      [PERMISSIONS.ACCOUNT.MANAGE_SESSIONS]: false,
      [PERMISSIONS.ACCOUNT.VIEW_PROFILE]: false,
      [PERMISSIONS.ACCOUNT.VIEW_SECURITY]: false,
    };

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

    expect(response.status).toBe(400);
    expect(body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
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
      session: buildRecentSensitiveSession({
        criticalMfaVerifiedAt: null,
        passwordReauthenticatedAt: null,
      }),
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        passwordHash: undefined,
        permissions: {
          [PERMISSIONS.USERS.UPDATE_ACCOUNT_POLICY]: true,
          [PERMISSIONS.USERS.VIEW]: true,
          [PERMISSIONS.USERS.VIEW_ACCOUNT_POLICY]: true,
        },
      }),
    });
    const existingUser = buildUser({
      id: 'target-1',
      permissions: { [PERMISSIONS.USERS.VIEW]: true },
    });
    const mergedPermissions = {
      [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false,
      [PERMISSIONS.USERS.VIEW]: true,
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
    mockRequireAuth.mockResolvedValueOnce({
      session: buildRecentSensitiveSession({ criticalMfaVerifiedAt: null }),
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        passwordHash: undefined,
        permissions: {
          [PERMISSIONS.USERS.GRANT_ACCESS]: true,
          [PERMISSIONS.USERS.VIEW]: true,
          [PERMISSIONS.USERS.VIEW_ACCESS]: true,
        },
      }),
    });
    const existingUser = buildUser({
      id: 'target-1',
      permissions: {
        [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false,
        [PERMISSIONS.USERS.VIEW]: false,
      },
    });
    const mergedPermissions = {
      [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false,
      [PERMISSIONS.USERS.VIEW]: true,
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
          permissions: { [PERMISSIONS.USERS.VIEW]: true },
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

  it('accepts a legacy access alias in a scoped payload and writes canonically', async () => {
    const existingUser = buildUser({ id: 'target-1', permissions: null });
    mockPrisma.user.findUnique.mockResolvedValue(existingUser);

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          permissions: { 'users:delete': false },
          permissionScope: 'access',
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
  });

  it('rejects role-bound API keys as individual overrides', async () => {
    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          permissions: { [PERMISSIONS.SETTINGS.UPDATE]: true },
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(body.error.details.permissions).toEqual([
      `Permission non attribuable: ${PERMISSIONS.SETTINGS.UPDATE}`,
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
      permissionKey === PERMISSIONS.USERS.UPDATE_ACCOUNT_POLICY
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
      PERMISSIONS.USERS.UPDATE_ACCOUNT_POLICY,
    );
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('redacts permission overrides from no-op PATCH responses', async () => {
    const existingUser = buildUser({
      id: 'target-1',
      permissions: { [PERMISSIONS.USERS.ARCHIVE]: true },
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
      session: buildRecentSensitiveSession(),
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
      session: buildRecentSensitiveSession(),
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
      session: buildRecentSensitiveSession(),
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

  it('requires target MFA enrollment before promotion to administrator', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'root-1',
        isProtected: true,
        passwordHash: undefined,
        role: 'ADMIN',
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(
      buildUser({ id: 'target-1', mfaEnabledAt: null, role: 'USER' }),
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          expectedUpdatedAt: USER_REVISION,
          role: 'ADMIN',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(409);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects promotion when only the MFA timestamp exists without a credential', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: buildRecentSensitiveSession(),
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'root-1',
        isProtected: true,
        passwordHash: undefined,
        role: 'ADMIN',
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(
      buildUser({
        id: 'target-1',
        mfaEnabledAt: new Date('2026-03-02T00:00:00.000Z'),
        role: 'USER',
        totpCredential: null,
      }),
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          expectedUpdatedAt: USER_REVISION,
          role: 'ADMIN',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(409);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('requires password unlock before changing a user role', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: buildRecentSensitiveSession({
        criticalMfaVerifiedAt: null,
        passwordReauthenticatedAt: null,
      }),
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'root-1',
        isProtected: true,
        passwordHash: undefined,
        role: 'ADMIN',
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(
      buildUser({
        id: 'target-1',
        mfaEnabledAt: new Date('2026-03-02T00:00:00.000Z'),
        role: 'USER',
        totpCredential: { userId: 'target-1' },
      }),
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          expectedUpdatedAt: USER_REVISION,
          role: 'ADMIN',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe(ErrorCode.PASSWORD_REAUTHENTICATION_REQUIRED);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('allows the root to promote a user after MFA enrollment', async () => {
    const existingUser = buildUser({
      id: 'target-1',
      mfaEnabledAt: new Date('2026-03-02T00:00:00.000Z'),
      role: 'USER',
      totpCredential: { userId: 'target-1' },
    });
    mockRequireAuth.mockResolvedValueOnce({
      session: buildRecentSensitiveSession({ criticalMfaVerifiedAt: null }),
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'root-1',
        isProtected: true,
        passwordHash: undefined,
        role: 'ADMIN',
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);
    mockPrisma.user.update.mockResolvedValueOnce({
      ...existingUser,
      role: 'ADMIN',
    });

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          expectedUpdatedAt: USER_REVISION,
          role: 'ADMIN',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'ADMIN',
          securityVersion: { increment: 1 },
        }),
      }),
    );
  });

  it('audits effective revocations when the root demotes an administrator', async () => {
    const existingUser = buildUser({
      id: 'target-1',
      role: 'ADMIN',
    });
    mockRequireAuth.mockResolvedValueOnce({
      session: buildRecentSensitiveSession({ criticalMfaVerifiedAt: null }),
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'root-1',
        isProtected: true,
        passwordHash: undefined,
        role: 'ADMIN',
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);
    mockPrisma.user.update.mockResolvedValueOnce({
      ...existingUser,
      role: 'USER',
    });

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          expectedUpdatedAt: USER_REVISION,
          role: 'USER',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(200);
    expect(mockCreateAuditLogWithHeaders).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PERMISSION_UPDATE',
        category: 'PERMISSION',
        metadata: expect.objectContaining({
          effectivelyGrantedPermissionKeys: [],
          effectivelyRevokedPermissionKeys: expect.arrayContaining([
            PERMISSIONS.USERS.VIEW,
            PERMISSIONS.USERS.GRANT_ACCESS,
          ]),
        }),
        targetUserId: 'target-1',
        userId: 'root-1',
      }),
      { client: mockPrisma, required: true },
    );
  });

  it('requires complete MFA before granting a critical delegated permission', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: buildRecentSensitiveSession(),
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'root-1',
        isProtected: true,
        passwordHash: undefined,
        role: 'ADMIN',
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(
      buildUser({ id: 'target-1', permissions: {}, role: 'USER' }),
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          permissions: {
            [PERMISSIONS.USERS.ARCHIVE]: true,
            [PERMISSIONS.USERS.VIEW]: true,
            [PERMISSIONS.USERS.VIEW_SECURITY]: true,
          },
          permissionScope: 'access',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(409);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockPrisma.session.deleteMany).not.toHaveBeenCalled();
  });

  it('allows a critical delegated permission after complete MFA enrollment', async () => {
    const existingUser = buildUser({
      id: 'target-1',
      mfaEnabledAt: new Date('2026-03-02T00:00:00.000Z'),
      permissions: {},
      role: 'USER',
      totpCredential: { userId: 'target-1' },
    });
    const permissions = {
      [PERMISSIONS.USERS.ARCHIVE]: true,
      [PERMISSIONS.USERS.VIEW]: true,
      [PERMISSIONS.USERS.VIEW_SECURITY]: true,
    };
    mockRequireAuth.mockResolvedValueOnce({
      session: buildRecentSensitiveSession({ criticalMfaVerifiedAt: null }),
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'root-1',
        isProtected: true,
        passwordHash: undefined,
        role: 'ADMIN',
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);
    mockPrisma.user.update.mockResolvedValueOnce({
      ...existingUser,
      permissions,
    });

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({ permissions, permissionScope: 'access' }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          permissions,
          securityVersion: { increment: 1 },
        }),
      }),
    );
    expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'target-1' },
    });
  });

  it('requires only password unlock for a critical permission change', async () => {
    const existingUser = buildUser({
      id: 'target-1',
      mfaEnabledAt: new Date('2026-03-02T00:00:00.000Z'),
      permissions: {},
      role: 'USER',
      totpCredential: { userId: 'target-1' },
    });
    const permissions = {
      [PERMISSIONS.USERS.ARCHIVE]: true,
      [PERMISSIONS.USERS.VIEW]: true,
      [PERMISSIONS.USERS.VIEW_SECURITY]: true,
    };
    mockRequireAuth.mockResolvedValueOnce({
      session: buildRecentSensitiveSession({
        criticalMfaVerifiedAt: null,
        passwordReauthenticatedAt: null,
      }),
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'root-1',
        isProtected: true,
        passwordHash: undefined,
        role: 'ADMIN',
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({ permissions, permissionScope: 'access' }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe(ErrorCode.PASSWORD_REAUTHENTICATION_REQUIRED);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('allows reducing critical access after the target loses complete MFA', async () => {
    const existingPermissions = {
      [PERMISSIONS.USERS.ARCHIVE]: true,
      [PERMISSIONS.USERS.EXPORT_ACTIVITY]: true,
      [PERMISSIONS.USERS.VIEW]: true,
      [PERMISSIONS.USERS.VIEW_ACTIVITY]: true,
      [PERMISSIONS.USERS.VIEW_SECURITY]: true,
    };
    const reducedPermissions = {
      [PERMISSIONS.USERS.EXPORT_ACTIVITY]: true,
      [PERMISSIONS.USERS.VIEW]: true,
      [PERMISSIONS.USERS.VIEW_ACTIVITY]: true,
      [PERMISSIONS.USERS.VIEW_SECURITY]: true,
    };
    const existingUser = buildUser({
      id: 'target-1',
      mfaEnabledAt: null,
      permissions: existingPermissions,
      role: 'USER',
      totpCredential: null,
    });
    mockRequireAuth.mockResolvedValueOnce({
      session: buildRecentSensitiveSession({ criticalMfaVerifiedAt: null }),
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'root-1',
        isProtected: true,
        passwordHash: undefined,
        role: 'ADMIN',
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);
    mockPrisma.user.update.mockResolvedValueOnce({
      ...existingUser,
      permissions: reducedPermissions,
    });

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/target-1', {
        body: stringifyRequestBody({
          permissions: reducedPermissions,
          permissionScope: 'access',
        }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          permissions: reducedPermissions,
          securityVersion: { increment: 1 },
        }),
      }),
    );
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
      [PERMISSIONS.USERS.ARCHIVE]: true,
      [PERMISSIONS.USERS.GRANT_ACCESS]: true,
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
          [PERMISSIONS.USERS.GRANT_ACCESS]: true,
          [PERMISSIONS.USERS.VIEW]: true,
          [PERMISSIONS.USERS.VIEW_ACCESS]: true,
        },
      }),
    });
    const existingPermissions = {
      [PERMISSIONS.USERS.VIEW]: true,
      [PERMISSIONS.USERS.VIEW_CONTACT]: true,
    };
    const nextPermissions = {
      [PERMISSIONS.USERS.VIEW_CONTACT]: true,
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
            [PERMISSIONS.USERS.CREATE]: true,
            [PERMISSIONS.USERS.VIEW]: true,
          },
          permissionScope: 'access',
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
            [PERMISSIONS.USERS.GRANT_ACCESS]: true,
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

  it('requires a recent MFA proof before the root creates an administrator', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'root-1',
        isProtected: true,
        passwordHash: undefined,
        role: 'ADMIN',
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);

    const route = await import('$app/api/users/route');
    const response = await route.POST(
      new Request('http://localhost/api/users', {
        body: stringifyRequestBody({
          contactEmail: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'Secondaire',
          loginName: 'admin.secondaire',
          role: 'ADMIN',
        }),
        method: 'POST',
      }) as never,
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe(ErrorCode.REAUTHENTICATION_REQUIRED);
    expect(mockGenerateTemporaryPassword).not.toHaveBeenCalled();
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('lets the root create an administrator after a recent MFA proof', async () => {
    const newAdmin = buildUser({
      contactEmail: 'admin@example.com',
      firstName: 'Admin',
      id: 'admin-2',
      lastName: 'Secondaire',
      loginName: 'admin.secondaire',
      mustChangePassword: true,
      role: 'ADMIN',
    });
    mockRequireAuth.mockResolvedValueOnce({
      session: buildRecentSensitiveSession(),
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'root-1',
        isProtected: true,
        passwordHash: undefined,
        role: 'ADMIN',
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockGenerateTemporaryPassword.mockReturnValueOnce('TempPassword1!');
    mockCreateUser.mockResolvedValueOnce(newAdmin);

    const route = await import('$app/api/users/route');
    const response = await route.POST(
      new Request('http://localhost/api/users', {
        body: stringifyRequestBody({
          contactEmail: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'Secondaire',
          loginName: 'admin.secondaire',
          role: 'ADMIN',
        }),
        method: 'POST',
      }) as never,
    );

    expect(response.status).toBe(200);
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        loginName: 'admin.secondaire',
        role: 'ADMIN',
      }),
      expect.any(Function),
    );
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

  it('blocks non-protected users from renaming an administrator', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(
      buildUser({
        id: 'admin-1',
        role: 'ADMIN',
      }),
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/users/admin-1', {
        body: stringifyRequestBody({ firstName: 'Intruder' }),
        method: 'PATCH',
      }) as never,
      { params: Promise.resolve({ id: 'admin-1' }) },
    );

    expect(response.status).toBe(403);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
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

  it('requires a fresh MFA proof before deleting a user', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: {
        mfaVerifiedAt: new Date(Date.now() - 6 * 60 * 1000),
      },
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        passwordHash: undefined,
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(
      buildUser({ id: 'target-1' }),
    );

    const route = await import('$app/api/users/[id]/route');
    const response = await route.DELETE(
      new Request('http://localhost/api/users/target-1', {
        method: 'DELETE',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe(ErrorCode.REAUTHENTICATION_REQUIRED);
    expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.session.deleteMany).not.toHaveBeenCalled();
    expect(mockCreateAuditLogWithHeaders).not.toHaveBeenCalled();
  });

  it('soft-deletes users, revokes sessions and writes audit in one transaction', async () => {
    const existingUser = buildUser({ id: 'target-1' });
    mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);
    mockPrisma.user.updateMany.mockResolvedValueOnce({ count: 1 });
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
    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
      data: {
        deletedAt: expect.any(Date),
        isActive: false,
        securityVersion: { increment: 1 },
      },
      where: {
        deletedAt: null,
        id: 'target-1',
        isProtected: false,
        role: 'USER',
        securityVersion: 3,
        updatedAt: new Date(USER_REVISION),
      },
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

  it('fails closed when the target role or security version changes during deletion', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(
      buildUser({ id: 'target-1' }),
    );
    mockPrisma.user.updateMany.mockResolvedValueOnce({ count: 0 });

    const route = await import('$app/api/users/[id]/route');
    const response = await route.DELETE(
      new Request('http://localhost/api/users/target-1', {
        method: 'DELETE',
      }) as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );

    expect(response.status).toBe(409);
    expect(mockPrisma.session.deleteMany).not.toHaveBeenCalled();
    expect(mockCreateAuditLogWithHeaders).not.toHaveBeenCalled();
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

  it('uses audit:view_sensitive consistently for another user journal', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: buildRecentSensitiveSession(),
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'auditor-1',
        isProtected: false,
        passwordHash: undefined,
        permissions: { [PERMISSIONS.AUDIT.VIEW_SENSITIVE]: true },
        role: 'ADMIN',
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValue(buildUser({ id: 'target-1' }));
    mockPrisma.auditLog.count.mockResolvedValue(1);
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([
      {
        action: 'USER_UPDATE',
        category: 'USER',
        createdAt: new Date('2026-03-02T00:00:00.000Z'),
        description: 'Adresse privée modifiée',
        id: 'log-sensitive',
        ipAddress: '1.2.3.4',
        metadata: {
          before: { apiKey: 'never-visible', firstName: 'Jean' },
          pageKey: 'users',
          requestId: 'legacy-private-request',
        },
        targetUserId: 'target-1',
        userAgent: 'TestAgent',
        userId: 'auditor-1',
      },
    ]);

    const route = await import('$app/api/users/[id]/audit/route');
    const response = await route.GET(
      new Request('http://localhost/api/users/target-1/audit') as never,
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.logs[0]).toMatchObject({
      description: 'Adresse privée modifiée',
      ipAddress: '1.2.3.4',
      metadata: { before: { firstName: 'Jean' }, pageKey: 'users' },
      userAgent: 'TestAgent',
    });
    expect(body.data.logs[0].metadata).not.toHaveProperty('requestId');
  });

  it('does not expose old admin actions on other accounts through own history', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'former-admin',
        passwordHash: undefined,
        permissions: {},
        role: 'USER',
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValue(
      buildUser({ id: 'former-admin' }),
    );
    mockPrisma.auditLog.count.mockResolvedValue(1);
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([
      {
        action: 'USER_UPDATE',
        category: 'USER',
        createdAt: new Date('2026-03-02T00:00:00.000Z'),
        description: 'Adresse modifiée: private@example.com',
        id: 'old-admin-action',
        ipAddress: '1.2.3.4',
        metadata: {
          before: { contactEmail: 'private@example.com' },
          pageKey: 'users',
        },
        targetUserId: 'someone-else',
        userAgent: 'PrivateAgent',
        userId: 'former-admin',
      },
    ]);

    const route = await import('$app/api/users/[id]/audit/route');
    const response = await route.GET(
      new Request('http://localhost/api/users/former-admin/audit') as never,
      { params: Promise.resolve({ id: 'former-admin' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.logs[0]).toMatchObject({
      description: 'Compte utilisateur modifié',
      ipAddress: null,
      metadata: { pageKey: 'users' },
      userAgent: null,
    });
    expect(body.data.logs[0].metadata).not.toHaveProperty('before');
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
          AND: [
            {
              OR: [{ userId: 'target-1' }, { targetUserId: 'target-1' }],
            },
            { createdAt: { lte: expect.any(Date) } },
          ],
        },
      }),
    );
  });

  it('applies the pending status filter at query level', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        passwordHash: undefined,
        permissions: {
          [PERMISSIONS.USERS.VIEW]: true,
          [PERMISSIONS.USERS.VIEW_SECURITY]: true,
        },
      }),
    });
    mockPrisma.user.count.mockResolvedValue(1);
    mockPrisma.user.findMany.mockResolvedValueOnce([
      buildUser({
        id: 'pending-1',
        mustChangePassword: true,
      }),
    ]);

    const route = await import('$app/api/users/route');
    const response = await route.GET(
      new Request('http://localhost/api/users?status=pending') as never,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.securityDetailsVisible).toBe(true);
    expect(body.data.users).toHaveLength(1);
    expect(body.data.users[0].permissions).toBeNull();
    expect(body.data.users[0].securityDetailsVisible).toBe(true);
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

  it('rejects the pending-password filter without view-security permission', async () => {
    const route = await import('$app/api/users/route');
    const response = await route.GET(
      new Request('http://localhost/api/users?status=pending') as never,
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe(ErrorCode.FORBIDDEN);
    expect(mockPrisma.user.count).not.toHaveBeenCalled();
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
  });

  it('keeps the protected account in the users list with a public identity only', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'admin-1',
        passwordHash: undefined,
        permissions: {
          [PERMISSIONS.USERS.VIEW]: true,
          [PERMISSIONS.USERS.VIEW_CONTACT]: true,
          [PERMISSIONS.USERS.VIEW_SECURITY]: true,
        },
        role: 'ADMIN',
      }),
    });
    mockPrisma.user.count.mockResolvedValue(1);
    mockPrisma.user.findMany.mockResolvedValueOnce([
      buildUser({
        contactEmail: 'root-secret@example.com',
        firstName: 'Hidden',
        id: 'root-1',
        isProtected: true,
        lastName: 'Identity',
        loginName: 'root.secret',
        role: 'ADMIN',
      }),
    ]);

    const route = await import('$app/api/users/route');
    const response = await route.GET(
      new Request('http://localhost/api/users') as never,
    );
    const body = await response.json();
    const listQuery = mockPrisma.user.findMany.mock.calls[0]?.[0];

    expect(response.status).toBe(200);
    expect(body.data.users).toHaveLength(1);
    expect(body.data.users[0]).toMatchObject({
      contactEmail: null,
      firstName: 'Compte',
      identityDetailsVisible: false,
      lastLoginAt: null,
      lastName: 'racine',
      loginName: '••••••••',
      permissions: null,
      securityDetailsVisible: false,
    });
    expect(listQuery.orderBy[0]).toEqual({ isProtected: 'desc' });
    expect(JSON.stringify(body)).not.toContain('root.secret');
    expect(JSON.stringify(body)).not.toContain('root-secret@example.com');
  });

  it('does not search protected accounts through their private identity', async () => {
    mockPrisma.user.count.mockResolvedValue(0);
    mockPrisma.user.findMany.mockResolvedValueOnce([]);

    const route = await import('$app/api/users/route');
    const response = await route.GET(
      new Request('http://localhost/api/users?search=root.secret') as never,
    );
    const listQuery = mockPrisma.user.findMany.mock.calls[0]?.[0];

    expect(response.status).toBe(200);
    expect(listQuery.where.OR).toEqual([
      {
        AND: [
          { isProtected: false },
          {
            OR: expect.arrayContaining([
              expect.objectContaining({
                loginName: expect.objectContaining({
                  contains: 'root.secret',
                }),
              }),
            ]),
          },
        ],
      },
    ]);
  });

  it('finds the protected account through its public superadmin label', async () => {
    mockPrisma.user.count.mockResolvedValue(0);
    mockPrisma.user.findMany.mockResolvedValueOnce([]);

    const route = await import('$app/api/users/route');
    const response = await route.GET(
      new Request('http://localhost/api/users?search=superadmin') as never,
    );
    const listQuery = mockPrisma.user.findMany.mock.calls[0]?.[0];

    expect(response.status).toBe(200);
    expect(listQuery.where.OR).toContainEqual({ isProtected: true });
  });

  it('redacts list security fields and password stats without view-security permission', async () => {
    mockPrisma.user.count.mockResolvedValue(1);
    mockPrisma.user.findMany.mockResolvedValueOnce([
      buildUser({
        failedLoginAttempts: 4,
        id: 'target-1',
        lockedUntil: new Date('2026-03-03T00:00:00.000Z'),
        mfaEnabledAt: new Date('2026-03-02T00:00:00.000Z'),
        mustChangePassword: true,
        passwordChangedAt: new Date('2026-03-01T12:00:00.000Z'),
      }),
    ]);

    const route = await import('$app/api/users/route');
    const response = await route.GET(
      new Request('http://localhost/api/users') as never,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.securityDetailsVisible).toBe(false);
    expect(body.data.stats.pendingPasswordChange).toBeNull();
    expect(body.data.users[0]).toMatchObject({
      failedLoginAttempts: 0,
      lockedUntil: null,
      mfaEnabledAt: null,
      mustChangePassword: false,
      passwordChangedAt: null,
      securityDetailsVisible: false,
    });
    expect(mockPrisma.user.count).not.toHaveBeenCalledWith({
      where: expect.objectContaining({ mustChangePassword: true }),
    });
  });

  it('normalizes invalid users list pagination params', async () => {
    mockPrisma.user.count.mockResolvedValue(0);
    mockPrisma.user.findMany.mockResolvedValueOnce([]);

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
    const listQuery = mockPrisma.user.findMany.mock.calls[0]?.[0];
    const privateIdentitySearch = listQuery.where.OR[0].AND[1].OR;

    expect(privateIdentitySearch).toEqual(
      expect.arrayContaining([
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
    const privateIdentitySearch = listQuery.where.OR[0].AND[1].OR;
    expect(
      privateIdentitySearch.some(
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
    expect(listQuery.where.OR[0].AND[1].OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contactEmail: expect.objectContaining({ contains: 'visible' }),
        }),
      ]),
    );
  });

  it('keeps protected-account activity private from delegated administrators', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'admin-1',
        passwordHash: undefined,
        permissions: { [PERMISSIONS.USERS.VIEW_ACTIVITY]: true },
        role: 'ADMIN',
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 'root-1',
      isProtected: true,
    });

    const route = await import('$app/api/users/[id]/audit/route');
    const response = await route.GET(
      new Request('http://localhost/api/users/root-1/audit') as never,
      { params: Promise.resolve({ id: 'root-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe(ErrorCode.FORBIDDEN);
    expect(mockPrisma.auditLog.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.count).not.toHaveBeenCalled();
  });

  it('returns null for dashboard sections the user cannot access', async () => {
    const route = await import('$app/api/dashboard/route');
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.generatedAt).toEqual(expect.any(String));
    expect(body.data).not.toHaveProperty('users');
    expect(body.data.security).toBeNull();
    expect(body.data.recentActivity).toBeNull();
    expect(mockPrisma.user.groupBy).not.toHaveBeenCalled();
    expect(mockPrisma.user.count).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it('does not load directory counters for a simple user-view permission', async () => {
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
    const route = await import('$app/api/dashboard/route');
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).not.toHaveProperty('users');
    expect(body.data.security).toBeNull();
    expect(body.data.recentActivity).toBeNull();
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.user.groupBy).not.toHaveBeenCalled();
    expect(mockPrisma.user.count).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it('only exposes active-account security signals with security permission', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'security-viewer-1',
        passwordHash: undefined,
        permissions: {
          [PERMISSIONS.USERS.VIEW]: true,
          [PERMISSIONS.USERS.VIEW_SECURITY]: true,
        },
      }),
    });
    mockPrisma.user.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(3);

    const route = await import('$app/api/dashboard/route');
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.security).toEqual({
      lockedActiveUsers: 1,
      mfaEnrollmentPendingActiveUsers: 3,
      temporaryPasswordActiveUsers: 4,
    });
    expect(mockPrisma.user.count).toHaveBeenNthCalledWith(1, {
      where: {
        deletedAt: null,
        isActive: true,
        mustChangePassword: true,
      },
    });
    expect(mockPrisma.user.count).toHaveBeenNthCalledWith(2, {
      where: {
        deletedAt: null,
        isActive: true,
        lockedUntil: { gt: expect.any(Date) },
      },
    });
    expect(mockPrisma.user.count).toHaveBeenNthCalledWith(3, {
      where: {
        deletedAt: null,
        isActive: true,
        mfaEnabledAt: null,
      },
    });
  });

  it('scopes dashboard user activity and redacts sensitive descriptions', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'activity-viewer-1',
        passwordHash: undefined,
        permissions: {
          [PERMISSIONS.USERS.VIEW]: true,
          [PERMISSIONS.USERS.VIEW_ACTIVITY]: true,
        },
      }),
    });
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([
      {
        action: 'PASSWORD_RESET',
        actorDisplayNameSnapshot: 'Admin archive',
        category: 'AUTH',
        createdAt: new Date('2026-07-16T10:00:00.000Z'),
        description: 'Mot de passe réinitialisé pour un identifiant secret',
        id: 'dashboard-log-1',
      },
    ]);

    const route = await import('$app/api/dashboard/route');
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        action: true,
        actorDisplayNameSnapshot: true,
        category: true,
        createdAt: true,
        description: true,
        id: true,
      },
      take: 3,
      where: {
        category: { in: ['AUTH', 'PERMISSION', 'USER'] },
        eventKind: 'ACTIVITY',
      },
    });
    expect(body.data.recentActivity).toEqual([
      {
        action: 'PASSWORD_RESET',
        category: 'AUTH',
        createdAt: '2026-07-16T10:00:00.000Z',
        description: 'Mot de passe réinitialisé',
        id: 'dashboard-log-1',
        userName: 'Admin archive',
      },
    ]);
  });

  it('loads global dashboard activity independently from the user directory', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      session: null,
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'audit-viewer-1',
        passwordHash: undefined,
        permissions: {
          [PERMISSIONS.AUDIT.VIEW]: true,
        },
      }),
    });
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([
      {
        action: 'SYSTEM_SETTINGS_UPDATE',
        actorDisplayNameSnapshot: null,
        category: 'SYSTEM',
        createdAt: new Date('2026-07-16T11:00:00.000Z'),
        description: 'Configuration technique sensible modifiée',
        id: 'dashboard-log-2',
      },
    ]);

    const route = await import('$app/api/dashboard/route');
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).not.toHaveProperty('users');
    expect(body.data.security).toBeNull();
    expect(body.data.recentActivity).toHaveLength(1);
    expect(mockPrisma.user.groupBy).not.toHaveBeenCalled();
    expect(mockPrisma.user.count).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventKind: 'ACTIVITY' },
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
      total: null,
      totalPages: null,
    });
    expect(mockPrisma.auditLog.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        take: 51,
      }),
    );
    expect(mockPrisma.auditLog.findMany.mock.calls[0]?.[0]).not.toHaveProperty(
      'skip',
    );
  });

  it('loads the system activity journal with cursor pagination and masked ip', async () => {
    mockPrisma.auditLog.findMany.mockReset();
    mockPrisma.user.findMany.mockReset();
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([
      {
        action: 'USER_UPDATE',
        actorDisplayNameSnapshot: 'Alice Admin',
        category: 'AUTH',
        createdAt: new Date('2026-03-03T10:00:00.000Z'),
        description: 'Connexion reussie',
        id: 'log-3',
        ipAddress: '1.2.3.4',
        metadata: SYSTEM_SENSITIVE_AUDIT_METADATA,
        targetDisplayNameSnapshot: 'Bob User',
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
        targetDisplayNameSnapshot: 'Nom archive',
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
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([]);
    const route = await import('$app/api/systeme/journal-activite/route');
    const response = await route.GET(
      new Request(
        'http://localhost/api/systeme/journal-activite?limit=2&period=7d&category=AUTH&action=USER_UPDATE',
      ) as never,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body.success).toBe(true);
    expect(body.data.logs).toHaveLength(2);
    expect(body.data.nextCursor).toEqual(expect.any(String));
    expect(body.data.nextCursor).not.toBe('log-2');
    expect(body.data.snapshotAt).toEqual(expect.any(String));
    expect(body.data.logs[0]).toMatchObject({
      actorName: 'Alice Admin',
      ipAddress: null,
      metadata: {
        ...SYSTEM_SAFE_AUDIT_METADATA,
        after: { firstName: 'Jeanne', isActive: true },
        before: { firstName: 'Jean', isActive: false },
        changes: ['firstName', 'isActive'],
      },
      targetName: 'Bob User',
    });
    expect(body.data.logs[0].metadata.after).not.toHaveProperty('contactEmail');
    expect(body.data.logs[0].metadata.before).not.toHaveProperty(
      'contactEmail',
    );
    expect(body.data.logs[1]).toMatchObject({
      actorName: null,
      ipAddress: null,
      targetName: 'Nom archive',
    });
    expect(mockRequirePermission).toHaveBeenCalledWith(
      expect.any(Object),
      PERMISSIONS.AUDIT.VIEW,
    );
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 3,
        where: {
          AND: expect.arrayContaining([
            { action: 'USER_UPDATE' },
            { category: 'AUTH' },
            { eventKind: 'ACTIVITY' },
            expect.objectContaining({
              createdAt: expect.objectContaining({
                gte: expect.any(Date),
                lte: expect.any(Date),
              }),
            }),
          ]),
        },
      }),
    );
    const nextResponse = await route.GET(
      new Request(
        `http://localhost/api/systeme/journal-activite?limit=2&period=7d&category=AUTH&action=USER_UPDATE&cursor=${encodeURIComponent(body.data.nextCursor)}`,
      ) as never,
    );

    expect(nextResponse.status).toBe(200);
    expect(mockPrisma.auditLog.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          AND: expect.arrayContaining([
            {
              OR: [
                { createdAt: { lt: new Date('2026-03-03T09:00:00.000Z') } },
                {
                  createdAt: new Date('2026-03-03T09:00:00.000Z'),
                  id: { lt: 'log-2' },
                },
              ],
            },
          ]),
        },
      }),
    );
  });

  it('reads legacy activity-journal page keys through the canonical page filter', async () => {
    mockPrisma.auditLog.findMany.mockReset();
    mockPrisma.user.findMany.mockReset();
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([]);
    const route = await import('$app/api/systeme/journal-activite/route');
    const response = await route.GET(
      new Request(
        'http://localhost/api/systeme/journal-activite?pageKey=system-activity',
      ) as never,
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: expect.arrayContaining([
            {
              pageKey: {
                in: ['system-activity', 'activity-journal', 'audit'],
              },
            },
          ]),
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
          [PERMISSIONS.AUDIT.VIEW]: false,
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
      PERMISSIONS.AUDIT.VIEW,
    );
    expect(mockPrisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it('separates connection logs from default system activity filters', async () => {
    mockPrisma.auditLog.findMany.mockReset();
    mockPrisma.user.findMany.mockReset();
    mockPrisma.auditLog.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockPrisma.user.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const route = await import('$app/api/systeme/journal-activite/route');

    await route.GET(
      new Request('http://localhost/api/systeme/journal-activite') as never,
    );

    const invalidResponse = await route.GET(
      new Request(
        'http://localhost/api/systeme/journal-activite?logType=connections&action=USER_UPDATE&category=USER&poleKey=system&pageKey=authentication',
      ) as never,
    );

    await route.GET(
      new Request(
        'http://localhost/api/systeme/journal-activite?logType=connections&connectionAction=LOGIN_FAILED',
      ) as never,
    );

    expect(invalidResponse.status).toBe(400);
    expect(mockPrisma.auditLog.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          AND: expect.arrayContaining([{ eventKind: 'ACTIVITY' }]),
        },
      }),
    );
    expect(mockPrisma.auditLog.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          AND: expect.arrayContaining([
            { action: 'LOGIN_FAILED' },
            { eventKind: 'CONNECTION' },
          ]),
        },
      }),
    );
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid, repeated and inconsistent journal filters', async () => {
    mockPrisma.auditLog.findMany.mockReset();
    const route = await import('$app/api/systeme/journal-activite/route');
    const requests = [
      'period=typo',
      'period=30d&period=7d',
      'unknownFilter=value',
      'search=a',
      'search=ab',
      'search=%25%25%25',
      'action=LOGIN_SUCCESS',
      'logType=connections&connectionAction=USER_UPDATE',
      'period=30d&from=2026-01-01T00%3A00%3A00.000Z',
      'period=30d&to=2026-01-02T00%3A00%3A00.000Z',
      'period=custom&from=2026-01-01T00%3A00%3A00.000Z',
      'period=custom&from=2024-01-01T00%3A00%3A00.000Z&to=2026-01-02T00%3A00%3A00.000Z',
    ];

    for (const query of requests) {
      const response = await route.GET(
        new Request(
          `http://localhost/api/systeme/journal-activite?${query}`,
        ) as never,
      );

      expect(response.status).toBe(400);
    }

    expect(mockPrisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it('rejects a cursor when the active journal filters have changed', async () => {
    mockPrisma.auditLog.findMany.mockReset();
    mockPrisma.user.findMany.mockReset();
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([
      {
        action: 'USER_UPDATE',
        category: 'USER',
        createdAt: new Date('2026-03-03T10:00:00.000Z'),
        description: 'Utilisateur modifie',
        id: 'log-2',
        ipAddress: null,
        metadata: null,
        targetUserId: null,
        userId: null,
      },
      {
        action: 'USER_UPDATE',
        category: 'USER',
        createdAt: new Date('2026-03-03T09:00:00.000Z'),
        description: 'Utilisateur modifie',
        id: 'log-1',
        ipAddress: null,
        metadata: null,
        targetUserId: null,
        userId: null,
      },
    ]);
    const route = await import('$app/api/systeme/journal-activite/route');
    const firstResponse = await route.GET(
      new Request(
        'http://localhost/api/systeme/journal-activite?limit=1&period=30d',
      ) as never,
    );
    const firstBody = await firstResponse.json();
    const changedFilterResponse = await route.GET(
      new Request(
        `http://localhost/api/systeme/journal-activite?limit=1&period=7d&cursor=${encodeURIComponent(firstBody.data.nextCursor)}`,
      ) as never,
    );
    const futureCursorPayload = JSON.parse(
      Buffer.from(
        String(firstBody.data.nextCursor).split('.')[0] ?? '',
        'base64url',
      ).toString('utf8'),
    ) as Record<string, unknown>;
    futureCursorPayload.snapshotAt = '2099-01-01T00:00:00.000Z';
    const futureCursor = Buffer.from(
      JSON.stringify(futureCursorPayload),
      'utf8',
    ).toString('base64url');
    const futureCursorResponse = await route.GET(
      new Request(
        `http://localhost/api/systeme/journal-activite?limit=1&period=30d&cursor=${encodeURIComponent(futureCursor)}`,
      ) as never,
    );

    expect(firstResponse.status).toBe(200);
    expect(changedFilterResponse.status).toBe(400);
    expect(futureCursorResponse.status).toBe(400);
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledTimes(1);
  });

  it('keeps login-name search behind sensitive audit access', async () => {
    mockPrisma.auditLog.findMany.mockReset();
    mockPrisma.auditLog.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const route = await import('$app/api/systeme/journal-activite/route');

    const regularResponse = await route.GET(
      new Request(
        'http://localhost/api/systeme/journal-activite?search=alice',
      ) as never,
    );
    const regularWhere = mockPrisma.auditLog.findMany.mock.calls[0]?.[0]
      ?.where as { AND?: Array<{ OR?: unknown[] }> };
    const regularSearch = regularWhere.AND?.find((filter) => filter.OR)?.OR;

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
    const protectedResponse = await route.GET(
      new Request(
        'http://localhost/api/systeme/journal-activite?search=alice',
      ) as never,
    );
    const protectedWhere = mockPrisma.auditLog.findMany.mock.calls[1]?.[0]
      ?.where as { AND?: Array<{ OR?: unknown[] }> };
    const protectedSearch = protectedWhere.AND?.find((filter) => filter.OR)?.OR;

    expect(regularResponse.status).toBe(200);
    expect(protectedResponse.status).toBe(200);
    expect(regularSearch).toHaveLength(2);
    expect(JSON.stringify(regularSearch)).not.toContain('LoginNameSnapshot');
    expect(protectedSearch).toHaveLength(4);
    expect(JSON.stringify(protectedSearch)).toContain('actorLoginNameSnapshot');
    expect(JSON.stringify(protectedSearch)).toContain(
      'targetLoginNameSnapshot',
    );
  });

  it('treats SQL wildcard characters in journal search as literals', async () => {
    mockPrisma.auditLog.findMany.mockReset();
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([]);
    const route = await import('$app/api/systeme/journal-activite/route');
    const response = await route.GET(
      new Request(
        'http://localhost/api/systeme/journal-activite?search=ali_ce%25',
      ) as never,
    );
    const where = mockPrisma.auditLog.findMany.mock.calls[0]?.[0]?.where as {
      AND?: Array<{
        OR?: Array<{
          actorDisplayNameSnapshot?: { contains?: string };
        }>;
      }>;
    };
    const searchFilter = where.AND?.find((filter) => filter.OR)?.OR;

    expect(response.status).toBe(200);
    expect(searchFilter?.[0]?.actorDisplayNameSnapshot?.contains).toBe(
      'ali\\_ce\\%',
    );
  });

  it('requires export permission and a recent step-up before exporting', async () => {
    const route = await import('$app/api/systeme/journal-activite/route');

    mockRequirePermission
      .mockReturnValueOnce({ success: true })
      .mockReturnValueOnce({
        response: Response.json(
          {
            error: { code: ErrorCode.FORBIDDEN, message: 'Accès refusé' },
            success: false,
          },
          { status: 403 },
        ),
        success: false,
      });
    const forbiddenResponse = await route.GET(
      new Request(
        'http://localhost/api/systeme/journal-activite?format=csv&period=all',
      ) as never,
    );

    expect(forbiddenResponse.status).toBe(403);
    expect(mockPrisma.auditLog.findMany).not.toHaveBeenCalled();

    mockRequireAuth.mockResolvedValueOnce({
      session: { mfaVerifiedAt: null },
      success: true,
      user: buildUser({
        deletedAt: undefined,
        id: 'viewer-1',
        passwordHash: undefined,
      }),
    });
    mockRequirePermission.mockReturnValue({ success: true });
    const stepUpResponse = await route.GET(
      new Request(
        'http://localhost/api/systeme/journal-activite?format=json&period=all',
      ) as never,
    );
    const stepUpBody = await stepUpResponse.json();

    expect(stepUpResponse.status).toBe(403);
    expect(stepUpBody.error.code).toBe(ErrorCode.REAUTHENTICATION_REQUIRED);
    expect(mockPrisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it('streams injection-safe filtered exports and audits the operation', async () => {
    mockPrisma.auditLog.findMany.mockReset();
    mockCreateAuditLog.mockReset();
    mockPrisma.auditLog.count.mockResolvedValueOnce(1);
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([
      {
        action: 'USER_UPDATE',
        actorDisplayNameSnapshot: ' \n=2+2',
        actorLoginNameSnapshot: 'actor',
        actorRoleSnapshot: 'ADMIN',
        category: 'USER',
        createdAt: new Date('2026-03-03T10:00:00.000Z'),
        description: '=private description',
        eventKind: 'ACTIVITY',
        eventVersion: 1,
        id: 'log-1',
        ipAddress: '1.2.3.4',
        metadata: { pageKey: 'users', passwordHash: 'never-export' },
        outcome: 'SUCCESS',
        pageKey: 'users',
        poleKey: 'system',
        requestId: 'request-private',
        severity: 'INFO',
        stream: 'IDENTITY',
        tabKey: 'profile',
        targetDisplayNameSnapshot: null,
        targetLoginNameSnapshot: null,
        targetRoleSnapshot: null,
        targetUserId: null,
        userAgent: 'private-agent',
        userId: null,
      },
    ]);
    const route = await import('$app/api/systeme/journal-activite/route');
    const response = await route.GET(
      new Request(
        'http://localhost/api/systeme/journal-activite?format=csv&period=all&action=USER_UPDATE',
      ) as never,
    );

    expect(mockCreateAuditLog).toHaveBeenCalledTimes(1);
    expect(mockCreateAuditLog).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: 'AUDIT_EXPORT',
        metadata: expect.objectContaining({
          pageKey: 'system-activity',
          pageLabel: "Journal d'activité",
          phase: 'started',
          poleKey: 'system',
          poleLabel: 'Système',
          rowCount: 0,
        }),
      }),
    );

    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/csv');
    expect(csv).toContain('"\' \n=2+2"');
    expect(csv).toContain('Compte utilisateur modifié');
    expect(csv).not.toContain('private description');
    expect(csv).not.toContain('never-export');
    expect(csv).not.toContain('request-private');
    expect(csv).not.toContain('private-agent');
    expect(response.headers.get('X-Export-Truncated')).toBe('false');
    expect(mockPrisma.auditLog.count).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50_001 }),
    );
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AUDIT_EXPORT',
        category: 'SYSTEM',
        ipAddress: '203.0.113.5',
        metadata: expect.objectContaining({
          format: 'csv',
          pageKey: 'system-activity',
          pageLabel: "Journal d'activité",
          phase: 'completed',
          poleKey: 'system',
          poleLabel: 'Système',
          rowCount: 1,
          truncated: false,
        }),
        requestId: 'request-test',
        userId: 'viewer-1',
      }),
    );
  });

  it('streams a valid JSON export manifest for the active filters', async () => {
    mockPrisma.auditLog.findMany.mockReset();
    mockPrisma.auditLog.count.mockResolvedValueOnce(0);
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([]);
    const route = await import('$app/api/systeme/journal-activite/route');
    const response = await route.GET(
      new Request(
        'http://localhost/api/systeme/journal-activite?format=json&period=custom&from=2026-03-01T00%3A00%3A00.000Z&to=2026-03-02T00%3A00%3A00.000Z&search=alice',
      ) as never,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(body).toMatchObject({
      filters: {
        from: '2026-03-01T00:00:00.000Z',
        period: 'custom',
        search: 'alice',
        to: '2026-03-02T00:00:00.000Z',
      },
      logs: [],
      rowCount: 0,
      truncated: false,
    });
    expect(body.generatedAt).toEqual(expect.any(String));
    expect(body.snapshotAt).toBe('2026-03-02T00:00:00.000Z');
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AUDIT_EXPORT',
        metadata: expect.objectContaining({
          format: 'json',
          phase: 'completed',
          rowCount: 0,
          truncated: false,
        }),
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
    expect(body.data.sensitiveDetailsVisible).toBe(true);
    expect(body.data.logs[0].ipAddress).toBe('1.2.3.4');
    expect(body.data.logs[0].metadata).toEqual({
      ...SYSTEM_SAFE_AUDIT_METADATA,
      after: {
        contactEmail: 'new@example.com',
        firstName: 'Jeanne',
        isActive: true,
      },
      before: {
        contactEmail: 'old@example.com',
        firstName: 'Jean',
        isActive: false,
      },
      changes: ['contactEmail', 'firstName', 'isActive'],
    });
    expect(body.data.logs[0].metadata).not.toHaveProperty('requestId');
  });
});
