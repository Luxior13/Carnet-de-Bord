import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, PATCH } from '$app/api/users/[id]/route';
import { PERMISSIONS } from '$constants/permissions.constants';

const mocks = vi.hoisted(() => ({
  audit: vi.fn(),
  auth: vi.fn(),
  find: vi.fn(),
  transaction: vi.fn(),
  update: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('$env', () => ({ env: { NODE_ENV: 'test' } }));
vi.mock('$server/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('$server/rate-limiter', () => ({
  reserveAuthenticatedApiRateLimit: vi.fn(async () => ({ allowed: true })),
}));
vi.mock('$server/prisma', () => ({
  prisma: { $transaction: mocks.transaction, user: { findUnique: mocks.find } },
}));
vi.mock('$server/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('$server/auth')>()),
  createAuditLogWithHeaders: mocks.audit,
  getAuthSession: mocks.auth,
}));

const revision = '2026-10-11T10:00:00.000Z';
const row = {
  contactEmail: 'private@example.test',
  contactEmailVerifiedAt: new Date(revision),
  createdAt: new Date(revision),
  failedLoginAttempts: 3,
  firstName: 'Fictif',
  id: 'target',
  isActive: true,
  isProtected: false,
  lastLoginAt: null,
  lastName: 'Exemple',
  lockedUntil: new Date(revision),
  loginName: 'fictive.account',
  mfaEnabledAt: new Date(revision),
  mustChangePassword: true,
  passwordChangedAt: new Date(revision),
  passwordHash: 'never-client-visible',
  permissions: {
    [PERMISSIONS.USERS.VIEW]: true,
    [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false,
  },
  role: 'USER',
  securityVersion: 3,
  totpCredential: { secretCiphertext: 'private-seed-marker', userId: 'target' },
  updatedAt: new Date(revision),
};
const actor = (
  permissions: Record<string, boolean> = {},
  extra = {},
): Record<string, unknown> => ({
  id: 'actor',
  isActive: true,
  isProtected: false,
  mustChangePassword: false,
  permissions,
  role: 'USER',
  securityVersion: 0,
  ...extra,
});
const params = { params: Promise.resolve({ id: 'target' }) };
const get = (): ReturnType<typeof GET> =>
  GET(new Request('http://localhost/api/users/target') as never, params);
const patch = (data: Record<string, unknown>): ReturnType<typeof PATCH> =>
  PATCH(
    new Request('http://localhost/api/users/target', {
      body: JSON.stringify({ expectedUpdatedAt: revision, ...data }),
      method: 'PATCH',
    }) as never,
    params,
  );
describe('user detail HTTP boundary with real permissions and projection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      session: null,
      user: actor({ [PERMISSIONS.USERS.VIEW]: true }),
    });
    mocks.find.mockResolvedValue(row);
    mocks.update.mockImplementation(async ({ data }) => ({ ...row, ...data }));
    mocks.transaction.mockImplementation(async (callback) => {
      const snapshot = await mocks.auth();

      return callback({
        $queryRaw: vi.fn(async () => []),
        session: { findFirst: vi.fn(async () => snapshot.session) },
        user: {
          findUnique: vi.fn(async () => snapshot.user),
          update: mocks.update,
        },
      });
    });
  });

  it('denies anonymous reads and writes before storage', async () => {
    mocks.auth.mockResolvedValue({ session: null, user: null });
    expect((await get()).status).toBe(401);
    expect((await patch({ lastName: '' })).status).toBe(401);
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it('returns 403 when users:view is revoked despite other overrides', async () => {
    mocks.auth.mockResolvedValue({
      session: null,
      user: actor({
        [PERMISSIONS.USERS.VIEW]: false,
        [PERMISSIONS.USERS.VIEW_CONTACT]: true,
      }),
    });
    expect((await get()).status).toBe(403);
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it.each<Record<string, boolean>>([
    {},
    { [PERMISSIONS.USERS.UPDATE_PROFILE]: true },
    { [PERMISSIONS.USERS.VIEW]: true },
  ])(
    'enforces effective profile permission dependencies: %j',
    async (permissions) => {
      mocks.auth.mockResolvedValue({ session: null, user: actor(permissions) });
      expect((await patch({ lastName: '' })).status).toBe(403);
      expect(mocks.find).not.toHaveBeenCalled();
    },
  );

  it.each([
    { firstName: 'Edited' },
    { lastName: '' },
    { isActive: false },
    { loginName: 'new.login' },
    { contactEmail: null },
    { role: 'USER' },
    { permissions: null },
  ])('requires the loaded revision for every update: %j', async (data) => {
    expect(
      (await patch({ ...data, expectedUpdatedAt: undefined })).status,
    ).toBe(400);
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ])(
    'projects contact=%s and security=%s without authentication material',
    async (contact, security) => {
      mocks.auth.mockResolvedValue({
        session: null,
        user: actor({
          [PERMISSIONS.USERS.VIEW]: true,
          [PERMISSIONS.USERS.VIEW_CONTACT]: contact,
          [PERMISSIONS.USERS.VIEW_SECURITY]: security,
        }),
      });
      const body = await (await get()).json();
      expect(body.data.user.contactEmail).toBe(
        contact ? row.contactEmail : null,
      );
      expect(body.data.user.mfaEnabledAt).toBe(security ? revision : null);
      expect(body.data.user.securityDetailsVisible).toBe(security);
      expect(body.data.user.permissions).toBeNull();
      expect(body.data.user).not.toHaveProperty('criticalAccessReady');
      expect(body.data.user).not.toHaveProperty('passwordHash');
      expect(body.data.user).not.toHaveProperty('securityVersion');
      expect(body.data.user).not.toHaveProperty('totpCredential');
      const query = mocks.find.mock.calls[0]?.[0];
      expect(query.select).not.toHaveProperty('passwordHash');
      expect(query.select.totpCredential).toEqual({ select: { userId: true } });
    },
  );

  it('provides only readiness to effective access grantors without revealing MFA fields', async () => {
    mocks.auth.mockResolvedValue({
      session: null,
      user: actor({
        [PERMISSIONS.USERS.VIEW]: true,
        [PERMISSIONS.USERS.VIEW_ACCESS]: true,
        [PERMISSIONS.USERS.GRANT_ACCESS]: true,
      }),
    });
    const body = await (await get()).json();
    expect(body.data.user.criticalAccessReady).toBe(true);
    expect(body.data.user.mfaEnabledAt).toBeNull();
    expect(body.data.user.permissions).toEqual({
      [PERMISSIONS.USERS.VIEW]: true,
    });
  });

  it('masks the root identity even when a third party can read contact and security', async () => {
    mocks.auth.mockResolvedValue({
      session: null,
      user: actor({}, { role: 'ADMIN' }),
    });
    mocks.find.mockResolvedValue({ ...row, isProtected: true, role: 'ADMIN' });
    const body = await (await get()).json();
    expect(body.data.user).toMatchObject({
      contactEmail: null,
      firstName: 'Compte',
      identityDetailsVisible: false,
      lastName: 'racine',
      mfaEnabledAt: null,
      permissions: null,
    });
    expect(body.data.user).not.toHaveProperty('updatedAt');
    expect(JSON.stringify(body)).not.toContain(row.loginName);
  });

  it('saves the empty name with real policy checks and an audit', async () => {
    mocks.auth.mockResolvedValue({
      session: { securityVersion: 0, token: 'source' },
      user: actor({
        [PERMISSIONS.USERS.VIEW]: true,
        [PERMISSIONS.USERS.UPDATE_PROFILE]: true,
      }),
    });
    const response = await patch({ lastName: '   ' });
    expect(response.status).toBe(200);
    expect((await response.json()).data.user).toMatchObject({
      contactEmail: null,
      firstName: 'Fictif',
      lastName: '',
    });
    expect(mocks.audit).toHaveBeenCalledTimes(1);
  });

  it('blocks a delegated write after effective profile permission is revoked', async () => {
    mocks.auth.mockResolvedValue({
      session: null,
      user: actor({
        [PERMISSIONS.USERS.VIEW]: true,
        [PERMISSIONS.USERS.UPDATE_PROFILE]: false,
      }),
    });
    expect((await patch({ lastName: '' })).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
