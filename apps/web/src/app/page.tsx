import { Home } from 'lucide-react';
import React from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { PageIdentityHero } from '$components/layout/PageIdentityHero';
import { FEATURES } from '$constants/feature-registry.constants';
import { getPageAuthSession } from '$server/auth';
import { PageCanvas, PageShell } from '$ui/page-shell';

export default async function HomePage(): Promise<React.ReactNode> {
  const { user } = await getPageAuthSession();
  const firstName = user?.firstName?.trim();

  return (
    <AuthenticatedLayout
      breadcrumbs={[
        { label: FEATURES.dashboard.audit.poleLabel },
        { label: FEATURES.dashboard.label },
      ]}
    >
      <PageShell className="py-0">
        <PageCanvas>
          <PageIdentityHero
            description="Les éléments importants apparaîtront ici lorsqu’ils seront utiles."
            icon={<Home aria-hidden="true" />}
            title={firstName ? `Bonjour ${firstName}` : "Vue d'ensemble"}
          />
        </PageCanvas>
      </PageShell>
    </AuthenticatedLayout>
  );
}
