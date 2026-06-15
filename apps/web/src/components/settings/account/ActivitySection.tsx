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

import type { AuditLogEntry, UserType } from '$types/auth.types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '$ui/card';
import { ServiceIcon } from '$ui/service-icon';
import { Skeleton } from '$ui/skeleton';

type ActivitySectionProps = {
  userData: UserType;
};

export const ActivitySection: FC<ActivitySectionProps> = ({ userData }) => {
  const [recentActivity, setRecentActivity] = useState<AuditLogEntry[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [stats, setStats] = useState({ failed: 0, success: 0, total: 0 });

  const formatRelativeTime = (date: Date | string | null): string => {
    if (!date) return 'Jamais';
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "A l'instant";
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;

    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

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
        label: 'Compte verrouille',
      },
      LOGIN_FAILED: {
        color: 'text-destructive',
        icon: XCircle,
        label: 'Echec connexion',
      },
      LOGIN_SUCCESS: {
        color: 'text-emerald-400',
        icon: CheckCircle,
        label: 'Connexion',
      },
      LOGOUT: {
        color: 'text-muted-foreground',
        icon: LogIn,
        label: 'Deconnexion',
      },
      PASSWORD_CHANGE: {
        color: 'text-amber-300',
        icon: Shield,
        label: 'MDP modifie',
      },
      PASSWORD_RESET: {
        color: 'text-amber-300',
        icon: Shield,
        label: 'MDP reinitialise',
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
    <Card className="bg-card/70">
      <CardHeader>
        <div className="flex items-center gap-3">
          <ServiceIcon className="bg-emerald-500/10 text-emerald-400">
            <Activity className="size-5" />
          </ServiceIcon>
          <div>
            <CardTitle>Activite</CardTitle>
            <CardDescription>Vos dernieres actions</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-background/35 rounded-lg border px-3 py-3 text-center">
            <p className="text-xl font-semibold">{stats.total}</p>
            <p className="text-muted-foreground text-xs">Actions</p>
          </div>
          <div className="rounded-lg border bg-emerald-500/10 px-3 py-3 text-center">
            <p className="text-xl font-semibold text-emerald-400">
              {stats.success}
            </p>
            <p className="text-muted-foreground text-xs">Succes</p>
          </div>
          <div className="bg-destructive/10 rounded-lg border px-3 py-3 text-center">
            <p className="text-destructive text-xl font-semibold">
              {stats.failed}
            </p>
            <p className="text-muted-foreground text-xs">Echecs</p>
          </div>
        </div>
        {loadingActivity ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : recentActivity.length === 0 ? (
          <div className="bg-background/35 flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
            <div className="bg-secondary text-primary mb-3 flex size-12 items-center justify-center rounded-lg">
              <Activity className="size-6" />
            </div>
            <p className="font-medium">Aucune activite recente</p>
            <p className="text-muted-foreground mt-1 max-w-[220px] text-xs">
              Vos connexions et modifications apparaitront ici.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((log) => {
              const config = getActionConfig(log.action);
              const Icon = config.icon;

              return (
                <div key={log.id} className="flex items-start gap-3">
                  <div className="bg-secondary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <Icon className={`size-4 ${config.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {config.label}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {formatRelativeTime(log.createdAt)}
                      {log.ipAddress && ` - ${log.ipAddress}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
