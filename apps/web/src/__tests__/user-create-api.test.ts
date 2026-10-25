import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PERMISSIONS } from '$constants/permissions.constants';
import { ErrorCode } from '$types/api.types';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  find: vi.fn(),
  generate: vi.fn(),
  session: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('$env', () => ({ env: { NODE_ENV: 'test' } }));
vi.mock('$server/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('$server/prisma', () => ({
  prisma: { user: { findUnique: mocks.find } },
}));
vi.mock('$server/rate-limiter', () => ({
  reserveAuthenticatedApiRateLimit: vi.fn(async () => ({ allowed: true })),
}));
vi.mock('$server/temporary-password', async (importOriginal) => ({
  ...(await importOriginal<typeof import('$server/temporary-password')>()),
  generateTemporaryPassword: mocks.generate,
}));
vi.mock('$server/session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('$server/session')>()),
  getAuthSession: mocks.session,
}));

vi.mock('$features/users/server/user-create.service', () => ({
  createUser: mocks.create,
}));

const actor = (
  permissions: Record<string, boolean> = {},
  extra = {},
): Record<string, unknown> => ({
  id: 'creator',
  isProtected: false,
  mustChangePassword: false,
  permissions,
  role: 'USER',
  ...extra,
});
const created = {
  contactEmail: null,
  contactEmailVerifiedAt: null,
  createdAt: new Date(),
  firstName: 'Fictif',
  id: 'new-account',
  isActive: true,
  isProtected: false,
  lastLoginAt: null,
  lastName: '',
  loginName: 'new.account',
  mfaEnabledAt: null,
  mustChangePassword: true,
  passwordChangedAt: null,
  passwordHash: 'private-hash-marker',
  permissions: null,
  role: 'USER',
  securityVersion: 0,
};
const form = {
  firstName: ' Fictif ',
  lastName: '',
  loginName: ' New.Account ',
  role: 'USER',
};
const privileges = {
  [PERMISSIONS.USERS.VIEW]: true,
  [PERMISSIONS.USERS.CREATE]: true,
};
const call = async (data: unknown = form): Promise<Response> => {
  const { POST } = await import('$app/api/users/route');

  return POST(
    new Request('http://localhost/api/users', {
      body: JSON.stringify(data),
      method: 'POST',
    }) as never,
  );
};
describe('user creation HTTP and permission boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ session: null, user: actor(privileges) });
    mocks.find.mockResolvedValue(null);
    mocks.create.mockResolvedValue(created);
    mocks.generate.mockReturnValue('FictifTemp1!abc');
  });

  it('refuses an anonymous request before querying or generating a secret', async () => {
    mocks.session.mockResolvedValue({ session: null, user: null });
    expect((await call()).status).toBe(401);
    expect(mocks.find).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it.each<Record<string, boolean>>([
    {},
    { [PERMISSIONS.USERS.VIEW]: true },
    { [PERMISSIONS.USERS.CREATE]: true },
    { [PERMISSIONS.USERS.VIEW]: false, [PERMISSIONS.USERS.CREATE]: true },
  ])(
    'checks effective create permission including view dependency: %j',
    async (permissions) => {
      mocks.session.mockResolvedValue({
        session: null,
        user: actor(permissions),
      });
      const response = await call();
      expect(response.status).toBe(403);
      expect(mocks.find).not.toHaveBeenCalled();
      expect(mocks.create).not.toHaveBeenCalled();
    },
  );

  it('creates a standard account with optional empty contact and name', async () => {
    const response = await call();
    expect(response.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledWith(
      {
        contactEmail: null,
        firstName: 'Fictif',
        lastName: '',
        loginName: 'new.account',
        password: 'FictifTemp1!abc',
        role: 'USER',
      },
      { actorId: 'creator', session: null },
      expect.any(Function),
    );
    const body = await response.json();
    expect(body.data.temporaryPassword).toBe('FictifTemp1!abc');
    expect(body.data.user.mustChangePassword).toBe(true);
    expect(body.data.user).not.toHaveProperty('passwordHash');
    expect(body.data.user).not.toHaveProperty('securityVersion');
    const audit = mocks.create.mock.calls[0]?.[2](created);
    expect(audit).toMatchObject({
      action: 'USER_CREATE',
      targetUserId: 'new-account',
      userId: 'creator',
    });
    expect(JSON.stringify(audit)).not.toContain('FictifTemp1!abc');
    expect(JSON.stringify(audit)).not.toContain('private-hash-marker');
  });

  it.each([
    { role: 'SUPERADMIN' },
    { isProtected: true },
    { permissions: privileges },
    { password: 'chosen-by-caller' },
    { firstName: '   ' },
    { lastName: 'x'.repeat(51) },
    { contactEmail: 'bad..mail@example.test' },
    { loginName: 'x' },
  ])(
    'rejects invalid or injected creation fields before writing: %j',
    async (fields) => {
      expect((await call({ ...form, ...fields })).status).toBe(400);
      expect(mocks.generate).not.toHaveBeenCalled();
      expect(mocks.create).not.toHaveBeenCalled();
    },
  );

  it.each(['USER', 'ADMIN'])(
    'refuses ADMIN creation by an unprotected %s',
    async (role) => {
      mocks.session.mockResolvedValue({
        session: null,
        user: actor(privileges, { role }),
      });
      expect((await call({ ...form, role: 'ADMIN' })).status).toBe(403);
      expect(mocks.find).not.toHaveBeenCalled();
      expect(mocks.create).not.toHaveBeenCalled();
    },
  );

  it.each([
    null,
    { passwordReauthenticatedAt: new Date() },
    {
      criticalMfaVerifiedAt: new Date(Date.now() - 6 * 60_000),
      passwordReauthenticatedAt: new Date(),
    },
    {
      criticalMfaVerifiedAt: new Date(),
      passwordReauthenticatedAt: new Date(Date.now() - 31 * 60_000),
    },
  ])(
    'requires fresh password and critical MFA proofs for ADMIN',
    async (session) => {
      mocks.session.mockResolvedValue({
        session,
        user: actor({}, { isProtected: true, role: 'ADMIN' }),
      });
      const response = await call({ ...form, role: 'ADMIN' });
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe(
        ErrorCode.REAUTHENTICATION_REQUIRED,
      );
      expect(mocks.generate).not.toHaveBeenCalled();
      expect(mocks.create).not.toHaveBeenCalled();
    },
  );

  it('accepts root ADMIN creation only with both recent proofs', async () => {
    mocks.session.mockResolvedValue({
      session: {
        criticalMfaVerifiedAt: new Date(),
        passwordReauthenticatedAt: new Date(),
      },
      user: actor({}, { isProtected: true, role: 'ADMIN' }),
    });
    expect((await call({ ...form, role: 'ADMIN' })).status).toBe(200);
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'ADMIN' }),
      { actorId: 'creator', session: expect.any(Object) },
      expect.any(Function),
    );
  });

  it('associates an existing login with the field and never generates a replacement secret', async () => {
    mocks.find.mockResolvedValue({ id: 'existing' });
    const response = await call();
    expect(response.status).toBe(400);
    expect((await response.json()).error.details.loginName).toHaveLength(1);
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.find).toHaveBeenCalledWith({
      select: { id: true },
      where: { loginName: 'new.account' },
    });
  });

  it('reports a login or reservation collision as a field conflict without a secret', async () => {
    mocks.create.mockRejectedValueOnce(
      Object.assign(new Error('Unique constraint'), { code: 'P2002' }),
    );
    const response = await call();
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.details.loginName).toHaveLength(1);
    expect(body).not.toHaveProperty('data');
    expect(JSON.stringify(body)).not.toContain('FictifTemp1!abc');
  });
});
