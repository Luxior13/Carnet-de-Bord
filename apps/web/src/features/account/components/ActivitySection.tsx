'use client';

import {
  Activity,
  CheckCircle,
  Clock,
  LogIn,
  Shield,
  XCircle,
} from 'lucide-react';
import React, { type FC, useCallback, useEffect, useState } from 'react';

import { SectionPanel } from '$components/layout/SectionPanel';
import { type AuditLogEntry, type UserType } from '$types/auth.types';
import { ServiceIcon } from '$ui/service-icon';
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
  ): { color: string; icon: typeof Activity; label: string } => {
    const configs: Record<
      string,
      { color: string; icon: typeof Activity; label: string }
    > = {
      ACCOUNT_LOCKED: {
        color: 'text-destructive',
        icon: Shield,
        label: 'Compte verrouillé',
      },
      LOGIN_FAILED: {
        color: 'text-destructive',
        icon: XCircle,
        label: 'Échec connexion',
      },
      LOGIN_SUCCESS: {
        color: 'text-emerald-400',
        icon: CheckCircle,
        label: 'Connexion',
      },
      LOGOUT: {
        color: 'text-muted-foreground',
        icon: LogIn,
        label: 'Déconnexion',
      },
      PASSWORD_CHANGE: {
        color: 'text-amber-300',
        icon: Shield,
        label: 'MDP modifié',
      },
      PASSWORD_RESET: {
        color: 'text-amber-300',
        icon: Shield,
        label: 'MDP réinitialisé',
      },
    };

    return (
      configs[action] || {
        color: 'text-muted-foreground',
        icon: Clock,
        label: action,
      }
    );
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
    fetchActivity();
  }, [fetchActivity]);

  return (
    <SectionPanel
      icon={<Activity className="size-4" />}
      title="Activité"
      description="Connexions et actions récentes"
      className="lg:sticky lg:top-20"
      contentClassName="space-y-5"
    >
      <div className="grid grid-cols-3 gap-2">
        <div className="border-sidebar-border/60 bg-sidebar-accent/10 rounded-xl border px-3 py-3 text-center">
          <p className="text-sidebar-foreground text-xl font-semibold">
            {stats.total}
          </p>
          <p className="text-sidebar-foreground/55 text-xs">Actions</p>
        </div>
        <div className="border-sidebar-border/60 rounded-xl border bg-emerald-500/10 px-3 py-3 text-center">
          <p className="text-xl font-semibold text-emerald-400">
            {stats.success}
          </p>
          <p className="text-sidebar-foreground/55 text-xs">Succès</p>
        </div>
        <div className="border-sidebar-border/60 bg-destructive/10 rounded-xl border px-3 py-3 text-center">
          <p className="text-destructive text-xl font-semibold">
            {stats.failed}
          </p>
          <p className="text-sidebar-foreground/55 text-xs">Échecs</p>
        </div>
      </div>
      {loadingActivity ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : recentActivity.length === 0 ? (
        <div className="border-sidebar-border/60 bg-sidebar-accent/10 flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center">
          <ServiceIcon className="border-sidebar-ring/20 bg-sidebar-accent/20 text-sidebar-ring mb-3">
            <Activity className="size-6" />
          </ServiceIcon>
          <p className="text-sidebar-foreground font-medium">
            Aucune activité récente
          </p>
          <p className="text-sidebar-foreground/55 mt-1 max-w-[220px] text-xs">
            Vos connexions et modifications apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentActivity.map((log) => {
            const config = getActionConfig(log.action);
            const Icon = config.icon;

            return (
              <div
                key={log.id}
                className="border-sidebar-border/60 bg-sidebar-accent/10 flex items-start gap-3 rounded-xl border p-3"
              >
                <div className="border-sidebar-border/60 bg-sidebar-accent/20 mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border">
                  <Icon className={`size-4 ${config.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{config.label}</p>
                  <p className="text-sidebar-foreground/55 truncate text-xs">
                    {formatRelativeAccountTime(log.createdAt)}
                    {log.ipAddress && ` - ${log.ipAddress}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionPanel>
  );
};
