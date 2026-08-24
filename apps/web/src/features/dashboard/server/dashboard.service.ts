import 'server-only';

import { AuditCategory, AuditEventKind } from '@repo/database';

import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import {
  getVisibleAuditDescription,
  sanitizeAuditMetadata,
} from '$server/audit-visibility';
import { prisma } from '$server/prisma';
import type { UserType } from '$types/auth.types';
import type { DashboardStats } from '$types/dashboard.types';

export type DashboardAccess = {
  canViewDashboard: boolean;
  canViewRecentActivity: boolean;
  canViewSensitiveAuditDetails: boolean;
  canViewSystemAudit: boolean;
  canViewUserActivity: boolean;
  canViewUserSecurity: boolean;
};

export const getDashboardAccess = (user: UserType): DashboardAccess => {
  const canUseOperationalAccess = !user.mustChangePassword;
  const canViewDashboard =
    canUseOperationalAccess &&
    (user.isProtected ||
      hasPermission(user.role, PERMISSIONS.DASHBOARD.VIEW, user.permissions));
  const canViewUserSecurity =
    canUseOperationalAccess &&
    (user.isProtected ||
      hasPermission(
        user.role,
        PERMISSIONS.USERS.VIEW_SECURITY,
        user.permissions,
      ));
  const canViewUserActivity =
    canUseOperationalAccess &&
    (user.isProtected ||
      hasPermission(
        user.role,
        PERMISSIONS.USERS.VIEW_ACTIVITY,
        user.permissions,
      ));
  const canViewSystemAudit =
    canUseOperationalAccess &&
    (user.isProtected ||
      hasPermission(user.role, PERMISSIONS.AUDIT.VIEW, user.permissions));

  return {
    canViewDashboard,
    canViewRecentActivity: canViewUserActivity || canViewSystemAudit,
    canViewSensitiveAuditDetails: canViewSystemAudit,
    canViewSystemAudit,
    canViewUserActivity,
    canViewUserSecurity,
  };
};

export const loadDashboardStats = async (
  user: UserType,
): Promise<DashboardStats> => {
  const access = getDashboardAccess(user);
  const now = new Date();
  const visibleSecurityUserWhere = {
    deletedAt: null,
    ...(!user.isProtected ? { isProtected: false } : {}),
  };
  const [
    temporaryPasswordActiveUsers,
    lockedActiveUsers,
    mfaEnrollmentPendingActiveUsers,
    recentLogs,
  ] = await Promise.all([
    access.canViewUserSecurity
      ? prisma.user.count({
          where: {
            ...visibleSecurityUserWhere,
            isActive: true,
            mustChangePassword: true,
          },
        })
      : Promise.resolve(null),
    access.canViewUserSecurity
      ? prisma.user.count({
          where: {
            ...visibleSecurityUserWhere,
            isActive: true,
            lockedUntil: { gt: now },
          },
        })
      : Promise.resolve(null),
    access.canViewUserSecurity
      ? prisma.user.count({
          where: {
            ...visibleSecurityUserWhere,
            isActive: true,
            mfaEnabledAt: null,
          },
        })
      : Promise.resolve(null),
    access.canViewRecentActivity
      ? prisma.auditLog.findMany({
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: {
            action: true,
            actorDisplayNameSnapshot: true,
            category: true,
            createdAt: true,
            description: true,
            id: true,
            metadata: true,
          },
          take: 3,
          where: {
            eventKind: AuditEventKind.ACTIVITY,
            ...(!user.isProtected
              ? {
                  NOT: [
                    { user: { is: { isProtected: true } } },
                    { targetUser: { is: { isProtected: true } } },
                  ],
                }
              : {}),
            ...(access.canViewSystemAudit
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

  return {
    generatedAt: now.toISOString(),
    recentActivity: recentLogs
      ? recentLogs.map((log) => ({
          action: log.action,
          category: log.category,
          createdAt: log.createdAt.toISOString(),
          description: getVisibleAuditDescription({
            action: log.action,
            canViewSensitiveDetails: access.canViewSensitiveAuditDetails,
            category: log.category,
            description: log.description,
            metadata: log.metadata,
          }),
          id: log.id,
          metadata:
            log.action === 'USER_DELETE'
              ? sanitizeAuditMetadata(log.metadata, false)
              : null,
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
};
