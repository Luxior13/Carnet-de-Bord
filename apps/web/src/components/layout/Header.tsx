'use client';

import {
  Bell,
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  type LucideIcon,
  Search,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { type FC, useMemo } from 'react';

import { getHeaderNavItems, type NavItem } from '$constants/app.constants';
import { useUser } from '$context/UserContext';
import { type BreadcrumbEntry, BreadcrumbTrail } from '$ui/breadcrumb';
import { Button } from '$ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '$ui/popover';
import { SidebarTrigger } from '$ui/sidebar';
import { cn } from '$utils/css.utils';

type HeaderProps = {
  breadcrumbs?: BreadcrumbEntry[];
  title?: string;
};

type HeaderNotification = {
  accentClassName: string;
  description: string;
  href: string;
  icon: LucideIcon;
  meta: string;
  title: string;
  unread?: boolean;
};

const HEADER_NOTIFICATIONS: HeaderNotification[] = [
  {
    accentClassName: 'border-cyan-400/35 bg-cyan-400/10 text-cyan-200',
    description: 'Document officiel a lire ou accepter.',
    href: '/tableau-de-bord/documents-a-accepter',
    icon: FileCheck2,
    meta: 'Vie interne',
    title: 'Charte a accepter',
    unread: true,
  },
  {
    accentClassName: 'border-amber-300/35 bg-amber-300/10 text-amber-200',
    description: 'Compte rendu ou ordre du jour a preparer.',
    href: '/tableau-de-bord/prochaines-reunions',
    icon: CalendarClock,
    meta: 'Reunion',
    title: 'Point bureau a venir',
    unread: true,
  },
  {
    accentClassName: 'border-violet-300/35 bg-violet-300/10 text-violet-200',
    description: 'Action sensible a verifier dans le systeme.',
    href: '/systeme/validations',
    icon: CheckCircle2,
    meta: 'Systeme',
    title: 'Validation en attente',
    unread: true,
  },
  {
    accentClassName: 'border-rose-300/35 bg-rose-300/10 text-rose-200',
    description: 'Element important a surveiller dans le tableau de bord.',
    href: '/tableau-de-bord/alertes-importantes',
    icon: ShieldAlert,
    meta: 'Alerte',
    title: 'Suivi prioritaire',
  },
];

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
  const unreadNotificationsCount = HEADER_NOTIFICATIONS.filter(
    (notification) => notification.unread,
  ).length;

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
      {headerNavItems.length > 0 && (
        <nav className="hidden min-w-0 flex-1 items-center justify-center md:flex">
          <div className="border-sidebar-border/70 flex max-w-full items-center gap-1 rounded-lg border bg-[#1f293b] p-1">
            {headerNavItems.map((item) => {
              const isActive = isNavItemActive(pathname, item);

              return (
                <Link
                  className={cn(
                    'shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <Link
          href="/recherche"
          className="border-sidebar-border/70 bg-popover/70 text-muted-foreground hover:border-sidebar-ring/35 hover:text-foreground flex h-9 min-w-9 shrink-0 items-center justify-center gap-2 rounded-md border px-2.5 text-sm transition-colors lg:min-w-64 lg:justify-start"
        >
          <Search className="size-4" />
          <span className="hidden lg:inline">Recherche globale</span>
        </Link>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              aria-label={`Ouvrir les notifications (${unreadNotificationsCount} non lues)`}
              className="border-sidebar-border/70 bg-popover/70 text-muted-foreground hover:border-sidebar-ring/35 hover:bg-popover hover:text-foreground relative shadow-none"
              size="icon"
              variant="outline"
            >
              <Bell className="size-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-cyan-400 text-[10px] font-bold text-slate-950 ring-2 ring-[#182131]">
                  {unreadNotificationsCount}
                  <span className="sr-only">notifications non lues</span>
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="border-sidebar-border/80 w-[min(calc(100vw-2rem),22rem)] overflow-hidden bg-[#162033]/98 p-0 shadow-2xl shadow-black/25"
            sideOffset={8}
          >
            <div className="border-sidebar-border/65 border-b px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-foreground text-sm font-semibold">
                    Notifications
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Raccourcis vers les points a traiter.
                  </p>
                </div>
                <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-0.5 text-xs font-semibold text-cyan-100">
                  {unreadNotificationsCount} nouvelles
                </span>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {HEADER_NOTIFICATIONS.map((notification) => {
                const NotificationIcon = notification.icon;

                return (
                  <Link
                    className="hover:bg-sidebar-accent/55 focus-visible:ring-sidebar-ring/50 flex gap-3 rounded-md px-2 py-2.5 transition-colors outline-none focus-visible:ring-2"
                    href={notification.href}
                    key={notification.href}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border',
                        notification.accentClassName,
                      )}
                    >
                      <NotificationIcon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="text-foreground truncate text-sm font-semibold">
                          {notification.title}
                        </span>
                        {notification.unread && (
                          <span className="size-1.5 shrink-0 rounded-full bg-cyan-300" />
                        )}
                      </span>
                      <span className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-5">
                        {notification.description}
                      </span>
                      <span className="text-muted-foreground/75 mt-1 block text-[11px] font-medium uppercase">
                        {notification.meta}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
            <div className="border-sidebar-border/65 grid grid-cols-2 border-t">
              <Link
                className="hover:bg-sidebar-accent/55 text-muted-foreground hover:text-foreground border-sidebar-border/65 flex h-10 items-center justify-center border-r text-xs font-semibold transition-colors"
                href="/tableau-de-bord/mes-rappels"
              >
                Mes rappels
              </Link>
              <Link
                className="hover:bg-sidebar-accent/55 text-muted-foreground hover:text-foreground flex h-10 items-center justify-center text-xs font-semibold transition-colors"
                href="/vie-interne/notifications-rappels"
              >
                Tout gerer
              </Link>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
};
