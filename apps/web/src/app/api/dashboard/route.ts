import { NextResponse } from 'next/server';

import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors } from '$server/api-response';
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

    const canViewUsers =
      auth.user.isProtected ||
      hasPermission(
        auth.user.role,
        PERMISSIONS.USERS.VIEW,
        auth.user.permissions,
      );

    if (!canViewUsers) {
      return NextResponse.json({
        data: {
          recentActivity: [],
          security: {
            lockedUsers: 0,
            pendingPassword: 0,
          },
          users: {
            active: auth.user.isActive ? 1 : 0,
            inactive: auth.user.isActive ? 0 : 1,
            recentLogins: auth.user.lastLoginAt ? 1 : 0,
            total: 1,
          },
        },
        success: true,
      });
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const now = new Date();

    const userWhere = { deletedAt: null };

    const [
      statusCounts,
      pendingPassword,
      lockedUsers,
      recentLogins,
      recentLogs,
    ] = await Promise.all([
      prisma.user.groupBy({
        _count: { _all: true },
        by: ['isActive'],
        where: userWhere,
      }),
      prisma.user.count({
        where: { ...userWhere, mustChangePassword: true },
      }),
      prisma.user.count({
        where: { ...userWhere, lockedUntil: { gt: now } },
      }),
      prisma.user.count({
        where: { ...userWhere, lastLoginAt: { gte: oneDayAgo } },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          action: true,
          category: true,
          createdAt: true,
          description: true,
          id: true,
          user: {
            select: { firstName: true, lastName: true },
          },
        },
        take: 8,
      }),
    ]);

    const activeUsers =
      statusCounts.find((statusCount) => statusCount.isActive)?._count._all ??
      0;
    const inactiveUsers =
      statusCounts.find((statusCount) => !statusCount.isActive)?._count._all ??
      0;
    const totalUsers = activeUsers + inactiveUsers;

    const stats: DashboardStats = {
      recentActivity: recentLogs.map((log) => ({
        action: log.action,
        category: log.category,
        createdAt: log.createdAt.toISOString(),
        description: log.description,
        id: log.id,
        userName: log.user
          ? `${log.user.firstName} ${log.user.lastName}`
          : null,
      })),
      security: {
        lockedUsers,
        pendingPassword,
      },
      users: {
        active: activeUsers,
        inactive: inactiveUsers,
        recentLogins,
        total: totalUsers,
      },
    };

    return NextResponse.json({
      data: stats,
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('DASHBOARD_STATS', error);
  }
}
