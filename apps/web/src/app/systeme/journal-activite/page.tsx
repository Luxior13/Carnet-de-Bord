'use client';

import React, { type FC, Suspense } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { AccessDeniedState } from '$components/layout/PageState';
import { FEATURES } from '$constants/feature-registry.constants';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
import { ActivityJournalPage } from '$features/audit/ActivityJournalPage';
import directoryStyles from '$ui/directory.module.css';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { cn } from '$utils/css.utils';

/** Rebuilt on 30 October 2026 (docs/pages/systeme/journal-activite.md). */
const ActivityJournalContent: FC = () => {
  const { userData } = useUser();
  const canView = userData
    ? userData.isProtected ||
      hasPermission(userData.role, PERMISSIONS.AUDIT.VIEW, userData.permissions)
    : false;

  if (!userData || !canView) {
    return (
      <AccessDeniedState
        actionHref="/"
        actionLabel="Retour à l'accueil"
        description="Vous n'avez pas la permission de consulter le journal d'activité."
      />
    );
  }

  return (
    <PageShell className="py-0">
      <PageCanvas contentClassName="py-6">
        <div className={cn(directoryStyles.directory, 'space-y-[18px]')}>
          <Suspense fallback={null}>
            <ActivityJournalPage />
          </Suspense>
        </div>
      </PageCanvas>
    </PageShell>
  );
};

const ActivityJournalRoute: FC = () => (
  <AuthenticatedLayout
    breadcrumbs={[
      { label: FEATURES.systemActivity.audit.poleLabel },
      {
        href: FEATURES.systemActivity.href,
        label: FEATURES.systemActivity.label,
      },
    ]}
  >
    <ActivityJournalContent />
  </AuthenticatedLayout>
);

export default ActivityJournalRoute;
