import React from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { PageDetailSkeleton } from '$components/layout/PageDetailSkeleton';
import { FEATURES } from '$constants/feature-registry.constants';
import { PageCanvas, PageShell } from '$ui/page-shell';

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
          <PageDetailSkeleton showBack />
        </PageCanvas>
      </PageShell>
    </AuthenticatedLayout>
  );
}
