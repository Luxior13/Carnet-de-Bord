import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PERMISSIONS } from '$constants/permissions.constants';

const mocks = vi.hoisted(() => ({
  clearMfaChallengeCookie: vi.fn(),
  createSession: vi.fn(),
  generateSessionToken: vi.fn(),
  prisma: {
    mfaRecoveryCode: { count: vi.fn() },
    totpCredential: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
  },
  requireAuth: vi.fn(),
  requirePermission: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('$server/api-auth', () => ({
  requireAuth: mocks.requireAuth,
  requirePermission: mocks.requirePermission,
}));

vi.mock('$server/session', () => ({
  createSession: mocks.createSession,
  generateSessionToken: mocks.generateSessionToken,
  setSessionTokenCookie: vi.fn(),
}));
vi.mock('$server/auth-errors', () => ({
  isSecurityVersionMismatchError: vi.fn(() => false),
  SecurityVersionMismatchError: class SecurityVersionMismatchError extends Error {},
}));
vi.mock('$server/user-projection', () => ({
  mapUserToUserType: vi.fn(),
}));
vi.mock('$server/password', () => ({
  verifyPassword: vi.fn(),
}));

vi.mock('$server/logger', () => ({
  logger: { error: vi.fn() },
}));

vi.mock('$server/mfa', () => ({
  clearMfaChallengeCookie: mocks.clearMfaChallengeCookie,
  consumeVerifiedMfaProof: vi.fn(),
  MFA_TOTP_CODE_PATTERN: /^\d{6}$/,
  MfaReplayDetectedError: class MfaReplayDetectedError extends Error {},
  verifyMfaProof: vi.fn(),
}));

vi.mock('$server/prisma', () => ({
  prisma: mocks.prisma,
}));

vi.mock('$server/rate-limiter', () => ({
  clearRateLimit: vi.fn(),
  reserveSensitiveActionRateLimit: vi.fn(),
}));

const buildAuth = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  session: {
    expiresAt: new Date('2026-07-15T20:00:00.000Z'),
    idleExpiresAt: new Date('2026-07-14T20:30:00.000Z'),
    lastSeenAt: new Date('2026-07-14T20:00:00.000Z'),
    rememberMe: false,
    securityVersion: 3,
    token: 'current-session-hash',
    userId: 'user-1',
  },
  success: true,
  user: {
    id: 'user-1',
    isProtected: false,
    mfaEnabledAt: null,
    role: 'USER',
    ...overrides,
  },
});

describe('/api/auth/mfa management invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermission.mockReturnValue({ success: true });
    mocks.prisma.mfaRecoveryCode.count.mockResolvedValue(0);
  });

  // MFA is mandatory: the always-refusing DELETE had no caller and was
  // removed on 25 October 2026, so the route only reads the state.
  it('offers no way to disable MFA', async () => {
    const route = await import('$app/api/auth/mfa/route');

    expect(Object.keys(route)).toEqual(['GET']);
  });

  it('reports MFA as mandatory for an administrator', async () => {
    const enabledAt = new Date('2026-07-10T12:00:00.000Z');
    mocks.requireAuth.mockResolvedValue(
      buildAuth({ mfaEnabledAt: enabledAt, role: 'ADMIN' }),
    );
    mocks.prisma.totpCredential.findUnique.mockResolvedValue({
      userId: 'user-1',
    });
    const { GET } = await import('$app/api/auth/mfa/route');

    const response = await GET(
      new NextRequest('http://localhost/api/auth/mfa'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      enabledAt: enabledAt.toISOString(),
      required: true,
    });
  });

  it('reports MFA as mandatory for a USER with effective critical access', async () => {
    const enabledAt = new Date('2026-07-10T12:00:00.000Z');
    mocks.requireAuth.mockResolvedValue(
      buildAuth({
        mfaEnabledAt: enabledAt,
        permissions: {
          [PERMISSIONS.USERS.UPDATE_LOGIN]: true,
          [PERMISSIONS.USERS.VIEW]: true,
        },
      }),
    );
    mocks.prisma.totpCredential.findUnique.mockResolvedValue({
      userId: 'user-1',
    });
    const { GET } = await import('$app/api/auth/mfa/route');

    const response = await GET(
      new NextRequest('http://localhost/api/auth/mfa'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      enabledAt: enabledAt.toISOString(),
      required: true,
    });
  });

  it('reports MFA as mandatory for an ordinary USER', async () => {
    const enabledAt = new Date('2026-07-10T12:00:00.000Z');
    mocks.requireAuth.mockResolvedValue(buildAuth({ mfaEnabledAt: enabledAt }));
    mocks.prisma.totpCredential.findUnique.mockResolvedValue({
      userId: 'user-1',
    });
    const { GET } = await import('$app/api/auth/mfa/route');

    const response = await GET(
      new NextRequest('http://localhost/api/auth/mfa'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      enabledAt: enabledAt.toISOString(),
      required: true,
    });
  });

  it('reports an inconsistent MFA marker/credential state instead of masking it', async () => {
    mocks.requireAuth.mockResolvedValue(buildAuth());
    mocks.prisma.totpCredential.findUnique.mockResolvedValue({
      userId: 'user-1',
    });
    const { GET } = await import('$app/api/auth/mfa/route');

    const response = await GET(
      new NextRequest('http://localhost/api/auth/mfa'),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.message).toContain('incohérente');
  });

  it('refuses a recovery code when regenerating recovery codes', async () => {
    mocks.requireAuth.mockResolvedValue(
      buildAuth({
        mfaEnabledAt: new Date('2026-07-10T12:00:00.000Z'),
      }),
    );
    const { POST } = await import('$app/api/auth/mfa/recovery-codes/route');

    const response = await POST(
      new NextRequest('http://localhost/api/auth/mfa/recovery-codes', {
        body: JSON.stringify({
          currentPassword: 'Secret1!',
          currentTotpCode: 'ABCD-EFGH-IJKL-MNOP-QRST-UVWX',
        }),
        method: 'POST',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(mocks.prisma.user.findUnique).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
});
