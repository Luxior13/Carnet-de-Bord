import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorCode } from '$types/api.types';

const mocks = vi.hoisted(() => ({
  authenticateUser: vi.fn(),
  createAuditLogWithHeaders: vi.fn(),
  createLoginRateLimitKeys: vi.fn(),
  createSession: vi.fn(),
  generateSessionToken: vi.fn(),
  isSecurityVersionMismatchError: vi.fn(),
  recordSuccessfulLogin: vi.fn(),
  reserveLoginRateLimits: vi.fn(),
  setSessionTokenCookie: vi.fn(),
}));

const LOGIN_RATE_LIMIT_KEYS = {
  account: 'account-key',
  ip: 'ip-key',
  pair: 'pair-key',
};

vi.mock('server-only', () => ({}));

vi.mock('$server/auth', () => ({
  authenticateUser: mocks.authenticateUser,
  createAuditLogWithHeaders: mocks.createAuditLogWithHeaders,
  createSession: mocks.createSession,
  generateSessionToken: mocks.generateSessionToken,
  isSecurityVersionMismatchError: mocks.isSecurityVersionMismatchError,
  setSessionTokenCookie: mocks.setSessionTokenCookie,
}));

vi.mock('$server/logger', () => ({
  logger: { error: vi.fn() },
}));

vi.mock('$server/rate-limiter', () => ({
  createLoginRateLimitKeys: mocks.createLoginRateLimitKeys,
  recordSuccessfulLogin: mocks.recordSuccessfulLogin,
  reserveLoginRateLimits: mocks.reserveLoginRateLimits,
}));

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reserveLoginRateLimits.mockResolvedValue({
      allowed: true,
      remainingAttempts: 5,
    });
    mocks.createAuditLogWithHeaders.mockResolvedValue(undefined);
    mocks.createLoginRateLimitKeys.mockReturnValue(LOGIN_RATE_LIMIT_KEYS);
    mocks.isSecurityVersionMismatchError.mockReturnValue(false);
    mocks.recordSuccessfulLogin.mockResolvedValue(undefined);
  });

  it('passes passwords with surrounding spaces unchanged', async () => {
    mocks.authenticateUser.mockResolvedValue({
      error: 'INVALID_CREDENTIALS',
      success: false,
    });
    const { POST } = await import('$app/api/auth/login/route');

    const response = await POST(
      new NextRequest('http://localhost/api/auth/login', {
        body: JSON.stringify({
          loginName: ' USER.NAME ',
          password: ' Secret1! ',
        }),
        method: 'POST',
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.authenticateUser).toHaveBeenCalledWith(
      'user.name',
      ' Secret1! ',
    );
    expect(mocks.createLoginRateLimitKeys).toHaveBeenCalledWith(
      'unknown',
      'user.name',
    );
    expect(mocks.reserveLoginRateLimits).toHaveBeenCalledWith(
      LOGIN_RATE_LIMIT_KEYS,
    );
    expect(
      mocks.reserveLoginRateLimits.mock.invocationCallOrder[0],
    ).toBeLessThan(mocks.authenticateUser.mock.invocationCallOrder[0] ?? 0);
    expect(mocks.recordSuccessfulLogin).not.toHaveBeenCalled();
  });

  it('rejects a limited request before password verification with Retry-After', async () => {
    mocks.reserveLoginRateLimits.mockResolvedValue({
      allowed: false,
      remainingAttempts: 0,
      retryAfter: 731,
    });
    const { POST } = await import('$app/api/auth/login/route');

    const response = await POST(
      new NextRequest('http://localhost/api/auth/login', {
        body: JSON.stringify({
          loginName: 'user.name',
          password: 'Secret1!',
        }),
        headers: { 'x-forwarded-for': '203.0.113.7' },
        method: 'POST',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('731');
    expect(body.error.code).toBe(ErrorCode.RATE_LIMITED);
    expect(mocks.createLoginRateLimitKeys).toHaveBeenCalledWith(
      '203.0.113.7',
      'user.name',
    );
    expect(mocks.authenticateUser).not.toHaveBeenCalled();
    expect(mocks.recordSuccessfulLogin).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON without attempting authentication', async () => {
    const { POST } = await import('$app/api/auth/login/route');

    const response = await POST(
      new NextRequest('http://localhost/api/auth/login', {
        body: '{invalid',
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(mocks.authenticateUser).not.toHaveBeenCalled();
  });

  it.each([
    ['too short', 'ab'],
    ['leading separator', '.user'],
    ['trailing separator', 'user-'],
    ['non ASCII', 'usér'],
    ['too long', `a${'b'.repeat(31)}c`],
  ])('rejects an invalid login name: %s', async (_label, loginName) => {
    const { POST } = await import('$app/api/auth/login/route');

    const response = await POST(
      new NextRequest('http://localhost/api/auth/login', {
        body: JSON.stringify({ loginName, password: 'Secret1!' }),
        method: 'POST',
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.authenticateUser).not.toHaveBeenCalled();
  });

  it('rejects the legacy email credential field', async () => {
    const { POST } = await import('$app/api/auth/login/route');

    const response = await POST(
      new NextRequest('http://localhost/api/auth/login', {
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'Secret1!',
        }),
        method: 'POST',
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.authenticateUser).not.toHaveBeenCalled();
  });

  it('does not reveal disabled accounts in the public response', async () => {
    mocks.authenticateUser.mockResolvedValue({
      error: 'ACCOUNT_DISABLED',
      success: false,
      userId: 'disabled-user',
    });
    const { POST } = await import('$app/api/auth/login/route');

    const response = await POST(
      new NextRequest('http://localhost/api/auth/login', {
        body: JSON.stringify({
          loginName: 'disabled.user',
          password: 'Secret1!',
        }),
        method: 'POST',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toEqual({
      code: ErrorCode.INVALID_CREDENTIALS,
      message: 'Identifiant ou mot de passe incorrect',
    });
    expect(mocks.createAuditLogWithHeaders).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LOGIN_FAILED',
        metadata: expect.objectContaining({ loginName: 'disabled.user' }),
        targetUserId: 'disabled-user',
        userId: null,
      }),
    );
    expect(
      mocks.createAuditLogWithHeaders.mock.calls.at(-1)?.[0]?.metadata,
    ).not.toHaveProperty('email');
  });

  it('does not reveal locked accounts in the public response', async () => {
    mocks.authenticateUser.mockResolvedValue({
      error: 'ACCOUNT_LOCKED',
      lockedUntil: new Date('2026-07-12T23:30:00.000Z'),
      success: false,
      userId: 'locked-user',
    });
    const { POST } = await import('$app/api/auth/login/route');

    const response = await POST(
      new NextRequest('http://localhost/api/auth/login', {
        body: JSON.stringify({
          loginName: 'locked.user',
          password: 'Secret1!',
        }),
        method: 'POST',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toEqual({
      code: ErrorCode.INVALID_CREDENTIALS,
      message: 'Identifiant ou mot de passe incorrect',
    });
  });

  it('does not issue a cookie when security state changes after authentication', async () => {
    const staleSecurityError = new Error('stale security state');
    mocks.authenticateUser.mockResolvedValue({
      success: true,
      user: {
        contactEmail: null,
        contactEmailVerifiedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        failedLoginAttempts: 0,
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
        permissions: null,
        role: 'USER',
        securityVersion: 3,
      },
    });
    mocks.generateSessionToken.mockReturnValue('raw-session-token');
    mocks.createSession.mockRejectedValueOnce(staleSecurityError);
    mocks.isSecurityVersionMismatchError.mockImplementation(
      (error) => error === staleSecurityError,
    );
    const { POST } = await import('$app/api/auth/login/route');

    const response = await POST(
      new NextRequest('http://localhost/api/auth/login', {
        body: JSON.stringify({
          loginName: 'user.name',
          password: 'Secret1!',
        }),
        method: 'POST',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe(ErrorCode.INVALID_CREDENTIALS);
    expect(mocks.setSessionTokenCookie).not.toHaveBeenCalled();
    expect(mocks.createAuditLogWithHeaders).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LOGIN_FAILED',
        metadata: expect.objectContaining({
          reason: 'SECURITY_STATE_CHANGED',
        }),
        targetUserId: 'user-1',
        userId: null,
      }),
    );
  });

  it('returns both idle and absolute deadlines after a successful login', async () => {
    const expiresAt = new Date('2026-08-12T12:00:00.000Z');
    const idleExpiresAt = new Date('2026-07-20T12:00:00.000Z');
    const lastSeenAt = new Date('2026-07-13T12:00:00.000Z');
    mocks.authenticateUser.mockResolvedValue({
      success: true,
      user: {
        contactEmail: 'user@example.com',
        contactEmailVerifiedAt: new Date('2026-01-02T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        failedLoginAttempts: 0,
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
        permissions: null,
        role: 'USER',
        securityVersion: 3,
      },
    });
    mocks.generateSessionToken.mockReturnValue('raw-session-token');
    mocks.createSession.mockResolvedValue({
      expiresAt,
      idleExpiresAt,
      lastSeenAt,
      rememberMe: true,
      token: 'raw-session-token',
    });
    const { POST } = await import('$app/api/auth/login/route');

    const response = await POST(
      new NextRequest('http://localhost/api/auth/login', {
        body: JSON.stringify({
          loginName: 'user.name',
          password: 'Secret1!',
          rememberMe: true,
        }),
        method: 'POST',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.createSession).toHaveBeenCalledWith(
      'raw-session-token',
      'user-1',
      3,
      true,
      expect.objectContaining({ action: 'LOGIN_SUCCESS' }),
    );
    expect(mocks.setSessionTokenCookie).toHaveBeenCalledWith(
      'raw-session-token',
      expiresAt,
    );
    expect(body.data.session).toEqual({
      expiresAt: expiresAt.toISOString(),
      idleExpiresAt: idleExpiresAt.toISOString(),
      lastSeenAt: lastSeenAt.toISOString(),
      rememberMe: true,
    });
    expect(body.data.user).toMatchObject({
      contactEmail: 'user@example.com',
      loginName: 'user.name',
    });
    expect(mocks.createSession).toHaveBeenCalledWith(
      'raw-session-token',
      'user-1',
      3,
      true,
      expect.objectContaining({
        description: 'Connexion réussie: user.name',
        metadata: expect.objectContaining({ loginName: 'user.name' }),
      }),
    );
    expect(
      mocks.createSession.mock.calls.at(-1)?.[4]?.metadata,
    ).not.toHaveProperty('email');
    expect(mocks.recordSuccessfulLogin).toHaveBeenCalledWith(
      LOGIN_RATE_LIMIT_KEYS,
    );
  });
});
