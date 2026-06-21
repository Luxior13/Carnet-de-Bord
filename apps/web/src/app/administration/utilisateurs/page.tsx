'use client';

import { ShieldAlert, Users } from 'lucide-react';
import Link from 'next/link';
import React, { type FC } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { UsersTab } from '$components/settings/UsersTab';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
import { Button } from '$ui/button';
import { Card, CardContent } from '$ui/card';
import { PageCanvas, PageHeader, PageShell } from '$ui/page-shell';
import { ServiceIcon } from '$ui/service-icon';

const UsersAdministrationContent: FC = () => {
  const { userData } = useUser();
  const canViewUsers = userData
    ? userData.isProtected ||
      hasPermission(userData.role, PERMISSIONS.USERS.VIEW, userData.permissions)
    : false;

  if (!canViewUsers) {
    return (
      <PageShell className="py-0">
        <PageCanvas>
          <Card className="max-w-3xl py-0">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <ServiceIcon className="bg-destructive/10 text-destructive">
                  <ShieldAlert className="size-5" />
                </ServiceIcon>
                <div className="space-y-3">
                  <div>
                    <h1 className="text-xl font-semibold">Acces refuse</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Vous n&apos;avez pas la permission de consulter les
                      utilisateurs.
                    </p>
                  </div>
                  <Button asChild variant="outline">
                    <Link href="/">Retour au tableau de bord</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </PageCanvas>
      </PageShell>
    );
  }

  return (
    <PageShell className="py-0">
      <PageCanvas>
        <PageHeader
          title="Utilisateurs"
          description="Comptes autorises et acces du carnet."
          icon={
            <ServiceIcon className="bg-primary/10">
              <Users className="size-5" />
            </ServiceIcon>
          }
        />
        <UsersTab />
      </PageCanvas>
    </PageShell>
  );
};

const UsersAdministrationPage: FC = () => {
  return (
    <AuthenticatedLayout
      breadcrumbs={[
        { label: 'Administration' },
        { href: '/administration/utilisateurs', label: 'Utilisateurs' },
      ]}
    >
      <UsersAdministrationContent />
    </AuthenticatedLayout>
  );
};

export default UsersAdministrationPage;
