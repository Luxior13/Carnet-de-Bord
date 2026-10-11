import { NextResponse } from 'next/server';

import { PERMISSIONS } from '$constants/permissions.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiError, apiErrors } from '$server/api-response';
import { createAuditLogWithHeaders } from '$server/auth';
import { prisma } from '$server/prisma';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';

type SessionInfo = {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  idleExpiresAt: Date;
  ipAddress: string | null;
  isCurrent: boolean;
  lastSeenAt: Date;
  rememberMe: boolean;
  userAgent: string | null;
};

class SessionNotFoundError extends Error {}

export async function GET(): Promise<
  NextResponse<
    ApiSuccessResponse<{ sessions: SessionInfo[] }> | ApiErrorResponse
  >
> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const { session: currentSession, user } = auth;

    const permission = requirePermission(
      user,
      PERMISSIONS.ACCOUNT.MANAGE_SESSIONS,
    );
    if (!permission.success) return permission.response;

    if (!currentSession) {
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Session actuelle introuvable',
        401,
      );
    }

    const now = new Date();
    // Bind cleanup and disclosure to the authenticated security state. If it
    // advances meanwhile, an older request must not delete a new valid session.
    const userScope = {
      is: {
        deletedAt: null,
        id: user.id,
        isActive: true,
        securityVersion: currentSession.securityVersion,
      },
    };
    await prisma.session.deleteMany({
      where: {
        OR: [
          { expiresAt: { lte: now } },
          { idleExpiresAt: { lte: now } },
          { securityVersion: { not: currentSession.securityVersion } },
        ],
        user: userScope,
        userId: user.id,
      },
    });

    // Get all sessions for the user
    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        expiresAt: true,
        id: true,
        idleExpiresAt: true,
        ipAddress: true,
        lastSeenAt: true,
        rememberMe: true,
        token: true,
        userAgent: true,
      },
      where: {
        expiresAt: { gt: now },
        idleExpiresAt: { gt: now },
        securityVersion: currentSession.securityVersion,
        user: userScope,
        userId: user.id,
      },
    });

    const sessionInfos: SessionInfo[] = sessions.map((session) => ({
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      id: session.id,
      idleExpiresAt: session.idleExpiresAt,
      ipAddress: session.ipAddress,
      isCurrent: session.token === currentSession.token,
      lastSeenAt: session.lastSeenAt,
      rememberMe: session.rememberMe,
      userAgent: session.userAgent,
    }));

    return NextResponse.json({
      data: { sessions: sessionInfos },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('SESSIONS', error);
  }
}

export async function DELETE(
  request: Request,
): Promise<NextResponse<ApiSuccessResponse<null> | ApiErrorResponse>> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const { session: currentSession, user } = auth;

    const permission = requirePermission(
      user,
      PERMISSIONS.ACCOUNT.MANAGE_SESSIONS,
    );
    if (!permission.success) return permission.response;

    if (!currentSession) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Session actuelle introuvable',
          },
          success: false,
        },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('id');

    if (sessionId) {
      // Delete a specific session
      const sessionToDelete = await prisma.session.findFirst({
        select: {
          id: true,
          token: true,
        },
        where: {
          id: sessionId,
          userId: user.id,
        },
      });

      if (!sessionToDelete) {
        return NextResponse.json(
          {
            error: {
              code: ErrorCode.NOT_FOUND,
              message: 'Session non trouvée',
            },
            success: false,
          },
          { status: 404 },
        );
      }

      // Don't allow deleting current session through this endpoint
      if (sessionToDelete.token === currentSession?.token) {
        return NextResponse.json(
          {
            error: {
              code: ErrorCode.FORBIDDEN,
              message:
                'Utilisez la déconnexion pour terminer votre session actuelle',
            },
            success: false,
          },
          { status: 403 },
        );
      }

      await prisma.$transaction(async (transaction) => {
        const deleted = await transaction.session.deleteMany({
          where: {
            id: sessionId,
            NOT: { token: currentSession.token },
            userId: user.id,
          },
        });
        if (deleted.count !== 1) throw new SessionNotFoundError();

        await createAuditLogWithHeaders(
          {
            action: 'SESSION_INVALIDATE',
            category: 'AUTH',
            description: 'Session révoquée',
            metadata: {
              pageKey: 'account',
              pageLabel: 'Mon compte',
              poleKey: 'account',
              poleLabel: 'Espace personnel',
              revokedSessions: 1,
              tabKey: 'security',
              tabLabel: 'Sécurité',
            },
            targetUserId: user.id,
            userId: user.id,
          },
          { client: transaction, required: true },
        );
      });
    } else {
      // Delete all other sessions (not current)
      await prisma.$transaction(async (transaction) => {
        const deleteResult = await transaction.session.deleteMany({
          where: {
            NOT: { token: currentSession.token },
            userId: user.id,
          },
        });

        await createAuditLogWithHeaders(
          {
            action: 'SESSION_INVALIDATE',
            category: 'AUTH',
            description: 'Toutes les autres sessions révoquées',
            metadata: {
              pageKey: 'account',
              pageLabel: 'Mon compte',
              poleKey: 'account',
              poleLabel: 'Espace personnel',
              revokedSessions: deleteResult.count,
              tabKey: 'security',
              tabLabel: 'Sécurité',
            },
            targetUserId: user.id,
            userId: user.id,
          },
          { client: transaction, required: true },
        );
      });
    }

    return NextResponse.json({
      data: null,
      success: true,
    });
  } catch (error) {
    if (error instanceof SessionNotFoundError) {
      return apiError(ErrorCode.NOT_FOUND, 'Session non trouvée', 404);
    }

    return apiErrors.internal('SESSIONS', error);
  }
}
