import { describe, expect, it, vi } from 'vitest';

import { PERMISSIONS } from '$constants/permissions.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import { ErrorCode } from '$types/api.types';

const { mockGetAuthSession, mockReserveAuthenticatedApiRateLimit } = vi.hoisted(
  () => ({
    mockGetAuthSession: vi.fn(),
    mockReserveAuthenticatedApiRateLimit: vi.fn(() =>
      Promise.resolve({
        allowed: true,
        remainingAttempts: 299,
        retryAfter: undefined as number | undefined,
      }),
    ),
  }),
);

vi.mock('server-only', () => ({}));

vi.mock('$server/session', () => ({
  getAuthSession: mockGetAuthSession,
}));

vi.mock('$server/rate-limiter', () => ({
  reserveAuthenticatedApiRateLimit: mockReserveAuthenticatedApiRateLimit,
}));

const buildAuthUser = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  contactEmail: 'user@example.com',
  contactEmailVerifiedAt: null,
  createdAt: new Date('2026-03-01T00:00:00.000Z'),
  firstName: 'Jean',
  id: 'user-1',
  isActive: true,
  isProtected: false,
  lastLoginAt: null,
  lastName: 'Dupont',
  loginName: 'user.test',
  mustChangePassword: false,
  passwordChangedAt: null,
  permissions: {},
  role: 'USER',
  ...overrides,
});

describe('requireAuth', () => {
  it('blocks standard API access while a temporary password must be changed', async () => {
    mockGetAuthSession.mockResolvedValueOnce({
      session: {
        expiresAt: new Date('2026-03-20T00:00:00.000Z'),
        idleExpiresAt: new Date('2026-03-01T00:30:00.000Z'),
        lastSeenAt: new Date('2026-03-01T00:00:00.000Z'),
        rememberMe: false,
        token: 'session-hash',
        userId: 'user-1',
      },
      user: buildAuthUser({ mustChangePassword: true }),
    });

    const auth = await requireAuth();

    expect(auth.success).toBe(false);
    if (!auth.success) {
      expect(auth.response.status).toBe(403);
      const body = await auth.response.json();
      expect(body.error.code).toBe(ErrorCode.PASSWORD_CHANGE_REQUIRED);
    }
  });

  it('allows explicitly whitelisted routes during required password change', async () => {
    mockGetAuthSession.mockResolvedValueOnce({
      session: {
        expiresAt: new Date('2026-03-20T00:00:00.000Z'),
        idleExpiresAt: new Date('2026-03-01T00:30:00.000Z'),
        lastSeenAt: new Date('2026-03-01T00:00:00.000Z'),
        rememberMe: false,
        token: 'session-hash',
        userId: 'user-1',
      },
      user: buildAuthUser({ mustChangePassword: true }),
    });

    const auth = await requireAuth({ allowPasswordChangeRequired: true });

    expect(auth.success).toBe(true);
  });

  it('enforces the durable authenticated API budget', async () => {
    mockGetAuthSession.mockResolvedValueOnce({
      session: null,
      user: buildAuthUser(),
    });
    mockReserveAuthenticatedApiRateLimit.mockResolvedValueOnce({
      allowed: false,
      remainingAttempts: 0,
      retryAfter: 42,
    });

    const auth = await requireAuth();

    expect(auth.success).toBe(false);
    if (!auth.success) {
      expect(auth.response.status).toBe(429);
      expect(auth.response.headers.get('Retry-After')).toBe('42');
      expect((await auth.response.json()).error.code).toBe(
        ErrorCode.RATE_LIMITED,
      );
    }
  });
});

describe('protected permission bypass', () => {
  it('allows a protected account to bypass a known active policy', () => {
    const result = requirePermission(
      buildAuthUser({ isProtected: true }) as never,
      PERMISSIONS.AUDIT.VIEW_FIELD_HISTORY,
    );

    expect(result.success).toBe(true);
  });

  it('fails closed for an unknown permission even on a protected account', () => {
    const result = requirePermission(
      buildAuthUser({ isProtected: true }) as never,
      'users:veiw',
    );

    expect(result.success).toBe(false);
    if (!result.success) expect(result.response.status).toBe(403);
  });
});
