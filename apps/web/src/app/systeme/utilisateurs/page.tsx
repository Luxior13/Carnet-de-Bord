'use client';

import React, { type FC, Suspense } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { AccessDeniedState } from '$components/layout/PageState';
import { FEATURES } from '$constants/feature-registry.constants';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
import styles from '$features/users/UsersListLayout.module.css';
import { UsersListPage } from '$features/users/UsersListPage';
import { PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';
import { cn } from '$utils/css.utils';

const UsersListFallback: FC = () => (
  <Skeleton
    className={cn(styles.main, 'h-96 rounded-lg')}
    role="status"
    aria-label="Chargement"
  />
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
      className={cn(styles.page, 'py-4 sm:py-6')}
      width="full"
    >
      <header data-slot="page-heading" className={styles.main}>
        <h1 className="text-2xl leading-8 font-semibold tracking-tight">
          {FEATURES.users.label}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm leading-5">
          Gérez les comptes et leurs accès.
        </p>
      </header>
      <Suspense fallback={<UsersListFallback />}>
        <UsersListPage />
      </Suspense>
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
