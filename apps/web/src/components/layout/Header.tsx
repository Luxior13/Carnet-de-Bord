import React, { type FC } from 'react';

import { QuickNavigation } from '$components/layout/GlobalSearch';
import { type BreadcrumbEntry, BreadcrumbTrail } from '$ui/breadcrumb';
import { SidebarTrigger } from '$ui/sidebar';

type HeaderProps = {
  breadcrumbs?: BreadcrumbEntry[];
};

export const Header: FC<HeaderProps> = ({ breadcrumbs = [] }) => {
  return (
    <header className="border-border-content bg-surface-content-header relative z-30 flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:gap-3 sm:px-4 md:px-5">
      <SidebarTrigger className="hover:bg-surface-navigation-hover -ml-1 shrink-0 rounded-sm focus-visible:ring-inset lg:hidden" />
      <span
        aria-hidden="true"
        className="bg-border-divider hidden h-5 w-px shrink-0 sm:block lg:hidden"
      />
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
      </div>
    </header>
  );
};
