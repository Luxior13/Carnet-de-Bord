import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  clearMfaChallengeCookie: vi.fn(),
  consumeVerifiedMfaProof: vi.fn(),
  createAuditLogWithHeaders: vi.fn(),
  createMfaRateLimitKeys: vi.fn(),
  createSession: vi.fn(),
  generateSessionToken: vi.fn(),
  getMfaChallengeToken: vi.fn(),
  hashMfaChallengeToken: vi.fn(),
  mapUserToUserType: vi.fn(),
  prisma: {
    mfaLoginChallenge: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
  reserveMfaRateLimits: vi.fn(),
  setSessionTokenCookie: vi.fn(),
  transaction: {
    mfaLoginChallenge: { deleteMany: vi.fn() },
    rateLimit: { deleteMany: vi.fn() },
  },
  verifyMfaProof: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('$server/auth', () => ({
  createAuditLogWithHeaders: mocks.createAuditLogWithHeaders,
  createSession: mocks.createSession,
  generateSessionToken: mocks.generateSessionToken,
  isSecurityVersionMismatchError: vi.fn(() => false),
  mapUserToUserType: mocks.mapUserToUserType,
  setSessionTokenCookie: mocks.setSessionTokenCookie,
}));

vi.mock('$server/logger', () => ({
  logger: { error: vi.fn() },
}));

vi.mock('$server/mfa', () => ({
  clearMfaChallengeCookie: mocks.clearMfaChallengeCookie,
  consumeVerifiedMfaProof: mocks.consumeVerifiedMfaProof,
  getMfaChallengeToken: mocks.getMfaChallengeToken,
  hashMfaChallengeToken: mocks.hashMfaChallengeToken,
  InvalidMfaChallengeError: class InvalidMfaChallengeError extends Error {},
  MfaReplayDetectedError: class MfaReplayDetectedError extends Error {},
  verifyMfaProof: mocks.verifyMfaProof,
}));

vi.mock('$server/prisma', () => ({
  prisma: mocks.prisma,
}));

vi.mock('$server/rate-limiter', () => ({
  createMfaRateLimitKeys: mocks.createMfaRateLimitKeys,
  reserveMfaRateLimits: mocks.reserveMfaRateLimits,
}));

vi.mock('$server/request-context', () => ({
  getClientIp: vi.fn(() => '203.0.113.8'),
}));

const CREDENTIAL_UPDATED_AT = new Date('2026-07-10T12:00:00.000Z');
const AUTHENTICATED_AT = new Date('2026-07-14T20:00:00.000Z');
const CHALLENGE = {
  credentialUpdatedAt: CREDENTIAL_UPDATED_AT,
  expiresAt: new Date('2099-07-14T20:05:00.000Z'),
  purpose: 'LOGIN',
  rememberMe: false,
  securityVersion: 3,
  user: {
    deletedAt: null,
    isActive: true,
    loginName: 'user.name',
    mfaEnabledAt: new Date('2026-07-10T12:00:00.000Z'),
    mfaRecoveryCodes: [],
    mustChangePassword: false,
    securityVersion: 3,
    totpCredential: {
      lastUsedTimeStep: null,
      updatedAt: CREDENTIAL_UPDATED_AT,
    },
  },
  userId: 'user-1',
};

describe('POST /api/auth/mfa/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMfaChallengeToken.mockResolvedValue('raw-challenge');
    mocks.hashMfaChallengeToken.mockReturnValue('challenge-hash');
    mocks.prisma.mfaLoginChallenge.findUnique.mockResolvedValue(CHALLENGE);
    mocks.createMfaRateLimitKeys.mockReturnValue({
      account: 'mfa-account',
      challenge: 'mfa-challenge',
      ip: 'mfa-ip',
    });
    mocks.reserveMfaRateLimits.mockResolvedValue({
      allowed: true,
      remainingAttempts: 4,
    });
    mocks.verifyMfaProof.mockResolvedValue({
      method: 'TOTP',
      timeStep: 5_945_120n,
    });
    mocks.generateSessionToken.mockReturnValue('new-session-token');
    mocks.transaction.mfaLoginChallenge.deleteMany.mockResolvedValue({
      count: 1,
    });
    mocks.transaction.rateLimit.deleteMany.mockResolvedValue({ count: 2 });
    mocks.consumeVerifiedMfaProof.mockResolvedValue(undefined);
    mocks.createSession.mockImplementation(
      async (
        _token: string,
        _userId: string,
        _securityVersion: number,
        _rememberMe: boolean,
        _audit: unknown,
        options: {
          precondition: (
            transaction: typeof mocks.transaction,
            authenticatedAt: Date,
          ) => Promise<void>;
        },
      ) => {
        await options.precondition(mocks.transaction, AUTHENTICATED_AT);

        return {
          expiresAt: new Date('2026-07-15T20:00:00.000Z'),
          idleExpiresAt: new Date('2026-07-14T20:30:00.000Z'),
          lastSeenAt: AUTHENTICATED_AT,
          rememberMe: false,
          token: 'new-session-token',
        };
      },
    );
    mocks.mapUserToUserType.mockReturnValue({
      id: 'user-1',
      loginName: 'user.name',
      mustChangePassword: false,
    });
  });

  it('consumes challenge and MFA proof in the session transaction', async () => {
    const { POST } = await import('$app/api/auth/mfa/verify/route');

    const response = await POST(
      new NextRequest('http://localhost/api/auth/mfa/verify', {
        body: JSON.stringify({ code: '123456' }),
        method: 'POST',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe('authenticated');
    expect(mocks.createSession).toHaveBeenCalledWith(
      'new-session-token',
      'user-1',
      3,
      false,
      expect.objectContaining({ action: 'LOGIN_SUCCESS' }),
      expect.objectContaining({
        mfaMethod: 'TOTP',
        requireMfaEnabled: true,
      }),
    );
    expect(mocks.verifyMfaProof.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.createSession.mock.invocationCallOrder[0] ?? 0,
    );
    expect(mocks.transaction.mfaLoginChallenge.deleteMany).toHaveBeenCalledWith(
      {
        where: {
          credentialUpdatedAt: CREDENTIAL_UPDATED_AT,
          expiresAt: { gt: AUTHENTICATED_AT },
          purpose: 'LOGIN',
          securityVersion: 3,
          tokenHash: 'challenge-hash',
          userId: 'user-1',
        },
      },
    );
    expect(mocks.consumeVerifiedMfaProof).toHaveBeenCalledWith(
      mocks.transaction,
      {
        authenticatedAt: AUTHENTICATED_AT,
        credentialUpdatedAt: CREDENTIAL_UPDATED_AT,
        proof: { method: 'TOTP', timeStep: 5_945_120n },
        userId: 'user-1',
      },
    );
    expect(mocks.transaction.rateLimit.deleteMany).toHaveBeenCalledWith({
      where: { key: { in: ['mfa-account', 'mfa-challenge'] } },
    });
    expect(mocks.setSessionTokenCookie).toHaveBeenCalledWith(
      'new-session-token',
      new Date('2026-07-15T20:00:00.000Z'),
    );
    expect(mocks.clearMfaChallengeCookie).toHaveBeenCalled();
  });

  it('never creates a session before a valid MFA proof exists', async () => {
    mocks.verifyMfaProof.mockResolvedValueOnce(null);
    mocks.prisma.mfaLoginChallenge.updateMany.mockResolvedValueOnce({
      count: 1,
    });
    mocks.createAuditLogWithHeaders.mockResolvedValueOnce(undefined);
    const { POST } = await import('$app/api/auth/mfa/verify/route');

    const response = await POST(
      new NextRequest('http://localhost/api/auth/mfa/verify', {
        body: JSON.stringify({ code: '000000' }),
        method: 'POST',
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.createSession).not.toHaveBeenCalled();
    expect(mocks.setSessionTokenCookie).not.toHaveBeenCalled();
    expect(mocks.consumeVerifiedMfaProof).not.toHaveBeenCalled();
  });
});
