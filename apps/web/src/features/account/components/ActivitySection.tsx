'use client';

import {
  Activity,
  CheckCircle,
  Clock,
  LogIn,
  type LucideIcon,
  Shield,
  XCircle,
} from 'lucide-react';
import React, { type FC, useCallback, useEffect, useState } from 'react';

import { AccountPanel } from '$features/account/components/AccountPanel';
import { type AuditLogEntry, type UserType } from '$types/auth.types';
import { Skeleton } from '$ui/skeleton';

import { formatRelativeAccountTime } from '../account.utils';

type ActivitySectionProps = {
  userData: UserType;
};

export const ActivitySection: FC<ActivitySectionProps> = ({ userData }) => {
  const [recentActivity, setRecentActivity] = useState<AuditLogEntry[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [stats, setStats] = useState({ failed: 0, success: 0, total: 0 });

  const getActionConfig = (
    action: string,
  ): { color: string; icon: LucideIcon; label: string } => {
    switch (action) {
      case 'ACCOUNT_LOCKED':
        return {
          color: 'text-destructive',
          icon: Shield,
          label: 'Compte verrouillé',
        };
      case 'LOGIN_FAILED':
        return {
          color: 'text-destructive',
          icon: XCircle,
          label: 'Échec connexion',
        };
      case 'LOGIN_SUCCESS':
        return {
          color: 'text-emerald-400',
          icon: CheckCircle,
          label: 'Connexion',
        };
      case 'LOGOUT':
        return {
          color: 'text-muted-foreground',
          icon: LogIn,
          label: 'Déconnexion',
        };
      case 'PASSWORD_CHANGE':
        return {
          color: 'text-amber-300',
          icon: Shield,
          label: 'MDP modifié',
        };
      case 'PASSWORD_RESET':
        return {
          color: 'text-amber-300',
          icon: Shield,
          label: 'MDP réinitialisé',
        };
      default:
        return {
          color: 'text-muted-foreground',
          icon: Clock,
          label: action,
        };
    }
  };

  const fetchActivity = useCallback(async (): Promise<void> => {
    try {
      setLoadingActivity(true);
      const response = await fetch(
        `/api/users/${userData.id}/audit?pageSize=8`,
      );
      const data = await response.json();

      if (data.success) {
        setRecentActivity(data.data.logs);
        setStats({
          failed: data.data.stats?.failedLogins || 0,
          success: data.data.stats?.successfulLogins || 0,
          total: data.data.stats?.totalActions || 0,
        });
      }
    } catch {
      // Activity is non-blocking for the profile screen.
    } finally {
      setLoadingActivity(false);
    }
  }, [userData.id]);

  useEffect(() => {
    void fetchActivity();
  }, [fetchActivity]);

  return (
    <AccountPanel
      icon={<Activity className="size-4" />}
      title="Activité"
      description="Connexions et actions récentes"
      className="lg:sticky lg:top-20"
      contentClassName="p-0"
    >
      <div className="divide-sidebar-border/45 grid grid-cols-3 divide-x">
        <div className="bg-background/28 px-3 py-4 text-center">
          <p className="text-sidebar-foreground text-xl font-semibold">
            {stats.total}
          </p>
          <p className="text-sidebar-foreground/55 text-xs">Actions</p>
        </div>
        <div className="bg-background/28 px-3 py-4 text-center">
          <p className="text-xl font-semibold text-emerald-400">
            {stats.success}
          </p>
          <p className="text-sidebar-foreground/55 text-xs">Succès</p>
        </div>
        <div className="bg-background/28 px-3 py-4 text-center">
          <p className="text-destructive text-xl font-semibold">
            {stats.failed}
          </p>
          <p className="text-sidebar-foreground/55 text-xs">Échecs</p>
        </div>
      </div>
      <div className="border-sidebar-border/45 border-t p-4 sm:p-5">
        {loadingActivity ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : recentActivity.length === 0 ? (
          <div className="border-sidebar-border/60 bg-background/45 flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
            <span className="border-sidebar-ring/35 bg-sidebar-ring/15 text-sidebar-ring mb-3 flex size-10 items-center justify-center rounded-lg border">
              <Activity className="size-5" />
            </span>
            <p className="text-sidebar-foreground font-medium">
              Aucune activité récente
            </p>
            <p className="text-sidebar-foreground/52 mt-1 max-w-[220px] text-xs">
              Vos connexions et modifications apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="border-sidebar-border/60 bg-background/45 overflow-hidden rounded-lg border">
            {recentActivity.map((log) => {
              const config = getActionConfig(log.action);
              const Icon = config.icon;

              return (
                <div
                  key={log.id}
                  className="border-sidebar-border/45 hover:bg-sidebar-accent/[0.06] flex items-start gap-3 border-b px-3 py-3 transition-colors last:border-b-0"
                >
                  <span className="border-sidebar-border/60 bg-background/55 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border">
                    <Icon className={`size-4 ${config.color}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {config.label}
                    </p>
                    <p className="text-sidebar-foreground/52 truncate text-xs">
                      {formatRelativeAccountTime(log.createdAt)}
                      {log.ipAddress && ` - ${log.ipAddress}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AccountPanel>
  );
};
