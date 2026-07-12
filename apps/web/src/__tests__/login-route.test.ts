import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorCode } from '$types/api.types';

const mocks = vi.hoisted(() => ({
  authenticateUser: vi.fn(),
  checkRateLimit: vi.fn(),
  createAuditLogWithHeaders: vi.fn(),
  createSession: vi.fn(),
  generateSessionToken: vi.fn(),
  recordLoginAttempt: vi.fn(),
  setSessionTokenCookie: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('$server/auth', () => ({
  authenticateUser: mocks.authenticateUser,
  createAuditLogWithHeaders: mocks.createAuditLogWithHeaders,
  createSession: mocks.createSession,
  generateSessionToken: mocks.generateSessionToken,
  setSessionTokenCookie: mocks.setSessionTokenCookie,
}));

vi.mock('$server/logger', () => ({
  logger: { error: vi.fn() },
}));

vi.mock('$server/rate-limiter', () => ({
  checkRateLimit: mocks.checkRateLimit,
  createRateLimitKey: (ip: string, email: string): string => `${ip}:${email}`,
  recordLoginAttempt: mocks.recordLoginAttempt,
}));

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkRateLimit.mockResolvedValue({
      allowed: true,
      remainingAttempts: 5,
    });
    mocks.createAuditLogWithHeaders.mockResolvedValue(undefined);
    mocks.recordLoginAttempt.mockResolvedValue(undefined);
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
          email: 'USER@example.com',
          password: ' Secret1! ',
        }),
        method: 'POST',
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.authenticateUser).toHaveBeenCalledWith(
      'user@example.com',
      ' Secret1! ',
    );
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
          email: 'disabled@example.com',
          password: 'Secret1!',
        }),
        method: 'POST',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toEqual({
      code: ErrorCode.INVALID_CREDENTIALS,
      message: 'Email ou mot de passe incorrect',
    });
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
          email: 'locked@example.com',
          password: 'Secret1!',
        }),
        method: 'POST',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toEqual({
      code: ErrorCode.INVALID_CREDENTIALS,
      message: 'Email ou mot de passe incorrect',
    });
  });
});
