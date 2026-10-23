import React from 'react';

import { UserDetailPageSkeleton } from '$components/users/user-detail/UserDetailFrame';

export default function Loading(): React.ReactNode {
  return <UserDetailPageSkeleton />;
}
