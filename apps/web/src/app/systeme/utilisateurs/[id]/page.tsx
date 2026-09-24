import React, { Suspense } from 'react';

import {
  UserDetailPage,
  UserDetailPageSkeleton,
} from '$components/users/UserDetailPage';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { getUserForActor } from '$features/users/server/user-detail.service';
import { getPageAuthSession } from '$server/auth';
import type { UserType } from '$types/auth.types';

type AdministrationUserDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdministrationUserDetailPage({
  params,
}: AdministrationUserDetailPageProps): Promise<React.ReactNode> {
  const [{ id }, { user }] = await Promise.all([params, getPageAuthSession()]);
  const canView = Boolean(
    user &&
    !user.mustChangePassword &&
    (user.isProtected ||
      hasPermission(user.role, PERMISSIONS.USERS.VIEW, user.permissions)),
  );
  let initialUser: UserType | undefined;

  if (user && canView) {
    try {
      initialUser = (await getUserForActor(id, user)) ?? undefined;
    } catch {
      // The client preserves the established not-found/retry state when the
      // server cannot produce a safe initial snapshot.
    }
  }

  return (
    <Suspense fallback={<UserDetailPageSkeleton />}>
      <UserDetailPage initialUser={initialUser} key={id} userId={id} />
    </Suspense>
  );
}
