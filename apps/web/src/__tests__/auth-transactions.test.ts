import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const transaction = {
    auditLog: { create: vi.fn() },
    rateLimit: { deleteMany: vi.fn() },
    session: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  return {
    bcryptCompare: vi.fn(),
    bcryptHash: vi.fn(),
    cookieStore: {
      delete: vi.fn(),
      get: vi.fn(),
      set: vi.fn(),
    },
    loggerError: vi.fn(),
    prisma: {
      $transaction: vi.fn(),
      auditLog: { create: vi.fn() },
      session: {
        deleteMany: vi.fn(),
        findUnique: vi.fn(),
        updateMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    },
    transaction,
  };
});

vi.mock('server-only', () => ({}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: mocks.bcryptCompare,
    hash: mocks.bcryptHash,
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mocks.cookieStore),
  headers: vi.fn(
    async () =>
      new Headers({
        'user-agent': 'Regression Browser',
        'x-forwarded-for': '198.51.100.7, 203.0.113.9',
        'x-request-id': '123e4567-e89b-42d3-a456-426614174000',
      }),
  ),
}));

vi.mock('$env', () => ({
  env: { NODE_ENV: 'development' },
}));

vi.mock('$server/logger', () => ({
  logger: { error: mocks.loggerError },
}));

vi.mock('$server/prisma', () => ({
  prisma: mocks.prisma,
}));

import {
  authenticateUser,
  createSession,
  createUser,
  getAuthSession,
  resetUserPassword,
  updateUserPassword,
} from '$server/auth';

const SESSION_USER = {
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  email: 'user@example.com',
  failedLoginAttempts: 0,
  firstName: 'Jean',
  id: 'user-1',
  isActive: true,
  isProtected: false,
  lastLoginAt: new Date('2026-07-01T00:00:00.000Z'),
  lastName: 'Dupont',
  lockedUntil: null,
  mustChangePassword: false,
  passwordChangedAt: new Date('2026-01-01T00:00:00.000Z'),
  permissions: null,
  role: 'USER' as const,
};

type StoredSession = {
  expiresAt: Date;
  idleExpiresAt: Date;
  lastSeenAt: Date;
  rememberMe: boolean;
  token: string;
  user: typeof SESSION_USER;
  userId: string;
};

const buildStoredSession = (
  overrides: Partial<StoredSession> = {},
): StoredSession => ({
  expiresAt: new Date('2026-07-14T12:00:00.000Z'),
  idleExpiresAt: new Date('2026-07-13T12:30:00.000Z'),
  lastSeenAt: new Date('2026-07-13T12:00:00.000Z'),
  rememberMe: false,
  token: 'stored-session-hash',
  user: SESSION_USER,
  userId: 'user-1',
  ...overrides,
});

const audit = {
  action: 'PASSWORD_CHANGE' as const,
  category: 'AUTH' as const,
  description: 'Security mutation',
  metadata: {
    pageKey: 'account',
    poleKey: 'account',
    tabKey: 'security',
  },
  targetUserId: 'user-1',
  userId: 'user-1',
};

describe('auth security transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.bcryptHash.mockImplementation(
      async (password: string) => `hash:${password}`,
    );
    mocks.prisma.$transaction.mockImplementation(
      async (callback: (client: typeof mocks.transaction) => unknown) =>
        callback(mocks.transaction),
    );
    mocks.transaction.auditLog.create.mockResolvedValue({ id: 'audit-1' });
    mocks.transaction.rateLimit.deleteMany.mockResolvedValue({ count: 1 });
    mocks.transaction.session.create.mockResolvedValue({
      expiresAt: new Date('2026-07-13T00:00:00.000Z'),
      idleExpiresAt: new Date('2026-07-13T00:00:00.000Z'),
      lastSeenAt: new Date('2026-07-13T00:00:00.000Z'),
      rememberMe: false,
    });
    mocks.transaction.session.deleteMany.mockResolvedValue({ count: 2 });
    mocks.transaction.user.update.mockResolvedValue({ id: 'user-1' });
    mocks.prisma.session.deleteMany.mockResolvedValue({ count: 1 });
    mocks.prisma.session.updateMany.mockResolvedValue({ count: 1 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a normal session with a one-day absolute limit and a thirty-minute idle limit', async () => {
    const loginAt = new Date('2026-07-13T12:00:00.000Z');
    const expiresAt = new Date('2026-07-14T12:00:00.000Z');
    const idleExpiresAt = new Date('2026-07-13T12:30:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(loginAt);
    mocks.transaction.session.create.mockResolvedValueOnce({
      expiresAt,
      idleExpiresAt,
      lastSeenAt: loginAt,
      rememberMe: false,
    });

    const result = await createSession('raw-session-token', 'user-1', false, {
      action: 'LOGIN_SUCCESS',
      category: 'AUTH',
      description: 'Connexion réussie',
      metadata: { pageKey: 'authentication' },
      userId: 'user-1',
    });

    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.session.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        expiresAt,
        idleExpiresAt,
        ipAddress: '203.0.113.9',
        lastSeenAt: loginAt,
        rememberMe: false,
        token: expect.not.stringMatching(/^raw-session-token$/),
        userAgent: 'Regression Browser',
        userId: 'user-1',
      }),
    });
    expect(mocks.transaction.user.update).toHaveBeenCalledWith({
      data: { lastLoginAt: expect.any(Date) },
      where: { id: 'user-1' },
    });
    expect(mocks.transaction.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'LOGIN_SUCCESS',
        ipAddress: '203.0.113.9',
        metadata: expect.objectContaining({
          requestId: '123e4567-e89b-42d3-a456-426614174000',
        }),
        userId: 'user-1',
      }),
    });
    expect(result).toEqual({
      expiresAt,
      idleExpiresAt,
      lastSeenAt: loginAt,
      rememberMe: false,
      token: 'raw-session-token',
    });
  });

  it('creates a remembered session with a thirty-day absolute limit and a seven-day idle limit', async () => {
    const loginAt = new Date('2026-07-13T12:00:00.000Z');
    const expiresAt = new Date('2026-08-12T12:00:00.000Z');
    const idleExpiresAt = new Date('2026-07-20T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(loginAt);
    mocks.transaction.session.create.mockResolvedValueOnce({
      expiresAt,
      idleExpiresAt,
      lastSeenAt: loginAt,
      rememberMe: true,
    });

    const result = await createSession(
      'remembered-session-token',
      'user-1',
      true,
    );

    expect(mocks.transaction.session.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        expiresAt,
        idleExpiresAt,
        lastSeenAt: loginAt,
        rememberMe: true,
      }),
    });
    expect(result).toEqual({
      expiresAt,
      idleExpiresAt,
      lastSeenAt: loginAt,
      rememberMe: true,
      token: 'remembered-session-token',
    });
  });

  it.each([
    {
      label: 'absolute limit',
      overrides: {
        expiresAt: new Date('2026-07-13T11:59:59.999Z'),
        idleExpiresAt: new Date('2026-07-13T12:30:00.000Z'),
      },
    },
    {
      label: 'idle limit',
      overrides: {
        expiresAt: new Date('2026-07-14T12:00:00.000Z'),
        idleExpiresAt: new Date('2026-07-13T11:59:59.999Z'),
      },
    },
  ])('deletes a session expired by its $label', async ({ overrides }) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-13T12:00:00.000Z'));
    mocks.cookieStore.get.mockReturnValue({ value: 'raw-session-token' });
    mocks.prisma.session.findUnique.mockResolvedValueOnce(
      buildStoredSession(overrides),
    );

    await expect(getAuthSession(false)).resolves.toEqual({
      session: null,
      user: null,
    });

    expect(mocks.prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { token: 'stored-session-hash' },
    });
    expect(mocks.prisma.session.updateMany).not.toHaveBeenCalled();
    expect(mocks.cookieStore.delete).toHaveBeenCalledWith('session');
  });

  it('touches an active session after one minute without extending its absolute limit', async () => {
    const activityAt = new Date('2026-07-13T12:00:00.000Z');
    const expiresAt = new Date('2026-07-14T12:00:00.000Z');
    const nextIdleExpiresAt = new Date('2026-07-13T12:30:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(activityAt);
    mocks.cookieStore.get.mockReturnValue({ value: 'raw-session-token' });
    mocks.prisma.session.findUnique.mockResolvedValueOnce(
      buildStoredSession({
        expiresAt,
        idleExpiresAt: new Date('2026-07-13T12:10:00.000Z'),
        lastSeenAt: new Date('2026-07-13T11:58:00.000Z'),
      }),
    );

    const result = await getAuthSession(false);

    expect(mocks.prisma.session.updateMany).toHaveBeenCalledWith({
      data: {
        idleExpiresAt: nextIdleExpiresAt,
        lastSeenAt: activityAt,
      },
      where: {
        expiresAt: { gt: activityAt },
        idleExpiresAt: { gt: activityAt },
        lastSeenAt: { lte: new Date('2026-07-13T11:59:00.000Z') },
        token: 'stored-session-hash',
      },
    });
    expect(
      mocks.prisma.session.updateMany.mock.calls[0]?.[0]?.data,
    ).not.toHaveProperty('expiresAt');
    expect(result.session).toMatchObject({
      expiresAt,
      idleExpiresAt: nextIdleExpiresAt,
      lastSeenAt: activityAt,
    });
  });

  it('does not write activity again inside the one-minute throttle window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-13T12:00:00.000Z'));
    mocks.cookieStore.get.mockReturnValue({ value: 'raw-session-token' });
    mocks.prisma.session.findUnique.mockResolvedValueOnce(
      buildStoredSession({
        lastSeenAt: new Date('2026-07-13T11:59:30.000Z'),
      }),
    );

    const result = await getAuthSession(false);

    expect(result.user?.id).toBe('user-1');
    expect(mocks.prisma.session.updateMany).not.toHaveBeenCalled();
  });

  it('migrates a legacy plaintext token with an idempotent update', async () => {
    const legacyToken = 'a'.repeat(52);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-13T12:00:00.000Z'));
    mocks.cookieStore.get.mockReturnValue({ value: legacyToken });
    mocks.prisma.session.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        buildStoredSession({
          lastSeenAt: new Date('2026-07-13T12:00:00.000Z'),
          token: legacyToken,
        }),
      );

    const result = await getAuthSession(false);

    expect(mocks.prisma.session.findUnique).toHaveBeenCalledTimes(2);
    expect(mocks.prisma.session.updateMany).toHaveBeenCalledWith({
      data: { token: expect.not.stringMatching(legacyToken) },
      where: { token: legacyToken },
    });
    expect(result.session?.token).not.toBe(legacyToken);
    expect(result.user?.id).toBe('user-1');
  });

  it('caps the refreshed idle limit at the absolute expiration', async () => {
    const activityAt = new Date('2026-07-13T12:00:00.000Z');
    const expiresAt = new Date('2026-07-13T12:10:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(activityAt);
    mocks.cookieStore.get.mockReturnValue({ value: 'raw-session-token' });
    mocks.prisma.session.findUnique.mockResolvedValueOnce(
      buildStoredSession({
        expiresAt,
        idleExpiresAt: new Date('2026-07-13T12:05:00.000Z'),
        lastSeenAt: new Date('2026-07-13T11:58:00.000Z'),
      }),
    );

    const result = await getAuthSession(false);

    expect(mocks.prisma.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          idleExpiresAt: expiresAt,
          lastSeenAt: activityAt,
        },
      }),
    );
    expect(result.session?.idleExpiresAt).toEqual(expiresAt);
    expect(result.session?.expiresAt).toEqual(expiresAt);
  });

  it('keeps password whitespace and mutates password, sessions, limiter and audit in one transaction', async () => {
    await updateUserPassword('user-1', ' NewPassword1! ', {
      audit,
      currentSessionToken: 'current-session-hash',
      rateLimitKey: 'password-change:user-1',
    });

    expect(mocks.bcryptHash).toHaveBeenCalledWith(' NewPassword1! ', 12);
    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordHash: 'hash: NewPassword1! ',
        }),
      }),
    );
    expect(mocks.transaction.session.deleteMany).toHaveBeenCalledWith({
      where: {
        token: {
          notIn: [
            'current-session-hash',
            expect.stringMatching(/^[0-9a-f]{64}$/),
          ],
        },
        userId: 'user-1',
      },
    });
    expect(mocks.transaction.rateLimit.deleteMany).toHaveBeenCalledWith({
      where: { key: 'password-change:user-1' },
    });
    expect(mocks.transaction.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('creates the user and its audit in one transaction', async () => {
    const createdUser = {
      createdAt: new Date('2026-07-12T00:00:00.000Z'),
      deletedAt: null,
      email: 'new@example.com',
      failedLoginAttempts: 0,
      firstName: 'New',
      id: 'new-user',
      isActive: true,
      isProtected: false,
      lastLoginAt: null,
      lastName: 'User',
      lockedUntil: null,
      mustChangePassword: true,
      passwordChangedAt: null,
      passwordHash: 'hash:TempPassword1!',
      permissions: null,
      role: 'USER' as const,
      updatedAt: new Date('2026-07-12T00:00:00.000Z'),
    };
    mocks.transaction.user.create.mockResolvedValueOnce(createdUser);

    const result = await createUser(
      {
        email: 'NEW@example.com',
        firstName: ' New ',
        lastName: ' User ',
        password: 'TempPassword1!',
        role: 'USER',
      },
      (user) => ({
        action: 'USER_CREATE',
        category: 'USER',
        description: `Utilisateur créé: ${user.email}`,
        targetUserId: user.id,
        userId: 'admin-1',
      }),
    );

    expect(result).toBe(createdUser);
    expect(mocks.transaction.user.create).toHaveBeenCalledWith({
      data: {
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        mustChangePassword: true,
        passwordHash: 'hash:TempPassword1!',
        role: 'USER',
      },
    });
    expect(mocks.transaction.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'USER_CREATE',
        targetUserId: 'new-user',
      }),
    });
  });

  it('resets password and revokes every session in the same transaction', async () => {
    const temporaryPassword = await resetUserPassword('user-1', {
      ...audit,
      action: 'PASSWORD_RESET',
    });

    expect(temporaryPassword).toHaveLength(14);
    expect(mocks.transaction.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          failedLoginAttempts: 0,
          mustChangePassword: true,
        }),
      }),
    );
    expect(mocks.transaction.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(mocks.transaction.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('propagates a required audit failure through the transaction', async () => {
    mocks.transaction.auditLog.create.mockRejectedValueOnce(
      new Error('audit unavailable'),
    );

    await expect(
      updateUserPassword('user-1', 'NewPassword1!', { audit }),
    ).rejects.toThrow('audit unavailable');
  });

  it('locks and audits the fifth failed login atomically', async () => {
    mocks.bcryptCompare.mockResolvedValueOnce(false);
    mocks.prisma.user.findUnique.mockResolvedValueOnce({
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      email: 'user@example.com',
      failedLoginAttempts: 4,
      firstName: 'Jean',
      id: 'user-1',
      isActive: true,
      isProtected: false,
      lastLoginAt: null,
      lastName: 'Dupont',
      lockedUntil: null,
      mustChangePassword: false,
      passwordChangedAt: null,
      passwordHash: 'stored-hash',
      permissions: null,
      role: 'USER',
    });
    mocks.transaction.user.update
      .mockResolvedValueOnce({ failedLoginAttempts: 5 })
      .mockResolvedValueOnce({ id: 'user-1' });

    const result = await authenticateUser('user@example.com', 'Wrong1!');

    expect(result).toMatchObject({
      error: 'ACCOUNT_LOCKED',
      success: false,
      userId: 'user-1',
    });
    expect(mocks.transaction.user.update).toHaveBeenNthCalledWith(1, {
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
      where: { id: 'user-1' },
    });
    expect(mocks.transaction.user.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: { lockedUntil: expect.any(Date) },
      }),
    );
    expect(mocks.transaction.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'ACCOUNT_LOCKED',
        userId: 'user-1',
      }),
    });
  });

  it('returns cleaned login state after an expired lock with one update', async () => {
    mocks.bcryptCompare.mockResolvedValueOnce(true);
    mocks.prisma.user.findUnique.mockResolvedValueOnce({
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      email: 'user@example.com',
      failedLoginAttempts: 5,
      firstName: 'Jean',
      id: 'user-1',
      isActive: true,
      isProtected: false,
      lastLoginAt: null,
      lastName: 'Dupont',
      lockedUntil: new Date('2020-01-01T00:00:00.000Z'),
      mustChangePassword: false,
      passwordChangedAt: null,
      passwordHash: 'stored-hash',
      permissions: null,
      role: 'USER',
    });
    mocks.prisma.user.update.mockResolvedValueOnce({ id: 'user-1' });

    const result = await authenticateUser('user@example.com', 'Correct1!');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.failedLoginAttempts).toBe(0);
      expect(result.user.lockedUntil).toBeNull();
    }
    expect(mocks.prisma.user.update).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      data: { failedLoginAttempts: 0, lockedUntil: null },
      where: { id: 'user-1' },
    });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });
});
