import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PERMISSIONS } from '$constants/permissions.constants';
import { ErrorCode } from '$types/api.types';

const mocks = vi.hoisted(() => ({
  audit: vi.fn(),
  mapUser: vi.fn(),
  recordAttempt: vi.fn(),
  requireAuth: vi.fn(),
  requirePermission: vi.fn(),
  reserveRateLimit: vi.fn(),
  transaction: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('$server/api-auth', () => ({
  requireAuth: mocks.requireAuth,
  requirePermission: mocks.requirePermission,
}));

vi.mock('$server/auth', () => ({
  createAuditLogWithHeaders: mocks.audit,
  mapUserToUserType: mocks.mapUser,
  verifyPassword: mocks.verifyPassword,
}));

vi.mock('$server/rate-limiter', () => ({
  recordLoginAttempt: mocks.recordAttempt,
  reserveSensitiveActionRateLimit: mocks.reserveRateLimit,
}));

const transactionClient = {
  user: { update: mocks.userUpdate },
};

vi.mock('$server/prisma', () => ({
  prisma: {
    $transaction: mocks.transaction,
    user: { findUnique: mocks.userFindUnique },
  },
}));

const updatedAt = new Date('2026-07-14T10:00:00.000Z');
const verifiedAt = new Date('2026-07-01T10:00:00.000Z');

const storedUser = {
  contactEmail: 'old@example.com',
  contactEmailVerifiedAt: verifiedAt,
  id: 'user-1',
  loginName: 'member.one',
  passwordHash: 'stored-password-hash',
  securityVersion: 7,
  updatedAt,
};

const request = (body: unknown): Request =>
  new Request('http://localhost/api/auth/contact-email', {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    method: 'PATCH',
  });

describe('PATCH /api/auth/contact-email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      session: null,
      success: true,
      user: {
        id: 'user-1',
        isProtected: true,
        permissions: null,
        role: 'ADMIN',
      },
    });
    mocks.requirePermission.mockReturnValue({ success: true });
    mocks.reserveRateLimit.mockResolvedValue({
      allowed: true,
      remainingAttempts: 4,
    });
    mocks.userFindUnique.mockResolvedValue(storedUser);
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.recordAttempt.mockResolvedValue(undefined);
    mocks.userUpdate.mockResolvedValue({
      ...storedUser,
      contactEmail: 'owner@example.com',
      contactEmailVerifiedAt: null,
    });
    mocks.audit.mockResolvedValue(undefined);
    mocks.mapUser.mockImplementation((user: unknown) => user);
    mocks.transaction.mockImplementation(
      async (callback: (client: typeof transactionClient) => unknown) =>
        callback(transactionClient),
    );
  });

  it('requires the authenticated account itself', async () => {
    mocks.requireAuth.mockResolvedValueOnce({
      response: Response.json(
        {
          error: { code: ErrorCode.UNAUTHORIZED, message: 'Non authentifié' },
          success: false,
        },
        { status: 401 },
      ),
      success: false,
    });

    const route = await import('$app/api/auth/contact-email/route');
    const response = await route.PATCH(
      request({
        contactEmail: 'owner@example.com',
        currentPassword: 'CurrentPassword1!',
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.requirePermission).not.toHaveBeenCalled();
    expect(mocks.reserveRateLimit).not.toHaveBeenCalled();
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
  });

  it('requires the personal contact-update permission', async () => {
    mocks.requirePermission.mockReturnValueOnce({
      response: Response.json(
        {
          error: { code: ErrorCode.FORBIDDEN, message: 'Accès refusé' },
          success: false,
        },
        { status: 403 },
      ),
      success: false,
    });

    const route = await import('$app/api/auth/contact-email/route');
    const response = await route.PATCH(
      request({
        contactEmail: 'owner@example.com',
        currentPassword: 'CurrentPassword1!',
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
      PERMISSIONS.ACCOUNT.UPDATE_CONTACT,
    );
    expect(mocks.reserveRateLimit).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON before reserving password work', async () => {
    const route = await import('$app/api/auth/contact-email/route');
    const response = await route.PATCH(
      new Request('http://localhost/api/auth/contact-email', {
        body: '{invalid',
        headers: { 'content-type': 'application/json' },
        method: 'PATCH',
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.reserveRateLimit).not.toHaveBeenCalled();
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
  });

  it.each([
    ['missing current password', { contactEmail: 'owner@example.com' }],
    [
      'invalid contact address',
      { contactEmail: 'not-an-email', currentPassword: 'CurrentPassword1!' },
    ],
    [
      'unknown input field',
      {
        contactEmail: 'owner@example.com',
        currentPassword: 'CurrentPassword1!',
        loginName: 'changed-login',
      },
    ],
    [
      'non-string contact address',
      { contactEmail: 123, currentPassword: 'CurrentPassword1!' },
    ],
  ])('strictly rejects %s', async (_label, body) => {
    const route = await import('$app/api/auth/contact-email/route');
    const response = await route.PATCH(request(body));
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(mocks.reserveRateLimit).not.toHaveBeenCalled();
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it('returns 429 without loading the hash or running bcrypt when blocked', async () => {
    mocks.reserveRateLimit.mockResolvedValueOnce({
      allowed: false,
      remainingAttempts: 0,
      retryAfter: 600,
    });

    const route = await import('$app/api/auth/contact-email/route');
    const response = await route.PATCH(
      request({
        contactEmail: 'owner@example.com',
        currentPassword: 'CurrentPassword1!',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('600');
    expect(body.error.code).toBe(ErrorCode.RATE_LIMITED);
    expect(mocks.reserveRateLimit).toHaveBeenCalledWith(
      'account-reauth:user-1',
    );
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
  });

  it('reserves atomically before bcrypt and keeps a failed proof counted', async () => {
    mocks.verifyPassword.mockResolvedValueOnce(false);

    const route = await import('$app/api/auth/contact-email/route');
    const response = await route.PATCH(
      request({
        contactEmail: 'owner@example.com',
        currentPassword: 'WrongPassword1!',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(mocks.reserveRateLimit.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.verifyPassword.mock.invocationCallOrder[0] ?? Infinity,
    );
    expect(mocks.verifyPassword).toHaveBeenCalledWith(
      'WrongPassword1!',
      'stored-password-hash',
    );
    expect(mocks.recordAttempt).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('returns 404 for a session whose user disappeared without running bcrypt', async () => {
    mocks.userFindUnique.mockResolvedValueOnce(null);

    const route = await import('$app/api/auth/contact-email/route');
    const response = await route.PATCH(
      request({
        contactEmail: 'owner@example.com',
        currentPassword: 'CurrentPassword1!',
      }),
    );

    expect(response.status).toBe(404);
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
    expect(mocks.recordAttempt).not.toHaveBeenCalled();
  });

  it('normalizes the address and updates it optimistically in an audited transaction', async () => {
    const route = await import('$app/api/auth/contact-email/route');
    const response = await route.PATCH(
      request({
        contactEmail: '  OWNER@Example.COM  ',
        currentPassword: 'CurrentPassword1!',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mocks.recordAttempt).toHaveBeenCalledWith(
      'account-reauth:user-1',
      true,
    );
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      data: {
        contactEmail: 'owner@example.com',
        contactEmailVerifiedAt: null,
      },
      where: { id: 'user-1', updatedAt },
    });
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_UPDATE',
        category: 'USER',
        metadata: expect.objectContaining({
          after: { contactEmail: 'owner@example.com' },
          before: { contactEmail: 'old@example.com' },
          pageLabel: 'Mon compte',
          tabLabel: 'Profil',
        }),
        targetUserId: 'user-1',
        userId: 'user-1',
      }),
      { client: transactionClient, required: true },
    );

    const updateData = mocks.userUpdate.mock.calls[0]?.[0]?.data;
    expect(Object.keys(updateData ?? {}).sort()).toEqual([
      'contactEmail',
      'contactEmailVerifiedAt',
    ]);
    const serializedAudit = JSON.stringify(mocks.audit.mock.calls[0]);
    expect(serializedAudit).not.toContain('CurrentPassword1!');
    expect(serializedAudit).not.toContain('stored-password-hash');
    expect(serializedAudit).not.toContain('securityVersion');
    expect(serializedAudit).not.toContain('loginName');
  });

  it.each([[''], [null]])(
    'accepts %s to clear the contact address',
    async (contactEmail) => {
      mocks.userUpdate.mockResolvedValueOnce({
        ...storedUser,
        contactEmail: null,
        contactEmailVerifiedAt: null,
      });

      const route = await import('$app/api/auth/contact-email/route');
      const response = await route.PATCH(
        request({
          contactEmail,
          currentPassword: 'CurrentPassword1!',
        }),
      );

      expect(response.status).toBe(200);
      expect(mocks.userUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { contactEmail: null, contactEmailVerifiedAt: null },
        }),
      );
    },
  );

  it('releases a valid proof but skips mutation and audit for an unchanged address', async () => {
    const route = await import('$app/api/auth/contact-email/route');
    const response = await route.PATCH(
      request({
        contactEmail: 'OLD@EXAMPLE.COM',
        currentPassword: 'CurrentPassword1!',
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.recordAttempt).toHaveBeenCalledWith(
      'account-reauth:user-1',
      true,
    );
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.userUpdate).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it('returns 409 instead of overwriting a concurrent account update', async () => {
    mocks.userUpdate.mockRejectedValueOnce({ code: 'P2025' });

    const route = await import('$app/api/auth/contact-email/route');
    const response = await route.PATCH(
      request({
        contactEmail: 'owner@example.com',
        currentPassword: 'CurrentPassword1!',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe(ErrorCode.CONFLICT);
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});
