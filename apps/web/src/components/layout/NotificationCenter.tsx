'use client';

import {
  Bell,
  BellRing,
  CircleCheck,
  Loader2,
  type LucideIcon,
  RefreshCcw,
  ShieldAlert,
  TriangleAlert,
  X,
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
import { toast } from 'sonner';

import { canOpenNavigationHref } from '$constants/app.constants';
import {
  NOTIFICATION_INBOX_HREF,
  NOTIFICATIONS_CHANGED_EVENT,
  notifyNotificationsChanged,
} from '$constants/notification.constants';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
import { notificationCountStore } from '$features/notifications/notification-count-store';
import { formatNotificationTime } from '$features/notifications/notification-time';
import { useNotificationCount } from '$features/notifications/useNotificationCount';
import { useAsyncResource } from '$hooks/useAsyncResource';
import type {
  NotificationItem,
  NotificationListData,
} from '$types/platform.types';
import { Button } from '$ui/button';
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from '$ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';
import { apiFetchJson, jsonRequest } from '$utils/api.utils';
import { cn } from '$utils/css.utils';

export type NotificationCenterItem = {
  accentClassName?: string;
  createdAt?: string;
  description: string;
  href: string;
  icon?: LucideIcon;
  id: string;
  meta?: string;
  read?: boolean;
  severity?: NotificationItem['severity'];
  sourceLabel?: string;
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
] as const;

const defaultAccentClassName = 'text-muted-foreground';
const NOTIFICATION_REFRESH_MIN_INTERVAL_MS = 30_000;
const NOTIFICATION_CHANGED_DEBOUNCE_MS = 200;

export const NotificationCenter: FC<NotificationCenterProps> = ({
  notifications,
}) => {
  const { authorizationRevision, userData } = useUser();

  return (
    <NotificationCenterContent
      key={`${userData?.id ?? 'anonymous'}:${authorizationRevision}`}
      notifications={notifications}
    />
  );
};

const NotificationCenterContent: FC<NotificationCenterProps> = ({
  notifications,
}) => {
  const pathname = usePathname();
  const { authorizationRevision, userData } = useUser();
  const scope = `${userData?.id ?? 'anonymous'}:${authorizationRevision}`;
  const [sharedUnreadCount, publishUnreadCount] = useNotificationCount(scope);
  const [
    hasActivatedNotificationResource,
    setHasActivatedNotificationResource,
  ] = useState(false);
  const lastNotificationRequestAtRef = useRef(0);
  const notificationChangedTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now);
  const pendingReadsRef = useRef(new Set<string>());
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
  const loadNotifications = useCallback(
    async (signal: AbortSignal) => {
      const requestedAt = Date.now();
      lastNotificationRequestAtRef.current = requestedAt;
      const data = await apiFetchJson<NotificationListData>(
        '/api/notifications?limit=10',
        {
          signal,
        },
      );
      if (!signal.aborted) publishUnreadCount(data.unreadCount, requestedAt);

      return data;
    },
    [publishUnreadCount],
  );
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
    if (notifications !== undefined || !canViewNotifications) return;
    let disposed = false;
    let running = false;
    let timer: number;
    const controller = new AbortController();
    const poll = async (): Promise<void> => {
      if (disposed || running) return;
      running = true;
      if (document.visibilityState === 'visible' && navigator.onLine) {
        setNow(Date.now());
        if (shouldLoadNotificationResource) {
          if (
            Date.now() - lastNotificationRequestAtRef.current >=
            NOTIFICATION_REFRESH_MIN_INTERVAL_MS
          ) {
            await refreshNotificationResource();
          }
        } else {
          // On the inbox, keep its initial read and only refresh a minimal preview.
          const requestedAt = Date.now();
          try {
            const data = await apiFetchJson<NotificationListData>(
              '/api/notifications?limit=1',
              {
                signal: controller.signal,
              },
            );
            if (!disposed) publishUnreadCount(data.unreadCount, requestedAt);
          } catch {
            // Keep the last known count; the inbox owns its visible loading errors.
          }
        }
      }
      running = false;
      if (!disposed)
        timer = window.setTimeout(
          () => void poll(),
          NOTIFICATION_REFRESH_MIN_INTERVAL_MS,
        );
    };
    const resume = (): void => {
      window.clearTimeout(timer);
      if (document.visibilityState !== 'visible') return;
      void poll();
    };
    timer = window.setTimeout(
      () => void poll(),
      NOTIFICATION_REFRESH_MIN_INTERVAL_MS,
    );
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);

    return (): void => {
      disposed = true;
      controller.abort();
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', resume);
    };
  }, [
    canViewNotifications,
    notifications,
    publishUnreadCount,
    refreshNotificationResource,
    shouldLoadNotificationResource,
  ]);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  const resolvedNotifications = useMemo<NotificationCenterItem[]>(
    () =>
      notifications ??
      notificationResource.data?.items.map((notification) => ({
        createdAt: notification.createdAt,
        description: notification.body,
        href: notification.href ?? NOTIFICATION_INBOX_HREF,
        id: notification.id,
        read: notification.readAt !== null,
        severity: notification.severity,
        sourceLabel: notification.source.label,
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
      ? (sharedUnreadCount ?? notificationResource.data?.unreadCount ?? 0)
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

  const markAsRead = useCallback(
    async (id: string): Promise<void> => {
      if (
        pendingReadsRef.current.has(id) ||
        notificationCountStore.get(scope) === null
      )
        return;
      pendingReadsRef.current.add(id);
      try {
        await apiFetchJson(
          `/api/notifications/${id}`,
          jsonRequest('PATCH', { action: 'read' }),
        );
        toast.dismiss(`notification-read-${id}`);
        publishUnreadCount((count) => Math.max(0, count - 1));
        notifyNotificationsChanged();
      } catch {
        if (notificationCountStore.get(scope) !== null)
          toast.error('La notification n’a pas pu être marquée comme lue.', {
            action: { label: 'Réessayer', onClick: () => void markAsRead(id) },
            duration: 10_000,
            id: `notification-read-${id}`,
          });
      } finally {
        pendingReadsRef.current.delete(id);
      }
    },
    [publishUnreadCount, scope],
  );

  if (!canViewNotifications) return null;

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setNow(Date.now());
        handlePopoverOpenChange(nextOpen);
      }}
    >
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              aria-label={
                unreadNotificationsCount > 0
                  ? `Ouvrir les notifications (${unreadNotificationsCount} non lues)`
                  : 'Ouvrir les notifications'
              }
              className="text-muted-foreground hover:bg-surface-navigation-hover hover:text-foreground data-[state=open]:border-border-strong/60 data-[state=open]:bg-surface-navigation-active data-[state=open]:text-foreground relative size-11 rounded-sm bg-transparent shadow-none hover:border-transparent focus-visible:ring-inset lg:size-9"
              size="icon"
              variant="ghost"
            >
              <Bell aria-hidden="true" className="size-4" />
              {unreadNotificationsCount > 0 && (
                <span className="ring-surface-panel bg-primary text-primary-foreground text-caption absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-semibold tabular-nums ring-2">
                  {unreadNotificationsCount > 99
                    ? '99+'
                    : unreadNotificationsCount}
                  <span className="sr-only">notifications non lues</span>
                </span>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="rounded-sm">
          Notifications
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        align="end"
        aria-label="Notifications"
        className="flex max-h-[var(--radix-popover-content-available-height)] w-[min(calc(100vw-2rem),25rem)] animate-none! flex-col overflow-y-auto rounded-sm p-1 shadow-none"
        collisionPadding={8}
        sideOffset={8}
      >
        <div className="border-border-divider mx-2 shrink-0 border-b py-2">
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
                        ? `${unreadNotificationsCount} notification${unreadNotificationsCount > 1 ? 's' : ''} non lue${unreadNotificationsCount > 1 ? 's' : ''}`
                        : 'Vous êtes à jour'}
              </p>
            </div>
            <PopoverClose asChild>
              <Button
                aria-label="Fermer les notifications"
                className="size-11 rounded-sm focus-visible:ring-inset lg:size-10"
                size="icon"
                variant="ghost"
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </PopoverClose>
          </div>
        </div>
        {hasRefreshError && (
          <div
            className="border-warning/30 bg-warning/10 text-warning flex shrink-0 items-center gap-2 border-b px-3 py-2"
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
            <span className="text-muted-foreground flex size-10 items-center justify-center">
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
            <span className="text-destructive flex size-10 items-center justify-center">
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
          <ul
            aria-label="Dernières notifications"
            className="max-h-96 min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
          >
            {visibleNotifications.map((notification) => {
              const severity = notification.severity;
              const NotificationIcon =
                notification.icon ??
                (severity === 'CRITICAL'
                  ? ShieldAlert
                  : severity === 'WARNING'
                    ? TriangleAlert
                    : severity === 'SUCCESS'
                      ? CircleCheck
                      : BellRing);
              const severityLabel =
                severity === 'CRITICAL'
                  ? 'Critique'
                  : severity === 'WARNING'
                    ? 'À surveiller'
                    : severity === 'SUCCESS'
                      ? 'Succès'
                      : null;
              const severityClass =
                severity === 'CRITICAL'
                  ? 'text-destructive'
                  : severity === 'WARNING'
                    ? 'text-warning'
                    : severity === 'SUCCESS'
                      ? 'text-success'
                      : defaultAccentClassName;
              const isUnread = !notification.read;
              const time = notification.createdAt
                ? formatNotificationTime(notification.createdAt, now)
                : null;

              return (
                <li key={notification.id}>
                  <Link
                    className="hover:bg-surface-navigation-hover focus-visible:bg-surface-navigation-active focus-visible:ring-ring flex gap-2.5 rounded-sm px-3 py-2.5 outline-none focus-visible:ring-[length:var(--ring-width)] focus-visible:ring-inset"
                    href={notification.href}
                    onClick={(event) => {
                      setOpen(false);
                      if (event.defaultPrevented) return;
                      if (notification.read) return;
                      void markAsRead(notification.id);
                    }}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex size-5 shrink-0 items-center justify-center',
                        notification.accentClassName ?? severityClass,
                      )}
                    >
                      <NotificationIcon aria-hidden="true" className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-start gap-2">
                        <span
                          className={cn(
                            'text-foreground line-clamp-2 min-w-0 flex-1 text-sm [overflow-wrap:anywhere]',
                            isUnread ? 'font-semibold' : 'font-medium',
                          )}
                        >
                          {notification.title}
                        </span>
                        <span className="flex w-1.5 shrink-0 justify-center">
                          {isUnread && (
                            <>
                              <span
                                aria-hidden="true"
                                className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full"
                              />
                              <span className="sr-only">Non lue</span>
                            </>
                          )}
                        </span>
                      </span>
                      <span className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-4 [overflow-wrap:anywhere]">
                        {notification.description}
                      </span>
                      {(time || notification.sourceLabel || severityLabel) && (
                        <span className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-1.5 text-xs leading-4">
                          {severityLabel && (
                            <span className={cn('font-medium', severityClass)}>
                              {severityLabel}
                            </span>
                          )}
                          {severityLabel && time && (
                            <span aria-hidden="true">·</span>
                          )}
                          {time && (
                            <time
                              dateTime={time.dateTime}
                              title={time.full}
                              aria-label={time.full}
                            >
                              {time.label}
                            </time>
                          )}
                          {notification.sourceLabel && (
                            <span
                              className="min-w-0 truncate"
                              title={notification.sourceLabel}
                            >
                              · {notification.sourceLabel}
                            </span>
                          )}
                        </span>
                      )}
                      {notification.meta && (
                        <span className="text-muted-foreground mt-1 block text-xs [overflow-wrap:anywhere]">
                          {notification.meta}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : hasLoadedNotifications ? (
          <div className="flex flex-col items-center px-4 py-7 text-center">
            <span className="text-muted-foreground flex size-10 items-center justify-center">
              <Bell aria-hidden="true" className="size-4" />
            </span>
            <p className="text-foreground mt-3 text-sm font-semibold">
              Aucune notification
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Les points importants apparaîtront ici.
            </p>
          </div>
        ) : null}
        {visibleQuickLinks.length > 0 && (
          <div
            className={cn(
              'border-border-divider mx-2 grid shrink-0 gap-1 border-t pt-1',
              visibleQuickLinks.length > 1 ? 'grid-cols-2' : 'grid-cols-1',
            )}
          >
            {visibleQuickLinks.map((link) => {
              const LinkIcon = link.icon;

              return (
                <Link
                  className="text-muted-foreground hover:bg-surface-navigation-hover hover:text-foreground focus-visible:ring-ring flex min-h-11 items-center justify-center gap-2 rounded-sm px-2 py-2 text-sm font-medium outline-none focus-visible:ring-[length:var(--ring-width)] focus-visible:ring-inset"
                  href={link.href}
                  key={link.href}
                  onClick={() => setOpen(false)}
                >
                  <LinkIcon aria-hidden="true" className="size-3.5" />
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
