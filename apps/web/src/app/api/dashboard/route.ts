import { AuditCategory, AuditEventKind } from '@repo/database';
import { NextResponse } from 'next/server';

import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors } from '$server/api-response';
import { getVisibleAuditDescription } from '$server/audit-visibility';
import { prisma } from '$server/prisma';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
} from '$types/api.types';
import type { DashboardStats } from '$types/dashboard.types';

export async function GET(): Promise<
  NextResponse<ApiSuccessResponse<DashboardStats> | ApiErrorResponse>
> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    const permCheck = requirePermission(auth.user, PERMISSIONS.DASHBOARD.VIEW);
    if (!permCheck.success) return permCheck.response;

    const canViewUserSecurity =
      auth.user.isProtected ||
      hasPermission(
        auth.user.role,
        PERMISSIONS.USERS.VIEW_SECURITY,
        auth.user.permissions,
      );
    const canViewUserActivity =
      auth.user.isProtected ||
      hasPermission(
        auth.user.role,
        PERMISSIONS.USERS.VIEW_ACTIVITY,
        auth.user.permissions,
      );
    const canViewSystemAudit =
      auth.user.isProtected ||
      hasPermission(
        auth.user.role,
        PERMISSIONS.SYSTEM.AUDIT,
        auth.user.permissions,
      );
    const canViewSensitiveAuditDetails =
      auth.user.isProtected ||
      hasPermission(
        auth.user.role,
        PERMISSIONS.SYSTEM.AUDIT_SENSITIVE,
        auth.user.permissions,
      );
    const canViewRecentActivity = canViewUserActivity || canViewSystemAudit;

    const now = new Date();

    const userWhere = { deletedAt: null };

    const [
      temporaryPasswordActiveUsers,
      lockedActiveUsers,
      mfaEnrollmentPendingActiveUsers,
      recentLogs,
    ] = await Promise.all([
      canViewUserSecurity
        ? prisma.user.count({
            where: {
              ...userWhere,
              isActive: true,
              mustChangePassword: true,
            },
          })
        : Promise.resolve(null),
      canViewUserSecurity
        ? prisma.user.count({
            where: {
              ...userWhere,
              isActive: true,
              lockedUntil: { gt: now },
            },
          })
        : Promise.resolve(null),
      canViewUserSecurity
        ? prisma.user.count({
            where: {
              ...userWhere,
              isActive: true,
              mfaEnabledAt: null,
            },
          })
        : Promise.resolve(null),
      canViewRecentActivity
        ? prisma.auditLog.findMany({
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            select: {
              action: true,
              actorDisplayNameSnapshot: true,
              category: true,
              createdAt: true,
              description: true,
              id: true,
            },
            take: 3,
            where: {
              eventKind: AuditEventKind.ACTIVITY,
              ...(canViewSystemAudit
                ? {}
                : {
                    category: {
                      in: [
                        AuditCategory.AUTH,
                        AuditCategory.PERMISSION,
                        AuditCategory.USER,
                      ],
                    },
                  }),
            },
          })
        : Promise.resolve(null),
    ]);

    const stats: DashboardStats = {
      generatedAt: now.toISOString(),
      recentActivity: recentLogs
        ? recentLogs.map((log) => ({
            action: log.action,
            category: log.category,
            createdAt: log.createdAt.toISOString(),
            description: getVisibleAuditDescription({
              action: log.action,
              canViewSensitiveDetails: canViewSensitiveAuditDetails,
              category: log.category,
              description: log.description,
            }),
            id: log.id,
            userName: log.actorDisplayNameSnapshot,
          }))
        : null,
      security:
        temporaryPasswordActiveUsers !== null &&
        lockedActiveUsers !== null &&
        mfaEnrollmentPendingActiveUsers !== null
          ? {
              lockedActiveUsers,
              mfaEnrollmentPendingActiveUsers,
              temporaryPasswordActiveUsers,
            }
          : null,
    };

    return NextResponse.json({
      data: stats,
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('DASHBOARD_STATS', error);
  }
}
