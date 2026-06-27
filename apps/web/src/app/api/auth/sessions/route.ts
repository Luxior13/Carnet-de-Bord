import { NextResponse } from 'next/server';

import { requireAuth } from '$server/api-auth';
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

    // Get all sessions for the user
    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: 'desc' },
      where: {
        expiresAt: { gt: new Date() },
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

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('id');

    if (sessionId) {
      // Delete a specific session
      const sessionToDelete = await prisma.session.findFirst({
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

      await prisma.session.delete({
        where: { id: sessionId },
      });

      await createAuditLogWithHeaders({
        action: 'SESSION_INVALIDATE',
        category: 'AUTH',
        description: 'Session révoquée',
        targetUserId: user.id,
        userId: user.id,
      });
    } else {
      // Delete all other sessions (not current)
      await prisma.session.deleteMany({
        where: {
          NOT: { token: currentSession?.token },
          userId: user.id,
        },
      });

      await createAuditLogWithHeaders({
        action: 'SESSION_INVALIDATE',
        category: 'AUTH',
        description: 'Toutes les autres sessions révoquées',
        targetUserId: user.id,
        userId: user.id,
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
