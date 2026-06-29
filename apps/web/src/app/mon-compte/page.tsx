import { User } from 'lucide-react';
import React, { type FC } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { AccountPageContent } from '$features/account/AccountPageContent';
import { Badge } from '$ui/badge';
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
            description="Profil privé, sécurité et sessions actives."
            meta={
              <>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Compte privé
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Sécurité
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Sessions
                </Badge>
              </>
            }
            icon={
              <ServiceIcon className="border-sidebar-ring/20 bg-sidebar-accent/25 text-sidebar-ring">
                <User className="size-5" />
              </ServiceIcon>
            }
          />
          <AccountPageContent />
        </PageCanvas>
      </PageShell>
    </AuthenticatedLayout>
  );
};

export default MyAccountPage;
