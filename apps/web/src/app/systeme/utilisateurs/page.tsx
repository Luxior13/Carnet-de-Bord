'use client';

import React, { type FC, Suspense } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { AccessDeniedState } from '$components/layout/PageState';
import { FEATURES } from '$constants/feature-registry.constants';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
import { UsersListPage } from '$features/users/UsersListPage';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';

const UsersListFallback: FC = () => (
  <Skeleton className="h-96 rounded-lg" role="status" aria-label="Chargement" />
);

const UsersAdministrationContent: FC = () => {
  const { userData } = useUser();
  const canViewUsers = userData
    ? userData.isProtected ||
      hasPermission(userData.role, PERMISSIONS.USERS.VIEW, userData.permissions)
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
    <PageShell
      alignment="available"
      data-surface-tone="indigo"
      className="py-0 [--page-shell-max-width:104rem]"
    >
      <PageCanvas contentClassName="space-y-5">
        <header
          data-slot="page-heading"
          className="min-w-0 @min-[94rem]/private-viewport:w-[calc(100%-16.25rem)]"
        >
          <h1 className="text-2xl leading-8 font-semibold tracking-tight">
            {FEATURES.users.label}
          </h1>
        </header>
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
