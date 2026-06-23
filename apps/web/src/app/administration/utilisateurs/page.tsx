'use client';

import { Plus, Users } from 'lucide-react';
import Link from 'next/link';
import React, { type FC } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { AccessDeniedState } from '$components/layout/PageState';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
import { UsersListPage } from '$features/users/UsersListPage';
import { Button } from '$ui/button';
import { PageCanvas, PageHeader, PageShell } from '$ui/page-shell';
import { ServiceIcon } from '$ui/service-icon';

const UsersAdministrationContent: FC = () => {
  const { userData } = useUser();
  const canViewUsers = userData
    ? userData.isProtected ||
      hasPermission(userData.role, PERMISSIONS.USERS.VIEW, userData.permissions)
    : false;
  const canCreateUsers = userData
    ? userData.isProtected ||
      hasPermission(
        userData.role,
        PERMISSIONS.USERS.CREATE,
        userData.permissions,
      )
    : false;

  if (!canViewUsers) {
    return (
      <AccessDeniedState
        actionHref="/"
        actionLabel="Retour au tableau de bord"
        description="Vous n'avez pas la permission de consulter les utilisateurs."
      />
    );
  }

  return (
    <PageShell className="py-0">
      <PageCanvas>
        <PageHeader
          title="Utilisateurs"
          description="Comptes autorisés et accès du carnet."
          actions={
            canCreateUsers ? (
              <Button asChild size="sm">
                <Link href="/administration/utilisateurs/nouveau">
                  <Plus className="size-4" />
                  Nouveau
                </Link>
              </Button>
            ) : null
          }
          icon={
            <ServiceIcon className="bg-primary/10">
              <Users className="size-5" />
            </ServiceIcon>
          }
        />
        <UsersListPage />
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
