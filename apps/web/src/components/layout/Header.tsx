import React, { type FC } from 'react';

import { QuickNavigation } from '$components/layout/GlobalSearch';
import { type BreadcrumbEntry, BreadcrumbTrail } from '$ui/breadcrumb';
import { SidebarTrigger } from '$ui/sidebar';

type HeaderProps = {
  breadcrumbs?: BreadcrumbEntry[];
  title?: string;
};

export const Header: FC<HeaderProps> = ({ breadcrumbs = [], title }) => {
  return (
    <header className="border-border/80 bg-background/92 relative z-30 h-14 shrink-0 border-b backdrop-blur">
      <div className="mx-auto flex h-full w-full max-w-[var(--private-content-width)] items-center gap-3 px-[var(--private-content-padding)]">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {breadcrumbs.length > 0 && (
            <BreadcrumbTrail
              className="max-w-full"
              items={breadcrumbs}
              showHome
            />
          )}
          {title && !breadcrumbs.length && (
            <h1 className="text-foreground truncate text-lg font-semibold">
              {title}
            </h1>
          )}
        </div>
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <QuickNavigation />
        </div>
      </div>
    </header>
  );
};
