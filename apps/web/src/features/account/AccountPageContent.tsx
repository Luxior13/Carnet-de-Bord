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

const AccountPageContentSkeleton: FC = () => (
  <div className="space-y-5">
    <Skeleton className="h-28 rounded-xl" />
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.95fr)] lg:items-start">
      <div className="space-y-4">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
      <Skeleton className="h-[34rem] rounded-xl" />
    </div>
  </div>
);

export const AccountPageContent: FC = () => {
  const { refreshUser, userData } = useUser();

  if (!userData) {
    return <AccountPageContentSkeleton />;
  }

  const summaryItems = [
    {
      description: 'Date de création du compte',
      icon: CalendarDays,
      title: 'Compte depuis',
      value: formatAccountDate(userData.createdAt),
    },
    {
      description: 'Dernière activité connue',
      icon: Clock3,
      title: 'Dernière connexion',
      value: userData.lastLoginAt
        ? formatRelativeAccountTime(userData.lastLoginAt)
        : 'Jamais',
    },
    {
      description: 'Dernière modification',
      icon: ShieldCheck,
      title: 'Mot de passe',
      value: userData.passwordChangedAt
        ? formatRelativeAccountTime(userData.passwordChangedAt)
        : 'Jamais',
    },
  ];

  return (
    <div className="space-y-5">
      <section className="border-sidebar-border/70 bg-surface overflow-hidden rounded-lg border shadow-[var(--shadow-panel)]">
        <div className="divide-sidebar-border/45 grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
          {summaryItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="bg-surface-muted flex min-w-0 gap-3 p-4 sm:p-5"
              >
                <span className="border-sidebar-ring/35 bg-sidebar-ring/15 text-sidebar-ring flex size-9 shrink-0 items-center justify-center rounded-lg border">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sidebar-foreground text-sm font-bold tracking-tight">
                    {item.title}
                  </p>
                  <p className="text-sidebar-foreground mt-1 truncate text-lg font-semibold tracking-tight">
                    {item.value}
                  </p>
                  <p className="text-sidebar-foreground/55 mt-0.5 truncate text-xs">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
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
