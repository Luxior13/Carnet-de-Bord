import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorCode } from '$types/api.types';
import type { SessionType } from '$types/auth.types';

const mocks = vi.hoisted(() => {
  class MfaReplayDetectedError extends Error {}

  const transaction = {
    rateLimit: { deleteMany: vi.fn() },
    session: { updateMany: vi.fn() },
  };

  return {
    consumeVerifiedMfaProof: vi.fn(),
    createAuditLogWithHeaders: vi.fn(),
    MfaReplayDetectedError,
    prisma: {
      $transaction: vi.fn(
        async (callback: (client: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
      user: { findUnique: vi.fn() },
    },
    recordLoginAttempt: vi.fn(),
    requireAuth: vi.fn(),
    reserveSensitiveActionRateLimit: vi.fn(),
    transaction,
    verifyMfaProof: vi.fn(),
    verifyPassword: vi.fn(),
  };
});

vi.mock('server-only', () => ({}));

vi.mock('$server/api-auth', () => ({
  requireAuth: mocks.requireAuth,
}));

vi.mock('$server/auth', () => ({
  createAuditLogWithHeaders: mocks.createAuditLogWithHeaders,
  verifyPassword: mocks.verifyPassword,
}));

vi.mock('$server/logger', () => ({
  logger: { error: vi.fn() },
}));

vi.mock('$server/mfa', () => ({
  consumeVerifiedMfaProof: mocks.consumeVerifiedMfaProof,
  MFA_TOTP_CODE_PATTERN: /^\d{6}$/,
  MfaReplayDetectedError: mocks.MfaReplayDetectedError,
  verifyMfaProof: mocks.verifyMfaProof,
}));

vi.mock('$server/prisma', () => ({
  prisma: mocks.prisma,
}));

vi.mock('$server/rate-limiter', () => ({
  recordLoginAttempt: mocks.recordLoginAttempt,
  reserveSensitiveActionRateLimit: mocks.reserveSensitiveActionRateLimit,
}));

const NOW = new Date('2026-07-15T12:00:00.000Z');
const SESSION_TOKEN = 'admin-session-hash';
const TOTP_CREDENTIAL_UPDATED_AT = new Date('2026-07-10T08:00:00.000Z');
const TOTP_CREDENTIAL = {
  createdAt: TOTP_CREDENTIAL_UPDATED_AT,
  lastUsedAt: null,
  lastUsedTimeStep: null,
  secretAuthTag: 'tag',
  secretCiphertext: 'ciphertext',
  secretIv: 'iv',
  secretKeyVersion: 1,
  updatedAt: TOTP_CREDENTIAL_UPDATED_AT,
  userId: 'admin-user',
};
const STORED_ADMIN = {
  id: 'admin-user',
  isActive: true,
  mfaEnabledAt: new Date('2026-07-01T08:00:00.000Z'),
  passwordHash: 'password-hash',
  role: 'ADMIN',
  securityVersion: 7,
  totpCredential: TOTP_CREDENTIAL,
};

const buildSession = (
  mfaVerifiedAt: Date | null,
  overrides: Partial<SessionType> = {},
): SessionType => ({
  expiresAt: new Date('2026-07-16T12:00:00.000Z'),
  idleExpiresAt: new Date('2026-07-15T12:30:00.000Z'),
  lastSeenAt: new Date('2026-07-15T11:55:00.000Z'),
  mfaVerifiedAt,
  rememberMe: false,
  securityVersion: 7,
  token: SESSION_TOKEN,
  userId: 'admin-user',
  ...overrides,
});

const buildAuth = (): Record<string, unknown> => ({
  session: buildSession(new Date('2026-07-15T11:00:00.000Z')),
  success: true,
  user: {
    id: 'admin-user',
    isProtected: false,
    role: 'ADMIN',
  },
});

const createRequest = (): NextRequest =>
  new NextRequest('http://localhost/api/auth/step-up', {
    body: JSON.stringify({
      currentPassword: 'Secret1!',
      currentTotpCode: '123456',
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

describe('sensitive-action proof freshness', () => {
  it('accepts a recent proof, including the five-minute boundary', async () => {
    const { hasRecentSensitiveActionProof, SENSITIVE_ACTION_PROOF_MAX_AGE_MS } =
      await import('$server/sensitive-action');

    expect(
      hasRecentSensitiveActionProof(
        buildSession(
          new Date(NOW.getTime() - SENSITIVE_ACTION_PROOF_MAX_AGE_MS),
        ),
        NOW,
      ),
    ).toBe(true);
  });

  it('rejects an old, missing, or future-dated proof', async () => {
    const { hasRecentSensitiveActionProof, SENSITIVE_ACTION_PROOF_MAX_AGE_MS } =
      await import('$server/sensitive-action');

    expect(
      hasRecentSensitiveActionProof(
        buildSession(
          new Date(NOW.getTime() - SENSITIVE_ACTION_PROOF_MAX_AGE_MS - 1),
        ),
        NOW,
      ),
    ).toBe(false);
    expect(hasRecentSensitiveActionProof(buildSession(null), NOW)).toBe(false);
    expect(
      hasRecentSensitiveActionProof(
        buildSession(new Date(NOW.getTime() + 1)),
        NOW,
      ),
    ).toBe(false);
  });
});

describe('POST /api/auth/step-up', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.clearAllMocks();

    mocks.requireAuth.mockResolvedValue(buildAuth());
    mocks.prisma.user.findUnique.mockResolvedValue(STORED_ADMIN);
    mocks.reserveSensitiveActionRateLimit.mockResolvedValue({
      allowed: true,
      remainingAttempts: 4,
    });
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.verifyMfaProof.mockResolvedValue({
      method: 'TOTP',
      timeStep: 123n,
    });
    mocks.transaction.session.updateMany.mockResolvedValue({ count: 1 });
    mocks.transaction.rateLimit.deleteMany.mockResolvedValue({ count: 2 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows a USER with an MFA-bound session to refresh its proof', async () => {
    mocks.requireAuth.mockResolvedValueOnce({
      ...buildAuth(),
      user: {
        id: 'admin-user',
        isProtected: false,
        role: 'USER',
      },
    });
    mocks.prisma.user.findUnique.mockResolvedValueOnce({
      ...STORED_ADMIN,
      role: 'USER',
    });
    const { POST } = await import('$app/api/auth/step-up/route');

    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    expect(mocks.requireAuth).toHaveBeenCalledWith();
    expect(mocks.prisma.user.findUnique).toHaveBeenCalledWith({
      include: { totpCredential: true },
      where: { deletedAt: null, id: 'admin-user' },
    });
    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid current password before checking TOTP', async () => {
    mocks.verifyPassword.mockResolvedValueOnce(false);
    const { POST } = await import('$app/api/auth/step-up/route');

    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe(ErrorCode.INVALID_CREDENTIALS);
    expect(mocks.verifyMfaProof).not.toHaveBeenCalled();
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.createAuditLogWithHeaders).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'STEP_UP_FAILED',
        metadata: expect.objectContaining({ reason: 'PASSWORD_INVALID' }),
        targetUserId: 'admin-user',
        userId: 'admin-user',
      }),
    );
  });

  it('rejects an invalid TOTP without updating the session', async () => {
    mocks.verifyMfaProof.mockResolvedValueOnce(null);
    const { POST } = await import('$app/api/auth/step-up/route');

    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe(ErrorCode.INVALID_CREDENTIALS);
    expect(mocks.recordLoginAttempt).toHaveBeenCalledWith(
      'sensitive-step-up-password:admin-user',
      true,
    );
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.consumeVerifiedMfaProof).not.toHaveBeenCalled();
    expect(mocks.createAuditLogWithHeaders).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'STEP_UP_FAILED',
        metadata: expect.objectContaining({ reason: 'TOTP_INVALID' }),
        targetUserId: 'admin-user',
        userId: 'admin-user',
      }),
    );
  });

  it('atomically refreshes the current session proof and consumes the TOTP', async () => {
    const proof = { method: 'TOTP' as const, timeStep: 123n };
    mocks.verifyMfaProof.mockResolvedValueOnce(proof);
    const { POST } = await import('$app/api/auth/step-up/route');

    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.expiresAt).toBe('2026-07-15T12:05:00.000Z');
    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.session.updateMany).toHaveBeenCalledWith({
      data: {
        lastSeenAt: NOW,
        mfaVerifiedAt: NOW,
      },
      where: {
        expiresAt: { gt: NOW },
        idleExpiresAt: { gt: NOW },
        securityVersion: 7,
        token: SESSION_TOKEN,
        userId: 'admin-user',
      },
    });
    expect(mocks.consumeVerifiedMfaProof).toHaveBeenCalledWith(
      mocks.transaction,
      {
        authenticatedAt: NOW,
        credentialUpdatedAt: TOTP_CREDENTIAL_UPDATED_AT,
        proof,
        userId: 'admin-user',
      },
    );
    expect(mocks.createAuditLogWithHeaders).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'STEP_UP_SUCCESS',
        metadata: expect.objectContaining({
          authenticationMethod: 'TOTP',
        }),
        targetUserId: 'admin-user',
        userId: 'admin-user',
      }),
      { client: mocks.transaction, required: true },
    );
    expect(mocks.transaction.rateLimit.deleteMany).toHaveBeenCalledWith({
      where: {
        key: {
          in: [
            'sensitive-step-up-password:admin-user',
            'sensitive-step-up-totp:admin-user',
          ],
        },
      },
    });
  });
});
