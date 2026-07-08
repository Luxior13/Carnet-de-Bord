import React, { type FC } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { AccountPageContent } from '$features/account/AccountPageContent';
import { PageCanvas, PageShell } from '$ui/page-shell';

const MyAccountPage: FC = () => {
  return (
    <AuthenticatedLayout
      breadcrumbs={[{ href: '/mon-compte', label: 'Mon compte' }]}
    >
      <PageShell className="py-0">
        <PageCanvas>
          <AccountPageContent />
        </PageCanvas>
      </PageShell>
    </AuthenticatedLayout>
  );
};

export default MyAccountPage;
