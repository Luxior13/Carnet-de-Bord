import { NextRequest, NextResponse } from 'next/server';

import { PAGINATION } from '$constants/pagination.constants';
import { PERMISSIONS } from '$constants/permissions.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, parsePagination } from '$server/api-response';
import { prisma } from '$server/prisma';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import type { AuditLogEntry, UserAuditStats } from '$types/auth.types';

type RouteParams = {
  params: Promise<{ id: string }>;
};

type AuditResponse = {
  logs: AuditLogEntry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  stats: UserAuditStats;
};

// ============================================
// GET /api/users/[id]/audit - Get user audit logs
// ============================================
export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse<ApiSuccessResponse<AuditResponse> | ApiErrorResponse>> {
  try {
    const { id } = await params;

    // Check authentication
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    // Allow users to view their own audit logs, or require USERS.VIEW permission for others
    const isOwnAudit = auth.user.id === id;
    if (!isOwnAudit) {
      const permCheck = requirePermission(auth.user, PERMISSIONS.USERS.VIEW);
      if (!permCheck.success) return permCheck.response;
    }
    const canViewSensitiveAudit = isOwnAudit || auth.user.isProtected;

    // Get pagination params
    const { searchParams } = new URL(request.url);
    const {
      limit: pageSize,
      page,
      skip,
    } = parsePagination(searchParams, PAGINATION.DEFAULT_LIMIT, {
      limitParam: 'pageSize',
    });

    // Check user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
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

    // Query for logs BY this user OR ON this user.
    // Older metadata fallbacks were removed now that targetUserId is structured.
    const whereClause = {
      OR: [{ userId: id }, { targetUserId: id }],
    };

    const [total, logs, failedLogins, successfulLogins] = await Promise.all([
      prisma.auditLog.count({ where: whereClause }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        where: whereClause,
      }),
      prisma.auditLog.count({
        where: { action: 'LOGIN_FAILED', userId: id },
      }),
      prisma.auditLog.count({
        where: { action: 'LOGIN_SUCCESS', userId: id },
      }),
    ]);

    const stats: UserAuditStats = {
      failedLogins,
      successfulLogins,
      totalActions: total,
    };

    return NextResponse.json({
      data: {
        logs: logs.map((log) => ({
          action: log.action,
          category: log.category,
          createdAt: log.createdAt,
          description: log.description,
          id: log.id,
          ipAddress: canViewSensitiveAudit ? log.ipAddress : null,
          metadata: log.metadata as Record<string, unknown> | null,
          userAgent: canViewSensitiveAudit ? log.userAgent : null,
          userId: log.userId,
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
        stats,
      },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('USER_AUDIT', error);
  }
}
