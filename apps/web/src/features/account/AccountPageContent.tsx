'use client';

import React, { type FC } from 'react';

import { useUser } from '$context/UserContext';
import { ActivitySection } from '$features/account/components/ActivitySection';
import { ProfileSection } from '$features/account/components/ProfileSection';
import { SecuritySection } from '$features/account/components/SecuritySection';
import { Skeleton } from '$ui/skeleton';

const AccountPageContentSkeleton: FC = () => (
  <div className="grid gap-4 lg:grid-cols-3">
    <div className="lg:col-span-2">
      <Skeleton className="h-64 w-full" />
    </div>
    <div className="space-y-4">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  </div>
);

export const AccountPageContent: FC = () => {
  const { refreshUser, userData } = useUser();

  if (!userData) {
    return <AccountPageContentSkeleton />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="order-last lg:col-span-1">
        <div className="lg:sticky lg:top-20">
          <ActivitySection userData={userData} />
        </div>
      </div>
      <div className="order-first space-y-4 lg:col-span-2">
        <ProfileSection userData={userData} onUpdate={refreshUser} />
        <SecuritySection userData={userData} onUpdate={refreshUser} />
      </div>
    </div>
  );
};
