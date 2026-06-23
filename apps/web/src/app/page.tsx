'use client';

import {
  ArrowRight,
  Clock,
  Home,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
import { Button } from '$ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '$ui/card';
import { PageCanvas, PageHeader, PageShell } from '$ui/page-shell';
import { ServiceIcon } from '$ui/service-icon';

const formatLastLogin = (date: Date | string | null): string => {
  if (!date) return 'Jamais';

  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  });
};

export default function HomePage(): React.ReactNode {
  const { userData } = useUser();
  const firstName = userData?.firstName?.trim();
  const canViewUsers = userData
    ? userData.isProtected ||
      hasPermission(userData.role, PERMISSIONS.USERS.VIEW, userData.permissions)
    : false;

  return (
    <AuthenticatedLayout>
      <PageShell className="py-0">
        <PageCanvas>
          <PageHeader
            title={firstName ? `Bonjour ${firstName}` : 'Tableau de bord'}
            description="Accès rapides, sécurité et administration."
            icon={
              <ServiceIcon className="bg-primary/10 text-primary">
                <Home className="size-5" />
              </ServiceIcon>
            }
          />
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <Card className="overflow-hidden py-0">
              <CardHeader>
                <CardTitle>Actions rapides</CardTitle>
                <CardDescription>
                  Les raccourcis utiles selon vos accès.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <Button
                  asChild
                  variant="outline"
                  className="bg-popover h-auto justify-between rounded-md border p-4 text-left"
                >
                  <Link href="/mon-compte">
                    <span className="flex items-center gap-3">
                      <ServiceIcon className="bg-primary/10 text-primary">
                        <UserRound className="size-4" />
                      </ServiceIcon>
                      <span>
                        <span className="block font-medium">Mon compte</span>
                        <span className="text-muted-foreground block text-xs">
                          Profil, mot de passe et sessions
                        </span>
                      </span>
                    </span>
                    <ArrowRight className="text-muted-foreground size-4" />
                  </Link>
                </Button>
                {canViewUsers && (
                  <Button
                    asChild
                    variant="outline"
                    className="bg-popover h-auto justify-between rounded-md border p-4 text-left"
                  >
                    <Link href="/administration/utilisateurs">
                      <span className="flex items-center gap-3">
                        <ServiceIcon className="bg-primary/10 text-primary">
                          <Users className="size-4" />
                        </ServiceIcon>
                        <span>
                          <span className="block font-medium">
                            Utilisateurs
                          </span>
                          <span className="text-muted-foreground block text-xs">
                            Comptes, accès et sécurité
                          </span>
                        </span>
                      </span>
                      <ArrowRight className="text-muted-foreground size-4" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
            <Card className="overflow-hidden py-0">
              <CardHeader>
                <CardTitle>État du compte</CardTitle>
                <CardDescription>Votre accès actuel.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="border-border/60 bg-popover flex items-center gap-3 rounded-md border p-3">
                  <ServiceIcon className="bg-primary/10 text-primary">
                    <ShieldCheck className="size-4" />
                  </ServiceIcon>
                  <div>
                    <p className="text-sm font-medium">
                      {userData?.mustChangePassword
                        ? 'Mot de passe temporaire'
                        : 'Compte sécurisé'}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {userData?.mustChangePassword
                        ? 'Changement requis à la prochaine action.'
                        : 'Aucune action immédiate requise.'}
                    </p>
                  </div>
                </div>
                <div className="border-border/60 bg-popover flex items-center gap-3 rounded-md border p-3">
                  <ServiceIcon className="bg-secondary text-secondary-foreground">
                    <Clock className="size-4" />
                  </ServiceIcon>
                  <div>
                    <p className="text-sm font-medium">Dernière connexion</p>
                    <p className="text-muted-foreground text-xs">
                      {formatLastLogin(userData?.lastLoginAt ?? null)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </PageCanvas>
      </PageShell>
    </AuthenticatedLayout>
  );
}
