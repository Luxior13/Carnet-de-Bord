'use client';

import { LoaderCircle, Pin, RefreshCw } from 'lucide-react';
import React, {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { toast } from 'sonner';

import { ContentState } from '$components/layout/ContentState';
import { DEFAULT_APPLICATION_TIME_ZONE } from '$constants/time.constants';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Skeleton } from '$ui/skeleton';

import {
  fetchInternalNews,
  updateInternalAnnouncementPin,
} from '../internal-news.api';
import type {
  InternalNewsItem,
  InternalNewsResponse,
} from '../internal-news.types';
import { InternalNewsCard } from './InternalNewsCard';

const dateKeyFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: DEFAULT_APPLICATION_TIME_ZONE,
  year: 'numeric',
});
const dateLabelFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'full',
  timeZone: DEFAULT_APPLICATION_TIME_ZONE,
});

const getDateKey = (value: Date): string => {
  const parts = dateKeyFormatter.formatToParts(value);
  const read = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${read('year')}-${read('month')}-${read('day')}`;
};

const getDateLabel = (value: string): string => {
  const date = new Date(value);
  const dateKey = getDateKey(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (dateKey === getDateKey(today)) return "Aujourd'hui";
  if (dateKey === getDateKey(yesterday)) return 'Hier';

  const label = dateLabelFormatter.format(date);

  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
};

const FeedSkeleton: FC = () => (
  <div
    aria-label="Chargement des actualités"
    className="space-y-3"
    role="status"
  >
    <Skeleton className="h-20 rounded-lg" />
    <Skeleton className="h-48 rounded-lg" />
    <Skeleton className="h-44 rounded-lg" />
    <span className="sr-only">Chargement…</span>
  </div>
);

type InternalNewsFeedProps = {
  canManage: boolean;
  initialState?: { data: InternalNewsResponse };
  onContentChanged: () => void;
  refreshVersion: number;
};

export const InternalNewsFeed: FC<InternalNewsFeedProps> = ({
  canManage,
  initialState,
  onContentChanged,
  refreshVersion,
}) => {
  const [error, setError] = useState<Error | null>(null);
  const [items, setItems] = useState<InternalNewsItem[]>(
    initialState?.data.items ?? [],
  );
  const [loading, setLoading] = useState(!initialState);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(
    initialState?.data.pagination.nextCursor ?? null,
  );
  const [pinPendingId, setPinPendingId] = useState<string | null>(null);
  const [pinned, setPinned] = useState<InternalNewsItem[]>(
    initialState?.data.pinned ?? [],
  );

  const loadFirstPage = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchInternalNews({ signal });
        setItems(response.items);
        setPinned(response.pinned);
        setNextCursor(response.pagination.nextCursor);
      } catch (caught) {
        if ((caught as Error).name !== 'AbortError') {
          setError(
            caught instanceof Error
              ? caught
              : new Error("Impossible de charger l'actualité"),
          );
          setItems([]);
          setPinned([]);
          setNextCursor(null);
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (refreshVersion === 0 && initialState) {
      setItems(initialState.data.items);
      setPinned(initialState.data.pinned);
      setNextCursor(initialState.data.pagination.nextCursor);
      setError(null);
      setLoading(false);

      return;
    }

    const controller = new AbortController();
    void loadFirstPage(controller.signal);

    return (): void => controller.abort();
  }, [initialState, loadFirstPage, refreshVersion]);

  const loadMore = async (): Promise<void> => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await fetchInternalNews({ cursor: nextCursor });
      setItems((currentItems) => {
        const existingIds = new Set(currentItems.map((item) => item.id));

        return [
          ...currentItems,
          ...response.items.filter((item) => !existingIds.has(item.id)),
        ];
      });
      setNextCursor(response.pagination.nextCursor);
    } catch {
      toast.error('Impossible de charger la suite du fil');
    } finally {
      setLoadingMore(false);
    }
  };

  const togglePin = async (item: InternalNewsItem): Promise<void> => {
    if (pinPendingId) return;
    const announcementId = item.id.slice('announcement:'.length);
    setPinPendingId(item.id);
    try {
      await updateInternalAnnouncementPin(announcementId, {
        isPinned: !item.isPinned,
      });
      toast.success(
        item.isPinned ? 'Actualité désépinglée' : 'Actualité épinglée',
      );
      onContentChanged();
    } catch {
      toast.error("Impossible de modifier l'épinglage");
    } finally {
      setPinPendingId(null);
    }
  };

  const groupedItems = useMemo(() => {
    const groups = new Map<string, InternalNewsItem[]>();
    for (const item of items) {
      const label = getDateLabel(item.occurredAt);
      groups.set(label, [...(groups.get(label) ?? []), item]);
    }

    return [...groups.entries()];
  }, [items]);

  if (loading) return <FeedSkeleton />;

  if (error) {
    return (
      <ContentState
        action={
          <Button onClick={() => void loadFirstPage()} size="sm">
            <RefreshCw className="size-4" />
            Réessayer
          </Button>
        }
        description="Le fil n’a pas pu être récupéré pour le moment."
        kind="error"
        layout="panel"
        title="Actualité indisponible"
      />
    );
  }

  return (
    <div className="space-y-5">
      {pinned.length > 0 && (
        <section aria-labelledby="pinned-news-heading" className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Pin className="text-primary-emphasis size-4" />
            <h2 className="text-sm font-semibold" id="pinned-news-heading">
              À la une
            </h2>
            <Badge variant="secondary">{pinned.length}</Badge>
          </div>
          <div className="grid gap-3 @min-[44rem]/page:grid-cols-2">
            {pinned.map((item) => (
              <InternalNewsCard
                canManage={canManage}
                item={item}
                key={item.id}
                onTogglePin={(selectedItem) => void togglePin(selectedItem)}
                pinPending={pinPendingId === item.id}
              />
            ))}
          </div>
        </section>
      )}

      {groupedItems.length === 0 && pinned.length === 0 ? (
        <ContentState
          description="Les annonces publiées pour la structure apparaîtront ici."
          layout="panel"
          title="Aucune actualité pour le moment"
        />
      ) : (
        <div className="space-y-6">
          {groupedItems.map(([label, groupItems]) => {
            const headingId = `news-group-${getDateKey(
              new Date(groupItems[0]?.occurredAt ?? Date.now()),
            )}`;

            return (
              <section
                aria-labelledby={headingId}
                className="space-y-3"
                key={label}
              >
                <div className="flex items-center gap-3 px-1">
                  <h2
                    className="text-muted-foreground text-xs font-semibold tracking-wide uppercase"
                    id={headingId}
                  >
                    {label}
                  </h2>
                  <span className="bg-border-subtle h-px flex-1" />
                </div>
                <div className="space-y-3">
                  {groupItems.map((item) => (
                    <InternalNewsCard
                      canManage={canManage}
                      item={item}
                      key={item.id}
                      onTogglePin={(selectedItem) =>
                        void togglePin(selectedItem)
                      }
                      pinPending={pinPendingId === item.id}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {nextCursor && (
        <div className="flex justify-center pt-1">
          <Button
            disabled={loadingMore}
            onClick={() => void loadMore()}
            variant="outline"
          >
            {loadingMore && <LoaderCircle className="size-4 animate-spin" />}
            Charger la suite
          </Button>
        </div>
      )}
    </div>
  );
};
