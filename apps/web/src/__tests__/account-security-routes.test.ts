import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorCode } from '$types/api.types';

const mockGetAuthSession = vi.fn();
const mockRequireAuth = vi.fn();
const mockRequirePermission = vi.fn();
const mockUpdateUserPassword = vi.fn();
const mockInvalidateOtherUserSessions = vi.fn();
const mockResetUserPassword = vi.fn();
const mockVerifyPassword = vi.fn();
const mockCreateAuditLogWithHeaders = vi.fn();

const mockPrisma = {
  session: {
    delete: vi.fn(),
    deleteMany: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

vi.mock('server-only', () => ({}));

vi.mock('$server/api-auth', () => ({
  requireAuth: mockRequireAuth,
  requirePermission: mockRequirePermission,
}));

vi.mock('$server/auth', () => ({
  createAuditLogWithHeaders: mockCreateAuditLogWithHeaders,
  getAuthSession: mockGetAuthSession,
  invalidateOtherUserSessions: mockInvalidateOtherUserSessions,
  resetUserPassword: mockResetUserPassword,
  updateUserPassword: mockUpdateUserPassword,
  verifyPassword: mockVerifyPassword,
}));

vi.mock('$server/prisma', () => ({
  prisma: mockPrisma,
}));

describe('account security routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetAuthSession.mockResolvedValue({
      session: {
        expiresAt: new Date('2026-03-20T00:00:00.000Z'),
        rememberMe: false,
        token: 'session-hash',
        userId: 'user-1',
      },
      user: {
        id: 'user-1',
        mustChangePassword: false,
      },
    });

    mockRequireAuth.mockResolvedValue({
      session: {
        expiresAt: new Date('2026-03-20T00:00:00.000Z'),
        rememberMe: false,
        token: 'session-hash',
        userId: 'user-1',
      },
      success: true,
      user: {
        id: 'user-1',
      },
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      passwordHash: 'stored-hash',
    });
    mockPrisma.session.findMany.mockResolvedValue([]);
    mockVerifyPassword.mockResolvedValue(false);
    mockUpdateUserPassword.mockResolvedValue(undefined);
    mockInvalidateOtherUserSessions.mockResolvedValue(undefined);
    mockResetUserPassword.mockResolvedValue('TempPassword1!');
    mockRequirePermission.mockReturnValue({ success: true });
    mockCreateAuditLogWithHeaders.mockResolvedValue(undefined);
  });

  describe('POST /api/auth/change-password', () => {
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
          rememberMe: false,
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
      );
      expect(mockInvalidateOtherUserSessions).toHaveBeenCalledWith(
        'user-1',
        'session-hash',
      );
      expect(mockCreateAuditLogWithHeaders).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PASSWORD_CHANGE',
          category: 'AUTH',
          userId: 'user-1',
        }),
      );
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
          ipAddress: '1.1.1.1',
          rememberMe: true,
          token: 'session-hash',
          userAgent: 'Chrome',
        },
        {
          createdAt: new Date('2026-03-02T00:00:00.000Z'),
          expiresAt: new Date('2026-03-21T00:00:00.000Z'),
          id: 'session-2',
          ipAddress: '2.2.2.2',
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
    });
  });

  describe('POST /api/users/[id]/reset-password', () => {
    it('rejects resetting your own password from user management', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        email: 'self@example.com',
        id: 'user-1',
        isProtected: false,
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
  });

  describe('GET /api/users/[id]/sessions', () => {
    it('lists target user active sessions for password reset managers', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        email: 'target@example.com',
        id: 'target-1',
        isProtected: false,
      });
      mockPrisma.session.findMany.mockResolvedValueOnce([
        {
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
          expiresAt: new Date('2026-03-20T00:00:00.000Z'),
          id: 'session-1',
          ipAddress: '1.1.1.1',
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
      expect(mockRequirePermission).toHaveBeenCalled();
      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'target-1' }),
        }),
      );
    });

    it('rejects listing your own sessions through user management', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        email: 'self@example.com',
        id: 'user-1',
        isProtected: false,
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
  });

  describe('DELETE /api/users/[id]/sessions', () => {
    it('revokes all target user sessions', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        email: 'target@example.com',
        id: 'target-1',
        isProtected: false,
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
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'target-1' },
      });
      expect(mockCreateAuditLogWithHeaders).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SESSION_INVALIDATE',
          category: 'AUTH',
          metadata: expect.objectContaining({ targetUserId: 'target-1' }),
          userId: 'user-1',
        }),
      );
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
          userId: 'user-1',
        }),
      );
    });
  });
});
