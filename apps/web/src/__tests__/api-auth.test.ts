import { describe, expect, it, vi } from 'vitest';

import { requireAuth } from '$server/api-auth';
import { ErrorCode } from '$types/api.types';

const { mockGetAuthSession } = vi.hoisted(() => ({
  mockGetAuthSession: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('$server/auth', () => ({
  getAuthSession: mockGetAuthSession,
}));

const buildAuthUser = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  contactEmail: 'user@example.com',
  contactEmailVerifiedAt: null,
  createdAt: new Date('2026-03-01T00:00:00.000Z'),
  failedLoginAttempts: 0,
  firstName: 'Jean',
  id: 'user-1',
  isActive: true,
  isProtected: false,
  lastLoginAt: null,
  lastName: 'Dupont',
  lockedUntil: null,
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

    const auth = await requireAuth(undefined, {
      allowPasswordChangeRequired: true,
    });

    expect(auth.success).toBe(true);
  });
});
