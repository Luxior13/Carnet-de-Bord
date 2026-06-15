'use client';

import { User, Users } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { type FC, Suspense, useCallback } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { AccountTab } from '$components/settings/AccountTab';
import { UsersTab } from '$components/settings/UsersTab';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
import { PageShell } from '$ui/page-shell';
import { ServiceIcon } from '$ui/service-icon';
import { Skeleton } from '$ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '$ui/tabs';

type TabId = 'compte' | 'utilisateurs';

type TabConfig = {
  icon: typeof User;
  id: TabId;
  label: string;
  requireAdmin?: boolean;
};

const TABS: TabConfig[] = [
  { icon: User, id: 'compte', label: 'Mon Compte' },
  {
    icon: Users,
    id: 'utilisateurs',
    label: 'Utilisateurs',
    requireAdmin: true,
  },
];

const SettingsContent: FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { userData } = useUser();

  const activeTab = (searchParams.get('tab') as TabId) || 'compte';
  const hasFullAccess = userData?.isProtected || false;
  const hasUsersPermission = userData
    ? hasFullAccess ||
      hasPermission(userData.role, PERMISSIONS.USERS.VIEW, userData.permissions)
    : false;
  const visibleTabs = TABS.filter((tab) => {
    if (!tab.requireAdmin) return true;
    if (tab.id === 'utilisateurs') return hasUsersPermission;

    return false;
  });
  const selectedTab = visibleTabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : 'compte';
  const selectedConfig: TabConfig = TABS.find(
    (tab) => tab.id === selectedTab,
  ) ?? {
    icon: User,
    id: 'compte',
    label: 'Mon Compte',
  };
  const PageIcon = selectedConfig.icon;
  const pageDescription =
    selectedTab === 'utilisateurs'
      ? 'Comptes autorises et acces du carnet.'
      : 'Profil, securite et sessions actives.';

  const handleTabChange = useCallback(
    (tabId: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tabId);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return (
    <PageShell className="max-w-6xl space-y-6">
      <div className="bg-card/70 flex flex-col gap-4 rounded-lg border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <ServiceIcon className="bg-primary/10">
            <PageIcon className="size-5" />
          </ServiceIcon>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {selectedConfig.label}
            </h1>
            <p className="text-muted-foreground text-sm">{pageDescription}</p>
          </div>
        </div>
      </div>
      {visibleTabs.length > 1 ? (
        <Tabs
          value={selectedTab}
          onValueChange={(value) => handleTabChange(value as TabId)}
          className="gap-0"
        >
          <TabsList className="bg-card/80 w-full justify-start sm:w-fit">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;

              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="min-w-0 flex-1 gap-2 px-3 sm:min-w-36"
                >
                  <Icon className="size-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
          <TabsContent value="compte" className="animate-fade-in-up mt-5">
            <AccountTab />
          </TabsContent>
          {hasUsersPermission && (
            <TabsContent
              value="utilisateurs"
              className="animate-fade-in-up mt-5"
            >
              <UsersTab />
            </TabsContent>
          )}
        </Tabs>
      ) : (
        <div className="animate-fade-in-up">
          <AccountTab />
        </div>
      )}
    </PageShell>
  );
};

const SettingsPage: FC = () => {
  return (
    <AuthenticatedLayout breadcrumbs={[{ href: '/settings', label: 'Compte' }]}>
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 lg:px-8">
            <Skeleton className="mb-6 h-10 w-48" />
            <Skeleton className="mb-6 h-10 w-64" />
            <Skeleton className="h-96 w-full" />
          </div>
        }
      >
        <SettingsContent />
      </Suspense>
    </AuthenticatedLayout>
  );
};

export default SettingsPage;
