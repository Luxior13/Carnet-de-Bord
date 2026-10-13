'use client';

import { useSearchParams } from 'next/navigation';
import React, { type FC, Suspense } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { PageDetailSkeleton } from '$components/layout/PageDetailSkeleton';
import { FEATURES } from '$constants/feature-registry.constants';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { PAGE_PATHS } from '$constants/routes.constants';
import { useUser } from '$context/UserContext';
import { NewUserForm } from '$features/users/NewUserForm';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { getSafeCollectionReturnHref } from '$utils/navigation.utils';

const NewUserPageContent: FC = () => {
  const searchParams = useSearchParams();
  const { userData } = useUser();
  const creationScope = `${userData?.id}:${userData?.isProtected}:${userData?.role}:${userData ? hasPermission(userData.role, PERMISSIONS.USERS.CREATE, userData.permissions) : false}`;
  const returnHref = getSafeCollectionReturnHref(
    searchParams.get('returnTo'),
    PAGE_PATHS.users,
  );

  return (
    <AuthenticatedLayout
      breadcrumbs={[
        { label: FEATURES.users.audit.poleLabel },
        { href: returnHref, label: FEATURES.users.label },
        { label: 'Nouvel utilisateur' },
      ]}
    >
      <NewUserForm
        key={creationScope}
        userData={userData}
        returnHref={returnHref}
      />
    </AuthenticatedLayout>
  );
};

const NewUserPage: FC = () => (
  <Suspense
    fallback={
      <PageShell className="py-0" width="form">
        <PageCanvas>
          <PageDetailSkeleton />
        </PageCanvas>
      </PageShell>
    }
  >
    <NewUserPageContent />
  </Suspense>
);

export default NewUserPage;
