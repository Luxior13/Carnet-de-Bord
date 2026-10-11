import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PERMISSIONS } from '$constants/permissions.constants';
import { ErrorCode } from '$types/api.types';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  list: vi.fn(),
  permission: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('$server/api-auth', () => ({
  requireAuth: mocks.auth,
  requirePermission: mocks.permission,
}));
vi.mock('$features/users/server/users-list.service', () => ({
  listUsers: mocks.list,
}));
vi.mock('$server/prisma', () => ({ prisma: {} }));
vi.mock('$server/auth', () => ({
  generateTemporaryPassword: vi.fn(),
  mapUserToUserType: (user: unknown): unknown => user,
}));
vi.mock('$server/sensitive-action', () => ({
  requireRecentSensitiveActionProof: vi.fn(),
}));

const account = (
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({
  contactEmail: 'visible@example.test',
  contactEmailVerifiedAt: null,
  createdAt: new Date('2026-03-01T00:00:00Z'),
  failedLoginAttempts: 4,
  firstName: 'Jean',
  id: 'user-1',
  isActive: true,
  isProtected: false,
  lastLoginAt: new Date('2026-03-03T00:00:00Z'),
  lastName: 'Dupont',
  lockedUntil: new Date('2026-03-04T00:00:00Z'),
  loginName: 'jean.dupont',
  mfaEnabledAt: new Date('2026-03-02T00:00:00Z'),
  mustChangePassword: true,
  passwordChangedAt: new Date('2026-03-01T00:00:00Z'),
  permissions: {},
  role: 'USER',
  ...extra,
});
const stats = {
  active: 1,
  byRole: { ADMIN: 0, SUPERADMIN: 0, USER: 1 },
  inactive: 0,
  pendingPasswordChange: null,
  total: 1,
};
const request = async (query = ''): Promise<Response> => {
  const { GET } = await import('$app/api/users/route');

  return GET(new Request('http://localhost/api/users?' + query) as never);
};
const authenticate = (
  permissions: Record<string, boolean> = {},
  extra = {},
): void => {
  mocks.auth.mockResolvedValue({
    session: null,
    success: true,
    user: account({
      id: 'viewer',
      permissions: { [PERMISSIONS.USERS.VIEW]: true, ...permissions },
      ...extra,
    }),
  });
};

describe('users list HTTP boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticate();
    mocks.permission.mockReturnValue({ success: true });
    mocks.list.mockImplementation(async (_input, visibility) => ({
      stats: {
        ...stats,
        pendingPasswordChange: visibility.canViewSecurity ? 1 : null,
      },
      total: 1,
      users: [account()],
    }));
  });

  it.each([401, 403])(
    'does not read data after authentication or permission refusal (%s)',
    async (status) => {
      const failure = {
        response: Response.json({ success: false }, { status }),
        success: false,
      };
      if (status === 401) mocks.auth.mockResolvedValue(failure);
      else mocks.permission.mockReturnValue(failure);
      expect((await request('loginName=jean.dupont')).status).toBe(status);
      expect(mocks.list).not.toHaveBeenCalled();
    },
  );

  it.each(['', 'ab', 'name%', 'x'.repeat(33)])(
    'rejects invalid exact lookup: %s',
    async (loginName) => {
      const response = await request(
        new URLSearchParams({ loginName }).toString(),
      );
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe(
        ErrorCode.VALIDATION_ERROR,
      );
      expect(mocks.list).not.toHaveBeenCalled();
    },
  );

  it.each(['', '&role=SUPERADMIN', '&status=pending'])(
    'normalizes exact login lookup without elevating the actor: %s',
    async (suffix) => {
      authenticate(
        { [PERMISSIONS.USERS.VIEW_SECURITY]: true },
        { role: 'ADMIN' },
      );
      expect(
        (await request('loginName=%20Jean.Dupont%20&limit=1' + suffix)).status,
      ).toBe(200);
      expect(mocks.list).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 1, loginName: 'jean.dupont' }),
        expect.objectContaining({ isProtected: false }),
      );
      expect(mocks.permission).toHaveBeenCalledWith(
        expect.anything(),
        PERMISSIONS.USERS.VIEW,
      );
    },
  );

  it('refuses a password-state filter without the security permission', async () => {
    const response = await request('status=pending');
    expect(response.status).toBe(403);
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it('passes the allowed password-state filter to the service', async () => {
    authenticate({ [PERMISSIONS.USERS.VIEW_SECURITY]: true });
    const response = await request('status=pending');
    expect(response.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' }),
      expect.objectContaining({ canViewSecurity: true }),
    );
    expect((await response.json()).data.stats.pendingPasswordChange).toBe(1);
  });

  it.each(['name', 'recent', 'created'])(
    'preserves sort and page inputs: %s',
    async (sort) => {
      const response = await request(`sort=${sort}&page=2&limit=1`);
      expect(response.status).toBe(200);
      expect(mocks.list).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 1, skip: 1, sort }),
        expect.anything(),
      );
    },
  );

  it.each(['SUPERADMIN', 'ADMIN', 'USER'])(
    'preserves access category: %s',
    async (role) => {
      await request('role=' + role);
      expect(mocks.list).toHaveBeenCalledWith(
        expect.objectContaining({ role }),
        expect.anything(),
      );
    },
  );

  it.each([
    ['page=bad&limit=bad&role=unknown&sort=unknown&status=unknown', 25, 1, 0],
    ['page=999999&limit=999999', 100, 1000, 99900],
    ['page=-2&limit=-2', 1, 1, 0],
  ])('bounds inputs before SQL: %s', async (query, limit, page, skip) => {
    const response = await request(query);
    expect(response.status).toBe(200);
    expect((await response.json()).data.pagination).toMatchObject({
      limit,
      page,
    });
    expect(mocks.list).toHaveBeenCalledWith(
      expect.objectContaining({
        limit,
        role: null,
        skip,
        sort: 'name',
        status: null,
      }),
      expect.anything(),
    );
  });

  it('limits search length and preserves zero-result pagination', async () => {
    mocks.list.mockResolvedValue({ stats, total: 0, users: [] });
    const response = await request('search=' + 'a'.repeat(140));
    expect(mocks.list).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'a'.repeat(100) }),
      expect.anything(),
    );
    expect((await response.json()).data.pagination).toEqual({
      limit: 25,
      page: 1,
      total: 0,
      totalPages: 0,
    });
  });

  it.each([PERMISSIONS.USERS.VIEW_CONTACT, PERMISSIONS.USERS.UPDATE_CONTACT])(
    'allows contact read and search with %s',
    async (permission) => {
      authenticate({
        [PERMISSIONS.USERS.VIEW_CONTACT]: true,
        [permission]: true,
      });
      const response = await request('search=visible');
      expect((await response.json()).data.users[0].contactEmail).toBe(
        'visible@example.test',
      );
      expect(mocks.list).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ canViewContact: true }),
      );
    },
  );

  it('redacts unauthorized contact and security data and exposes no overrides', async () => {
    const response = await request('search=private');
    const { data } = await response.json();
    expect(data.securityDetailsVisible).toBe(false);
    expect(data.stats.pendingPasswordChange).toBeNull();
    expect(data.users[0]).toMatchObject({
      contactEmail: null,
      contactEmailVerifiedAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      mfaEnabledAt: null,
      mustChangePassword: false,
      passwordChangedAt: null,
      permissions: null,
      securityDetailsVisible: false,
    });
    expect(mocks.list).toHaveBeenCalledWith(expect.anything(), {
      canViewContact: false,
      canViewSecurity: false,
      isProtected: false,
    });
  });

  it('masks root identity even for a delegated administrator with field permissions', async () => {
    authenticate(
      {
        [PERMISSIONS.USERS.VIEW_CONTACT]: true,
        [PERMISSIONS.USERS.VIEW_SECURITY]: true,
      },
      { role: 'ADMIN' },
    );
    mocks.list.mockResolvedValue({
      stats,
      total: 1,
      users: [
        account({
          contactEmail: 'private-root@example.test',
          firstName: 'Hidden',
          id: 'root',
          isProtected: true,
          lastName: 'Identity',
          loginName: 'private.root',
          role: 'ADMIN',
        }),
      ],
    });
    const response = await request();
    const body = await response.json();
    expect(body.data.users[0]).toMatchObject({
      contactEmail: null,
      firstName: 'Compte',
      identityDetailsVisible: false,
      lastLoginAt: null,
      lastName: 'racine',
      loginName: '••••••••',
      securityDetailsVisible: false,
    });
    expect(JSON.stringify(body)).not.toContain('private.root');
    expect(JSON.stringify(body)).not.toContain('private-root@example.test');
  });

  it('keeps the root visibility privileges explicit', async () => {
    authenticate({}, { isProtected: true, role: 'ADMIN' });
    await request();
    expect(mocks.list).toHaveBeenCalledWith(expect.anything(), {
      canViewContact: true,
      canViewSecurity: true,
      isProtected: true,
    });
  });
});
