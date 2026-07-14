import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  clearMfaChallengeCookie: vi.fn(),
  consumeVerifiedMfaProof: vi.fn(),
  createAuditLogWithHeaders: vi.fn(),
  createSession: vi.fn(),
  createTotpProvisioningData: vi.fn(),
  decryptTotpSecret: vi.fn(),
  encryptTotpSecret: vi.fn(),
  generateMfaChallengeToken: vi.fn(),
  generateRecoveryCodes: vi.fn(),
  generateSessionToken: vi.fn(),
  generateTotpSecret: vi.fn(),
  getMfaChallengeToken: vi.fn(),
  hashMfaChallengeToken: vi.fn(),
  mapUserToUserType: vi.fn(),
  prisma: {
    $transaction: vi.fn(),
    mfaLoginChallenge: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    user: { findUnique: vi.fn() },
  },
  recordLoginAttempt: vi.fn(),
  requireAuth: vi.fn(),
  requirePermission: vi.fn(),
  reserveMfaRateLimits: vi.fn(),
  reserveSensitiveActionRateLimit: vi.fn(),
  setMfaChallengeCookie: vi.fn(),
  setSessionTokenCookie: vi.fn(),
  transaction: {
    $queryRaw: vi.fn(),
    mfaLoginChallenge: {
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    mfaRecoveryCode: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    rateLimit: { deleteMany: vi.fn() },
    totpCredential: {
      count: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
    totpEnrollment: {
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  verifyMfaProof: vi.fn(),
  verifyPassword: vi.fn(),
  verifyTotpCode: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('$server/api-auth', () => ({
  requireAuth: mocks.requireAuth,
  requirePermission: mocks.requirePermission,
}));

vi.mock('$server/auth', () => ({
  createAuditLogWithHeaders: mocks.createAuditLogWithHeaders,
  createSession: mocks.createSession,
  generateSessionToken: mocks.generateSessionToken,
  isSecurityVersionMismatchError: vi.fn(() => false),
  mapUserToUserType: mocks.mapUserToUserType,
  setSessionTokenCookie: mocks.setSessionTokenCookie,
  verifyPassword: mocks.verifyPassword,
}));

vi.mock('$server/logger', () => ({
  logger: { error: vi.fn() },
}));

vi.mock('$server/mfa', () => ({
  clearMfaChallengeCookie: mocks.clearMfaChallengeCookie,
  consumeVerifiedMfaProof: mocks.consumeVerifiedMfaProof,
  createTotpProvisioningData: mocks.createTotpProvisioningData,
  decryptTotpSecret: mocks.decryptTotpSecret,
  encryptTotpSecret: mocks.encryptTotpSecret,
  generateMfaChallengeToken: mocks.generateMfaChallengeToken,
  generateRecoveryCodes: mocks.generateRecoveryCodes,
  generateTotpSecret: mocks.generateTotpSecret,
  getMfaChallengeToken: mocks.getMfaChallengeToken,
  hashMfaChallengeToken: mocks.hashMfaChallengeToken,
  InvalidMfaChallengeError: class InvalidMfaChallengeError extends Error {},
  MFA_ENROLLMENT_DURATION_MS: 10 * 60 * 1000,
  MfaReplayDetectedError: class MfaReplayDetectedError extends Error {},
  setMfaChallengeCookie: mocks.setMfaChallengeCookie,
  verifyMfaProof: mocks.verifyMfaProof,
  verifyTotpCode: mocks.verifyTotpCode,
}));

vi.mock('$server/prisma', () => ({
  prisma: mocks.prisma,
}));

vi.mock('$server/rate-limiter', () => ({
  createMfaRateLimitKeys: vi.fn(() => ({
    account: 'mfa-account',
    challenge: 'mfa-challenge',
    ip: 'mfa-ip',
  })),
  recordLoginAttempt: mocks.recordLoginAttempt,
  reserveMfaRateLimits: mocks.reserveMfaRateLimits,
  reserveSensitiveActionRateLimit: mocks.reserveSensitiveActionRateLimit,
}));

vi.mock('$server/request-context', () => ({
  getClientIp: vi.fn(() => '203.0.113.8'),
}));

const NOW = new Date('2026-07-14T20:00:00.000Z');
const CREDENTIAL_UPDATED_AT = new Date('2026-07-10T12:00:00.000Z');
const SESSION = {
  expiresAt: new Date('2026-07-15T12:00:00.000Z'),
  idleExpiresAt: new Date('2026-07-14T20:30:00.000Z'),
  lastSeenAt: new Date('2026-07-14T19:59:00.000Z'),
  rememberMe: false,
  securityVersion: 3,
  token: 'current-session-hash',
  userId: 'user-1',
};
const AUTH_USER = {
  id: 'user-1',
  isProtected: false,
  mfaEnabledAt: new Date('2026-07-01T12:00:00.000Z'),
};

describe('/api/auth/mfa/setup invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mocks.requireAuth.mockResolvedValue({
      session: SESSION,
      success: true,
      user: AUTH_USER,
    });
    mocks.requirePermission.mockReturnValue({ success: true });
    mocks.reserveSensitiveActionRateLimit.mockResolvedValue({
      allowed: true,
      remainingAttempts: 4,
    });
    mocks.reserveMfaRateLimits.mockResolvedValue({
      allowed: true,
      remainingAttempts: 4,
    });
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.recordLoginAttempt.mockResolvedValue(undefined);
    mocks.consumeVerifiedMfaProof.mockResolvedValue(undefined);
    mocks.createAuditLogWithHeaders.mockResolvedValue(undefined);
    mocks.generateMfaChallengeToken.mockReturnValue('new-challenge');
    mocks.hashMfaChallengeToken.mockReturnValue('challenge-hash');
    mocks.generateTotpSecret.mockReturnValue('NEW-TOTP-SECRET');
    mocks.encryptTotpSecret.mockReturnValue({
      secretAuthTag: 'auth-tag',
      secretCiphertext: 'ciphertext',
      secretIv: 'iv',
      secretKeyVersion: 1,
    });
    mocks.createTotpProvisioningData.mockResolvedValue({
      manualKey: 'NEW-TOTP-SECRET',
      qrCodeDataUrl: 'data:image/png;base64,qr',
    });
    mocks.prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof mocks.transaction) => unknown) =>
        callback(mocks.transaction),
    );
    mocks.transaction.$queryRaw.mockResolvedValue([{ id: 'user-1' }]);
    mocks.transaction.mfaLoginChallenge.upsert.mockResolvedValue({});
    mocks.transaction.totpEnrollment.upsert.mockResolvedValue({});
    mocks.setMfaChallengeCookie.mockResolvedValue(undefined);
    mocks.setSessionTokenCookie.mockResolvedValue(undefined);
    mocks.clearMfaChallengeCookie.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the active credential while staging a replacement and snapshots its consumed timestamp', async () => {
    const storedUser = {
      id: 'user-1',
      loginName: 'user.name',
      mfaEnabledAt: new Date('2026-07-01T12:00:00.000Z'),
      mfaRecoveryCodes: [],
      passwordHash: 'password-hash',
      securityVersion: 3,
      totpCredential: { updatedAt: CREDENTIAL_UPDATED_AT },
    };
    mocks.getMfaChallengeToken.mockResolvedValue(null);
    mocks.prisma.user.findUnique.mockResolvedValue(storedUser);
    mocks.transaction.user.findUnique.mockResolvedValue({
      deletedAt: null,
      isActive: true,
      isProtected: false,
      mfaEnabledAt: storedUser.mfaEnabledAt,
      securityVersion: 3,
      totpCredential: { updatedAt: CREDENTIAL_UPDATED_AT },
    });
    mocks.verifyMfaProof.mockResolvedValue({
      method: 'TOTP',
      timeStep: 5_945_120n,
    });
    const { POST } = await import('$app/api/auth/mfa/setup/route');

    const response = await POST(
      new NextRequest('http://localhost/api/auth/mfa/setup', {
        body: JSON.stringify({
          currentCode: '123456',
          currentPassword: 'Secret1!',
        }),
        method: 'POST',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.replacing).toBe(true);
    expect(mocks.consumeVerifiedMfaProof).toHaveBeenCalledWith(
      mocks.transaction,
      {
        authenticatedAt: NOW,
        credentialUpdatedAt: CREDENTIAL_UPDATED_AT,
        proof: { method: 'TOTP', timeStep: 5_945_120n },
        userId: 'user-1',
      },
    );
    expect(mocks.transaction.totpCredential.upsert).not.toHaveBeenCalled();
    expect(mocks.transaction.totpCredential.deleteMany).not.toHaveBeenCalled();
    expect(mocks.transaction.totpEnrollment.upsert).toHaveBeenCalledWith({
      create: expect.objectContaining({
        secretCiphertext: 'ciphertext',
        userId: 'user-1',
      }),
      update: expect.objectContaining({ secretCiphertext: 'ciphertext' }),
      where: { userId: 'user-1' },
    });
    expect(mocks.transaction.mfaLoginChallenge.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ credentialUpdatedAt: NOW }),
        update: expect.objectContaining({ credentialUpdatedAt: NOW }),
      }),
    );
    expect(mocks.transaction.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('binds non-bootstrap confirmation to the current session and does not audit a new login', async () => {
    const enrollment = {
      expiresAt: new Date('2026-07-14T20:10:00.000Z'),
      secretAuthTag: 'auth-tag',
      secretCiphertext: 'ciphertext',
      secretIv: 'iv',
      secretKeyVersion: 1,
      updatedAt: new Date('2026-07-14T19:59:00.000Z'),
    };
    mocks.getMfaChallengeToken.mockResolvedValue('raw-challenge');
    mocks.prisma.mfaLoginChallenge.findUnique.mockResolvedValue({
      credentialUpdatedAt: CREDENTIAL_UPDATED_AT,
      expiresAt: new Date('2026-07-14T20:10:00.000Z'),
      purpose: 'SETUP',
      rememberMe: false,
      securityVersion: 3,
      user: {
        deletedAt: null,
        isActive: true,
        isProtected: false,
        loginName: 'user.name',
        mfaEnabledAt: new Date('2026-07-01T12:00:00.000Z'),
        securityVersion: 3,
        totpCredential: { updatedAt: CREDENTIAL_UPDATED_AT },
        totpEnrollment: enrollment,
      },
      userId: 'user-1',
    });
    mocks.verifyTotpCode.mockResolvedValue(5_945_120n);
    mocks.generateRecoveryCodes.mockReturnValue([
      {
        codeHash: 'code-hash',
        plaintext: 'AAAA-BBBB-CCCC-DDDD-EEEE-FFFF',
        salt: 'salt',
      },
    ]);
    mocks.generateSessionToken.mockReturnValue('replacement-session');
    mocks.createSession.mockResolvedValue({
      expiresAt: SESSION.expiresAt,
      idleExpiresAt: SESSION.idleExpiresAt,
      lastSeenAt: NOW,
      rememberMe: false,
      token: 'replacement-session',
    });
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      mfaEnabledAt: NOW,
    });
    mocks.mapUserToUserType.mockReturnValue({
      id: 'user-1',
      mustChangePassword: false,
    });
    const { PUT } = await import('$app/api/auth/mfa/setup/route');

    const response = await PUT(
      new NextRequest('http://localhost/api/auth/mfa/setup', {
        body: JSON.stringify({ code: '123456' }),
        method: 'PUT',
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.requireAuth).toHaveBeenCalled();
    expect(mocks.createSession).toHaveBeenCalledWith(
      'replacement-session',
      'user-1',
      3,
      false,
      undefined,
      expect.objectContaining({
        advanceSecurityVersion: true,
        mfaMethod: 'TOTP',
        revokeExistingSessions: true,
        sourceSessionToken: 'current-session-hash',
      }),
    );
  });
});
