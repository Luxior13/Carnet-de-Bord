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
      <section className="border-sidebar-border/60 overflow-hidden rounded-xl border bg-[linear-gradient(180deg,rgba(15,22,34,0.86),rgba(10,15,23,0.92))] shadow-[0_20px_48px_-38px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm">
        <div className="h-1 w-full bg-[linear-gradient(90deg,rgba(95,132,200,0.92),rgba(108,146,214,0.3),transparent)]" />
        <div className="divide-sidebar-border/45 grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
          {summaryItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="bg-sidebar-accent/[0.06] flex min-w-0 gap-3 p-4 sm:p-5"
              >
                <span className="border-sidebar-ring/30 bg-sidebar-accent/35 text-sidebar-ring flex size-9 shrink-0 items-center justify-center rounded-md border">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sidebar-ring/90 text-[11px] font-semibold tracking-[0.12em] uppercase">
                    {item.title}
                  </p>
                  <p className="text-sidebar-foreground mt-1 truncate text-xl font-semibold tracking-tight">
                    {item.value}
                  </p>
                  <p className="text-sidebar-foreground/58 mt-0.5 text-xs">
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
