import { NextResponse } from 'next/server';

import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors } from '$server/api-response';
import { prisma } from '$server/prisma';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
} from '$types/api.types';

export type DashboardStats = {
  recentActivity: {
    action: string;
    category: string;
    createdAt: string;
    description: string;
    id: string;
    userName: string | null;
  }[];
  security: {
    lockedUsers: number;
    pendingPassword: number;
  };
  users: {
    active: number;
    inactive: number;
    recentLogins: number;
    total: number;
  };
};

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

    const [users, recentLogs] = await Promise.all([
      prisma.user.findMany({
        select: {
          isActive: true,
          lastLoginAt: true,
          lockedUntil: true,
          mustChangePassword: true,
        },
        where: { deletedAt: null },
      }),
      prisma.auditLog.findMany({
        include: {
          user: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);

    const userStats = users.reduce(
      (acc, user) => {
        acc.total++;
        if (user.isActive) acc.active++;
        if (!user.isActive) acc.inactive++;
        if (user.mustChangePassword) acc.pendingPassword++;
        if (user.lockedUntil && user.lockedUntil > now) acc.lockedUsers++;
        if (user.lastLoginAt && user.lastLoginAt >= oneDayAgo)
          acc.recentLogins++;

        return acc;
      },
      {
        active: 0,
        inactive: 0,
        lockedUsers: 0,
        pendingPassword: 0,
        recentLogins: 0,
        total: 0,
      },
    );

    return NextResponse.json({
      data: {
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
          lockedUsers: userStats.lockedUsers,
          pendingPassword: userStats.pendingPassword,
        },
        users: {
          active: userStats.active,
          inactive: userStats.inactive,
          recentLogins: userStats.recentLogins,
          total: userStats.total,
        },
      },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('DASHBOARD_STATS', error);
  }
}
