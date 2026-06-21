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
import { PageCanvas, PageShell } from '$ui/page-shell';
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
    case 'ACCOUNT_LOCKED':
      return 'Compte verrouillé';
    case 'LOGIN_FAILED':
      return 'Connexion échouée';
    case 'LOGIN_SUCCESS':
      return 'Connexion';
    case 'LOGOUT':
      return 'Déconnexion';
    case 'PASSWORD_CHANGE':
      return 'Mot de passe changé';
    case 'PASSWORD_RESET':
      return 'Mot de passe réinitialisé';
    case 'PERMISSION_UPDATE':
      return 'Permissions modifiées';
    case 'SESSION_INVALIDATE':
      return 'Session révoquée';
    case 'USER_ACTIVATE':
      return 'Utilisateur activé';
    case 'USER_CREATE':
      return 'Utilisateur créé';
    case 'USER_DEACTIVATE':
      return 'Utilisateur désactivé';
    case 'USER_DELETE':
      return 'Utilisateur supprimé';
    case 'USER_UPDATE':
      return 'Utilisateur modifié';
    default:
      return 'Événement système';
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
    <PageShell className="py-0">
      <PageCanvas>
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
      </PageCanvas>
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
    <Card>
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
    <div className="bg-popover flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center">
      <ServiceIcon className="mb-3 size-11">{icon}</ServiceIcon>
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">{text}</p>
    </div>
  );
}

export default function DashboardPage(): React.ReactNode {
  const { isLoading: isUserLoading, userData } = useUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [hasDashboardError, setHasDashboardError] = useState(false);
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
        setHasDashboardError(false);
        const response = await fetch('/api/dashboard');
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        } else {
          setStats(null);
          setHasDashboardError(true);
        }
      } catch {
        setStats(null);
        setHasDashboardError(true);
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
        <PageShell className="py-0">
          <PageCanvas>
            <Card>
              <CardContent className="flex items-start gap-4 px-5">
                <ServiceIcon className="bg-amber-500/10 text-amber-300">
                  <AlertTriangle className="size-5" />
                </ServiceIcon>
                <div>
                  <p className="font-medium">Accès limité</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Vous n&apos;avez pas la permission de voir le tableau de
                    bord.
                  </p>
                </div>
              </CardContent>
            </Card>
          </PageCanvas>
        </PageShell>
      ) : hasDashboardError ? (
        <PageShell className="py-0">
          <PageCanvas>
            <Card>
              <CardContent className="flex items-start gap-4 px-5">
                <ServiceIcon className="bg-destructive/10 text-destructive">
                  <AlertTriangle className="size-5" />
                </ServiceIcon>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">Tableau de bord indisponible</p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Les statistiques n&apos;ont pas pu être chargées.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.location.reload()}
                  >
                    Recharger
                  </Button>
                </div>
              </CardContent>
            </Card>
          </PageCanvas>
        </PageShell>
      ) : stats ? (
        <PageShell className="py-0">
          <PageCanvas>
            <Card className="overflow-hidden py-0">
              <div className="bg-primary h-1 w-full" />
              <CardContent className="grid gap-6 p-6 md:grid-cols-[1.5fr_1fr] md:items-center">
                <div>
                  <Badge variant="secondary" className="mb-4">
                    {SITE_CONFIG.name}
                  </Badge>
                  <h1 className="text-3xl font-semibold tracking-tight">
                    Bonjour {userData?.firstName}
                  </h1>
                  <p className="text-muted-foreground mt-2 max-w-2xl">
                    Vue générale de votre carnet, de vos accès et de
                    l&apos;activité récente.
                  </p>
                </div>
                <div className="bg-popover rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <ServiceIcon>
                      <ShieldCheck className="size-5" />
                    </ServiceIcon>
                    <div>
                      <p className="text-muted-foreground text-sm">
                        État global
                      </p>
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
                detail="Activité récente"
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
                tone={
                  stats.security.pendingPassword > 0 ? 'warning' : 'primary'
                }
                icon={<KeyRound className="size-5" />}
              />
              <MetricCard
                label="Comptes verrouillés"
                value={stats.security.lockedUsers}
                detail={
                  stats.security.lockedUsers > 0
                    ? 'Vérification conseillée'
                    : 'Aucun verrouillage'
                }
                tone={stats.security.lockedUsers > 0 ? 'danger' : 'primary'}
                icon={<ShieldCheck className="size-5" />}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="text-primary size-5" />
                    Activité récente
                  </CardTitle>
                  <CardDescription>
                    Connexions, modifications de comptes et changements
                    d&apos;accès.
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
                              {activity.userName || 'Système'}
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
                      label="Aucune activité"
                      text="Les événements importants apparaîtront ici."
                    />
                  )}
                </CardContent>
              </Card>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="text-primary size-5" />
                      Synthèse
                    </CardTitle>
                    <CardDescription>État général des accès.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Actifs</span>
                      <span className="font-medium">{stats.users.active}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Inactifs</span>
                      <span className="font-medium">
                        {stats.users.inactive}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Mot de passe à changer
                      </span>
                      <span className="font-medium">
                        {stats.security.pendingPassword}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Accès rapide</CardTitle>
                    <CardDescription>
                      Gérez votre compte, votre mot de passe et vos sessions.
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
          </PageCanvas>
        </PageShell>
      ) : null}
    </AuthenticatedLayout>
  );
}
