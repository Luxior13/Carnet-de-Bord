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
      session: { updateMany: vi.fn() },
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

const buildSession = (overrides: Partial<SessionType> = {}): SessionType => ({
  criticalMfaVerifiedAt: null,
  expiresAt: new Date('2026-07-16T12:00:00.000Z'),
  idleExpiresAt: new Date('2026-07-15T12:30:00.000Z'),
  lastSeenAt: new Date('2026-07-15T11:55:00.000Z'),
  mfaVerifiedAt: new Date('2026-07-15T11:00:00.000Z'),
  passwordReauthenticatedAt: null,
  rememberMe: false,
  securityVersion: 7,
  token: SESSION_TOKEN,
  userId: 'admin-user',
  ...overrides,
});

const buildAuth = (session = buildSession()): Record<string, unknown> => ({
  session,
  success: true,
  user: {
    id: 'admin-user',
    isProtected: false,
    role: 'ADMIN',
  },
});

const createRequest = (body: Record<string, unknown>): NextRequest =>
  new NextRequest('http://localhost/api/auth/step-up', {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

describe('step-up proof freshness', () => {
  it('accepts the exact password and critical-MFA boundaries', async () => {
    const {
      ELEVATED_MFA_PROOF_MAX_AGE_MS,
      hasRecentElevatedMfaProof,
      hasRecentPasswordReauthentication,
      PASSWORD_REAUTHENTICATION_MAX_AGE_MS,
    } = await import('$server/sensitive-action');
    const session = buildSession({
      criticalMfaVerifiedAt: new Date(
        NOW.getTime() - ELEVATED_MFA_PROOF_MAX_AGE_MS,
      ),
      passwordReauthenticatedAt: new Date(
        NOW.getTime() - PASSWORD_REAUTHENTICATION_MAX_AGE_MS,
      ),
    });

    expect(hasRecentPasswordReauthentication(session, NOW)).toBe(true);
    expect(hasRecentElevatedMfaProof(session, NOW)).toBe(true);
  });

  it('rejects old, absent, and future-dated step-up proofs', async () => {
    const {
      ELEVATED_MFA_PROOF_MAX_AGE_MS,
      hasRecentElevatedMfaProof,
      hasRecentPasswordReauthentication,
      PASSWORD_REAUTHENTICATION_MAX_AGE_MS,
    } = await import('$server/sensitive-action');

    expect(hasRecentPasswordReauthentication(buildSession(), NOW)).toBe(false);
    expect(
      hasRecentPasswordReauthentication(
        buildSession({
          passwordReauthenticatedAt: new Date(
            NOW.getTime() - PASSWORD_REAUTHENTICATION_MAX_AGE_MS - 1,
          ),
        }),
        NOW,
      ),
    ).toBe(false);
    expect(
      hasRecentElevatedMfaProof(
        buildSession({
          criticalMfaVerifiedAt: new Date(
            NOW.getTime() - ELEVATED_MFA_PROOF_MAX_AGE_MS - 1,
          ),
          passwordReauthenticatedAt: NOW,
        }),
        NOW,
      ),
    ).toBe(false);
    expect(
      hasRecentElevatedMfaProof(
        buildSession({
          criticalMfaVerifiedAt: new Date(NOW.getTime() + 1),
          passwordReauthenticatedAt: NOW,
        }),
        NOW,
      ),
    ).toBe(false);
  });
});

describe('/api/auth/step-up', () => {
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
    mocks.prisma.session.updateMany.mockResolvedValue({ count: 1 });
    mocks.transaction.rateLimit.deleteMany.mockResolvedValue({ count: 2 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('confirms the password only and keeps it valid for thirty minutes', async () => {
    const { POST } = await import('$app/api/auth/step-up/route');
    const response = await POST(
      createRequest({ currentPassword: 'Secret1!', kind: 'password' }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      criticalMfaExpiresAt: null,
      expiresAt: '2026-07-15T12:30:00.000Z',
      kind: 'password',
      passwordExpiresAt: '2026-07-15T12:30:00.000Z',
    });
    expect(mocks.verifyPassword).toHaveBeenCalledTimes(1);
    expect(mocks.verifyMfaProof).not.toHaveBeenCalled();
    expect(mocks.consumeVerifiedMfaProof).not.toHaveBeenCalled();
    expect(mocks.transaction.session.updateMany).toHaveBeenCalledWith({
      data: {
        lastSeenAt: NOW,
        passwordReauthenticatedAt: NOW,
      },
      where: {
        expiresAt: { gt: NOW },
        idleExpiresAt: { gt: NOW },
        securityVersion: 7,
        token: SESSION_TOKEN,
        userId: 'admin-user',
      },
    });
  });

  it('rejects an invalid password without checking TOTP', async () => {
    mocks.verifyPassword.mockResolvedValueOnce(false);
    const { POST } = await import('$app/api/auth/step-up/route');
    const response = await POST(
      createRequest({ currentPassword: 'wrong', kind: 'password' }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe(ErrorCode.INVALID_CREDENTIALS);
    expect(mocks.verifyMfaProof).not.toHaveBeenCalled();
    expect(mocks.createAuditLogWithHeaders).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'STEP_UP_FAILED',
        metadata: expect.objectContaining({
          proofKind: 'password',
          reason: 'PASSWORD_INVALID',
        }),
      }),
    );
  });

  it('requires an active password proof before critical MFA', async () => {
    mocks.requireAuth.mockResolvedValueOnce(buildAuth(buildSession()));
    const { POST } = await import('$app/api/auth/step-up/route');
    const response = await POST(
      createRequest({ currentTotpCode: '123456', kind: 'critical-mfa' }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe(ErrorCode.PASSWORD_REAUTHENTICATION_REQUIRED);
    expect(mocks.prisma.user.findUnique).not.toHaveBeenCalled();
    expect(mocks.verifyMfaProof).not.toHaveBeenCalled();
  });

  it('confirms critical MFA without asking for the password again', async () => {
    mocks.requireAuth.mockResolvedValueOnce(
      buildAuth(buildSession({ passwordReauthenticatedAt: NOW })),
    );
    const proof = { method: 'TOTP' as const, timeStep: 123n };
    mocks.verifyMfaProof.mockResolvedValueOnce(proof);
    const { POST } = await import('$app/api/auth/step-up/route');
    const response = await POST(
      createRequest({ currentTotpCode: '123456', kind: 'critical-mfa' }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      criticalMfaExpiresAt: '2026-07-15T12:15:00.000Z',
      expiresAt: '2026-07-15T12:15:00.000Z',
      kind: 'critical-mfa',
      passwordExpiresAt: '2026-07-15T12:30:00.000Z',
    });
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
    expect(mocks.transaction.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          criticalMfaVerifiedAt: NOW,
          lastSeenAt: NOW,
        },
      }),
    );
    expect(mocks.consumeVerifiedMfaProof).toHaveBeenCalledWith(
      mocks.transaction,
      {
        authenticatedAt: NOW,
        credentialUpdatedAt: TOTP_CREDENTIAL_UPDATED_AT,
        proof,
        userId: 'admin-user',
      },
    );
  });

  it('keeps the login MFA timestamp immutable for a legacy full proof', async () => {
    const { POST } = await import('$app/api/auth/step-up/route');
    const response = await POST(
      createRequest({
        currentPassword: 'Secret1!',
        currentTotpCode: '123456',
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.transaction.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          criticalMfaVerifiedAt: NOW,
          lastSeenAt: NOW,
          passwordReauthenticatedAt: NOW,
        },
      }),
    );
    expect(
      mocks.transaction.session.updateMany.mock.calls[0]?.[0]?.data,
    ).not.toHaveProperty('mfaVerifiedAt');
  });

  it('returns status and clears both step-up proofs on explicit lock', async () => {
    const activeSession = buildSession({
      criticalMfaVerifiedAt: NOW,
      passwordReauthenticatedAt: NOW,
    });
    mocks.requireAuth.mockResolvedValue(buildAuth(activeSession));
    const { DELETE, GET } = await import('$app/api/auth/step-up/route');

    const statusResponse = await GET();
    const statusBody = await statusResponse.json();
    expect(statusBody.data).toEqual({
      criticalMfaExpiresAt: '2026-07-15T12:15:00.000Z',
      passwordExpiresAt: '2026-07-15T12:30:00.000Z',
    });

    const lockResponse = await DELETE();
    const lockBody = await lockResponse.json();
    expect(lockResponse.status).toBe(200);
    expect(lockBody.data).toEqual({
      criticalMfaExpiresAt: null,
      passwordExpiresAt: null,
    });
    expect(mocks.prisma.session.updateMany).toHaveBeenCalledWith({
      data: {
        criticalMfaVerifiedAt: null,
        passwordReauthenticatedAt: null,
      },
      where: {
        expiresAt: { gt: NOW },
        idleExpiresAt: { gt: NOW },
        securityVersion: 7,
        token: SESSION_TOKEN,
        userId: 'admin-user',
      },
    });
  });
});
