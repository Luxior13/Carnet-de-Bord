import { NextResponse } from 'next/server';

import { PERMISSIONS } from '$constants/permissions.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors } from '$server/api-response';
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
  ipAddress: string | null;
  isCurrent: boolean;
  rememberMe: boolean;
  userAgent: string | null;
};

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
      PERMISSIONS.ACCOUNT.VIEW_SECURITY,
    );
    if (!permission.success) return permission.response;

    const now = new Date();
    await prisma.session.deleteMany({
      where: { expiresAt: { lte: now }, userId: user.id },
    });

    // Get all sessions for the user
    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        expiresAt: true,
        id: true,
        ipAddress: true,
        rememberMe: true,
        token: true,
        userAgent: true,
      },
      where: {
        expiresAt: { gt: now },
        userId: user.id,
      },
    });

    const sessionInfos: SessionInfo[] = sessions.map((session) => ({
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      id: session.id,
      ipAddress: session.ipAddress,
      isCurrent: session.token === currentSession?.token,
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
      PERMISSIONS.ACCOUNT.VIEW_SECURITY,
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
        await transaction.session.delete({
          where: { id: sessionId },
        });

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
    return apiErrors.internal('SESSIONS', error);
  }
}
