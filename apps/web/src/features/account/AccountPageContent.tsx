'use client';

import { CalendarDays, Clock3, ShieldCheck } from 'lucide-react';
import React, { type FC } from 'react';

import { useUser } from '$context/UserContext';
import {
  formatAccountDate,
  formatRelativeAccountTime,
} from '$features/account/account.utils';
import { ActivitySection } from '$features/account/components/ActivitySection';
import { ProfileSection } from '$features/account/components/ProfileSection';
import { SecuritySection } from '$features/account/components/SecuritySection';
import { Skeleton } from '$ui/skeleton';
import { StatCard } from '$ui/stat-card';

const AccountPageContentSkeleton: FC = () => (
  <div className="space-y-5">
    <div className="grid gap-4 md:grid-cols-3">
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
    </div>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.95fr)] lg:items-start">
      <div className="space-y-4">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
      <Skeleton className="h-[42rem] rounded-xl" />
    </div>
  </div>
);

export const AccountPageContent: FC = () => {
  const { refreshUser, userData } = useUser();

  if (!userData) {
    return <AccountPageContentSkeleton />;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={CalendarDays}
          title="Compte depuis"
          value={formatAccountDate(userData.createdAt)}
          description="Date de création du compte"
        />
        <StatCard
          icon={Clock3}
          title="Dernière connexion"
          value={
            userData.lastLoginAt
              ? formatRelativeAccountTime(userData.lastLoginAt)
              : 'Jamais'
          }
          description="Dernière activité connue"
        />
        <StatCard
          icon={ShieldCheck}
          title="Mot de passe"
          value={
            userData.passwordChangedAt
              ? formatRelativeAccountTime(userData.passwordChangedAt)
              : 'Jamais'
          }
          description="Dernière modification"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.95fr)] lg:items-start">
        <div className="space-y-4">
          <ProfileSection userData={userData} onUpdate={refreshUser} />
          <SecuritySection userData={userData} onUpdate={refreshUser} />
        </div>
        <ActivitySection userData={userData} />
      </div>
    </div>
  );
};
