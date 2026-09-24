import React from 'react';

import { UserDetailPageSkeleton } from '$components/users/UserDetailPage';

export default function Loading(): React.ReactNode {
  return <UserDetailPageSkeleton />;
}
