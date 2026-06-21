import { User } from 'lucide-react';
import React, { type FC } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { AccountTab } from '$components/settings/AccountTab';
import { PageCanvas, PageHeader, PageShell } from '$ui/page-shell';
import { ServiceIcon } from '$ui/service-icon';

const MyAccountPage: FC = () => {
  return (
    <AuthenticatedLayout
      breadcrumbs={[{ href: '/mon-compte', label: 'Mon compte' }]}
    >
      <PageShell className="py-0">
        <PageCanvas>
          <PageHeader
            title="Mon compte"
            description="Profil, securite et sessions actives."
            icon={
              <ServiceIcon className="bg-primary/10">
                <User className="size-5" />
              </ServiceIcon>
            }
          />
          <AccountTab />
        </PageCanvas>
      </PageShell>
    </AuthenticatedLayout>
  );
};

export default MyAccountPage;
