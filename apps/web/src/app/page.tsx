'use client';

import {
  AlertTriangle,
  ArrowRight,
  Home,
  KeyRound,
  Loader2,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import Link from 'next/link';
import React, {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { ContentState } from '$components/layout/ContentState';
import { PageHero } from '$components/layout/PageHero';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
import {
  AUDIT_ACTION_DISPLAY,
  DEFAULT_AUDIT_ACTION_DISPLAY,
} from '$features/audit/audit-display';
import type { ApiResponse } from '$types/api.types';
import type {
  DashboardActivityItem,
  DashboardStats,
} from '$types/dashboard.types';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from '$ui/card';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Separator } from '$ui/separator';
import { ServiceIcon } from '$ui/service-icon';
import { cn } from '$utils/css.utils';

type DashboardSnapshot = {
  scope: string;
  stats: DashboardStats;
};

type DashboardLoadError = {
  message: string;
  scope: string;
};

const CATEGORY_LABELS = new Map<string, string>([
  ['AUTH', 'Authentification'],
  ['PERMISSION', 'Autorisations'],
  ['SYSTEM', 'Système'],
  ['USER', 'Utilisateurs'],
]);

const toValidDate = (date: Date | string | null | undefined): Date | null => {
  if (!date) return null;

  const parsedDate = new Date(date);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const formatDashboardDate = (
  date: Date | string | null | undefined,
): string => {
  const parsedDate = toValidDate(date);

  if (!parsedDate) return 'Date inconnue';

  return parsedDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatRelativeDashboardTime = (
  date: Date | string | null | undefined,
): string => {
  const parsedDate = toValidDate(date);

  if (!parsedDate) return 'Date inconnue';

  const now = new Date();
  const diffMs = now.getTime() - parsedDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} j`;

  return parsedDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year:
      parsedDate.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
};

const DashboardActivityList: FC<{
  activities: DashboardActivityItem[];
}> = ({ activities }) => (
  <div>
    {activities.map((activity, index) => {
      const display =
        AUDIT_ACTION_DISPLAY.get(activity.action) ??
        DEFAULT_AUDIT_ACTION_DISPLAY;
      const Icon = display.icon;
      const activityDate = toValidDate(activity.createdAt);

      return (
        <React.Fragment key={activity.id}>
          {index > 0 && <Separator className="bg-border/60" />}
          <div className="flex min-w-0 items-start gap-3 py-3">
            <span
              className={cn(
                'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border',
                display.color,
              )}
            >
              <Icon aria-hidden="true" className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="text-foreground text-sm font-medium">
                  {display.label}
                </p>
                <Badge className="text-xs" variant="outline">
                  {CATEGORY_LABELS.get(activity.category) ?? activity.category}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-5">
                {activity.description}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {activity.userName ?? 'Système'} ·{' '}
                {activityDate ? (
                  <time
                    dateTime={activityDate.toISOString()}
                    title={formatDashboardDate(activityDate)}
                  >
                    {formatRelativeDashboardTime(activityDate)}
                  </time>
                ) : (
                  'Date inconnue'
                )}
              </p>
            </div>
          </div>
        </React.Fragment>
      );
    })}
  </div>
);

const DashboardAttentionCard: FC<{
  security: NonNullable<DashboardStats['security']>;
}> = ({ security }) => {
  const attentionItems = [
    {
      count: security.lockedActiveUsers,
      description: 'Un déverrouillage peut être nécessaire.',
      icon: AlertTriangle,
      label: 'Comptes actifs verrouillés',
    },
    {
      count: security.temporaryPasswordActiveUsers,
      description: 'Le mot de passe temporaire doit être remplacé.',
      icon: KeyRound,
      label: 'Mots de passe temporaires',
    },
    {
      count: security.mfaEnrollmentPendingActiveUsers,
      description: 'La double authentification reste à configurer.',
      icon: Smartphone,
      label: 'MFA à configurer',
    },
  ].filter((item) => item.count > 0);

  return (
    <Card className="border-warning/25 overflow-hidden rounded-lg py-0">
      <CardHeader className="border-border/65 bg-surface-muted border-b p-4">
        <h2 className="text-sm font-semibold">À traiter</h2>
        <CardDescription>
          Uniquement les comptes nécessitant une action.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="divide-border/60 divide-y">
          {attentionItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                key={item.label}
              >
                <ServiceIcon className="border-warning/35 bg-warning/10 text-warning size-9">
                  <Icon aria-hidden="true" className="size-4" />
                </ServiceIcon>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{item.label}</p>
                    <Badge variant="warning">{item.count}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="border-border/65 bg-surface-muted justify-end border-t p-4">
        <Button asChild size="sm" variant="outline">
          <Link href="/administration/utilisateurs">
            Examiner les comptes
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

const DashboardActivityCard: FC<{
  activities: DashboardActivityItem[];
  canOpenJournal: boolean;
}> = ({ activities, canOpenJournal }) => (
  <Card className="border-border/70 overflow-hidden rounded-lg py-0">
    <CardHeader className="border-border/65 bg-surface-muted border-b p-4">
      <h2 className="text-sm font-semibold">Activité récente</h2>
      <CardDescription>Les trois derniers événements utiles.</CardDescription>
    </CardHeader>
    <CardContent className="p-4">
      <DashboardActivityList activities={activities} />
    </CardContent>
    {canOpenJournal && (
      <CardFooter className="border-border/65 bg-surface-muted justify-end border-t p-4">
        <Button asChild size="sm" variant="outline">
          <Link href="/systeme/journal-activite">
            Voir le journal
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </CardFooter>
    )}
  </Card>
);

export default function HomePage(): React.ReactNode {
  const { userData } = useUser();
  const dashboardAbortControllerRef = useRef<AbortController | null>(null);
  const [dashboardSnapshot, setDashboardSnapshot] =
    useState<DashboardSnapshot | null>(null);
  const [dashboardLoadError, setDashboardLoadError] =
    useState<DashboardLoadError | null>(null);
  const [loadingDashboardScope, setLoadingDashboardScope] = useState<
    string | null
  >(null);

  const firstName = userData?.firstName?.trim();
  const canUseOperationalAccess = !userData?.mustChangePassword;
  const canViewDashboard = userData
    ? canUseOperationalAccess &&
      (userData.isProtected ||
        hasPermission(
          userData.role,
          PERMISSIONS.DASHBOARD.VIEW,
          userData.permissions,
        ))
    : false;
  const canViewUserSecurity = userData
    ? canUseOperationalAccess &&
      (userData.isProtected ||
        hasPermission(
          userData.role,
          PERMISSIONS.USERS.VIEW_SECURITY,
          userData.permissions,
        ))
    : false;
  const canViewUserActivity = userData
    ? canUseOperationalAccess &&
      (userData.isProtected ||
        hasPermission(
          userData.role,
          PERMISSIONS.USERS.VIEW_ACTIVITY,
          userData.permissions,
        ))
    : false;
  const canViewSystemAudit = userData
    ? canUseOperationalAccess &&
      (userData.isProtected ||
        hasPermission(
          userData.role,
          PERMISSIONS.AUDIT.VIEW,
          userData.permissions,
        ))
    : false;
  const canViewSensitiveAuditDetails = userData
    ? canUseOperationalAccess &&
      (userData.isProtected ||
        hasPermission(
          userData.role,
          PERMISSIONS.AUDIT.VIEW_SENSITIVE,
          userData.permissions,
        ))
    : false;
  const canViewRecentActivity = canViewUserActivity || canViewSystemAudit;
  const canLoadDashboardData =
    canViewDashboard && (canViewUserSecurity || canViewRecentActivity);
  const dashboardAccessScope = useMemo(
    () =>
      JSON.stringify({
        canViewDashboard,
        canViewSensitiveAuditDetails,
        canViewSystemAudit,
        canViewUserActivity,
        canViewUserSecurity,
        userId: userData?.id ?? null,
      }),
    [
      canViewDashboard,
      canViewSensitiveAuditDetails,
      canViewSystemAudit,
      canViewUserActivity,
      canViewUserSecurity,
      userData?.id,
    ],
  );
  const dashboardStats =
    dashboardSnapshot?.scope === dashboardAccessScope
      ? dashboardSnapshot.stats
      : null;
  const dashboardError =
    dashboardLoadError?.scope === dashboardAccessScope
      ? dashboardLoadError.message
      : null;
  const isLoadingDashboard = loadingDashboardScope === dashboardAccessScope;

  const fetchDashboardStats = useCallback(async (): Promise<void> => {
    dashboardAbortControllerRef.current?.abort();
    dashboardAbortControllerRef.current = null;

    if (!canLoadDashboardData) {
      setDashboardSnapshot(null);
      setDashboardLoadError(null);
      setLoadingDashboardScope(null);

      return;
    }

    const controller = new AbortController();
    const requestScope = dashboardAccessScope;
    dashboardAbortControllerRef.current = controller;

    try {
      setDashboardSnapshot((currentSnapshot) =>
        currentSnapshot?.scope === requestScope ? currentSnapshot : null,
      );
      setLoadingDashboardScope(requestScope);
      setDashboardLoadError((currentError) =>
        currentError?.scope === requestScope ? currentError : null,
      );

      const response = await fetch('/api/dashboard', {
        signal: controller.signal,
      });
      const data = (await response.json()) as ApiResponse<DashboardStats>;

      if (controller.signal.aborted) return;

      if (response.ok && data.success) {
        setDashboardLoadError(null);
        setDashboardSnapshot({
          scope: requestScope,
          stats: data.data,
        });
      } else {
        setDashboardLoadError({
          message: data.success
            ? 'Impossible de charger le tableau de bord'
            : data.error.message,
          scope: requestScope,
        });
      }
    } catch {
      if (controller.signal.aborted) return;

      setDashboardLoadError({
        message: 'Impossible de charger le tableau de bord',
        scope: requestScope,
      });
    } finally {
      if (dashboardAbortControllerRef.current !== controller) return;

      dashboardAbortControllerRef.current = null;
      setLoadingDashboardScope((currentScope) =>
        currentScope === requestScope ? null : currentScope,
      );
    }
  }, [canLoadDashboardData, dashboardAccessScope]);

  useEffect((): (() => void) => {
    return (): void => {
      dashboardAbortControllerRef.current?.abort();
      dashboardAbortControllerRef.current = null;
    };
  }, []);

  useEffect((): void => {
    void fetchDashboardStats();
  }, [fetchDashboardStats]);

  const security = dashboardStats?.security ?? null;
  const hasSecurityAttention =
    !!security &&
    (security.lockedActiveUsers > 0 ||
      security.temporaryPasswordActiveUsers > 0 ||
      security.mfaEnrollmentPendingActiveUsers > 0);
  const recentActivity = dashboardStats?.recentActivity ?? [];
  const hasRecentActivity = recentActivity.length > 0;
  const hasDashboardContent = hasSecurityAttention || hasRecentActivity;

  return (
    <AuthenticatedLayout>
      <PageShell className="py-0">
        <PageCanvas contentClassName="space-y-4">
          <PageHero
            description="Les éléments importants apparaissent ici lorsqu’ils sont utiles."
            icon={<Home aria-hidden="true" className="size-5" />}
            title={firstName ? `Bonjour ${firstName}` : "Vue d'ensemble"}
            tone="dashboard"
          />

          {dashboardError && (
            <ContentState
              action={
                <Button
                  disabled={isLoadingDashboard}
                  onClick={() => void fetchDashboardStats()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {isLoadingDashboard ? (
                    <Loader2
                      aria-hidden="true"
                      className="size-4 animate-spin"
                    />
                  ) : (
                    <RefreshCw aria-hidden="true" className="size-4" />
                  )}
                  Réessayer
                </Button>
              }
              description="Les informations restent masquées tant que leur chargement n’a pas réussi."
              kind="error"
              title="Accueil indisponible"
            />
          )}

          {hasDashboardContent && (
            <div
              className={cn(
                'grid items-start gap-4',
                hasSecurityAttention &&
                  hasRecentActivity &&
                  'xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]',
              )}
            >
              {hasSecurityAttention && (
                <DashboardAttentionCard security={security} />
              )}
              {hasRecentActivity && (
                <DashboardActivityCard
                  activities={recentActivity}
                  canOpenJournal={canViewSystemAudit}
                />
              )}
            </div>
          )}
        </PageCanvas>
      </PageShell>
    </AuthenticatedLayout>
  );
}
