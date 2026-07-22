import React from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { FEATURES } from '$constants/feature-registry.constants';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';

export default function PersonLoading(): React.ReactNode {
  return (
    <AuthenticatedLayout
      breadcrumbs={[
        { label: FEATURES.persons.audit.poleLabel },
        { href: FEATURES.persons.href, label: FEATURES.persons.label },
        { label: 'Fiche' },
      ]}
    >
      <PageShell className="py-0">
        <PageCanvas>
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-[34rem] rounded-xl" />
        </PageCanvas>
      </PageShell>
    </AuthenticatedLayout>
  );
}
