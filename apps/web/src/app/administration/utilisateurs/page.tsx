'use client';

import { Plus, Users } from 'lucide-react';
import Link from 'next/link';
import React, { type FC, Suspense } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { AccessDeniedState } from '$components/layout/PageState';
import { UsersAdminHero } from '$components/users/UsersAdminHero';
import { FEATURES } from '$constants/feature-registry.constants';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
import { UsersListPage } from '$features/users/UsersListPage';
import { Button } from '$ui/button';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';

const UsersListFallback: FC = () => (
  <div className="space-y-4" role="status" aria-label="Chargement">
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {[...Array(4)].map((_, index) => (
        <Skeleton key={index} className="h-20 rounded-md" />
      ))}
    </div>
    <Skeleton className="h-96 rounded-md" />
  </div>
);

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
        actionLabel="Retour à l'accueil"
        description="Vous n'avez pas la permission de consulter les utilisateurs."
      />
    );
  }

  return (
    <PageShell className="py-0">
      <PageCanvas contentClassName="space-y-5">
        <UsersAdminHero
          title={FEATURES.users.label}
          description="Comptes, rôles et autorisations administratives."
          actions={
            canCreateUsers ? (
              <Button asChild size="sm">
                <Link href="/administration/utilisateurs/nouveau">
                  <Plus className="size-4" />
                  Nouvel utilisateur
                </Link>
              </Button>
            ) : null
          }
          icon={<Users className="size-5" />}
        />
        <Suspense fallback={<UsersListFallback />}>
          <UsersListPage />
        </Suspense>
      </PageCanvas>
    </PageShell>
  );
};

const UsersAdministrationPage: FC = () => {
  return (
    <AuthenticatedLayout
      breadcrumbs={[
        {
          href: FEATURES.systemHome.href,
          label: FEATURES.users.audit.poleLabel,
        },
        { href: FEATURES.users.href, label: FEATURES.users.label },
      ]}
    >
      <UsersAdministrationContent />
    </AuthenticatedLayout>
  );
};

export default UsersAdministrationPage;
