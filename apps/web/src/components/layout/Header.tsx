import { Search } from 'lucide-react';
import Link from 'next/link';
import React, { type FC } from 'react';

import { NotificationCenter } from '$components/layout/NotificationCenter';
import { type BreadcrumbEntry, BreadcrumbTrail } from '$ui/breadcrumb';
import { SidebarTrigger } from '$ui/sidebar';

type HeaderProps = {
  breadcrumbs?: BreadcrumbEntry[];
  title?: string;
};

export const Header: FC<HeaderProps> = ({ breadcrumbs = [], title }) => {
  return (
    <header className="border-sidebar-border/70 relative z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-[#182131]/95 px-4 backdrop-blur md:px-5">
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
        <Link
          href="/recherche"
          className="border-sidebar-border/70 bg-popover/70 text-muted-foreground hover:border-sidebar-ring/35 hover:text-foreground flex h-9 min-w-9 shrink-0 items-center justify-center gap-2 rounded-md border px-2.5 text-sm transition-colors lg:min-w-64 lg:justify-start"
        >
          <Search className="size-4" />
          <span className="hidden lg:inline">Recherche globale</span>
        </Link>
        <NotificationCenter />
      </div>
    </header>
  );
};
