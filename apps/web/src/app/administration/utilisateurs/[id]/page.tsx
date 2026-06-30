import React, { Suspense } from 'react';

import { UserDetailPage } from '$components/users/UserDetailPage';

type AdministrationUserDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdministrationUserDetailPage({
  params,
}: AdministrationUserDetailPageProps): Promise<React.ReactNode> {
  const { id } = await params;

  return (
    <Suspense fallback={null}>
      <UserDetailPage userId={id} />
    </Suspense>
  );
}
