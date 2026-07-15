import type { UserRole } from '@repo/database';
import { NextRequest, NextResponse } from 'next/server';

import { PERMISSIONS } from '$constants/permissions.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors } from '$server/api-response';
import { createAuditLogWithHeaders } from '$server/auth';
import { prisma } from '$server/prisma';
import { requireRecentSensitiveActionProof } from '$server/sensitive-action';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import type { UserSessionInfo } from '$types/auth.types';

type RouteParams = {
  params: Promise<{ id: string }>;
};

class TargetSessionStateChangedError extends Error {
  constructor() {
    super('Target session state changed');
    this.name = 'TargetSessionStateChangedError';
  }
}

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
  role: UserRole;
  securityVersion: number;
} | null> => {
  return prisma.user.findUnique({
    select: {
      firstName: true,
      id: true,
      isProtected: true,
      lastName: true,
      loginName: true,
      role: true,
      securityVersion: true,
    },
    where: { deletedAt: null, id },
  });
};

const getStableTargetRelationFilter = (
  targetUser: NonNullable<
    Awaited<ReturnType<typeof getTargetUserForSessionManagement>>
  >,
  actorIsProtected: boolean,
): {
  is: {
    deletedAt: null;
    id: string;
    isProtected: false;
    role: UserRole;
    securityVersion: number;
  };
} => ({
  is: {
    deletedAt: null,
    id: targetUser.id,
    isProtected: false,
    role: actorIsProtected ? targetUser.role : 'USER',
    securityVersion: targetUser.securityVersion,
  },
});

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

    if (targetUser.isProtected) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message:
              'Les sessions du compte racine sont privées et ne peuvent être gérées que depuis Mon compte',
          },
          success: false,
        },
        { status: 403 },
      );
    }

    if (targetUser.role === 'ADMIN' && !auth.user.isProtected) {
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
    const stableTarget = getStableTargetRelationFilter(
      targetUser,
      auth.user.isProtected,
    );
    const sessions = await prisma.$transaction(async (transaction) => {
      await transaction.session.deleteMany({
        where: {
          OR: [{ expiresAt: { lte: now } }, { idleExpiresAt: { lte: now } }],
          user: stableTarget,
          userId: targetUser.id,
        },
      });

      return transaction.session.findMany({
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
          user: stableTarget,
          userId: targetUser.id,
        },
      });
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

    if (targetUser.isProtected) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message:
              'Les sessions du compte racine sont privées et ne peuvent être gérées que depuis Mon compte',
          },
          success: false,
        },
        { status: 403 },
      );
    }

    if (targetUser.role === 'ADMIN' && !auth.user.isProtected) {
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

    const proofCheck = requireRecentSensitiveActionProof(auth.session);
    if (!proofCheck.success) return proofCheck.response;

    const sessionId = request.nextUrl.searchParams.get('id')?.trim() || null;
    const stableTarget = getStableTargetRelationFilter(
      targetUser,
      auth.user.isProtected,
    );
    const targetName =
      targetUser.firstName && targetUser.lastName
        ? `${targetUser.firstName} ${targetUser.lastName}`
        : targetUser.loginName;

    if (sessionId) {
      const revokedSession = await prisma.$transaction(async (transaction) => {
        const deleteResult = await transaction.session.deleteMany({
          where: {
            id: sessionId,
            user: stableTarget,
            userId: targetUser.id,
          },
        });
        if (deleteResult.count !== 1) return false;

        await createAuditLogWithHeaders(
          {
            action: 'SESSION_INVALIDATE',
            category: 'AUTH',
            description: `Session révoquée pour: ${targetUser.loginName}`,
            metadata: {
              revocationScope: 'single',
              revokedSessions: 1,
              sessionId,
              ...USERS_SECURITY_AUDIT_LOCATION,
              targetName,
            },
            targetUserId: targetUser.id,
            userId: auth.user.id,
          },
          { client: transaction, required: true },
        );

        return true;
      });

      if (!revokedSession) {
        return NextResponse.json(
          {
            error: {
              code: ErrorCode.NOT_FOUND,
              message:
                'Session introuvable ou compte modifié depuis le chargement',
            },
            success: false,
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        data: { revokedSessions: 1 },
        success: true,
      });
    }

    const result = await prisma.$transaction(async (transaction) => {
      const targetVersionAdvance = await transaction.user.updateMany({
        data: { securityVersion: { increment: 1 } },
        where: {
          deletedAt: null,
          id: targetUser.id,
          isProtected: false,
          role: auth.user.isProtected ? targetUser.role : 'USER',
          securityVersion: targetUser.securityVersion,
        },
      });
      if (targetVersionAdvance.count !== 1) {
        throw new TargetSessionStateChangedError();
      }

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
    if (error instanceof TargetSessionStateChangedError) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.CONFLICT,
            message:
              'La sécurité ou le rôle de ce compte a changé. Rechargez la fiche avant de réessayer.',
          },
          success: false,
        },
        { status: 409 },
      );
    }

    return apiErrors.internal('USER_SESSIONS_DELETE', error);
  }
}
