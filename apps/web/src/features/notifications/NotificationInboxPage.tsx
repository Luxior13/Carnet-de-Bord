'use client';

import {
  Archive,
  ArchiveRestore,
  Bell,
  BellRing,
  Check,
  CheckCheck,
  CircleCheck,
  Loader2,
  type LucideIcon,
  RefreshCcw,
  ShieldAlert,
  TriangleAlert,
} from 'lucide-react';
import Link from 'next/link';
import React, {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { toast } from 'sonner';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { ContentState } from '$components/layout/ContentState';
import { PageHero } from '$components/layout/PageHero';
import { ResourceStateBoundary } from '$components/layout/ResourceStateBoundary';
import { canOpenNavigationHref } from '$constants/app.constants';
import {
  NOTIFICATION_INBOX_HREF,
  notifyNotificationsChanged,
} from '$constants/notification.constants';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
import { useAsyncResource } from '$hooks/useAsyncResource';
import type {
  NotificationItem,
  NotificationListData,
} from '$types/platform.types';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';
import { apiFetchJson, jsonRequest } from '$utils/api.utils';
import { cn } from '$utils/css.utils';

type InboxFilter = 'all' | 'archived' | 'unread';
type NotificationAction = 'archive' | 'read' | 'restore' | 'unread';
type SeverityDisplay = {
  badge: 'destructive' | 'info' | 'success' | 'warning';
  className: string;
  icon: LucideIcon;
  label: string;
};

const PAGE_SIZE = 20;
const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const FILTERS: readonly {
  label: string;
  value: InboxFilter;
}[] = [
  { label: 'Toutes', value: 'all' },
  { label: 'Non lues', value: 'unread' },
  { label: 'Archivées', value: 'archived' },
];

const getSeverityDisplay = (
  severity: NotificationItem['severity'],
): SeverityDisplay => {
  switch (severity) {
    case 'SUCCESS':
      return {
        badge: 'success' as const,
        className: 'border-success/35 bg-success/10 text-success',
        icon: CircleCheck,
        label: 'Succès',
      };
    case 'WARNING':
      return {
        badge: 'warning' as const,
        className: 'border-warning/35 bg-warning/10 text-warning',
        icon: TriangleAlert,
        label: 'Avertissement',
      };
    case 'CRITICAL':
      return {
        badge: 'destructive' as const,
        className: 'border-destructive/35 bg-destructive/10 text-destructive',
        icon: ShieldAlert,
        label: 'Critique',
      };
    case 'INFO':
      return {
        badge: 'info' as const,
        className: 'border-info/35 bg-info/10 text-info',
        icon: Bell,
        label: 'Information',
      };
  }
};

const formatDate = (value: string): string => {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? 'Date inconnue'
    : dateFormatter.format(date);
};

const NotificationListSkeleton: FC = () => (
  <div
    aria-label="Chargement des notifications"
    className="space-y-3"
    role="status"
  >
    {Array.from({ length: 5 }, (_, index) => (
      <div
        className="border-border-default bg-surface-panel flex gap-3 rounded-xl border p-4"
        key={index}
      >
        <Skeleton className="size-10 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
    ))}
    <span className="sr-only">Chargement en cours…</span>
  </div>
);

type NotificationRowProps = {
  href: string | null;
  item: NotificationItem;
  onAction: (item: NotificationItem, action: NotificationAction) => void;
  onOpen: (item: NotificationItem) => void;
  pending: boolean;
};

const NotificationRow: FC<NotificationRowProps> = ({
  href,
  item,
  onAction,
  onOpen,
  pending,
}) => {
  const severity = getSeverityDisplay(item.severity);
  const SeverityIcon = severity.icon;
  const isArchived = item.archivedAt !== null;
  const isUnread = item.readAt === null;

  return (
    <li>
      <article
        className={cn(
          'border-border-default bg-surface-panel rounded-xl border p-4 shadow-[var(--shadow-panel)] transition-colors',
          isUnread && !isArchived && 'border-primary/45 bg-primary/[0.045]',
        )}
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-lg border',
              severity.className,
            )}
          >
            <SeverityIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-foreground text-sm font-semibold sm:text-base">
                    {item.title}
                  </h2>
                  {isUnread && !isArchived && (
                    <Badge variant="default">Non lue</Badge>
                  )}
                  {isArchived && <Badge variant="secondary">Archivée</Badge>}
                  <Badge variant={severity.badge}>{severity.label}</Badge>
                </div>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {item.body}
                </p>
                <time
                  className="text-muted-foreground/80 mt-2 block text-xs font-medium"
                  dateTime={item.createdAt}
                >
                  {formatDate(item.createdAt)}
                </time>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {href && !isArchived && (
                <Button asChild size="sm" variant="outline">
                  <Link href={href} onClick={() => onOpen(item)}>
                    Ouvrir
                  </Link>
                </Button>
              )}
              {!isArchived && (
                <Button
                  disabled={pending}
                  onClick={() => onAction(item, isUnread ? 'read' : 'unread')}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {pending ? (
                    <Loader2 className="animate-spin" />
                  ) : isUnread ? (
                    <Check />
                  ) : (
                    <BellRing />
                  )}
                  {isUnread ? 'Marquer comme lue' : 'Marquer non lue'}
                </Button>
              )}
              <Button
                disabled={pending}
                onClick={() =>
                  onAction(item, isArchived ? 'restore' : 'archive')
                }
                size="sm"
                type="button"
                variant="ghost"
              >
                {pending ? (
                  <Loader2 className="animate-spin" />
                ) : isArchived ? (
                  <ArchiveRestore />
                ) : (
                  <Archive />
                )}
                {isArchived ? 'Restaurer' : 'Archiver'}
              </Button>
            </div>
          </div>
        </div>
      </article>
    </li>
  );
};

export const NotificationInboxPage: FC = () => {
  const { userData } = useUser();
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [pagination, setPagination] = useState<
    NotificationListData['pagination'] | null
  >(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const canViewNotifications =
    !!userData &&
    (userData.isProtected ||
      hasPermission(
        userData.role,
        PERMISSIONS.NOTIFICATIONS.VIEW,
        userData.permissions,
      ));
  const loadFirstPage = useCallback(
    (signal: AbortSignal) =>
      apiFetchJson<NotificationListData>(
        `/api/notifications?status=${filter}&limit=${PAGE_SIZE}`,
        { signal },
      ),
    [filter],
  );
  const resource = useAsyncResource(loadFirstPage, {
    enabled: canViewNotifications,
    keepPreviousData: false,
  });

  useEffect(() => {
    setItems([]);
    setPagination(null);
  }, [filter]);

  useEffect(() => {
    if (!resource.data) return;
    setItems(resource.data.items);
    setPagination(resource.data.pagination);
    setUnreadCount(resource.data.unreadCount);
  }, [resource.data]);

  const isInitialLoading =
    resource.isLoading || (resource.isRefreshing && items.length === 0);
  const filterEmptyCopy = useMemo(() => {
    if (filter === 'unread') {
      return {
        description: 'Toutes vos notifications ont été traitées.',
        title: 'Aucune notification non lue',
      };
    }
    if (filter === 'archived') {
      return {
        description: 'Les notifications archivées resteront disponibles ici.',
        title: 'Aucune notification archivée',
      };
    }

    return {
      description:
        'Vos prochaines notifications personnelles apparaîtront ici.',
      title: 'Aucune notification',
    };
  }, [filter]);

  const runItemAction = useCallback(
    async (item: NotificationItem, action: NotificationAction) => {
      const actionKey = `${item.id}:${action}`;
      setPendingAction(actionKey);
      try {
        await apiFetchJson(
          `/api/notifications/${item.id}`,
          jsonRequest('PATCH', { action }),
        );
        const wasUnread = item.readAt === null && item.archivedAt === null;
        setItems((currentItems) => {
          if (
            (filter === 'unread' && action === 'read') ||
            (filter !== 'archived' && action === 'archive') ||
            (filter === 'archived' && action === 'restore')
          ) {
            return currentItems.filter(
              (notification) => notification.id !== item.id,
            );
          }

          return currentItems.map((notification) =>
            notification.id === item.id
              ? {
                  ...notification,
                  archivedAt:
                    action === 'archive'
                      ? new Date().toISOString()
                      : action === 'restore'
                        ? null
                        : notification.archivedAt,
                  readAt:
                    action === 'read' || action === 'archive'
                      ? new Date().toISOString()
                      : action === 'unread'
                        ? null
                        : notification.readAt,
                }
              : notification,
          );
        });
        if (action === 'read' || action === 'archive') {
          if (wasUnread) setUnreadCount((count) => Math.max(0, count - 1));
        } else if (action === 'unread' && item.archivedAt === null) {
          setUnreadCount((count) => count + 1);
        }
        notifyNotificationsChanged();
        toast.success(
          action === 'archive'
            ? 'Notification archivée'
            : action === 'restore'
              ? 'Notification restaurée'
              : action === 'read'
                ? 'Notification marquée comme lue'
                : 'Notification marquée comme non lue',
        );
      } catch {
        toast.error('Impossible de modifier cette notification');
      } finally {
        setPendingAction(null);
      }
    },
    [filter],
  );

  const markReadOnOpen = useCallback((item: NotificationItem): void => {
    if (item.readAt !== null || item.archivedAt !== null) return;
    setItems((currentItems) =>
      currentItems.map((notification) =>
        notification.id === item.id
          ? { ...notification, readAt: new Date().toISOString() }
          : notification,
      ),
    );
    setUnreadCount((count) => Math.max(0, count - 1));
    void apiFetchJson(
      `/api/notifications/${item.id}`,
      jsonRequest('PATCH', { action: 'read' }),
    )
      .then(() => notifyNotificationsChanged())
      .catch(() => undefined);
  }, []);

  const markAllRead = useCallback(async (): Promise<void> => {
    setPendingAction('read-all');
    try {
      const result = await apiFetchJson<{ updatedCount: number }>(
        '/api/notifications',
        jsonRequest('PATCH', { action: 'read_all' }),
      );
      const now = new Date().toISOString();
      setItems((currentItems) =>
        filter === 'unread'
          ? []
          : currentItems.map((item) => ({ ...item, readAt: now })),
      );
      setUnreadCount(0);
      notifyNotificationsChanged();
      toast.success(
        result.updatedCount > 0
          ? `${result.updatedCount} notification${result.updatedCount > 1 ? 's' : ''} marquée${result.updatedCount > 1 ? 's' : ''} comme lue${result.updatedCount > 1 ? 's' : ''}`
          : 'Aucune notification non lue',
      );
    } catch {
      toast.error('Impossible de marquer les notifications comme lues');
    } finally {
      setPendingAction(null);
    }
  }, [filter]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (!pagination?.nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = await apiFetchJson<NotificationListData>(
        `/api/notifications?status=${filter}&limit=${PAGE_SIZE}&cursor=${encodeURIComponent(pagination.nextCursor)}`,
      );
      setItems((currentItems) => {
        const knownIds = new Set(currentItems.map((item) => item.id));

        return [
          ...currentItems,
          ...nextPage.items.filter((item) => !knownIds.has(item.id)),
        ];
      });
      setPagination(nextPage.pagination);
      setUnreadCount(nextPage.unreadCount);
    } catch {
      toast.error('Impossible de charger la suite des notifications');
    } finally {
      setIsLoadingMore(false);
    }
  }, [filter, isLoadingMore, pagination?.nextCursor]);

  if (!canViewNotifications) {
    return (
      <AuthenticatedLayout breadcrumbs={[{ label: 'Mes notifications' }]}>
        <PageShell className="py-0">
          <PageCanvas>
            <ContentState
              description="Votre compte ne possède pas la permission de consulter les notifications."
              kind="warning"
              layout="panel"
              title="Accès non autorisé"
            />
          </PageCanvas>
        </PageShell>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout
      breadcrumbs={[
        { href: '/', label: 'Tableau de bord' },
        { href: NOTIFICATION_INBOX_HREF, label: 'Mes notifications' },
      ]}
    >
      <PageShell className="py-0" width="narrow">
        <PageCanvas contentClassName="space-y-5">
          <PageHero
            actions={
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={resource.isRefreshing}
                  onClick={() => void resource.refresh()}
                  type="button"
                  variant="outline"
                >
                  <RefreshCcw
                    className={cn(resource.isRefreshing && 'animate-spin')}
                  />
                  Actualiser
                </Button>
                <Button
                  disabled={unreadCount === 0 || pendingAction === 'read-all'}
                  onClick={() => void markAllRead()}
                  type="button"
                  variant="secondary"
                >
                  {pendingAction === 'read-all' ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <CheckCheck />
                  )}
                  Tout marquer comme lu
                </Button>
              </div>
            }
            description="Retrouvez les messages adressés à votre compte et gérez leur état sans affecter les autres utilisateurs."
            icon={<BellRing className="size-5" />}
            meta={
              <Badge variant={unreadCount > 0 ? 'default' : 'secondary'}>
                {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
              </Badge>
            }
            title="Mes notifications"
          />

          <section
            aria-label="Filtres des notifications"
            className="border-border-default bg-surface-panel flex flex-col gap-3 rounded-xl border p-3 shadow-[var(--shadow-panel)] sm:flex-row sm:items-center sm:justify-between"
          >
            <div
              aria-label="Afficher"
              className="flex flex-wrap gap-2"
              role="tablist"
            >
              {FILTERS.map((entry) => (
                <Button
                  aria-selected={filter === entry.value}
                  key={entry.value}
                  onClick={() => setFilter(entry.value)}
                  role="tab"
                  size="sm"
                  type="button"
                  variant={filter === entry.value ? 'default' : 'ghost'}
                >
                  {entry.label}
                  {entry.value === 'unread' && unreadCount > 0 && (
                    <span className="bg-primary-foreground/20 rounded-full px-1.5 text-xs">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              ))}
            </div>
            {resource.isRefreshing && items.length > 0 && (
              <span
                aria-live="polite"
                className="text-muted-foreground flex items-center gap-2 text-xs"
              >
                <Loader2 className="size-3.5 animate-spin" />
                Mise à jour…
              </span>
            )}
          </section>

          <ResourceStateBoundary
            emptyDescription={filterEmptyCopy.description}
            emptyTitle={filterEmptyCopy.title}
            error={resource.error}
            isEmpty={items.length === 0}
            isLoading={isInitialLoading}
            loadingFallback={<NotificationListSkeleton />}
            onRetry={() => void resource.refresh()}
          >
            <ul aria-label="Notifications personnelles" className="space-y-3">
              {items.map((item) => (
                <NotificationRow
                  href={
                    item.href && canOpenNavigationHref(userData, item.href)
                      ? item.href
                      : null
                  }
                  item={item}
                  key={item.id}
                  onAction={(selectedItem, action) =>
                    void runItemAction(selectedItem, action)
                  }
                  onOpen={markReadOnOpen}
                  pending={pendingAction?.startsWith(`${item.id}:`) ?? false}
                />
              ))}
            </ul>
          </ResourceStateBoundary>

          {pagination?.hasMore && (
            <div className="flex justify-center pt-1">
              <Button
                disabled={isLoadingMore}
                onClick={() => void loadMore()}
                type="button"
                variant="outline"
              >
                {isLoadingMore && <Loader2 className="animate-spin" />}
                Charger plus
              </Button>
            </div>
          )}
        </PageCanvas>
      </PageShell>
    </AuthenticatedLayout>
  );
};
