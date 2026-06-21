'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { type FC, useMemo } from 'react';

import { getHeaderNavItems, type NavItem } from '$constants/app.constants';
import { useUser } from '$context/UserContext';
import { Breadcrumb, type BreadcrumbItem } from '$ui/breadcrumb';
import { SidebarTrigger } from '$ui/sidebar';
import { cn } from '$utils/css.utils';

type HeaderProps = {
  breadcrumbs?: BreadcrumbItem[];
  title?: string;
};

function isNavItemActive(pathname: string, item: NavItem): boolean {
  return (
    pathname === item.href ||
    (item.href !== '/' && pathname.startsWith(`${item.href}/`))
  );
}

export const Header: FC<HeaderProps> = ({ breadcrumbs = [], title }) => {
  const pathname = usePathname();
  const { userData } = useUser();
  const headerNavItems = useMemo(() => getHeaderNavItems(userData), [userData]);

  return (
    <header className="bg-background/95 relative z-30 flex h-14 shrink-0 items-center gap-3 border-b px-4 backdrop-blur md:px-5">
      <SidebarTrigger className="-ml-1 shrink-0" />
      <div className="flex min-w-0 items-center gap-4">
        {breadcrumbs.length > 0 && (
          <Breadcrumb items={breadcrumbs} showHome={true} />
        )}
        {title && !breadcrumbs.length && (
          <h1 className="text-foreground truncate text-lg font-semibold">
            {title}
          </h1>
        )}
      </div>
      {headerNavItems.length > 0 && (
        <nav className="hidden min-w-0 flex-1 items-center justify-center md:flex">
          <div className="bg-card flex max-w-full items-center gap-1 rounded-lg border p-1">
            {headerNavItems.map((item) => {
              const isActive = isNavItemActive(pathname, item);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
};
