import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PERMISSIONS } from '$constants/permissions.constants';
import { ErrorCode } from '$types/api.types';

const mockGetAuthSession = vi.fn();
const mockDeleteSessionCookie = vi.fn();
const mockIsSecurityVersionMismatchError = vi.fn();
const mockRequireAuth = vi.fn();
const mockRequirePermission = vi.fn();
const mockUpdateUserPassword = vi.fn();
const mockInvalidateOtherUserSessions = vi.fn();
const mockResetUserPassword = vi.fn();
const mockVerifyPassword = vi.fn();
const mockCreateAuditLogWithHeaders = vi.fn();
const mockMapUserToUserType = vi.fn((user: unknown): unknown => user);
const mockCheckRateLimit = vi.fn();
const mockRecordLoginAttempt = vi.fn();

const mockPrisma = {
  $transaction: vi.fn(),
  session: {
    delete: vi.fn(),
    deleteMany: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('server-only', () => ({}));

vi.mock('$server/api-auth', () => ({
  requireAuth: mockRequireAuth,
  requirePermission: mockRequirePermission,
}));

vi.mock('$server/auth', () => ({
  createAuditLogWithHeaders: mockCreateAuditLogWithHeaders,
  deleteSessionCookie: mockDeleteSessionCookie,
  getAuthSession: mockGetAuthSession,
  invalidateOtherUserSessions: mockInvalidateOtherUserSessions,
  isSecurityVersionMismatchError: mockIsSecurityVersionMismatchError,
  mapUserToUserType: mockMapUserToUserType,
  resetUserPassword: mockResetUserPassword,
  updateUserPassword: mockUpdateUserPassword,
  verifyPassword: mockVerifyPassword,
}));

vi.mock('$server/rate-limiter', () => ({
  checkRateLimit: mockCheckRateLimit,
  recordLoginAttempt: mockRecordLoginAttempt,
}));

vi.mock('$server/prisma', () => ({
  prisma: mockPrisma,
}));

describe('account security routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma.$transaction.mockImplementation(
      async (callback: (client: typeof mockPrisma) => unknown) =>
        callback(mockPrisma),
    );

    mockGetAuthSession.mockResolvedValue({
      session: {
        expiresAt: new Date('2026-03-20T00:00:00.000Z'),
        idleExpiresAt: new Date('2026-03-01T00:30:00.000Z'),
        lastSeenAt: new Date('2026-03-01T00:00:00.000Z'),
        rememberMe: false,
        securityVersion: 3,
        token: 'session-hash',
        userId: 'user-1',
      },
      user: {
        id: 'user-1',
        isProtected: false,
        mustChangePassword: false,
        permissions: null,
        role: 'USER',
      },
    });

    mockRequireAuth.mockResolvedValue({
      session: {
        expiresAt: new Date('2026-03-20T00:00:00.000Z'),
        idleExpiresAt: new Date('2026-03-01T00:30:00.000Z'),
        lastSeenAt: new Date('2026-03-01T00:00:00.000Z'),
        rememberMe: false,
        securityVersion: 3,
        token: 'session-hash',
        userId: 'user-1',
      },
      success: true,
      user: {
        id: 'user-1',
        isProtected: false,
        permissions: null,
        role: 'USER',
      },
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      passwordHash: 'stored-hash',
    });
    mockPrisma.session.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.session.findMany.mockResolvedValue([]);
    mockVerifyPassword.mockResolvedValue(false);
    mockUpdateUserPassword.mockResolvedValue(undefined);
    mockInvalidateOtherUserSessions.mockResolvedValue(undefined);
    mockResetUserPassword.mockResolvedValue('TempPassword1!');
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remainingAttempts: 5,
    });
    mockRecordLoginAttempt.mockResolvedValue(undefined);
    mockMapUserToUserType.mockImplementation((user: unknown) => user);
    mockRequirePermission.mockReturnValue({ success: true });
    mockCreateAuditLogWithHeaders.mockResolvedValue(undefined);
    mockDeleteSessionCookie.mockResolvedValue(undefined);
    mockIsSecurityVersionMismatchError.mockReturnValue(false);
  });

  describe('GET /api/auth/me', () => {
    it('returns the personal account without requiring user-management permissions', async () => {
      const route = await import('$app/api/auth/me/route');
      const response = await route.GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.user.id).toBe('user-1');
      expect(mockRequireAuth).toHaveBeenCalledWith(undefined, {
        allowPasswordChangeRequired: true,
      });
      expect(mockRequirePermission).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /api/auth/me', () => {
    it('returns 400 for an invalid JSON body', async () => {
      const route = await import('$app/api/auth/me/route');
      const response = await route.PATCH(
        new Request('http://localhost/api/auth/me', {
          body: '{invalid',
          headers: { 'content-type': 'application/json' },
          method: 'PATCH',
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects whitespace-only profile names after trimming', async () => {
      const route = await import('$app/api/auth/me/route');
      const response = await route.PATCH(
        new Request('http://localhost/api/auth/me', {
          body: JSON.stringify({
            firstName: '   ',
            lastName: 'Dupont',
          }),
          method: 'PATCH',
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('audits profile changes from my account with before and after values', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        session: null,
        success: true,
        user: {
          firstName: 'Jean',
          id: 'user-1',
          lastName: 'Dupont',
        },
      });
      mockPrisma.user.update.mockResolvedValueOnce({
        firstName: 'Jeanne',
        id: 'user-1',
        lastName: 'Dupont',
      });

      const route = await import('$app/api/auth/me/route');
      const response = await route.PATCH(
        new Request('http://localhost/api/auth/me', {
          body: JSON.stringify({
            firstName: 'Jeanne',
            lastName: 'Dupont',
          }),
          method: 'PATCH',
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(mockCreateAuditLogWithHeaders).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_UPDATE',
          category: 'USER',
          metadata: expect.objectContaining({
            after: { firstName: 'Jeanne' },
            before: { firstName: 'Jean' },
            changes: {
              firstName: { from: 'Jean', to: 'Jeanne' },
            },
            pageLabel: 'Mon compte',
            poleLabel: 'Espace personnel',
            tabLabel: 'Profil',
          }),
          targetUserId: 'user-1',
          userId: 'user-1',
        }),
        { client: mockPrisma, required: true },
      );
      expect(mockRequirePermission).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-1' }),
        PERMISSIONS.ACCOUNT.UPDATE_PROFILE,
      );
    });

    it('rejects profile changes when personal profile updates are disabled', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        session: null,
        success: true,
        user: {
          firstName: 'Jean',
          id: 'user-1',
          lastName: 'Dupont',
        },
      });
      mockRequirePermission.mockReturnValueOnce({
        response: Response.json(
          {
            error: {
              code: ErrorCode.FORBIDDEN,
              message: 'Action non autorisee',
            },
            success: false,
          },
          { status: 403 },
        ),
        success: false,
      });

      const route = await import('$app/api/auth/me/route');
      const response = await route.PATCH(
        new Request('http://localhost/api/auth/me', {
          body: JSON.stringify({
            firstName: 'Jeanne',
            lastName: 'Dupont',
          }),
          method: 'PATCH',
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.success).toBe(false);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockCreateAuditLogWithHeaders).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('keeps password changes available despite a legacy deny override', async () => {
      mockGetAuthSession.mockResolvedValueOnce({
        session: {
          expiresAt: new Date('2026-03-20T00:00:00.000Z'),
          idleExpiresAt: new Date('2026-03-01T00:30:00.000Z'),
          lastSeenAt: new Date('2026-03-01T00:00:00.000Z'),
          rememberMe: false,
          securityVersion: 3,
          token: 'session-hash',
          userId: 'user-1',
        },
        user: {
          id: 'user-1',
          isProtected: false,
          mustChangePassword: false,
          permissions: { [PERMISSIONS.ACCOUNT.CHANGE_PASSWORD]: false },
          role: 'USER',
        },
      });
      mockVerifyPassword
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const route = await import('$app/api/auth/change-password/route');
      const response = await route.POST(
        new Request('http://localhost/api/auth/change-password', {
          body: JSON.stringify({
            confirmPassword: 'NewPassword1!',
            currentPassword: 'CurrentPassword1!',
            newPassword: 'NewPassword1!',
          }),
          method: 'POST',
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(mockUpdateUserPassword).toHaveBeenCalledWith(
        'user-1',
        'NewPassword1!',
        expect.objectContaining({
          currentSessionToken: 'session-hash',
          expectedSecurityVersion: 3,
        }),
      );
    });

    it('requires the current password for standard password changes', async () => {
      const route = await import('$app/api/auth/change-password/route');
      const response = await route.POST(
        new Request('http://localhost/api/auth/change-password', {
          body: JSON.stringify({
            confirmPassword: 'NewPassword1!',
            newPassword: 'NewPassword1!',
          }),
          method: 'POST',
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(body.error.message).toBe('Le mot de passe actuel est requis');
      expect(mockUpdateUserPassword).not.toHaveBeenCalled();
    });

    it('rejects an incorrect current password', async () => {
      mockVerifyPassword.mockResolvedValueOnce(false);

      const route = await import('$app/api/auth/change-password/route');
      const response = await route.POST(
        new Request('http://localhost/api/auth/change-password', {
          body: JSON.stringify({
            confirmPassword: 'NewPassword1!',
            currentPassword: 'WrongPassword1!',
            newPassword: 'NewPassword1!',
          }),
          method: 'POST',
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Le mot de passe actuel est incorrect');
      expect(mockRecordLoginAttempt).toHaveBeenCalledWith(
        'password-change:user-1',
        false,
      );
      expect(mockUpdateUserPassword).not.toHaveBeenCalled();
    });

    it('rate limits repeated current password checks', async () => {
      mockCheckRateLimit.mockResolvedValueOnce({
        allowed: false,
        remainingAttempts: 0,
        retryAfter: 120,
      });

      const route = await import('$app/api/auth/change-password/route');
      const response = await route.POST(
        new Request('http://localhost/api/auth/change-password', {
          body: JSON.stringify({
            confirmPassword: 'NewPassword1!',
            currentPassword: 'WrongPassword1!',
            newPassword: 'NewPassword1!',
          }),
          method: 'POST',
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ErrorCode.RATE_LIMITED);
      expect(mockVerifyPassword).not.toHaveBeenCalled();
      expect(mockUpdateUserPassword).not.toHaveBeenCalled();
    });

    it('rejects reusing the current password', async () => {
      mockVerifyPassword
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      const route = await import('$app/api/auth/change-password/route');
      const response = await route.POST(
        new Request('http://localhost/api/auth/change-password', {
          body: JSON.stringify({
            confirmPassword: 'CurrentPassword1!',
            currentPassword: 'CurrentPassword1!',
            newPassword: 'CurrentPassword1!',
          }),
          method: 'POST',
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe(
        "Le nouveau mot de passe doit être différent de l'actuel",
      );
      expect(mockUpdateUserPassword).not.toHaveBeenCalled();
    });

    it('allows forced password changes without the current password', async () => {
      mockGetAuthSession.mockResolvedValue({
        session: {
          expiresAt: new Date('2026-03-20T00:00:00.000Z'),
          idleExpiresAt: new Date('2026-03-01T00:30:00.000Z'),
          lastSeenAt: new Date('2026-03-01T00:00:00.000Z'),
          rememberMe: false,
          securityVersion: 3,
          token: 'session-hash',
          userId: 'user-1',
        },
        user: {
          id: 'user-1',
          mustChangePassword: true,
        },
      });
      mockVerifyPassword.mockResolvedValueOnce(false);

      const route = await import('$app/api/auth/change-password/route');
      const response = await route.POST(
        new Request('http://localhost/api/auth/change-password', {
          body: JSON.stringify({
            confirmPassword: 'NewPassword1!',
            newPassword: 'NewPassword1!',
          }),
          method: 'POST',
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(mockUpdateUserPassword).toHaveBeenCalledWith(
        'user-1',
        'NewPassword1!',
        expect.objectContaining({
          audit: expect.objectContaining({
            action: 'PASSWORD_CHANGE',
            category: 'AUTH',
            metadata: expect.objectContaining({
              pageLabel: 'Mon compte',
              passwordChange: true,
              poleLabel: 'Espace personnel',
              tabKey: 'security',
            }),
            userId: 'user-1',
          }),
          currentSessionToken: 'session-hash',
          expectedSecurityVersion: 3,
          rateLimitKey: 'password-change:user-1',
        }),
      );
      expect(mockInvalidateOtherUserSessions).not.toHaveBeenCalled();
      expect(mockCreateAuditLogWithHeaders).not.toHaveBeenCalled();
    });

    it('expires the client session when password state changed concurrently', async () => {
      const staleSecurityError = new Error('stale security state');
      mockVerifyPassword
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      mockUpdateUserPassword.mockRejectedValueOnce(staleSecurityError);
      mockIsSecurityVersionMismatchError.mockImplementation(
        (error) => error === staleSecurityError,
      );

      const route = await import('$app/api/auth/change-password/route');
      const response = await route.POST(
        new Request('http://localhost/api/auth/change-password', {
          body: JSON.stringify({
            confirmPassword: 'NewPassword1!',
            currentPassword: 'CurrentPassword1!',
            newPassword: 'NewPassword1!',
          }),
          method: 'POST',
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(mockDeleteSessionCookie).toHaveBeenCalledTimes(1);
    });

    it('returns a validation error for malformed payloads', async () => {
      const route = await import('$app/api/auth/change-password/route');
      const response = await route.POST(
        new Request('http://localhost/api/auth/change-password', {
          body: JSON.stringify({
            confirmPassword: 123,
            newPassword: 123,
          }),
          method: 'POST',
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });
  });

  describe('GET /api/auth/sessions', () => {
    it('marks the current session correctly', async () => {
      mockPrisma.session.findMany.mockResolvedValue([
        {
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
          expiresAt: new Date('2026-03-20T00:00:00.000Z'),
          id: 'session-1',
          idleExpiresAt: new Date('2026-03-08T00:00:00.000Z'),
          ipAddress: '1.1.1.1',
          lastSeenAt: new Date('2026-03-01T00:00:00.000Z'),
          rememberMe: true,
          token: 'session-hash',
          userAgent: 'Chrome',
        },
        {
          createdAt: new Date('2026-03-02T00:00:00.000Z'),
          expiresAt: new Date('2026-03-21T00:00:00.000Z'),
          id: 'session-2',
          idleExpiresAt: new Date('2026-03-02T00:30:00.000Z'),
          ipAddress: '2.2.2.2',
          lastSeenAt: new Date('2026-03-02T00:00:00.000Z'),
          rememberMe: false,
          token: 'other-hash',
          userAgent: 'Firefox',
        },
      ]);

      const route = await import('$app/api/auth/sessions/route');
      const response = await route.GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.sessions).toHaveLength(2);
      expect(body.data.sessions[0].isCurrent).toBe(true);
      expect(body.data.sessions[1].isCurrent).toBe(false);
      expect(body.data.sessions[0]).toMatchObject({
        idleExpiresAt: '2026-03-08T00:00:00.000Z',
        lastSeenAt: '2026-03-01T00:00:00.000Z',
      });
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { expiresAt: { lte: expect.any(Date) } },
            { idleExpiresAt: { lte: expect.any(Date) } },
          ],
          userId: 'user-1',
        },
      });
      expect(mockRequirePermission).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-1' }),
        PERMISSIONS.ACCOUNT.MANAGE_SESSIONS,
      );
    });

    it('blocks personal session data without account security permission', async () => {
      mockRequirePermission.mockReturnValueOnce({
        response: Response.json(
          {
            error: { code: ErrorCode.FORBIDDEN, message: 'Accès refusé' },
            success: false,
          },
          { status: 403 },
        ),
        success: false,
      });

      const route = await import('$app/api/auth/sessions/route');
      const response = await route.GET();

      expect(response.status).toBe(403);
      expect(mockPrisma.session.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.session.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/users/[id]/reset-password', () => {
    it('rejects resetting your own password from user management', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        isProtected: false,
        loginName: 'self.user',
      });

      const route = await import('$app/api/users/[id]/reset-password/route');
      const response = await route.POST(
        new NextRequest('http://localhost/api/users/user-1/reset-password', {
          method: 'POST',
        }),
        { params: Promise.resolve({ id: 'user-1' }) },
      );
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ErrorCode.FORBIDDEN);
      expect(mockResetUserPassword).not.toHaveBeenCalled();
    });

    it('rejects resetting an admin password for non-protected users', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'admin-1',
        isProtected: false,
        loginName: 'admin.user',
        role: 'ADMIN',
      });

      const route = await import('$app/api/users/[id]/reset-password/route');
      const response = await route.POST(
        new NextRequest('http://localhost/api/users/admin-1/reset-password', {
          method: 'POST',
        }),
        { params: Promise.resolve({ id: 'admin-1' }) },
      );
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ErrorCode.FORBIDDEN);
      expect(mockResetUserPassword).not.toHaveBeenCalled();
    });

    it('rejects resetting the root password even for another protected actor', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        session: null,
        success: true,
        user: {
          id: 'protected-actor',
          isProtected: true,
          permissions: null,
          role: 'ADMIN',
        },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'root-1',
        isProtected: true,
        loginName: 'root.owner',
        role: 'ADMIN',
      });

      const route = await import('$app/api/users/[id]/reset-password/route');
      const response = await route.POST(
        new NextRequest('http://localhost/api/users/root-1/reset-password', {
          method: 'POST',
        }),
        { params: Promise.resolve({ id: 'root-1' }) },
      );

      expect(response.status).toBe(403);
      expect(mockResetUserPassword).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/users/[id]/sessions', () => {
    it('lists target user active sessions for session viewers', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'target-1',
        isProtected: false,
        loginName: 'target.user',
      });
      mockPrisma.session.findMany.mockResolvedValueOnce([
        {
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
          expiresAt: new Date('2026-03-20T00:00:00.000Z'),
          id: 'session-1',
          idleExpiresAt: new Date('2026-03-08T00:00:00.000Z'),
          ipAddress: '1.1.1.1',
          lastSeenAt: new Date('2026-03-01T00:00:00.000Z'),
          rememberMe: true,
          userAgent: 'Chrome',
        },
      ]);

      const route = await import('$app/api/users/[id]/sessions/route');
      const response = await route.GET(
        new NextRequest('http://localhost/api/users/target-1/sessions'),
        { params: Promise.resolve({ id: 'target-1' }) },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.sessions).toHaveLength(1);
      expect(body.data.sessions[0]).toMatchObject({
        idleExpiresAt: '2026-03-08T00:00:00.000Z',
        lastSeenAt: '2026-03-01T00:00:00.000Z',
      });
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { expiresAt: { lte: expect.any(Date) } },
            { idleExpiresAt: { lte: expect.any(Date) } },
          ],
          userId: 'target-1',
        },
      });
      expect(mockRequirePermission).toHaveBeenCalledWith(
        expect.any(Object),
        'users:view_sessions',
      );
      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expiresAt: { gt: expect.any(Date) },
            idleExpiresAt: { gt: expect.any(Date) },
            userId: 'target-1',
          }),
        }),
      );
    });

    it('rejects listing your own sessions through user management', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        isProtected: false,
        loginName: 'self.user',
      });

      const route = await import('$app/api/users/[id]/sessions/route');
      const response = await route.GET(
        new NextRequest('http://localhost/api/users/user-1/sessions'),
        { params: Promise.resolve({ id: 'user-1' }) },
      );
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ErrorCode.FORBIDDEN);
      expect(mockPrisma.session.findMany).not.toHaveBeenCalled();
    });

    it('rejects listing admin sessions for non-protected users', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'admin-1',
        isProtected: false,
        loginName: 'admin.user',
        role: 'ADMIN',
      });

      const route = await import('$app/api/users/[id]/sessions/route');
      const response = await route.GET(
        new NextRequest('http://localhost/api/users/admin-1/sessions'),
        { params: Promise.resolve({ id: 'admin-1' }) },
      );
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ErrorCode.FORBIDDEN);
      expect(mockPrisma.session.findMany).not.toHaveBeenCalled();
    });

    it('keeps root sessions private from every other actor', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        session: null,
        success: true,
        user: {
          id: 'protected-actor',
          isProtected: true,
          permissions: null,
          role: 'ADMIN',
        },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'root-1',
        isProtected: true,
        loginName: 'root.owner',
        role: 'ADMIN',
      });

      const route = await import('$app/api/users/[id]/sessions/route');
      const response = await route.GET(
        new NextRequest('http://localhost/api/users/root-1/sessions'),
        { params: Promise.resolve({ id: 'root-1' }) },
      );

      expect(response.status).toBe(403);
      expect(mockPrisma.session.findMany).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/users/[id]/sessions', () => {
    it('revokes all target user sessions', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'target-1',
        isProtected: false,
        loginName: 'target.user',
      });
      mockPrisma.session.deleteMany.mockResolvedValueOnce({ count: 2 });

      const route = await import('$app/api/users/[id]/sessions/route');
      const response = await route.DELETE(
        new NextRequest('http://localhost/api/users/target-1/sessions', {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: 'target-1' }) },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.revokedSessions).toBe(2);
      expect(mockRequirePermission).toHaveBeenCalledWith(
        expect.any(Object),
        'users:revoke_sessions',
      );
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'target-1' },
      });
      expect(mockCreateAuditLogWithHeaders).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SESSION_INVALIDATE',
          category: 'AUTH',
          metadata: expect.objectContaining({ revokedSessions: 2 }),
          targetUserId: 'target-1',
          userId: 'user-1',
        }),
        { client: mockPrisma, required: true },
      );
    });

    it('revokes one target user session when a session id is provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        firstName: 'Target',
        id: 'target-1',
        isProtected: false,
        lastName: 'User',
        loginName: 'target.user',
      });
      mockPrisma.session.findFirst.mockResolvedValueOnce({
        id: 'session-1',
      });
      mockPrisma.session.delete.mockResolvedValueOnce({
        id: 'session-1',
      });

      const route = await import('$app/api/users/[id]/sessions/route');
      const response = await route.DELETE(
        new NextRequest(
          'http://localhost/api/users/target-1/sessions?id=session-1',
          {
            method: 'DELETE',
          },
        ),
        { params: Promise.resolve({ id: 'target-1' }) },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.revokedSessions).toBe(1);
      expect(mockPrisma.session.findFirst).toHaveBeenCalledWith({
        select: { id: true },
        where: {
          id: 'session-1',
          userId: 'target-1',
        },
      });
      expect(mockPrisma.session.delete).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
      expect(mockPrisma.session.deleteMany).not.toHaveBeenCalled();
      expect(mockCreateAuditLogWithHeaders).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SESSION_INVALIDATE',
          category: 'AUTH',
          metadata: expect.objectContaining({
            revocationScope: 'single',
            revokedSessions: 1,
            sessionId: 'session-1',
          }),
          targetUserId: 'target-1',
          userId: 'user-1',
        }),
        { client: mockPrisma, required: true },
      );
    });

    it('rejects revoking admin sessions for non-protected users', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'admin-1',
        isProtected: false,
        loginName: 'admin.user',
        role: 'ADMIN',
      });

      const route = await import('$app/api/users/[id]/sessions/route');
      const response = await route.DELETE(
        new NextRequest('http://localhost/api/users/admin-1/sessions', {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: 'admin-1' }) },
      );
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ErrorCode.FORBIDDEN);
      expect(mockPrisma.session.deleteMany).not.toHaveBeenCalled();
    });

    it('rejects revoking root sessions for every other actor', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        session: null,
        success: true,
        user: {
          id: 'protected-actor',
          isProtected: true,
          permissions: null,
          role: 'ADMIN',
        },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'root-1',
        isProtected: true,
        loginName: 'root.owner',
        role: 'ADMIN',
      });

      const route = await import('$app/api/users/[id]/sessions/route');
      const response = await route.DELETE(
        new NextRequest('http://localhost/api/users/root-1/sessions', {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: 'root-1' }) },
      );

      expect(response.status).toBe(403);
      expect(mockPrisma.session.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/auth/sessions', () => {
    it('prevents revoking the current session through the revoke endpoint', async () => {
      mockPrisma.session.findFirst.mockResolvedValue({
        id: 'session-1',
        token: 'session-hash',
        userId: 'user-1',
      });

      const route = await import('$app/api/auth/sessions/route');
      const response = await route.DELETE(
        new Request('http://localhost/api/auth/sessions?id=session-1', {
          method: 'DELETE',
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ErrorCode.FORBIDDEN);
      expect(mockRequirePermission).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-1' }),
        PERMISSIONS.ACCOUNT.MANAGE_SESSIONS,
      );
      expect(mockPrisma.session.delete).not.toHaveBeenCalled();
    });

    it('revokes all other sessions while keeping the current token', async () => {
      const route = await import('$app/api/auth/sessions/route');
      const response = await route.DELETE(
        new Request('http://localhost/api/auth/sessions', {
          method: 'DELETE',
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: {
          NOT: { token: 'session-hash' },
          userId: 'user-1',
        },
      });
      expect(mockCreateAuditLogWithHeaders).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SESSION_INVALIDATE',
          category: 'AUTH',
          metadata: expect.objectContaining({
            pageLabel: 'Mon compte',
            poleLabel: 'Espace personnel',
            revokedSessions: 0,
            tabKey: 'security',
          }),
          userId: 'user-1',
        }),
        { client: mockPrisma, required: true },
      );
      expect(mockRequirePermission).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-1' }),
        PERMISSIONS.ACCOUNT.MANAGE_SESSIONS,
      );
    });
  });
});
