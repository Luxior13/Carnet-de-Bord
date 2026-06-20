import { User } from 'lucide-react';
import React, { type FC } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { AccountTab } from '$components/settings/AccountTab';
import { PageShell } from '$ui/page-shell';
import { ServiceIcon } from '$ui/service-icon';

const MyAccountPage: FC = () => {
  return (
    <AuthenticatedLayout
      breadcrumbs={[{ href: '/mon-compte', label: 'Mon compte' }]}
    >
      <PageShell className="max-w-6xl space-y-6">
        <div className="bg-card/70 flex flex-col gap-4 rounded-lg border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <ServiceIcon className="bg-primary/10">
              <User className="size-5" />
            </ServiceIcon>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Mon compte
              </h1>
              <p className="text-muted-foreground text-sm">
                Profil, securite et sessions actives.
              </p>
            </div>
          </div>
        </div>
        <AccountTab />
      </PageShell>
    </AuthenticatedLayout>
  );
};

export default MyAccountPage;
