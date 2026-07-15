'use client';

import { Bell, BellRing, type LucideIcon, Settings, Timer } from 'lucide-react';
import Link from 'next/link';
import React, { type FC, useMemo } from 'react';

import { canOpenNavigationHref } from '$constants/app.constants';
import { useUser } from '$context/UserContext';
import { Button } from '$ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '$ui/popover';
import { cn } from '$utils/css.utils';

export type NotificationCenterItem = {
  accentClassName?: string;
  description: string;
  href: string;
  icon?: LucideIcon;
  id: string;
  meta?: string;
  read?: boolean;
  title: string;
};

type NotificationCenterProps = {
  notifications?: NotificationCenterItem[];
};

const QUICK_LINKS = [
  {
    href: '/tableau-de-bord/mes-rappels',
    icon: Timer,
    label: 'Mes rappels',
  },
  {
    href: '/vie-interne/notifications-rappels',
    icon: Settings,
    label: 'Tout gérer',
  },
] as const;

const defaultAccentClassName =
  'border-primary/35 bg-primary/10 text-primary-emphasis';

export const NotificationCenter: FC<NotificationCenterProps> = ({
  notifications = [],
}) => {
  const { userData } = useUser();
  const visibleNotifications = useMemo(
    () =>
      notifications.filter((notification) =>
        canOpenNavigationHref(userData, notification.href),
      ),
    [notifications, userData],
  );
  const visibleQuickLinks = useMemo(
    () =>
      QUICK_LINKS.filter((link) => canOpenNavigationHref(userData, link.href)),
    [userData],
  );
  const unreadNotificationsCount = visibleNotifications.filter(
    (notification) => !notification.read,
  ).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label={
            unreadNotificationsCount > 0
              ? `Ouvrir les notifications (${unreadNotificationsCount} non lues)`
              : 'Ouvrir les notifications'
          }
          className="border-border-control bg-surface-control text-muted-foreground hover:border-primary/35 hover:bg-surface-subtle hover:text-foreground relative shadow-none"
          size="icon"
          variant="outline"
        >
          <Bell className="size-4" />
          {unreadNotificationsCount > 0 && (
            <span className="ring-surface bg-primary text-primary-foreground absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full text-xs font-bold ring-2">
              {unreadNotificationsCount}
              <span className="sr-only">notifications non lues</span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="border-border/80 bg-surface-raised/98 w-[min(calc(100vw-2rem),22rem)] overflow-hidden p-0 shadow-[var(--shadow-panel-strong)]"
        sideOffset={8}
      >
        <div className="border-border/65 border-b px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-foreground text-sm font-semibold">
                Notifications
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {unreadNotificationsCount > 0
                  ? `${unreadNotificationsCount} point${unreadNotificationsCount > 1 ? 's' : ''} a traiter`
                  : 'Aucun point en attente'}
              </p>
            </div>
            {unreadNotificationsCount > 0 && (
              <span className="border-primary/30 bg-primary/10 text-primary-emphasis rounded-full border px-2 py-0.5 text-xs font-semibold">
                {unreadNotificationsCount}
              </span>
            )}
          </div>
        </div>
        {visibleNotifications.length > 0 ? (
          <div className="max-h-80 overflow-y-auto p-2">
            {visibleNotifications.map((notification) => {
              const NotificationIcon = notification.icon ?? BellRing;
              const isUnread = !notification.read;

              return (
                <Link
                  className="hover:bg-accent/55 focus-visible:ring-ring/50 flex gap-3 rounded-md px-2 py-2.5 transition-colors outline-none focus-visible:ring-2"
                  href={notification.href}
                  key={notification.id}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border',
                      notification.accentClassName ?? defaultAccentClassName,
                    )}
                  >
                    <NotificationIcon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="text-foreground truncate text-sm font-semibold">
                        {notification.title}
                      </span>
                      {isUnread && (
                        <span className="bg-primary size-1.5 shrink-0 rounded-full" />
                      )}
                    </span>
                    <span className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-5">
                      {notification.description}
                    </span>
                    {notification.meta && (
                      <span className="text-muted-foreground/75 mt-1 block text-xs font-medium uppercase">
                        {notification.meta}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center px-4 py-7 text-center">
            <span className="border-border/70 bg-accent/20 text-muted-foreground flex size-10 items-center justify-center rounded-lg border">
              <Bell className="size-4" />
            </span>
            <p className="text-foreground mt-3 text-sm font-semibold">
              Aucune notification
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Les points importants apparaitront ici.
            </p>
          </div>
        )}
        {visibleQuickLinks.length > 0 && (
          <div
            className={cn(
              'border-border/65 grid border-t',
              visibleQuickLinks.length > 1 ? 'grid-cols-2' : 'grid-cols-1',
            )}
          >
            {visibleQuickLinks.map((link, index) => {
              const LinkIcon = link.icon;

              return (
                <Link
                  className={cn(
                    'hover:bg-accent/55 text-muted-foreground hover:text-foreground flex h-10 items-center justify-center gap-2 text-xs font-semibold transition-colors',
                    index < visibleQuickLinks.length - 1 &&
                      'border-border/65 border-r',
                  )}
                  href={link.href}
                  key={link.href}
                >
                  <LinkIcon className="size-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
