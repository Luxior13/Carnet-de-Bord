'use client';

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Clock,
  Home,
  KeyRound,
  Loader2,
  type LucideIcon,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  UserRound,
  Users,
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
import {
  getAccessLabel,
  hasPermission,
  PERMISSIONS,
} from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
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
  CardTitle,
} from '$ui/card';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Separator } from '$ui/separator';
import { ServiceIcon } from '$ui/service-icon';
import { Skeleton } from '$ui/skeleton';

type DashboardMetricTone = 'danger' | 'neutral' | 'primary' | 'warning';

type DashboardMetric = {
  description: string;
  icon: LucideIcon;
  label: string;
  tone?: DashboardMetricTone;
  value: string;
};

type HomeShortcut = {
  description: string;
  href: string;
  icon: LucideIcon;
  label: string;
};

const ACTION_LABELS = new Map<string, string>([
  ['ACCOUNT_LOCKED', 'Compte verrouillé'],
  ['LOGIN_FAILED', 'Échec de connexion'],
  ['LOGIN_SUCCESS', 'Connexion'],
  ['LOGOUT', 'Déconnexion'],
  ['MFA_DISABLED', 'Double authentification désactivée'],
  ['MFA_ENABLED', 'Application d’authentification configurée'],
  ['MFA_RECOVERY_CODE_USED', 'Code de secours utilisé'],
  ['MFA_RECOVERY_CODES_REGENERATED', 'Codes de secours régénérés'],
  ['PASSWORD_CHANGE', 'Mot de passe modifié'],
  ['PASSWORD_RESET', 'Mot de passe réinitialisé'],
  ['PERMISSION_UPDATE', 'Permissions modifiées'],
  ['SESSION_INVALIDATE', 'Sessions révoquées'],
  ['USER_ACTIVATE', 'Utilisateur activé'],
  ['USER_CREATE', 'Utilisateur créé'],
  ['USER_DEACTIVATE', 'Utilisateur désactivé'],
  ['USER_DELETE', 'Utilisateur supprimé'],
  ['USER_UPDATE', 'Utilisateur modifié'],
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

  if (!parsedDate) return 'Jamais';

  return parsedDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  });
};

const formatRelativeDashboardTime = (
  date: Date | string | null | undefined,
): string => {
  const parsedDate = toValidDate(date);

  if (!parsedDate) return 'Jamais';

  const now = new Date();
  const diffMs = now.getTime() - parsedDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "A l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays}j`;

  return parsedDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year:
      parsedDate.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
};

const formatRefreshTime = (date: Date): string =>
  date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

const getMetricToneClassName = (tone: DashboardMetricTone): string => {
  if (tone === 'danger') {
    return 'border-destructive/35 bg-destructive/10 text-destructive';
  }

  if (tone === 'warning') {
    return 'border-warning/35 bg-warning/10 text-warning';
  }

  if (tone === 'primary') {
    return 'border-primary/35 bg-primary/15 text-primary-emphasis';
  }

  return 'border-border/70 bg-secondary/80 text-muted-foreground';
};

const getActivityLabel = (activity: DashboardActivityItem): string => {
  return (
    ACTION_LABELS.get(activity.action) ??
    (activity.description || activity.action)
  );
};

const DashboardSkeleton: FC = () => (
  <div className="space-y-4" role="status" aria-label="Chargement">
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[...Array(4)].map((_, index) => (
        <Skeleton key={index} className="h-28 rounded-md" />
      ))}
    </div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
      <Skeleton className="h-72 rounded-md" />
      <Skeleton className="h-72 rounded-md" />
    </div>
  </div>
);

const DashboardMetricCard: FC<DashboardMetric> = ({
  description,
  icon: Icon,
  label,
  tone = 'neutral',
  value,
}) => (
  <Card className="border-border/70 overflow-hidden rounded-md py-0">
    <CardContent className="p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <span
          className={`${getMetricToneClassName(tone)} flex size-9 shrink-0 items-center justify-center rounded-lg border sm:size-10`}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">{label}</p>
          <p className="text-foreground mt-1 truncate text-xl font-semibold tracking-normal sm:text-2xl">
            {value}
          </p>
          <p className="text-muted-foreground mt-1 line-clamp-2 hidden text-xs sm:block">
            {description}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const ShortcutButton: FC<{
  className?: string;
  shortcut: HomeShortcut;
}> = ({ className, shortcut }) => {
  const Icon = shortcut.icon;

  return (
    <Button
      asChild
      variant="ghost"
      className={`bg-surface hover:bg-surface-muted h-auto min-h-20 justify-between rounded-none border-0 p-4 text-left shadow-none ${className ?? ''}`}
    >
      <Link href={shortcut.href}>
        <span className="flex min-w-0 items-center gap-3">
          <ServiceIcon className="bg-primary/10 text-primary-emphasis size-9">
            <Icon className="size-4" />
          </ServiceIcon>
          <span className="min-w-0">
            <span className="block truncate font-medium">{shortcut.label}</span>
            <span className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-5">
              {shortcut.description}
            </span>
          </span>
        </span>
        <ArrowRight className="text-muted-foreground size-4 shrink-0" />
      </Link>
    </Button>
  );
};

const DashboardActivityList: FC<{
  activities: DashboardActivityItem[];
  isLoading: boolean;
  isUnavailable?: boolean;
}> = ({ activities, isLoading, isUnavailable = false }) => {
  if (isLoading) {
    return (
      <div className="space-y-3" role="status" aria-label="Chargement">
        {[...Array(4)].map((_, index) => (
          <Skeleton key={index} className="h-14 rounded-md" />
        ))}
      </div>
    );
  }

  if (isUnavailable) {
    return (
      <ContentState
        className="rounded-none border-0 bg-transparent px-0"
        description="Aucun événement n’est affiché tant que l’actualisation n’a pas réussi."
        kind="warning"
        title="Activité indisponible"
      />
    );
  }

  if (activities.length === 0) {
    return (
      <ContentState
        className="rounded-none border-0 bg-transparent px-0"
        description="Les prochains événements visibles apparaîtront ici."
        title="Aucune activité récente"
      />
    );
  }

  return (
    <div className="space-y-0">
      {activities.map((activity, index) => (
        <React.Fragment key={activity.id}>
          {index > 0 && <Separator className="bg-border/60" />}
          <div className="flex min-w-0 items-start gap-3 py-3">
            <span className="border-primary/35 bg-primary/15 text-primary-emphasis mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border">
              <Activity className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="text-foreground truncate text-sm font-medium">
                  {getActivityLabel(activity)}
                </p>
                <Badge variant="outline" className="text-xs">
                  {activity.category}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                {activity.description}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {activity.userName ?? 'Système'} -{' '}
                {formatRelativeDashboardTime(activity.createdAt)}
              </p>
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export default function HomePage(): React.ReactNode {
  const { userData } = useUser();
  const dashboardAbortControllerRef = useRef<AbortController | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(
    null,
  );
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [lastSuccessfulLoadAt, setLastSuccessfulLoadAt] = useState<Date | null>(
    null,
  );

  const firstName = userData?.firstName?.trim();
  const mustChangePassword = !!userData?.mustChangePassword;
  const canViewDashboard = userData
    ? !mustChangePassword &&
      (userData.isProtected ||
        hasPermission(
          userData.role,
          PERMISSIONS.DASHBOARD.VIEW,
          userData.permissions,
        ))
    : false;
  const canViewUsers = userData
    ? !mustChangePassword &&
      (userData.isProtected ||
        hasPermission(
          userData.role,
          PERMISSIONS.USERS.VIEW,
          userData.permissions,
        ))
    : false;
  const canCreateUsers = userData
    ? !mustChangePassword &&
      (userData.isProtected ||
        hasPermission(
          userData.role,
          PERMISSIONS.USERS.CREATE,
          userData.permissions,
        ))
    : false;
  const canViewRecentActivity = userData
    ? userData.isProtected ||
      hasPermission(
        userData.role,
        PERMISSIONS.USERS.VIEW_ACTIVITY,
        userData.permissions,
      ) ||
      hasPermission(
        userData.role,
        PERMISSIONS.SYSTEM.AUDIT,
        userData.permissions,
      )
    : false;

  const fetchDashboardStats = useCallback(async (): Promise<void> => {
    dashboardAbortControllerRef.current?.abort();
    dashboardAbortControllerRef.current = null;

    if (!canViewDashboard) {
      setDashboardStats(null);
      setDashboardError(null);
      setIsLoadingDashboard(false);

      return;
    }

    const controller = new AbortController();
    dashboardAbortControllerRef.current = controller;

    try {
      setIsLoadingDashboard(true);
      setDashboardError(null);

      const response = await fetch('/api/dashboard', {
        signal: controller.signal,
      });
      const data = (await response.json()) as ApiResponse<DashboardStats>;

      if (controller.signal.aborted) return;

      if (response.ok && data.success) {
        setDashboardStats(data.data);
        setLastSuccessfulLoadAt(new Date());
      } else {
        setDashboardError(
          data.success
            ? 'Impossible de charger le tableau de bord'
            : data.error.message,
        );
      }
    } catch {
      if (controller.signal.aborted) return;

      setDashboardError('Impossible de charger le tableau de bord');
    } finally {
      if (dashboardAbortControllerRef.current !== controller) return;

      dashboardAbortControllerRef.current = null;
      setIsLoadingDashboard(false);
    }
  }, [canViewDashboard]);

  useEffect((): (() => void) => {
    return (): void => {
      dashboardAbortControllerRef.current?.abort();
      dashboardAbortControllerRef.current = null;
    };
  }, []);

  useEffect((): void => {
    void fetchDashboardStats();
  }, [fetchDashboardStats]);

  const shortcuts = useMemo<HomeShortcut[]>(() => {
    const nextShortcuts: HomeShortcut[] = [
      {
        description: 'Profil, mot de passe, sessions et activité personnelle.',
        href: '/mon-compte',
        icon: UserRound,
        label: 'Mon compte',
      },
    ];

    if (canViewUsers) {
      nextShortcuts.push({
        description: 'Consulter les comptes, les accès et la sécurité.',
        href: '/administration/utilisateurs',
        icon: Users,
        label: 'Utilisateurs',
      });
    }

    if (canCreateUsers) {
      nextShortcuts.push({
        description: 'Créer un membre et lui transmettre son accès temporaire.',
        href: '/administration/utilisateurs/nouveau',
        icon: UserPlus,
        label: 'Nouveau membre',
      });
    }

    return nextShortcuts;
  }, [canCreateUsers, canViewUsers]);

  const dashboardMetrics = useMemo<DashboardMetric[]>(() => {
    const stats = dashboardStats;
    const lockedUsers = stats?.security.lockedUsers;
    const pendingPassword = stats?.security.pendingPassword;
    const securityAlerts =
      lockedUsers === undefined || pendingPassword === undefined
        ? null
        : lockedUsers + pendingPassword;

    if (!canViewDashboard) {
      return [
        {
          description: 'Accès limité aux informations de votre compte.',
          icon: UserRound,
          label: 'Vue personnelle',
          tone: 'neutral',
          value: 'Compte',
        },
        {
          description: userData?.isActive
            ? 'Connexion autorisée'
            : 'Connexion désactivée',
          icon: ShieldCheck,
          label: 'État du compte',
          tone: userData?.isActive ? 'primary' : 'danger',
          value: userData?.isActive ? 'Actif' : 'Inactif',
        },
        {
          description: 'Dernière activité connue',
          icon: Clock,
          label: 'Connexion',
          tone: 'neutral',
          value: formatRelativeDashboardTime(userData?.lastLoginAt ?? null),
        },
        {
          description: userData?.mustChangePassword
            ? 'Changement requis'
            : 'Aucune action immédiate',
          icon: KeyRound,
          label: 'Mot de passe',
          tone: userData?.mustChangePassword ? 'warning' : 'primary',
          value: userData?.mustChangePassword ? 'À changer' : 'OK',
        },
      ];
    }

    return [
      {
        description: canViewUsers
          ? 'Comptes non supprimés'
          : 'Vue limitée à votre compte',
        icon: Users,
        label: canViewUsers ? 'Utilisateurs' : 'Compte',
        tone: 'primary',
        value: stats ? String(stats.users.total) : '—',
      },
      {
        description: canViewUsers
          ? `${stats?.users.inactive ?? 0} compte(s) inactif(s)`
          : 'État de votre compte',
        icon: ShieldCheck,
        label: canViewUsers ? 'Actifs' : 'État',
        tone: 'primary',
        value: canViewUsers
          ? stats
            ? String(stats.users.active)
            : '—'
          : userData?.isActive
            ? 'Actif'
            : 'Inactif',
      },
      {
        description: canViewUsers
          ? 'Connexions sur les dernières 24h'
          : 'Dernière connexion personnelle',
        icon: CalendarClock,
        label: canViewUsers ? 'Connexions 24h' : 'Connexion',
        tone: 'neutral',
        value: canViewUsers
          ? stats
            ? String(stats.users.recentLogins)
            : '—'
          : formatRelativeDashboardTime(userData?.lastLoginAt ?? null),
      },
      {
        description:
          securityAlerts === null
            ? 'Données de sécurité indisponibles'
            : `${lockedUsers} verrouillé(s), ${pendingPassword} mot(s) de passe à changer`,
        icon: AlertTriangle,
        label: 'Alertes sécurité',
        tone:
          securityAlerts === null
            ? 'neutral'
            : securityAlerts > 0
              ? 'warning'
              : 'primary',
        value: securityAlerts === null ? '—' : String(securityAlerts),
      },
    ];
  }, [canViewDashboard, canViewUsers, dashboardStats, userData]);

  return (
    <AuthenticatedLayout>
      <PageShell className="py-0">
        <PageCanvas contentClassName="space-y-4">
          <PageHero
            title={firstName ? `Bonjour ${firstName}` : "Vue d'ensemble"}
            description="Pilotage privé, sécurité et raccourcis."
            actions={
              <>
                <Button asChild variant="outline" size="sm">
                  <Link href="/mon-compte">
                    <UserRound className="size-4" />
                    Mon compte
                  </Link>
                </Button>
                {canViewUsers && (
                  <Button asChild size="sm">
                    <Link href="/administration/utilisateurs">
                      <Users className="size-4" />
                      Utilisateurs
                    </Link>
                  </Button>
                )}
              </>
            }
            icon={<Home className="size-5" />}
            meta={
              userData ? (
                <>
                  <Badge variant="secondary">{getAccessLabel(userData)}</Badge>
                  {!canViewDashboard && (
                    <Badge variant="outline">Vue personnelle</Badge>
                  )}
                  {lastSuccessfulLoadAt && (
                    <Badge variant="outline">
                      Actualisé à {formatRefreshTime(lastSuccessfulLoadAt)}
                    </Badge>
                  )}
                  {userData.mustChangePassword && (
                    <Badge
                      variant="outline"
                      className="border-warning/40 text-warning"
                    >
                      Mot de passe à changer
                    </Badge>
                  )}
                </>
              ) : null
            }
            tone="dashboard"
          />
          {isLoadingDashboard && !dashboardStats && canViewDashboard ? (
            <DashboardSkeleton />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {dashboardMetrics.map((metric) => (
                  <DashboardMetricCard key={metric.label} {...metric} />
                ))}
              </div>
              {dashboardError && (
                <ContentState
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void fetchDashboardStats()}
                      disabled={isLoadingDashboard}
                    >
                      {isLoadingDashboard ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <RefreshCw className="size-4" />
                      )}
                      Réessayer
                    </Button>
                  }
                  description={
                    dashboardStats && lastSuccessfulLoadAt
                      ? `Les dernières données fiables, actualisées à ${formatRefreshTime(lastSuccessfulLoadAt)}, restent affichées.`
                      : 'Les raccourcis restent disponibles. Les métriques sont masquées pour éviter des valeurs trompeuses.'
                  }
                  kind="error"
                  title="Tableau de bord indisponible"
                />
              )}
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)] xl:items-start">
                <div className="space-y-4">
                  <Card className="border-border/70 overflow-hidden rounded-md py-0">
                    <CardHeader className="border-border/65 bg-surface-muted border-b p-4">
                      <CardTitle className="text-sm">Raccourcis</CardTitle>
                      <CardDescription>
                        Accès utiles selon votre rôle actuel.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="bg-border/60 grid gap-px p-0 md:grid-cols-2">
                      {shortcuts.map((shortcut, index) => (
                        <ShortcutButton
                          className={
                            shortcuts.length % 2 === 1 &&
                            index === shortcuts.length - 1
                              ? 'md:col-span-2'
                              : undefined
                          }
                          key={shortcut.href}
                          shortcut={shortcut}
                        />
                      ))}
                    </CardContent>
                  </Card>
                  {canViewDashboard && canViewRecentActivity && (
                    <Card className="border-border/70 overflow-hidden rounded-md py-0">
                      <CardHeader className="border-border/65 bg-surface-muted border-b p-4">
                        <CardTitle className="text-sm">
                          Activité récente
                        </CardTitle>
                        <CardDescription>
                          Derniers événements visibles pour votre rôle.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4">
                        <DashboardActivityList
                          activities={dashboardStats?.recentActivity ?? []}
                          isUnavailable={!dashboardStats && !!dashboardError}
                          isLoading={isLoadingDashboard && !dashboardStats}
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
                <Card className="border-border/70 overflow-hidden rounded-md py-0">
                  <CardHeader className="border-border/65 bg-surface-muted border-b p-4">
                    <CardTitle className="text-sm">
                      Sécurité du compte
                    </CardTitle>
                    <CardDescription>
                      Votre état d&apos;accès et les signaux importants.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="divide-border/60 divide-y p-0">
                    <div className="flex items-start gap-3 px-4 py-4">
                      <ServiceIcon
                        className={
                          userData?.mustChangePassword
                            ? 'border-warning/35 bg-warning/10 text-warning size-9'
                            : 'bg-primary/10 text-primary-emphasis size-9'
                        }
                      >
                        <ShieldCheck className="size-4" />
                      </ServiceIcon>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {userData?.mustChangePassword
                            ? 'Mot de passe temporaire'
                            : 'Compte sécurisé'}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {userData?.mustChangePassword
                            ? 'Changement requis à la prochaine connexion.'
                            : 'Aucune action immédiate requise.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 px-4 py-4">
                      <ServiceIcon className="size-9">
                        <Clock className="size-4" />
                      </ServiceIcon>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          Dernière connexion
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {formatDashboardDate(userData?.lastLoginAt ?? null)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 px-4 py-4">
                      <ServiceIcon className="size-9">
                        <KeyRound className="size-4" />
                      </ServiceIcon>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          Dernier changement
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {formatDashboardDate(
                            userData?.passwordChangedAt ?? null,
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-border/65 bg-surface-muted justify-end border-t p-4">
                    <Button asChild variant="outline" size="sm">
                      <Link href="/mon-compte">
                        <UserRound className="size-4" />
                        Gérer mon compte
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </>
          )}
        </PageCanvas>
      </PageShell>
    </AuthenticatedLayout>
  );
}
