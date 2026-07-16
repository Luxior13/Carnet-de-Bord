import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const transaction = {
    auditLog: { create: vi.fn() },
    loginNameReservation: { create: vi.fn() },
    rateLimit: { deleteMany: vi.fn() },
    session: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
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
        findMany: vi.fn(),
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

import { PERMISSIONS } from '$constants/permissions.constants';
import {
  authenticateUser,
  createAuditLog,
  createSession,
  createUser,
  getAuthSession,
  ProtectedAccountMutationError,
  resetUserPassword,
  SecurityVersionMismatchError,
  updateUserPassword,
} from '$server/auth';

const SESSION_USER = {
  contactEmail: 'user@example.com',
  contactEmailVerifiedAt: new Date('2026-01-02T00:00:00.000Z'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  failedLoginAttempts: 0,
  firstName: 'Jean',
  id: 'user-1',
  isActive: true,
  isProtected: false,
  lastLoginAt: new Date('2026-07-01T00:00:00.000Z'),
  lastName: 'Dupont',
  lockedUntil: null,
  loginName: 'user.name',
  mfaEnabledAt: null as Date | null,
  mustChangePassword: false,
  passwordChangedAt: new Date('2026-01-01T00:00:00.000Z'),
  permissions: null as Record<string, boolean> | null,
  role: 'USER' as const,
  securityVersion: 3,
  totpCredential: null as { userId: string } | null,
};

type StoredSession = {
  expiresAt: Date;
  idleExpiresAt: Date;
  lastSeenAt: Date;
  mfaMethod: null | 'RECOVERY_CODE' | 'TOTP';
  mfaVerifiedAt: Date | null;
  rememberMe: boolean;
  securityVersion: number;
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
  mfaMethod: null,
  mfaVerifiedAt: null,
  rememberMe: false,
  securityVersion: 3,
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
    mocks.transaction.session.updateMany.mockResolvedValue({ count: 1 });
    mocks.transaction.user.findMany.mockImplementation(
      async ({ where }: { where: { id: { in: string[] } } }) => {
        const users = [
          {
            firstName: 'Jean',
            id: 'user-1',
            lastName: 'Dupont',
            loginName: 'user.name',
            role: 'USER' as const,
          },
          {
            firstName: 'Ada',
            id: 'admin-1',
            lastName: 'Admin',
            loginName: 'admin',
            role: 'ADMIN' as const,
          },
          {
            firstName: 'New',
            id: 'new-user',
            lastName: 'User',
            loginName: 'new.user',
            role: 'USER' as const,
          },
        ];

        return users.filter((user) => where.id.in.includes(user.id));
      },
    );
    mocks.transaction.user.update.mockResolvedValue({ id: 'user-1' });
    mocks.transaction.user.updateMany.mockResolvedValue({ count: 1 });
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

    const result = await createSession(
      'raw-session-token',
      'user-1',
      3,
      false,
      {
        action: 'LOGIN_SUCCESS',
        category: 'AUTH',
        description: 'Connexion réussie',
        metadata: { pageKey: 'authentication' },
        userId: 'user-1',
      },
    );

    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.session.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        expiresAt,
        idleExpiresAt,
        ipAddress: '203.0.113.9',
        lastSeenAt: loginAt,
        rememberMe: false,
        securityVersion: 3,
        token: expect.not.stringMatching(/^raw-session-token$/),
        userAgent: 'Regression Browser',
        userId: 'user-1',
      }),
    });
    expect(mocks.transaction.user.updateMany).toHaveBeenCalledWith({
      data: { lastLoginAt: expect.any(Date) },
      where: {
        deletedAt: null,
        id: 'user-1',
        isActive: true,
        isProtected: false,
        mfaEnabledAt: null,
        securityVersion: 3,
      },
    });
    expect(mocks.transaction.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'LOGIN_SUCCESS',
        actorDisplayNameSnapshot: 'Jean Dupont',
        actorLoginNameSnapshot: 'user.name',
        actorRoleSnapshot: 'USER',
        eventKind: 'CONNECTION',
        eventVersion: 1,
        ipAddress: '203.0.113.9',
        metadata: expect.objectContaining({
          requestId: '123e4567-e89b-42d3-a456-426614174000',
        }),
        outcome: 'SUCCESS',
        requestId: '123e4567-e89b-42d3-a456-426614174000',
        severity: 'INFO',
        stream: 'AUTHENTICATION',
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

  it('bounds audit payloads before touching the database', async () => {
    await expect(
      createAuditLog(
        {
          action: 'USER_UPDATE',
          category: 'USER',
          description: 'Valid description',
          metadata: { pageKey: 'Invalid page key' },
        },
        mocks.transaction,
      ),
    ).rejects.toThrow('Invalid audit location key');
    await expect(
      createAuditLog(
        {
          action: 'USER_UPDATE',
          category: 'USER',
          description: 'Valid description',
          metadata: { payload: 'x'.repeat(65 * 1024) },
        },
        mocks.transaction,
      ),
    ).rejects.toThrow('64 KiB');

    expect(mocks.transaction.user.findMany).not.toHaveBeenCalled();
    expect(mocks.transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it('truncates untrusted audit request headers to bounded columns', async () => {
    await createAuditLog(
      {
        action: 'USER_UPDATE',
        category: 'USER',
        description: 'Valid description',
        ipAddress: '1'.repeat(100),
        requestId: 'r'.repeat(300),
        userAgent: 'u'.repeat(2_000),
      },
      mocks.transaction,
    );

    expect(mocks.transaction.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ipAddress: '1'.repeat(64),
        requestId: 'r'.repeat(191),
        userAgent: 'u'.repeat(1_024),
      }),
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
      3,
      true,
    );

    expect(mocks.transaction.session.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        expiresAt,
        idleExpiresAt,
        lastSeenAt: loginAt,
        rememberMe: true,
        securityVersion: 3,
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

  it('does not issue a session when the authenticated security version became stale', async () => {
    mocks.transaction.user.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      createSession('raw-session-token', 'user-1', 3),
    ).rejects.toBeInstanceOf(SecurityVersionMismatchError);

    expect(mocks.transaction.session.create).not.toHaveBeenCalled();
    expect(mocks.transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it('runs the MFA proof precondition before creating an MFA-bound session', async () => {
    const authenticatedAt = new Date('2026-07-13T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(authenticatedAt);
    const precondition = vi.fn(async () => undefined);

    await createSession('raw-session-token', 'user-1', 3, false, undefined, {
      mfaMethod: 'TOTP',
      precondition,
      requireMfaEnabled: true,
    });

    expect(mocks.transaction.user.updateMany).toHaveBeenCalledWith({
      data: { lastLoginAt: authenticatedAt },
      where: {
        deletedAt: null,
        id: 'user-1',
        isActive: true,
        mfaEnabledAt: { not: null },
        securityVersion: 3,
      },
    });
    expect(precondition).toHaveBeenCalledWith(
      mocks.transaction,
      authenticatedAt,
    );
    expect(precondition.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.transaction.session.create.mock.invocationCallOrder[0] ?? 0,
    );
    expect(mocks.transaction.session.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        mfaMethod: 'TOTP',
        mfaVerifiedAt: authenticatedAt,
        securityVersion: 3,
        userId: 'user-1',
      }),
    });
  });

  it('does not create a session when the MFA proof precondition fails', async () => {
    const preconditionError = new Error('proof already consumed');

    await expect(
      createSession('raw-session-token', 'user-1', 3, false, undefined, {
        mfaMethod: 'TOTP',
        precondition: vi.fn(async () => {
          throw preconditionError;
        }),
        requireMfaEnabled: true,
      }),
    ).rejects.toBe(preconditionError);

    expect(mocks.transaction.session.create).not.toHaveBeenCalled();
    expect(mocks.transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it('rotates a source session without extending its deadlines or last-login time', async () => {
    const rotatedAt = new Date('2026-07-13T12:00:00.000Z');
    const sourceExpiresAt = new Date('2026-07-13T20:00:00.000Z');
    const sourceIdleExpiresAt = new Date('2026-07-13T12:20:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(rotatedAt);
    mocks.transaction.session.findUnique.mockResolvedValueOnce({
      expiresAt: sourceExpiresAt,
      idleExpiresAt: sourceIdleExpiresAt,
      ipAddress: '192.0.2.10',
      rememberMe: true,
      userAgent: 'Original Browser',
    });
    mocks.transaction.session.create.mockResolvedValueOnce({
      expiresAt: sourceExpiresAt,
      idleExpiresAt: sourceIdleExpiresAt,
      lastSeenAt: rotatedAt,
      rememberMe: true,
    });

    const result = await createSession(
      'replacement-token',
      'user-1',
      3,
      false,
      undefined,
      {
        advanceSecurityVersion: true,
        mfaMethod: 'TOTP',
        requireMfaEnabled: true,
        revokeExistingSessions: true,
        sourceSessionToken: 'source-session-hash',
      },
    );

    expect(mocks.transaction.user.updateMany).toHaveBeenCalledWith({
      data: { securityVersion: { increment: 1 } },
      where: expect.objectContaining({
        id: 'user-1',
        mfaEnabledAt: { not: null },
        securityVersion: 3,
      }),
    });
    expect(mocks.transaction.session.updateMany).toHaveBeenCalledWith({
      data: { lastSeenAt: rotatedAt },
      where: {
        expiresAt: { gt: rotatedAt },
        idleExpiresAt: { gt: rotatedAt },
        securityVersion: 3,
        token: 'source-session-hash',
        userId: 'user-1',
      },
    });
    expect(mocks.transaction.session.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        expiresAt: sourceExpiresAt,
        idleExpiresAt: sourceIdleExpiresAt,
        ipAddress: '192.0.2.10',
        rememberMe: true,
        securityVersion: 4,
        userAgent: 'Original Browser',
      }),
    });
    expect(result).toMatchObject({
      expiresAt: sourceExpiresAt,
      idleExpiresAt: sourceIdleExpiresAt,
      rememberMe: true,
      token: 'replacement-token',
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

  it('deletes a session issued under an obsolete security version', async () => {
    mocks.cookieStore.get.mockReturnValue({ value: 'raw-session-token' });
    mocks.prisma.session.findUnique.mockResolvedValueOnce(
      buildStoredSession({
        user: { ...SESSION_USER, securityVersion: 4 },
      }),
    );

    await expect(getAuthSession(false)).resolves.toEqual({
      session: null,
      user: null,
    });

    expect(mocks.prisma.session.deleteMany).toHaveBeenCalledWith({
      where: {
        securityVersion: 3,
        token: 'stored-session-hash',
      },
    });
    expect(mocks.prisma.session.updateMany).not.toHaveBeenCalled();
    expect(mocks.cookieStore.delete).toHaveBeenCalledWith('session');
  });

  it('rejects every password-only session for the protected root', async () => {
    mocks.cookieStore.get.mockReturnValue({ value: 'raw-session-token' });
    mocks.prisma.session.findUnique.mockResolvedValueOnce(
      buildStoredSession({
        user: {
          ...SESSION_USER,
          id: 'root-user',
          isProtected: true,
          mfaEnabledAt: null,
        },
        userId: 'root-user',
      }),
    );

    await expect(getAuthSession(false)).resolves.toEqual({
      session: null,
      user: null,
    });
    expect(mocks.prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { token: 'stored-session-hash' },
    });
  });

  it('rejects a USER session without MFA when critical access becomes effective', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-13T12:00:00.000Z'));
    mocks.cookieStore.get.mockReturnValue({ value: 'raw-session-token' });
    mocks.prisma.session.findUnique.mockResolvedValueOnce(
      buildStoredSession({
        user: {
          ...SESSION_USER,
          permissions: {
            [PERMISSIONS.USERS.UPDATE_LOGIN]: true,
            [PERMISSIONS.USERS.VIEW]: true,
          },
        },
      }),
    );

    await expect(getAuthSession(false)).resolves.toEqual({
      session: null,
      user: null,
    });
    expect(mocks.prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { token: 'stored-session-hash' },
    });
    expect(mocks.prisma.session.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a password-only session after MFA has been enabled', async () => {
    mocks.cookieStore.get.mockReturnValue({ value: 'raw-session-token' });
    mocks.prisma.session.findUnique.mockResolvedValueOnce(
      buildStoredSession({
        user: {
          ...SESSION_USER,
          mfaEnabledAt: new Date('2026-07-10T12:00:00.000Z'),
        },
      }),
    );

    await expect(getAuthSession(false)).resolves.toEqual({
      session: null,
      user: null,
    });
    expect(mocks.prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { token: 'stored-session-hash' },
    });
  });

  it('rejects a session when a credential exists without the enabled marker', async () => {
    mocks.cookieStore.get.mockReturnValue({ value: 'raw-session-token' });
    mocks.prisma.session.findUnique.mockResolvedValueOnce(
      buildStoredSession({
        user: {
          ...SESSION_USER,
          mfaEnabledAt: null,
          totpCredential: { userId: 'user-1' },
        },
      }),
    );

    await expect(getAuthSession(false)).resolves.toEqual({
      session: null,
      user: null,
    });
    expect(mocks.prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { token: 'stored-session-hash' },
    });
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
        securityVersion: 3,
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
      expectedSecurityVersion: 3,
      rateLimitKey: 'password-change:user-1',
    });

    expect(mocks.bcryptHash).toHaveBeenCalledWith(' NewPassword1! ', 12);
    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.user.updateMany).toHaveBeenCalledWith({
      data: expect.objectContaining({
        passwordHash: 'hash: NewPassword1! ',
        securityVersion: { increment: 1 },
      }),
      where: { id: 'user-1', securityVersion: 3 },
    });
    expect(mocks.transaction.session.updateMany).toHaveBeenCalledWith({
      data: { securityVersion: 4 },
      where: {
        securityVersion: 3,
        token: {
          in: ['current-session-hash', expect.stringMatching(/^[0-9a-f]{64}$/)],
        },
        userId: 'user-1',
      },
    });
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

  it('rejects a password change started from an obsolete security version', async () => {
    mocks.transaction.user.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      updateUserPassword('user-1', 'NewPassword1!', {
        currentSessionToken: 'current-session-hash',
        expectedSecurityVersion: 3,
      }),
    ).rejects.toBeInstanceOf(SecurityVersionMismatchError);

    expect(mocks.transaction.session.updateMany).not.toHaveBeenCalled();
    expect(mocks.transaction.session.deleteMany).not.toHaveBeenCalled();
  });

  it('rejects a password change if its current session disappeared', async () => {
    mocks.transaction.session.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      updateUserPassword('user-1', 'NewPassword1!', {
        currentSessionToken: 'current-session-hash',
        expectedSecurityVersion: 3,
      }),
    ).rejects.toBeInstanceOf(SecurityVersionMismatchError);

    expect(mocks.transaction.session.deleteMany).not.toHaveBeenCalled();
  });

  it('creates the user and its audit in one transaction', async () => {
    const createdUser = {
      contactEmail: 'new@example.com',
      contactEmailVerifiedAt: null,
      createdAt: new Date('2026-07-12T00:00:00.000Z'),
      deletedAt: null,
      failedLoginAttempts: 0,
      firstName: 'New',
      id: 'new-user',
      isActive: true,
      isProtected: false,
      lastLoginAt: null,
      lastName: 'User',
      lockedUntil: null,
      loginName: 'new.user',
      mustChangePassword: true,
      passwordChangedAt: null,
      passwordHash: 'hash:TempPassword1!',
      permissions: null,
      role: 'USER' as const,
      securityVersion: 0,
      updatedAt: new Date('2026-07-12T00:00:00.000Z'),
    };
    mocks.transaction.user.create.mockResolvedValueOnce(createdUser);

    const result = await createUser(
      {
        contactEmail: 'NEW@example.com',
        firstName: ' New ',
        lastName: ' User ',
        loginName: 'NEW.USER',
        password: 'TempPassword1!',
        role: 'USER',
      },
      (user) => ({
        action: 'USER_CREATE',
        category: 'USER',
        description: `Utilisateur créé: ${user.loginName}`,
        targetUserId: user.id,
        userId: 'admin-1',
      }),
    );

    expect(result).toBe(createdUser);
    expect(mocks.transaction.user.create).toHaveBeenCalledWith({
      data: {
        contactEmail: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        loginName: 'new.user',
        mustChangePassword: true,
        passwordHash: 'hash:TempPassword1!',
        role: 'USER',
      },
    });
    expect(mocks.transaction.loginNameReservation.create).toHaveBeenCalledWith({
      data: {
        loginName: 'new.user',
        userId: 'new-user',
      },
    });
    expect(mocks.transaction.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'USER_CREATE',
        targetUserId: 'new-user',
      }),
    });
  });

  it('aborts user creation when the login name has a permanent reservation', async () => {
    mocks.transaction.user.create.mockResolvedValueOnce({ id: 'new-user' });
    mocks.transaction.loginNameReservation.create.mockRejectedValueOnce(
      Object.assign(new Error('Unique constraint'), { code: 'P2002' }),
    );

    await expect(
      createUser({
        firstName: 'New',
        lastName: 'User',
        loginName: 'retired.login',
        password: 'TempPassword1!',
        role: 'USER',
      }),
    ).rejects.toMatchObject({ code: 'P2002' });

    expect(mocks.transaction.loginNameReservation.create).toHaveBeenCalledWith({
      data: {
        loginName: 'retired.login',
        userId: 'new-user',
      },
    });
    expect(mocks.transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it('resets password and revokes every session in the same transaction', async () => {
    const temporaryPassword = await resetUserPassword('user-1', {
      ...audit,
      action: 'PASSWORD_RESET',
    });

    expect(temporaryPassword).toHaveLength(14);
    expect(mocks.transaction.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          failedLoginAttempts: 0,
          mustChangePassword: true,
          securityVersion: { increment: 1 },
        }),
        where: { id: 'user-1', isProtected: false },
      }),
    );
    expect(mocks.transaction.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(mocks.transaction.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('refuses a direct administrative password reset of the protected root account', async () => {
    mocks.transaction.user.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      resetUserPassword('root-user', {
        ...audit,
        action: 'PASSWORD_RESET',
        targetUserId: 'root-user',
      }),
    ).rejects.toBeInstanceOf(ProtectedAccountMutationError);

    expect(mocks.transaction.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'root-user', isProtected: false },
      }),
    );
    expect(mocks.transaction.session.deleteMany).not.toHaveBeenCalled();
    expect(mocks.transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it('propagates a required audit failure through the transaction', async () => {
    mocks.transaction.auditLog.create.mockRejectedValueOnce(
      new Error('audit unavailable'),
    );

    await expect(
      updateUserPassword('user-1', 'NewPassword1!', {
        audit,
        currentSessionToken: 'current-session-hash',
        expectedSecurityVersion: 3,
      }),
    ).rejects.toThrow('audit unavailable');
  });

  it('locks and audits the fifth failed login atomically', async () => {
    mocks.bcryptCompare.mockResolvedValueOnce(false);
    mocks.prisma.user.findUnique.mockResolvedValueOnce({
      contactEmail: 'user@example.com',
      contactEmailVerifiedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      failedLoginAttempts: 4,
      firstName: 'Jean',
      id: 'user-1',
      isActive: true,
      isProtected: false,
      lastLoginAt: null,
      lastName: 'Dupont',
      lockedUntil: null,
      loginName: 'user.name',
      mustChangePassword: false,
      passwordChangedAt: null,
      passwordHash: 'stored-hash',
      permissions: null,
      role: 'USER',
      securityVersion: 3,
    });
    mocks.transaction.user.update
      .mockResolvedValueOnce({ failedLoginAttempts: 5 })
      .mockResolvedValueOnce({ id: 'user-1' });

    const result = await authenticateUser('USER.NAME', 'Wrong1!');

    expect(mocks.prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null, loginName: 'user.name' },
      }),
    );

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
        targetUserId: 'user-1',
        userId: null,
      }),
    });
  });

  it('does not persist failed-attempt or lock mutations on the protected root account', async () => {
    mocks.bcryptCompare.mockResolvedValueOnce(false);
    mocks.prisma.user.findUnique.mockResolvedValueOnce({
      contactEmail: 'root@example.com',
      contactEmailVerifiedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      failedLoginAttempts: 0,
      firstName: 'Lucas',
      id: 'root-user',
      isActive: true,
      isProtected: true,
      lastLoginAt: null,
      lastName: 'These',
      lockedUntil: null,
      loginName: 'superadmin',
      mustChangePassword: false,
      passwordChangedAt: null,
      passwordHash: 'stored-hash',
      permissions: null,
      role: 'ADMIN',
      securityVersion: 3,
    });

    const result = await authenticateUser('superadmin', 'Wrong1!');

    expect(result).toEqual({
      error: 'INVALID_CREDENTIALS',
      success: false,
      userId: 'root-user',
    });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
    expect(mocks.transaction.user.update).not.toHaveBeenCalled();
    expect(mocks.transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it('returns cleaned login state after an expired lock with one update', async () => {
    mocks.bcryptCompare.mockResolvedValueOnce(true);
    mocks.prisma.user.findUnique.mockResolvedValueOnce({
      contactEmail: 'user@example.com',
      contactEmailVerifiedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      failedLoginAttempts: 5,
      firstName: 'Jean',
      id: 'user-1',
      isActive: true,
      isProtected: false,
      lastLoginAt: null,
      lastName: 'Dupont',
      lockedUntil: new Date('2020-01-01T00:00:00.000Z'),
      loginName: 'user.name',
      mustChangePassword: false,
      passwordChangedAt: null,
      passwordHash: 'stored-hash',
      permissions: null,
      role: 'USER',
      securityVersion: 3,
    });
    mocks.prisma.user.update.mockResolvedValueOnce({ id: 'user-1' });

    const result = await authenticateUser('user.name', 'Correct1!');

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
