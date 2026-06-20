'use client';

import {
  Activity,
  AlertTriangle,
  Clock,
  KeyRound,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

import type { DashboardStats } from '$app/api/dashboard/route';
import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { SITE_CONFIG } from '$constants/app.constants';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '$ui/card';
import { PageShell } from '$ui/page-shell';
import { Separator } from '$ui/separator';
import { ServiceIcon } from '$ui/service-icon';
import { Skeleton } from '$ui/skeleton';
import { cn } from '$utils/css.utils';

type MetricTone = 'danger' | 'primary' | 'success' | 'warning';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "A l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;

  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}

function getActionLabel(action: string): string {
  switch (action) {
    case 'LOGIN_FAILED':
      return 'Connexion echouee';
    case 'LOGIN_SUCCESS':
      return 'Connexion';
    case 'LOGOUT':
      return 'Deconnexion';
    case 'PASSWORD_CHANGE':
      return 'Mot de passe change';
    case 'PASSWORD_RESET':
      return 'Mot de passe reinitialise';
    case 'PERMISSION_UPDATE':
      return 'Permissions modifiees';
    case 'USER_ACTIVATE':
      return 'Utilisateur active';
    case 'USER_CREATE':
      return 'Utilisateur cree';
    case 'USER_DEACTIVATE':
      return 'Utilisateur desactive';
    case 'USER_DELETE':
      return 'Utilisateur supprime';
    case 'USER_UPDATE':
      return 'Utilisateur modifie';
    default:
      return 'Evenement systeme';
  }
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'AUTH':
      return 'bg-sky-400';
    case 'PERMISSION':
      return 'bg-blue-400';
    case 'USER':
      return 'bg-primary';
    default:
      return 'bg-muted-foreground';
  }
}

function getToneClass(tone: MetricTone): string {
  switch (tone) {
    case 'danger':
      return 'bg-destructive/10 text-destructive';
    case 'success':
      return 'bg-emerald-500/10 text-emerald-400';
    case 'warning':
      return 'bg-amber-500/10 text-amber-300';
    default:
      return 'bg-secondary text-primary';
  }
}

function LoadingSkeleton(): React.ReactNode {
  return (
    <PageShell className="space-y-6">
      <Skeleton className="h-36 rounded-lg" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-lg lg:col-span-2" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </PageShell>
  );
}

function MetricCard({
  detail,
  icon,
  label,
  tone = 'primary',
  value,
}: {
  detail?: string;
  icon: React.ReactNode;
  label: string;
  tone?: MetricTone;
  value: string | number;
}): React.ReactNode {
  return (
    <Card className="bg-card/70">
      <CardContent className="flex items-center gap-4 px-5">
        <ServiceIcon className={getToneClass(tone)}>{icon}</ServiceIcon>
        <div className="min-w-0">
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          {detail && (
            <p className="text-muted-foreground mt-1 text-xs">{detail}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon,
  label,
  text,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
}): React.ReactNode {
  return (
    <div className="bg-background/35 flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center">
      <ServiceIcon className="mb-3 size-11">{icon}</ServiceIcon>
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">{text}</p>
    </div>
  );
}

export default function DashboardPage(): React.ReactNode {
  const { isLoading: isUserLoading, userData } = useUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const canViewDashboard = userData
    ? userData.isProtected ||
      hasPermission(
        userData.role,
        PERMISSIONS.DASHBOARD.VIEW,
        userData.permissions,
      )
    : false;

  useEffect(() => {
    if (isUserLoading) return;

    if (!canViewDashboard) {
      setIsLoading(false);
      setStats(null);

      return;
    }

    async function fetchStats(): Promise<void> {
      try {
        const response = await fetch('/api/dashboard');
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch {
        // Dashboard data is optional for rendering the shell.
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [canViewDashboard, isUserLoading]);

  return (
    <AuthenticatedLayout>
      {isUserLoading || isLoading ? (
        <LoadingSkeleton />
      ) : !canViewDashboard ? (
        <PageShell>
          <Card>
            <CardContent className="flex items-start gap-4 px-5">
              <ServiceIcon className="bg-amber-500/10 text-amber-300">
                <AlertTriangle className="size-5" />
              </ServiceIcon>
              <div>
                <p className="font-medium">Acces limite</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Vous n&apos;avez pas la permission de voir le tableau de bord.
                </p>
              </div>
            </CardContent>
          </Card>
        </PageShell>
      ) : stats ? (
        <PageShell className="space-y-6">
          <Card className="bg-card/70 overflow-hidden">
            <CardContent className="grid gap-6 px-6 md:grid-cols-[1.5fr_1fr] md:items-center">
              <div>
                <Badge variant="secondary" className="mb-4">
                  {SITE_CONFIG.name}
                </Badge>
                <h1 className="text-3xl font-semibold tracking-tight">
                  Bonjour {userData?.firstName}
                </h1>
                <p className="text-muted-foreground mt-2 max-w-2xl">
                  Vue generale de ton carnet, de tes acces et de l&apos;activite
                  recente.
                </p>
              </div>
              <div className="bg-background/35 rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <ServiceIcon>
                    <ShieldCheck className="size-5" />
                  </ServiceIcon>
                  <div>
                    <p className="text-muted-foreground text-sm">Etat global</p>
                    <p className="text-2xl font-semibold">
                      {stats.security.lockedUsers > 0 ? 'A surveiller' : 'OK'}
                    </p>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {stats.users.active} actif
                    {stats.users.active > 1 ? 's' : ''}
                  </Badge>
                  <Badge
                    variant={
                      stats.security.pendingPassword > 0
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {stats.security.pendingPassword} mot
                    {stats.security.pendingPassword > 1 ? 's' : ''} de passe
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Comptes"
              value={stats.users.total}
              detail={`${stats.users.active} actifs`}
              icon={<Users className="size-5" />}
            />
            <MetricCard
              label="Connexions 24h"
              value={stats.users.recentLogins}
              detail="Activite recente"
              tone="success"
              icon={<Clock className="size-5" />}
            />
            <MetricCard
              label="Mots de passe"
              value={stats.security.pendingPassword}
              detail={
                stats.security.pendingPassword > 0
                  ? 'Action requise'
                  : 'Aucune action'
              }
              tone={stats.security.pendingPassword > 0 ? 'warning' : 'primary'}
              icon={<KeyRound className="size-5" />}
            />
            <MetricCard
              label="Comptes verrouilles"
              value={stats.security.lockedUsers}
              detail={
                stats.security.lockedUsers > 0
                  ? 'Verification conseillee'
                  : 'Aucun verrouillage'
              }
              tone={stats.security.lockedUsers > 0 ? 'danger' : 'primary'}
              icon={<ShieldCheck className="size-5" />}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="bg-card/70 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="text-primary size-5" />
                  Activite recente
                </CardTitle>
                <CardDescription>
                  Connexions, modifications de comptes et changements
                  d&apos;acces.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.recentActivity.length > 0 ? (
                  <div className="space-y-2">
                    {stats.recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="hover:bg-accent/60 flex items-start gap-3 rounded-lg p-2"
                      >
                        <span
                          className={cn(
                            'mt-2 size-2 shrink-0 rounded-full',
                            getCategoryColor(activity.category),
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {getActionLabel(activity.action)}
                          </p>
                          <p className="text-muted-foreground truncate text-xs">
                            {activity.userName || 'Systeme'}
                          </p>
                        </div>
                        <span className="text-muted-foreground shrink-0 text-xs">
                          {formatRelativeTime(activity.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Activity className="size-5" />}
                    label="Aucune activite"
                    text="Les evenements importants apparaitront ici."
                  />
                )}
              </CardContent>
            </Card>
            <div className="space-y-4">
              <Card className="bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="text-primary size-5" />
                    Synthese
                  </CardTitle>
                  <CardDescription>Etat general des acces.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Actifs</span>
                    <span className="font-medium">{stats.users.active}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Inactifs</span>
                    <span className="font-medium">{stats.users.inactive}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Mot de passe a changer
                    </span>
                    <span className="font-medium">
                      {stats.security.pendingPassword}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/70">
                <CardHeader>
                  <CardTitle>Acces rapide</CardTitle>
                  <CardDescription>
                    Gerer ton compte, ton mot de passe et tes sessions.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/mon-compte">Ouvrir mon compte</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </PageShell>
      ) : null}
    </AuthenticatedLayout>
  );
}
