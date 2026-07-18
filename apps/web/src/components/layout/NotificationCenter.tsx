'use client';

import {
  Bell,
  BellRing,
  Loader2,
  type LucideIcon,
  RefreshCcw,
  Settings,
  TriangleAlert,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { canOpenNavigationHref } from '$constants/app.constants';
import {
  NOTIFICATION_INBOX_HREF,
  NOTIFICATIONS_CHANGED_EVENT,
  notifyNotificationsChanged,
} from '$constants/notification.constants';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
import { useAsyncResource } from '$hooks/useAsyncResource';
import type { NotificationListData } from '$types/platform.types';
import { Button } from '$ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '$ui/popover';
import { apiFetchJson, jsonRequest } from '$utils/api.utils';
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
    href: NOTIFICATION_INBOX_HREF,
    icon: Bell,
    label: 'Toutes les notifications',
  },
  {
    href: '/vie-interne/notifications-rappels',
    icon: Settings,
    label: 'Tout gérer',
  },
] as const;

const defaultAccentClassName =
  'border-primary/35 bg-primary/10 text-primary-emphasis';
const NOTIFICATION_REFRESH_MIN_INTERVAL_MS = 30_000;
const NOTIFICATION_CHANGED_DEBOUNCE_MS = 200;

export const NotificationCenter: FC<NotificationCenterProps> = ({
  notifications,
}) => {
  const pathname = usePathname();
  const { userData } = useUser();
  const [
    hasActivatedNotificationResource,
    setHasActivatedNotificationResource,
  ] = useState(false);
  const lastNotificationRequestAtRef = useRef(0);
  const notificationChangedTimerRef = useRef<number | null>(null);
  const canViewNotifications =
    !!userData &&
    (userData.isProtected ||
      hasPermission(
        userData.role,
        PERMISSIONS.NOTIFICATIONS.VIEW,
        userData.permissions,
      ));
  const isNotificationInboxRoute = pathname === NOTIFICATION_INBOX_HREF;
  const shouldLoadNotificationResource =
    notifications === undefined &&
    canViewNotifications &&
    (!isNotificationInboxRoute || hasActivatedNotificationResource);
  const loadNotifications = useCallback((signal: AbortSignal) => {
    lastNotificationRequestAtRef.current = Date.now();

    return apiFetchJson<NotificationListData>('/api/notifications?limit=10', {
      signal,
    });
  }, []);
  const notificationResource = useAsyncResource(loadNotifications, {
    enabled: shouldLoadNotificationResource,
  });
  const refreshNotificationResource = notificationResource.refresh;
  const refreshNotificationResourceIfStale = useCallback((): void => {
    if (
      !shouldLoadNotificationResource ||
      Date.now() - lastNotificationRequestAtRef.current <
        NOTIFICATION_REFRESH_MIN_INTERVAL_MS
    ) {
      return;
    }

    void refreshNotificationResource();
  }, [refreshNotificationResource, shouldLoadNotificationResource]);
  const handlePopoverOpenChange = useCallback(
    (open: boolean): void => {
      if (!open || notifications !== undefined || !canViewNotifications) return;

      if (isNotificationInboxRoute && !hasActivatedNotificationResource) {
        // The inbox already loads the same collection. Defer the header read
        // until the bell is actually used on that route.
        setHasActivatedNotificationResource(true);

        return;
      }

      refreshNotificationResourceIfStale();
    },
    [
      canViewNotifications,
      hasActivatedNotificationResource,
      isNotificationInboxRoute,
      notifications,
      refreshNotificationResourceIfStale,
    ],
  );
  useEffect(() => {
    if (!shouldLoadNotificationResource) return;

    const refreshNotifications = (): void => {
      if (notificationChangedTimerRef.current !== null) {
        window.clearTimeout(notificationChangedTimerRef.current);
      }
      notificationChangedTimerRef.current = window.setTimeout(() => {
        notificationChangedTimerRef.current = null;
        void refreshNotificationResource();
      }, NOTIFICATION_CHANGED_DEBOUNCE_MS);
    };
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshNotifications);

    return (): void => {
      window.removeEventListener(
        NOTIFICATIONS_CHANGED_EVENT,
        refreshNotifications,
      );
      if (notificationChangedTimerRef.current !== null) {
        window.clearTimeout(notificationChangedTimerRef.current);
        notificationChangedTimerRef.current = null;
      }
    };
  }, [refreshNotificationResource, shouldLoadNotificationResource]);
  useEffect(() => {
    if (!shouldLoadNotificationResource) return;

    const refreshWhenVisible = (): void => {
      if (document.visibilityState !== 'visible') return;
      refreshNotificationResourceIfStale();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return (): void =>
      document.removeEventListener('visibilitychange', refreshWhenVisible);
  }, [refreshNotificationResourceIfStale, shouldLoadNotificationResource]);
  const resolvedNotifications = useMemo<NotificationCenterItem[]>(
    () =>
      notifications ??
      notificationResource.data?.items.map((notification) => ({
        description: notification.body,
        href: notification.href ?? NOTIFICATION_INBOX_HREF,
        id: notification.id,
        meta: `${new Date(notification.createdAt).toLocaleDateString('fr-FR')} · ${notification.source.label}`,
        read: notification.readAt !== null,
        title: notification.title,
      })) ??
      [],
    [notificationResource.data?.items, notifications],
  );
  const visibleNotifications = useMemo(
    () =>
      resolvedNotifications.map((notification) => ({
        ...notification,
        href: canOpenNavigationHref(userData, notification.href)
          ? notification.href
          : NOTIFICATION_INBOX_HREF,
      })),
    [resolvedNotifications, userData],
  );
  const visibleQuickLinks = useMemo(
    () =>
      QUICK_LINKS.filter((link) => canOpenNavigationHref(userData, link.href)),
    [userData],
  );
  const unreadNotificationsCount =
    notifications === undefined
      ? (notificationResource.data?.unreadCount ?? 0)
      : visibleNotifications.filter((notification) => !notification.read)
          .length;
  const hasLoadedNotifications =
    notifications !== undefined || notificationResource.data !== null;
  const isInitialLoading =
    notifications === undefined &&
    notificationResource.data === null &&
    notificationResource.error === null &&
    (shouldLoadNotificationResource || isNotificationInboxRoute);
  const hasInitialError =
    notifications === undefined &&
    notificationResource.data === null &&
    notificationResource.error !== null;
  const hasRefreshError =
    notifications === undefined &&
    notificationResource.data !== null &&
    notificationResource.error !== null;

  if (!canViewNotifications) return null;

  return (
    <Popover onOpenChange={handlePopoverOpenChange}>
      <PopoverTrigger asChild>
        <Button
          aria-label={
            unreadNotificationsCount > 0
              ? `Ouvrir les notifications (${unreadNotificationsCount} non lues)`
              : 'Ouvrir les notifications'
          }
          className="border-border-control bg-surface-control text-muted-foreground hover:border-primary/35 hover:bg-surface-control-hover hover:text-foreground relative rounded-lg shadow-none"
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
        className="border-border-default bg-surface-floating w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-xl p-0 shadow-[var(--shadow-panel-strong)]"
        sideOffset={8}
      >
        <div className="border-border-divider bg-surface-panel-raised/85 border-b px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-foreground text-sm font-semibold">
                Notifications
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {isInitialLoading
                  ? 'Chargement en cours'
                  : hasInitialError
                    ? 'Chargement indisponible'
                    : notificationResource.isRefreshing
                      ? 'Mise à jour en cours'
                      : unreadNotificationsCount > 0
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
        {hasRefreshError && (
          <div
            className="border-warning/30 bg-warning/10 text-warning flex items-center gap-2 border-b px-3 py-2"
            role="alert"
          >
            <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
            <p className="min-w-0 flex-1 text-xs font-medium">
              Actualisation impossible. Les dernières données restent affichées.
            </p>
            <Button
              onClick={() => void refreshNotificationResource()}
              size="sm"
              type="button"
              variant="ghost"
            >
              Réessayer
            </Button>
          </div>
        )}
        {isInitialLoading ? (
          <div
            aria-live="polite"
            className="flex flex-col items-center px-4 py-7 text-center"
            role="status"
          >
            <span className="border-border-subtle bg-surface-inset text-muted-foreground flex size-10 items-center justify-center rounded-lg border">
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            </span>
            <p className="text-foreground mt-3 text-sm font-semibold">
              Chargement des notifications
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Récupération de vos derniers messages.
            </p>
          </div>
        ) : hasInitialError ? (
          <div
            className="flex flex-col items-center px-4 py-7 text-center"
            role="alert"
          >
            <span className="border-destructive/30 bg-destructive/10 text-destructive flex size-10 items-center justify-center rounded-lg border">
              <TriangleAlert aria-hidden="true" className="size-4" />
            </span>
            <p className="text-foreground mt-3 text-sm font-semibold">
              Notifications indisponibles
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Le chargement a échoué. Vous pouvez réessayer maintenant.
            </p>
            <Button
              className="mt-3"
              onClick={() => void refreshNotificationResource()}
              size="sm"
              type="button"
              variant="outline"
            >
              <RefreshCcw aria-hidden="true" />
              Réessayer
            </Button>
          </div>
        ) : visibleNotifications.length > 0 ? (
          <div className="max-h-80 overflow-y-auto p-2">
            {visibleNotifications.map((notification) => {
              const NotificationIcon = notification.icon ?? BellRing;
              const isUnread = !notification.read;

              return (
                <Link
                  className="hover:bg-surface-tile-hover focus-visible:ring-ring/50 flex gap-3 rounded-lg px-2 py-2.5 transition-colors outline-none focus-visible:ring-2"
                  href={notification.href}
                  key={notification.id}
                  onClick={() => {
                    if (notification.read) return;
                    void apiFetchJson(
                      `/api/notifications/${notification.id}`,
                      jsonRequest('PATCH', { action: 'read' }),
                    )
                      .then(() => {
                        notifyNotificationsChanged();
                      })
                      .catch(() => undefined);
                  }}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border',
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
                      <span className="text-muted-foreground/75 mt-1 block text-xs font-medium [overflow-wrap:anywhere] uppercase">
                        {notification.meta}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : hasLoadedNotifications ? (
          <div className="flex flex-col items-center px-4 py-7 text-center">
            <span className="border-border-subtle bg-surface-inset text-muted-foreground flex size-10 items-center justify-center rounded-lg border">
              <Bell className="size-4" />
            </span>
            <p className="text-foreground mt-3 text-sm font-semibold">
              Aucune notification
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Les points importants apparaitront ici.
            </p>
          </div>
        ) : null}
        {visibleQuickLinks.length > 0 && (
          <div
            className={cn(
              'border-border-divider bg-surface-inset/70 grid border-t',
              visibleQuickLinks.length > 1 ? 'grid-cols-2' : 'grid-cols-1',
            )}
          >
            {visibleQuickLinks.map((link, index) => {
              const LinkIcon = link.icon;

              return (
                <Link
                  className={cn(
                    'text-muted-foreground hover:bg-surface-tile-hover hover:text-foreground flex h-10 items-center justify-center gap-2 text-xs font-semibold transition-colors',
                    index < visibleQuickLinks.length - 1 &&
                      'border-border-divider border-r',
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
