import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  class MfaReplayDetectedError extends Error {}

  const transaction = {
    mfaLoginChallenge: { deleteMany: vi.fn() },
    mfaRecoveryCode: { deleteMany: vi.fn() },
    rateLimit: { deleteMany: vi.fn() },
    session: { deleteMany: vi.fn(), updateMany: vi.fn() },
    totpCredential: { deleteMany: vi.fn() },
    totpEnrollment: { deleteMany: vi.fn() },
    user: { findUnique: vi.fn(), updateMany: vi.fn() },
  };

  return {
    consumeVerifiedMfaProof: vi.fn(),
    createAuditLogWithHeaders: vi.fn(),
    mapUserToUserType: vi.fn((user) => user),
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
  mapUserToUserType: mocks.mapUserToUserType,
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

const NOW = new Date('2026-07-14T20:00:00.000Z');
const ROOT_CREDENTIAL = {
  createdAt: NOW,
  lastUsedAt: null,
  lastUsedTimeStep: null,
  secretAuthTag: 'tag',
  secretCiphertext: 'ciphertext',
  secretIv: 'iv',
  secretKeyVersion: 1,
  updatedAt: NOW,
  userId: 'root-user',
};
const TARGET_CREDENTIAL = {
  ...ROOT_CREDENTIAL,
  userId: 'target-user',
};
const ROOT = {
  firstName: 'Root',
  id: 'root-user',
  isActive: true,
  isProtected: true,
  lastName: 'Owner',
  loginName: 'superadmin',
  mfaEnabledAt: NOW,
  passwordHash: 'root-password-hash',
  role: 'ADMIN',
  securityVersion: 7,
  totpCredential: ROOT_CREDENTIAL,
};
const TARGET = {
  firstName: 'Membre',
  id: 'target-user',
  isProtected: false,
  lastName: 'Test',
  loginName: 'membre.test',
  mfaEnabledAt: NOW,
  role: 'USER',
  securityVersion: 3,
  totpCredential: TARGET_CREDENTIAL,
};
const UPDATED_TARGET = {
  ...TARGET,
  mfaEnabledAt: null,
  securityVersion: 4,
  totpCredential: null,
};

const buildAuth = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  session: {
    expiresAt: new Date('2026-07-15T20:00:00.000Z'),
    idleExpiresAt: new Date('2026-07-14T20:30:00.000Z'),
    lastSeenAt: NOW,
    rememberMe: false,
    securityVersion: 7,
    token: 'root-session-hash',
    userId: 'root-user',
  },
  success: true,
  user: {
    id: 'root-user',
    isProtected: true,
    role: 'ADMIN',
    ...overrides,
  },
});

const createRequest = (body: Record<string, unknown>): NextRequest =>
  new NextRequest('http://localhost/api/users/target-user/reset-mfa', {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

const routeParams = { params: Promise.resolve({ id: 'target-user' }) };

describe('POST /api/users/[id]/reset-mfa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue(buildAuth());
    mocks.reserveSensitiveActionRateLimit.mockResolvedValue({
      allowed: true,
      remainingAttempts: 4,
    });
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.verifyMfaProof.mockResolvedValue({
      method: 'TOTP',
      timeStep: 123n,
    });
    mocks.prisma.user.findUnique
      .mockResolvedValueOnce(ROOT)
      .mockResolvedValueOnce(TARGET);
    mocks.transaction.session.updateMany.mockResolvedValue({ count: 1 });
    mocks.transaction.user.updateMany.mockResolvedValue({ count: 1 });
    mocks.transaction.totpCredential.deleteMany.mockResolvedValue({ count: 1 });
    mocks.transaction.session.deleteMany.mockResolvedValue({ count: 2 });
    mocks.transaction.mfaLoginChallenge.deleteMany.mockResolvedValue({
      count: 1,
    });
    mocks.transaction.totpEnrollment.deleteMany.mockResolvedValue({ count: 1 });
    mocks.transaction.mfaRecoveryCode.deleteMany.mockResolvedValue({
      count: 8,
    });
    mocks.transaction.rateLimit.deleteMany.mockResolvedValue({ count: 2 });
    mocks.transaction.user.findUnique.mockResolvedValue(UPDATED_TARGET);
  });

  it('refuses every non-root actor before loading account secrets', async () => {
    mocks.requireAuth.mockResolvedValue(
      buildAuth({ id: 'admin-user', isProtected: false }),
    );
    const { POST } = await import('$app/api/users/[id]/reset-mfa/route');

    const response = await POST(
      createRequest({
        currentPassword: 'Secret1!',
        currentTotpCode: '123456',
      }),
      routeParams,
    );

    expect(response.status).toBe(403);
    expect(mocks.prisma.user.findUnique).not.toHaveBeenCalled();
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
  });

  it('accepts only a strict six-digit TOTP, never a recovery code', async () => {
    const { POST } = await import('$app/api/users/[id]/reset-mfa/route');

    const response = await POST(
      createRequest({
        currentPassword: 'Secret1!',
        currentTotpCode: 'ABCD-EFGH-IJKL-MNOP-QRST-UVWX',
      }),
      routeParams,
    );

    expect(response.status).toBe(400);
    expect(mocks.prisma.user.findUnique).not.toHaveBeenCalled();
    expect(mocks.verifyMfaProof).not.toHaveBeenCalled();
  });

  it('never resets the protected root target', async () => {
    mocks.prisma.user.findUnique.mockReset();
    mocks.prisma.user.findUnique
      .mockResolvedValueOnce(ROOT)
      .mockResolvedValueOnce({ ...TARGET, isProtected: true, role: 'ADMIN' });
    const { POST } = await import('$app/api/users/[id]/reset-mfa/route');

    const response = await POST(
      createRequest({
        currentPassword: 'Secret1!',
        currentTotpCode: '123456',
      }),
      routeParams,
    );

    expect(response.status).toBe(403);
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('lets the root recover an unprotected administrator with strong proof', async () => {
    const adminTarget = { ...TARGET, role: 'ADMIN' as const };
    mocks.prisma.user.findUnique.mockReset();
    mocks.prisma.user.findUnique
      .mockResolvedValueOnce(ROOT)
      .mockResolvedValueOnce(adminTarget);
    mocks.transaction.user.findUnique.mockResolvedValueOnce({
      ...UPDATED_TARGET,
      role: 'ADMIN',
    });
    const { POST } = await import('$app/api/users/[id]/reset-mfa/route');

    const response = await POST(
      createRequest({
        currentPassword: 'Secret1!',
        currentTotpCode: '123456',
      }),
      routeParams,
    );

    expect(response.status).toBe(200);
    expect(mocks.verifyPassword).toHaveBeenCalled();
    expect(mocks.verifyMfaProof).toHaveBeenCalled();
    expect(mocks.transaction.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: 'ADMIN' }),
      }),
    );
  });

  it('leaves the target untouched when the root TOTP is invalid', async () => {
    mocks.verifyMfaProof.mockResolvedValue(null);
    const { POST } = await import('$app/api/users/[id]/reset-mfa/route');

    const response = await POST(
      createRequest({
        currentPassword: 'Secret1!',
        currentTotpCode: '123456',
      }),
      routeParams,
    );

    expect(response.status).toBe(400);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.consumeVerifiedMfaProof).not.toHaveBeenCalled();
  });

  it('resets all target MFA state atomically and audits the root actor', async () => {
    const proof = { method: 'TOTP' as const, timeStep: 123n };
    mocks.verifyMfaProof.mockResolvedValue(proof);
    const { POST } = await import('$app/api/users/[id]/reset-mfa/route');

    const response = await POST(
      createRequest({
        currentPassword: 'Secret1!',
        currentTotpCode: '123456',
      }),
      routeParams,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.user).toEqual(
      expect.objectContaining({
        id: 'target-user',
        mfaEnabledAt: null,
        securityVersion: 4,
      }),
    );
    expect(mocks.transaction.session.updateMany).toHaveBeenCalledWith({
      data: {
        lastSeenAt: expect.any(Date),
        mfaVerifiedAt: expect.any(Date),
      },
      where: expect.objectContaining({
        mfaMethod: { not: null },
        mfaVerifiedAt: { not: null },
        securityVersion: 7,
        token: 'root-session-hash',
        userId: 'root-user',
      }),
    });
    expect(mocks.transaction.user.updateMany).toHaveBeenCalledWith({
      data: {
        mfaEnabledAt: null,
        securityVersion: { increment: 1 },
      },
      where: expect.objectContaining({
        id: 'target-user',
        isProtected: false,
        mfaEnabledAt: { not: null },
        role: 'USER',
        securityVersion: 3,
      }),
    });
    expect(mocks.consumeVerifiedMfaProof).toHaveBeenCalledWith(
      mocks.transaction,
      expect.objectContaining({
        credentialUpdatedAt: NOW,
        proof,
        userId: 'root-user',
      }),
    );
    expect(mocks.transaction.totpCredential.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'target-user' },
    });
    expect(mocks.transaction.totpEnrollment.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'target-user' },
    });
    expect(mocks.transaction.mfaLoginChallenge.deleteMany).toHaveBeenCalledWith(
      { where: { userId: 'target-user' } },
    );
    expect(mocks.transaction.mfaRecoveryCode.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'target-user' },
    });
    expect(mocks.transaction.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'target-user' },
    });
    expect(mocks.createAuditLogWithHeaders).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'MFA_DISABLED',
        targetUserId: 'target-user',
        userId: 'root-user',
      }),
      { client: mocks.transaction, required: true },
    );
  });

  it('fails closed on a concurrent target security-version change', async () => {
    mocks.transaction.user.updateMany.mockResolvedValue({ count: 0 });
    const { POST } = await import('$app/api/users/[id]/reset-mfa/route');

    const response = await POST(
      createRequest({
        currentPassword: 'Secret1!',
        currentTotpCode: '123456',
      }),
      routeParams,
    );

    expect(response.status).toBe(409);
    expect(mocks.consumeVerifiedMfaProof).not.toHaveBeenCalled();
    expect(mocks.transaction.totpCredential.deleteMany).not.toHaveBeenCalled();
    expect(mocks.createAuditLogWithHeaders).not.toHaveBeenCalled();
  });
});
