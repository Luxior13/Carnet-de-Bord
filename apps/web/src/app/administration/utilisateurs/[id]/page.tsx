import React from 'react';

import { UserDetailPage } from '$components/users/UserDetailPage';

type AdministrationUserDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdministrationUserDetailPage({
  params,
}: AdministrationUserDetailPageProps): Promise<React.ReactNode> {
  const { id } = await params;

  return <UserDetailPage userId={id} />;
}
