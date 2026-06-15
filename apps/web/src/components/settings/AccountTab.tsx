'use client';

import React, { type FC } from 'react';

import { ActivitySection } from '$components/settings/account/ActivitySection';
import { ProfileSection } from '$components/settings/account/ProfileSection';
import { SecuritySection } from '$components/settings/account/SecuritySection';
import { useUser } from '$context/UserContext';
import { Skeleton } from '$ui/skeleton';

const AccountTabSkeleton: FC = () => (
  <div className="grid gap-6 lg:grid-cols-3">
    <div className="lg:col-span-2">
      <Skeleton className="h-64 w-full" />
    </div>
    <div className="space-y-6">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  </div>
);

export const AccountTab: FC = () => {
  const { refreshUser, userData } = useUser();

  if (!userData) {
    return <AccountTabSkeleton />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Mobile: Activity first, Desktop: Right column */}
      <div className="order-first lg:order-last lg:col-span-1">
        <div className="lg:sticky lg:top-20">
          <ActivitySection userData={userData} />
        </div>
      </div>
      {/* Main content */}
      <div className="order-last space-y-6 lg:order-first lg:col-span-2">
        <ProfileSection userData={userData} onUpdate={refreshUser} />
        <SecuritySection userData={userData} onUpdate={refreshUser} />
      </div>
    </div>
  );
};
