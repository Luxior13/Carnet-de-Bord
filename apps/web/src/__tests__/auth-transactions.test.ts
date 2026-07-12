import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  resetUserPassword,
  updateUserPassword,
} from '$server/auth';

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
      rememberMe: false,
    });
    mocks.transaction.session.deleteMany.mockResolvedValue({ count: 2 });
    mocks.transaction.user.update.mockResolvedValue({ id: 'user-1' });
  });

  it('commits session creation, last login and success audit together', async () => {
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
        ipAddress: '203.0.113.9',
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
    expect(result.token).toBe('raw-session-token');
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
