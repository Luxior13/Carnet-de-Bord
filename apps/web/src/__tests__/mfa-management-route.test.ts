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

vi.mock('$server/auth', () => ({
  createSession: mocks.createSession,
  generateSessionToken: mocks.generateSessionToken,
  isSecurityVersionMismatchError: vi.fn(() => false),
  mapUserToUserType: vi.fn(),
  SecurityVersionMismatchError: class SecurityVersionMismatchError extends Error {},
  setSessionTokenCookie: vi.fn(),
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
  recordLoginAttempt: vi.fn(),
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

  it('refuses to disable MFA for every administrator before parsing secrets', async () => {
    mocks.requireAuth.mockResolvedValue(
      buildAuth({
        id: 'admin-user',
        isProtected: false,
        mfaEnabledAt: new Date('2026-07-10T12:00:00.000Z'),
        role: 'ADMIN',
      }),
    );
    const { DELETE } = await import('$app/api/auth/mfa/route');

    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.message).toContain('obligatoire');
    expect(mocks.prisma.user.findUnique).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
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

    const response = await GET();
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

    const response = await GET();
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

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      enabledAt: enabledAt.toISOString(),
      required: true,
    });
  });

  it('refuses to disable MFA for an ordinary USER', async () => {
    mocks.requireAuth.mockResolvedValue(
      buildAuth({
        mfaEnabledAt: new Date('2026-07-10T12:00:00.000Z'),
      }),
    );
    const { DELETE } = await import('$app/api/auth/mfa/route');

    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.message).toContain('obligatoire');
    expect(mocks.prisma.user.findUnique).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it('reports an inconsistent MFA marker/credential state instead of masking it', async () => {
    mocks.requireAuth.mockResolvedValue(buildAuth());
    mocks.prisma.totpCredential.findUnique.mockResolvedValue({
      userId: 'user-1',
    });
    const { GET } = await import('$app/api/auth/mfa/route');

    const response = await GET();
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
