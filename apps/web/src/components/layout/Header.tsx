import React, { type FC } from 'react';

import { QuickNavigation } from '$components/layout/GlobalSearch';
import { NotificationCenter } from '$components/layout/NotificationCenter';
import { type BreadcrumbEntry, BreadcrumbTrail } from '$ui/breadcrumb';
import { SidebarTrigger } from '$ui/sidebar';

type HeaderProps = {
  breadcrumbs?: BreadcrumbEntry[];
};

export const Header: FC<HeaderProps> = ({ breadcrumbs = [] }) => {
  return (
    <header className="border-border-divider bg-surface-page relative z-30 flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:gap-3 sm:px-4 md:px-5">
      <SidebarTrigger className="-ml-1 shrink-0 rounded-sm" />
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {breadcrumbs.length > 0 && (
          <BreadcrumbTrail
            className="max-w-full"
            compactOnMobile
            items={breadcrumbs}
            showHome
          />
        )}
      </div>
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <QuickNavigation />
        <NotificationCenter />
      </div>
    </header>
  );
};
