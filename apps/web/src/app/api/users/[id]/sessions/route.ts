import { NextRequest, NextResponse } from 'next/server';

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
import type { UserSessionInfo } from '$types/auth.types';

type RouteParams = {
  params: Promise<{ id: string }>;
};

const getTargetUserForSessionManagement = async (
  id: string,
): Promise<{
  email: string;
  id: string;
  isProtected: boolean;
} | null> => {
  return prisma.user.findUnique({
    select: {
      email: true,
      id: true,
      isProtected: true,
    },
    where: { deletedAt: null, id },
  });
};

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<
  NextResponse<
    ApiSuccessResponse<{ sessions: UserSessionInfo[] }> | ApiErrorResponse
  >
> {
  try {
    const { id } = await params;
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    const permCheck = requirePermission(
      auth.user,
      PERMISSIONS.USERS.RESET_PASSWORD,
    );
    if (!permCheck.success) return permCheck.response;

    const targetUser = await getTargetUserForSessionManagement(id);

    if (!targetUser) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'Utilisateur non trouvé',
          },
          success: false,
        },
        { status: 404 },
      );
    }

    if (targetUser.id === auth.user.id) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message: 'Gérez vos sessions depuis Mon compte',
          },
          success: false,
        },
        { status: 403 },
      );
    }

    if (targetUser.isProtected && !auth.user.isProtected) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message: 'Ce compte protégé ne peut pas être géré',
          },
          success: false,
        },
        { status: 403 },
      );
    }

    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: 'desc' },
      where: {
        expiresAt: { gt: new Date() },
        userId: targetUser.id,
      },
    });

    return NextResponse.json({
      data: {
        sessions: sessions.map((session) => ({
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          id: session.id,
          ipAddress: session.ipAddress,
          rememberMe: session.rememberMe,
          userAgent: session.userAgent,
        })),
      },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('USER_SESSIONS_GET', error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<
  NextResponse<
    ApiSuccessResponse<{ revokedSessions: number }> | ApiErrorResponse
  >
> {
  try {
    const { id } = await params;
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    const permCheck = requirePermission(
      auth.user,
      PERMISSIONS.USERS.RESET_PASSWORD,
    );
    if (!permCheck.success) return permCheck.response;

    const targetUser = await getTargetUserForSessionManagement(id);

    if (!targetUser) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'Utilisateur non trouvé',
          },
          success: false,
        },
        { status: 404 },
      );
    }

    if (targetUser.id === auth.user.id) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message: 'Utilisez Mon compte pour gérer vos sessions',
          },
          success: false,
        },
        { status: 403 },
      );
    }

    if (targetUser.isProtected && !auth.user.isProtected) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message: 'Ce compte protégé ne peut pas être géré',
          },
          success: false,
        },
        { status: 403 },
      );
    }

    const result = await prisma.session.deleteMany({
      where: { userId: targetUser.id },
    });

    await createAuditLogWithHeaders({
      action: 'SESSION_INVALIDATE',
      category: 'AUTH',
      description: `Sessions révoquées pour: ${targetUser.email}`,
      metadata: {
        revokedSessions: result.count,
        targetUserId: targetUser.id,
      },
      userId: auth.user.id,
    });

    return NextResponse.json({
      data: { revokedSessions: result.count },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('USER_SESSIONS_DELETE', error);
  }
}
