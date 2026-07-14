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

const USERS_SECURITY_AUDIT_LOCATION = {
  pageKey: 'users',
  pageLabel: 'Utilisateurs & permissions',
  poleKey: 'system',
  poleLabel: 'Système',
  tabKey: 'security',
  tabLabel: 'Sécurité',
} as const;

const getTargetUserForSessionManagement = async (
  id: string,
): Promise<{
  firstName: string;
  id: string;
  isProtected: boolean;
  lastName: string;
  loginName: string;
  role: string;
} | null> => {
  return prisma.user.findUnique({
    select: {
      firstName: true,
      id: true,
      isProtected: true,
      lastName: true,
      loginName: true,
      role: true,
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
      PERMISSIONS.USERS.VIEW_SESSIONS,
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

    if (
      (targetUser.isProtected || targetUser.role === 'ADMIN') &&
      !auth.user.isProtected
    ) {
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

    const now = new Date();
    await prisma.session.deleteMany({
      where: {
        OR: [{ expiresAt: { lte: now } }, { idleExpiresAt: { lte: now } }],
        userId: targetUser.id,
      },
    });

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
        userAgent: true,
      },
      where: {
        expiresAt: { gt: now },
        idleExpiresAt: { gt: now },
        userId: targetUser.id,
      },
    });

    return NextResponse.json({
      data: {
        sessions: sessions.map((session) => ({
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          id: session.id,
          idleExpiresAt: session.idleExpiresAt,
          ipAddress: session.ipAddress,
          lastSeenAt: session.lastSeenAt,
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
  request: NextRequest,
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
      PERMISSIONS.USERS.REVOKE_SESSIONS,
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

    if (
      (targetUser.isProtected || targetUser.role === 'ADMIN') &&
      !auth.user.isProtected
    ) {
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

    const sessionId = request.nextUrl.searchParams.get('id')?.trim() || null;
    const targetName =
      targetUser.firstName && targetUser.lastName
        ? `${targetUser.firstName} ${targetUser.lastName}`
        : targetUser.loginName;

    if (sessionId) {
      const session = await prisma.session.findFirst({
        select: { id: true },
        where: {
          id: sessionId,
          userId: targetUser.id,
        },
      });

      if (!session) {
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

      await prisma.$transaction(async (transaction) => {
        await transaction.session.delete({
          where: { id: session.id },
        });

        await createAuditLogWithHeaders(
          {
            action: 'SESSION_INVALIDATE',
            category: 'AUTH',
            description: `Session révoquée pour: ${targetUser.loginName}`,
            metadata: {
              revocationScope: 'single',
              revokedSessions: 1,
              sessionId: session.id,
              ...USERS_SECURITY_AUDIT_LOCATION,
              targetName,
            },
            targetUserId: targetUser.id,
            userId: auth.user.id,
          },
          { client: transaction, required: true },
        );
      });

      return NextResponse.json({
        data: { revokedSessions: 1 },
        success: true,
      });
    }

    const result = await prisma.$transaction(async (transaction) => {
      const deleteResult = await transaction.session.deleteMany({
        where: { userId: targetUser.id },
      });

      await createAuditLogWithHeaders(
        {
          action: 'SESSION_INVALIDATE',
          category: 'AUTH',
          description: `Sessions révoquées pour: ${targetUser.loginName}`,
          metadata: {
            revocationScope: 'all',
            revokedSessions: deleteResult.count,
            ...USERS_SECURITY_AUDIT_LOCATION,
            targetName,
          },
          targetUserId: targetUser.id,
          userId: auth.user.id,
        },
        { client: transaction, required: true },
      );

      return deleteResult;
    });

    return NextResponse.json({
      data: { revokedSessions: result.count },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('USER_SESSIONS_DELETE', error);
  }
}
