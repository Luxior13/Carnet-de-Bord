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
import { toast } from 'sonner';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
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
import { PageCanvas, PageHeader, PageShell } from '$ui/page-shell';
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
  ['ACCOUNT_LOCKED', 'Compte verrouille'],
  ['LOGIN_FAILED', 'Echec de connexion'],
  ['LOGIN_SUCCESS', 'Connexion'],
  ['LOGOUT', 'Deconnexion'],
  ['PASSWORD_CHANGE', 'Mot de passe modifie'],
  ['PASSWORD_RESET', 'Mot de passe reinitialise'],
  ['PERMISSION_UPDATE', 'Permissions modifiees'],
  ['SESSION_INVALIDATE', 'Sessions revoquees'],
  ['USER_ACTIVATE', 'Utilisateur active'],
  ['USER_CREATE', 'Utilisateur cree'],
  ['USER_DEACTIVATE', 'Utilisateur desactive'],
  ['USER_DELETE', 'Utilisateur supprime'],
  ['USER_UPDATE', 'Utilisateur modifie'],
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

const getMetricToneClassName = (tone: DashboardMetricTone): string => {
  if (tone === 'danger') {
    return 'border-destructive/35 bg-destructive/10 text-destructive';
  }

  if (tone === 'warning') {
    return 'border-amber-500/35 bg-amber-500/10 text-amber-400';
  }

  if (tone === 'primary') {
    return 'border-sidebar-ring/35 bg-sidebar-ring/15 text-sidebar-ring';
  }

  return 'border-sidebar-border/70 bg-secondary/80 text-muted-foreground';
};

const getActivityLabel = (activity: DashboardActivityItem): string => {
  return ACTION_LABELS.get(activity.action) ?? activity.action;
};

const DashboardSkeleton: FC = () => (
  <div className="space-y-4" role="status" aria-label="Chargement">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[...Array(4)].map((_, index) => (
        <Skeleton key={index} className="h-28 rounded-xl" />
      ))}
    </div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
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
  <Card className="border-sidebar-border/70 overflow-hidden rounded-xl py-0">
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <span
          className={`${getMetricToneClassName(tone)} flex size-10 shrink-0 items-center justify-center rounded-lg border`}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">{label}</p>
          <p className="text-foreground mt-1 truncate text-2xl font-semibold tracking-tight">
            {value}
          </p>
          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
            {description}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const ShortcutButton: FC<{ shortcut: HomeShortcut }> = ({ shortcut }) => {
  const Icon = shortcut.icon;

  return (
    <Button
      asChild
      variant="outline"
      className="bg-popover h-auto min-h-20 justify-between rounded-md border p-4 text-left shadow-none"
    >
      <Link href={shortcut.href}>
        <span className="flex min-w-0 items-center gap-3">
          <ServiceIcon className="bg-primary/10 text-primary size-9">
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
}> = ({ activities, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, index) => (
          <Skeleton key={index} className="h-14 rounded-md" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="border-border/60 bg-popover rounded-md border p-4">
        <p className="text-muted-foreground text-sm">
          Aucune activite recente a afficher.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {activities.map((activity, index) => (
        <React.Fragment key={activity.id}>
          {index > 0 && <Separator className="bg-border/60" />}
          <div className="flex min-w-0 items-start gap-3 py-3">
            <span className="border-sidebar-ring/35 bg-sidebar-ring/15 text-sidebar-ring mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border">
              <Activity className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="text-foreground truncate text-sm font-medium">
                  {getActivityLabel(activity)}
                </p>
                <Badge variant="outline" className="text-[10px]">
                  {activity.category}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                {activity.description}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {activity.userName ?? 'Systeme'} -{' '}
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
      } else {
        setDashboardStats(null);
        setDashboardError(
          data.success
            ? 'Impossible de charger le tableau de bord'
            : data.error.message,
        );
      }
    } catch {
      if (controller.signal.aborted) return;

      setDashboardStats(null);
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

  useEffect((): void => {
    if (dashboardError) {
      toast.error(dashboardError);
    }
  }, [dashboardError]);

  const shortcuts = useMemo<HomeShortcut[]>(() => {
    const nextShortcuts: HomeShortcut[] = [
      {
        description: 'Profil, mot de passe, sessions et activite personnelle.',
        href: '/mon-compte',
        icon: UserRound,
        label: 'Mon compte',
      },
    ];

    if (canViewUsers) {
      nextShortcuts.push({
        description: 'Consulter les comptes, les acces et la securite.',
        href: '/administration/utilisateurs',
        icon: Users,
        label: 'Utilisateurs',
      });
    }

    if (canCreateUsers) {
      nextShortcuts.push({
        description: 'Creer un membre et lui transmettre son acces temporaire.',
        href: '/administration/utilisateurs/nouveau',
        icon: UserPlus,
        label: 'Nouveau membre',
      });
    }

    return nextShortcuts;
  }, [canCreateUsers, canViewUsers]);

  const dashboardMetrics = useMemo<DashboardMetric[]>(() => {
    const stats = dashboardStats;
    const lockedUsers = stats?.security.lockedUsers ?? 0;
    const pendingPassword = stats?.security.pendingPassword ?? 0;
    const securityAlerts = lockedUsers + pendingPassword;

    if (!canViewDashboard) {
      return [
        {
          description: 'Acces limite aux informations de votre compte.',
          icon: UserRound,
          label: 'Vue personnelle',
          tone: 'neutral',
          value: 'Compte',
        },
        {
          description: userData?.isActive
            ? 'Connexion autorisee'
            : 'Connexion desactivee',
          icon: ShieldCheck,
          label: 'Etat du compte',
          tone: userData?.isActive ? 'primary' : 'danger',
          value: userData?.isActive ? 'Actif' : 'Inactif',
        },
        {
          description: 'Derniere activite connue',
          icon: Clock,
          label: 'Connexion',
          tone: 'neutral',
          value: formatRelativeDashboardTime(userData?.lastLoginAt ?? null),
        },
        {
          description: userData?.mustChangePassword
            ? 'Changement requis'
            : 'Aucune action immediate',
          icon: KeyRound,
          label: 'Mot de passe',
          tone: userData?.mustChangePassword ? 'warning' : 'primary',
          value: userData?.mustChangePassword ? 'A changer' : 'OK',
        },
      ];
    }

    return [
      {
        description: canViewUsers
          ? 'Comptes non supprimes'
          : 'Vue limitee a votre compte',
        icon: Users,
        label: canViewUsers ? 'Utilisateurs' : 'Compte',
        tone: 'primary',
        value: String(stats?.users.total ?? 0),
      },
      {
        description: canViewUsers
          ? `${stats?.users.inactive ?? 0} compte(s) inactif(s)`
          : 'Etat de votre compte',
        icon: ShieldCheck,
        label: canViewUsers ? 'Actifs' : 'Etat',
        tone: 'primary',
        value: canViewUsers
          ? String(stats?.users.active ?? 0)
          : userData?.isActive
            ? 'Actif'
            : 'Inactif',
      },
      {
        description: canViewUsers
          ? 'Connexions sur les dernieres 24h'
          : 'Derniere connexion personnelle',
        icon: CalendarClock,
        label: canViewUsers ? 'Connexions 24h' : 'Connexion',
        tone: 'neutral',
        value: canViewUsers
          ? String(stats?.users.recentLogins ?? 0)
          : formatRelativeDashboardTime(userData?.lastLoginAt ?? null),
      },
      {
        description: `${lockedUsers} verrouille(s), ${pendingPassword} mot(s) de passe a changer`,
        icon: AlertTriangle,
        label: 'Alertes securite',
        tone: securityAlerts > 0 ? 'warning' : 'primary',
        value: String(securityAlerts),
      },
    ];
  }, [canViewDashboard, canViewUsers, dashboardStats, userData]);

  return (
    <AuthenticatedLayout>
      <PageShell className="py-0">
        <PageCanvas contentClassName="space-y-4">
          <PageHeader
            title={firstName ? `Bonjour ${firstName}` : "Vue d'ensemble"}
            description="Pilotage prive, securite et raccourcis."
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
            icon={
              <ServiceIcon className="bg-primary/10 text-primary">
                <Home className="size-5" />
              </ServiceIcon>
            }
            meta={
              userData ? (
                <>
                  <Badge variant="secondary">{getAccessLabel(userData)}</Badge>
                  {!canViewDashboard && (
                    <Badge variant="outline">Vue personnelle</Badge>
                  )}
                  {userData.mustChangePassword && (
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 text-amber-400"
                    >
                      Mot de passe a changer
                    </Badge>
                  )}
                </>
              ) : null
            }
          />
          {isLoadingDashboard && !dashboardStats && canViewDashboard ? (
            <DashboardSkeleton />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {dashboardMetrics.map((metric) => (
                  <DashboardMetricCard key={metric.label} {...metric} />
                ))}
              </div>
              {dashboardError && (
                <Card className="border-destructive/30 bg-destructive/5 overflow-hidden rounded-xl py-0">
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="bg-destructive/10 text-destructive border-destructive/30 flex size-9 shrink-0 items-center justify-center rounded-lg border">
                        <AlertTriangle className="size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium">
                          Tableau de bord indisponible
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Les raccourcis restent disponibles.
                        </p>
                      </div>
                    </div>
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
                      Reessayer
                    </Button>
                  </CardContent>
                </Card>
              )}
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)] xl:items-start">
                <div className="space-y-4">
                  <Card className="border-sidebar-border/70 overflow-hidden rounded-xl py-0">
                    <CardHeader className="border-sidebar-border/65 bg-surface-muted border-b p-4">
                      <CardTitle className="text-sm">Raccourcis</CardTitle>
                      <CardDescription>
                        Acces utiles selon votre role actuel.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 p-4 md:grid-cols-2">
                      {shortcuts.map((shortcut) => (
                        <ShortcutButton
                          key={shortcut.href}
                          shortcut={shortcut}
                        />
                      ))}
                    </CardContent>
                  </Card>
                  {canViewDashboard && (
                    <Card className="border-sidebar-border/70 overflow-hidden rounded-xl py-0">
                      <CardHeader className="border-sidebar-border/65 bg-surface-muted border-b p-4">
                        <CardTitle className="text-sm">
                          Activite recente
                        </CardTitle>
                        <CardDescription>
                          Derniers evenements visibles pour votre role.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4">
                        <DashboardActivityList
                          activities={dashboardStats?.recentActivity ?? []}
                          isLoading={isLoadingDashboard}
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
                <Card className="border-sidebar-border/70 overflow-hidden rounded-xl py-0">
                  <CardHeader className="border-sidebar-border/65 bg-surface-muted border-b p-4">
                    <CardTitle className="text-sm">
                      Securite du compte
                    </CardTitle>
                    <CardDescription>
                      Votre etat d&apos;acces et les signaux importants.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4">
                    <div className="border-border/60 bg-popover flex items-start gap-3 rounded-md border p-3">
                      <ServiceIcon
                        className={
                          userData?.mustChangePassword
                            ? 'size-9 border-amber-500/35 bg-amber-500/10 text-amber-400'
                            : 'bg-primary/10 text-primary size-9'
                        }
                      >
                        <ShieldCheck className="size-4" />
                      </ServiceIcon>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {userData?.mustChangePassword
                            ? 'Mot de passe temporaire'
                            : 'Compte securise'}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {userData?.mustChangePassword
                            ? 'Changement requis a la prochaine connexion.'
                            : 'Aucune action immediate requise.'}
                        </p>
                      </div>
                    </div>
                    <div className="border-border/60 bg-popover flex items-start gap-3 rounded-md border p-3">
                      <ServiceIcon className="size-9">
                        <Clock className="size-4" />
                      </ServiceIcon>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          Derniere connexion
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {formatDashboardDate(userData?.lastLoginAt ?? null)}
                        </p>
                      </div>
                    </div>
                    <div className="border-border/60 bg-popover flex items-start gap-3 rounded-md border p-3">
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
                  <CardFooter className="border-sidebar-border/65 bg-surface-muted justify-end border-t p-4">
                    <Button asChild variant="outline" size="sm">
                      <Link href="/mon-compte">
                        <UserRound className="size-4" />
                        Gerer mon compte
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
