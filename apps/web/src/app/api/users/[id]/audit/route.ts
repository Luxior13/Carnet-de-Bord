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

    // Query for logs BY this user OR ON this user
    const whereClause = {
      OR: [
        { userId: id },
        { targetUserId: id },
        {
          metadata: {
            equals: id,
            path: ['targetUserId'],
          },
        },
      ],
    };

    // Get total count
    const total = await prisma.auditLog.count({
      where: whereClause,
    });

    // Get audit logs
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      where: whereClause,
    });

    // Calculate stats (only for actions BY this user for login stats)
    const userLogs = await prisma.auditLog.findMany({
      select: { action: true },
      where: { userId: id },
    });

    const stats: UserAuditStats = {
      failedLogins: userLogs.filter((l) => l.action === 'LOGIN_FAILED').length,
      successfulLogins: userLogs.filter((l) => l.action === 'LOGIN_SUCCESS')
        .length,
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
