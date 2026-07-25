'use client';

import {
  CircleAlert,
  Loader2,
  MessageSquareText,
  Plus,
  RefreshCw,
} from 'lucide-react';
import React, {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import { DEFAULT_APPLICATION_TIME_ZONE } from '$constants/time.constants';
import { Button } from '$ui/button';
import { Card, CardContent, CardHeader } from '$ui/card';
import { Skeleton } from '$ui/skeleton';

import { getPartnerTimeline, setPartnerActionCompleted } from '../partner.api';
import { formatPartnerCivilDate } from '../partner-timeline.ui';
import type { PartnerDetail, PartnerFollowUp } from '../types/partner.types';
import type {
  PartnerTimelineItem,
  PartnerTimelineResponse,
} from '../types/partner-timeline.types';
import { PartnerFollowUpComposer } from './PartnerFollowUpComposer';
import { PartnerFollowUpEditor } from './PartnerFollowUpEditor';
import { PartnerOpenActions } from './PartnerOpenActions';
import { PartnerStatusControl } from './PartnerStatusControl';
import {
  PartnerFollowUpNote,
  PartnerTimelineEvent,
} from './PartnerTimelineItems';

const TIMELINE_PAGE_SIZE = 25;

const PARIS_DAY_KEY_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: DEFAULT_APPLICATION_TIME_ZONE,
  year: 'numeric',
});

const getParisDayKey = (value: string | Date): string => {
  const parts = PARIS_DAY_KEY_FORMATTER.formatToParts(
    typeof value === 'string' ? new Date(value) : value,
  );
  const byType = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${byType.year}-${byType.month}-${byType.day}`;
};

const getPreviousCivilDay = (day: string): string => {
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);

  return date.toISOString().slice(0, 10);
};

const getTimelineDayLabel = (day: string): string => {
  const today = getParisDayKey(new Date());
  if (day === today) return 'Aujourd’hui';
  if (day === getPreviousCivilDay(today)) return 'Hier';

  return formatPartnerCivilDate(day);
};

const TimelineLoading: FC = () => (
  <div className="space-y-3" aria-label="Chargement du fil de suivi">
    <Skeleton className="h-32 rounded-xl" />
    <Skeleton className="h-16 rounded-xl" />
    <Skeleton className="h-28 rounded-xl" />
  </div>
);

const PartnerTimelineFeed: FC<{
  actionSavingEntryId: string | null;
  canManage: boolean;
  error: Error | null;
  hasMore: boolean;
  items: readonly PartnerTimelineItem[];
  loading: boolean;
  loadingMore: boolean;
  onEdit: (entry: PartnerFollowUp, editableDeadlineMs: number) => void;
  onLoadMore: () => Promise<void>;
  onOpenComposer: () => void;
  onRetry: () => Promise<void>;
  onToggleAction: (entry: PartnerFollowUp, completed: boolean) => Promise<void>;
  refreshing: boolean;
}> = ({
  actionSavingEntryId,
  canManage,
  error,
  hasMore,
  items,
  loading,
  loadingMore,
  onEdit,
  onLoadMore,
  onOpenComposer,
  onRetry,
  onToggleAction,
  refreshing,
}) => {
  const groups = useMemo(() => {
    const grouped = new Map<string, PartnerTimelineItem[]>();
    for (const item of items) {
      const key = getParisDayKey(item.occurredAt);
      const current = grouped.get(key) ?? [];
      current.push(item);
      grouped.set(key, current);
    }

    return [...grouped.entries()];
  }, [items]);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Fil de suivi</h2>
            {refreshing && (
              <Loader2
                aria-label="Actualisation du fil"
                className="text-muted-foreground size-4 animate-spin"
              />
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Notes partagées, changements de relation et actions, du plus récent
            au plus ancien.
          </p>
        </div>
        {canManage && (
          <Button onClick={onOpenComposer} size="sm" type="button">
            <Plus className="size-4" />
            Ajouter une note
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        {loading ? (
          <TimelineLoading />
        ) : error && !items.length ? (
          <div className="flex flex-col items-center px-4 py-10 text-center">
            <CircleAlert className="text-destructive size-6" />
            <p className="mt-3 text-sm font-medium">
              Le fil de suivi ne peut pas être chargé.
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {error.message}
            </p>
            <Button
              className="mt-4"
              onClick={() => {
                void onRetry().catch(() => undefined);
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <RefreshCw className="size-4" />
              Réessayer
            </Button>
          </div>
        ) : !items.length ? (
          <div className="flex flex-col items-center px-4 py-10 text-center">
            <MessageSquareText className="text-muted-foreground size-6" />
            <p className="mt-3 text-sm font-medium">
              Aucun suivi pour le moment
            </p>
            <p className="text-muted-foreground mt-1 max-w-md text-sm">
              Ajoutez la première information utile pour que les autres
              utilisateurs puissent reprendre le dossier facilement.
            </p>
            {canManage && (
              <Button
                className="mt-4"
                onClick={onOpenComposer}
                size="sm"
                type="button"
              >
                <Plus className="size-4" />
                Ajouter une note
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {error && (
              <div className="border-warning/30 bg-warning/10 text-warning-foreground flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <CircleAlert className="size-4 shrink-0" />
                  <span>Le fil n’a pas pu être entièrement actualisé.</span>
                </div>
                <Button
                  disabled={refreshing}
                  onClick={() => {
                    void onRetry().catch(() => undefined);
                  }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <RefreshCw
                    className={`size-4 ${refreshing ? 'animate-spin' : ''}`}
                  />
                  Réessayer
                </Button>
              </div>
            )}
            {groups.map(([day, dayItems]) => (
              <section aria-labelledby={`timeline-day-${day}`} key={day}>
                <h3
                  className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase"
                  id={`timeline-day-${day}`}
                >
                  {getTimelineDayLabel(day)}
                </h3>
                <div className="border-border-divider space-y-2 border-l pl-4">
                  {dayItems.map((item) =>
                    item.kind === 'NOTE' ? (
                      <PartnerFollowUpNote
                        actionSavingEntryId={actionSavingEntryId}
                        canManage={canManage}
                        entry={item.followUp}
                        key={item.id}
                        onEdit={onEdit}
                        onToggleAction={onToggleAction}
                      />
                    ) : (
                      <PartnerTimelineEvent item={item} key={item.id} />
                    ),
                  )}
                </div>
              </section>
            ))}
            {hasMore && (
              <div className="flex justify-center pt-1">
                <Button
                  disabled={loadingMore}
                  onClick={() => void onLoadMore()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {loadingMore && <Loader2 className="size-4 animate-spin" />}
                  Afficher les suivis précédents
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const PartnerFollowUpSection: FC<{
  canManage: boolean;
  canViewInterlocutors: boolean;
  onChange: (partner: PartnerDetail) => void;
  partner: PartnerDetail;
}> = ({ canManage, canViewInterlocutors, onChange, partner }) => {
  const [actionSavingEntryId, setActionSavingEntryId] = useState<string | null>(
    null,
  );
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<{
    editableDeadlineMs: number;
    entry: PartnerFollowUp;
  } | null>(null);
  const [timelineItems, setTimelineItems] = useState<PartnerTimelineItem[]>([]);
  const [openActions, setOpenActions] = useState<PartnerFollowUp[]>([]);
  const [pagination, setPagination] = useState<
    PartnerTimelineResponse['pagination'] | null
  >(null);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [timelineRefreshing, setTimelineRefreshing] = useState(false);
  const [timelineLoadingMore, setTimelineLoadingMore] = useState(false);
  const [timelineError, setTimelineError] = useState<Error | null>(null);
  const requestGeneration = useRef(0);

  const applyTimelineResponse = useCallback(
    (response: PartnerTimelineResponse): void => {
      setTimelineItems(response.items);
      setOpenActions(response.openActions);
      setPagination(response.pagination);
      setTimelineError(null);
    },
    [],
  );

  const refreshTimeline = useCallback(async (): Promise<void> => {
    const generation = ++requestGeneration.current;
    setTimelineRefreshing(true);
    try {
      const response = await getPartnerTimeline(partner.id, {
        limit: TIMELINE_PAGE_SIZE,
      });
      if (generation !== requestGeneration.current) return;
      applyTimelineResponse(response);
      setTimelineLoading(false);
    } catch (caught) {
      if (generation !== requestGeneration.current) return;
      const error =
        caught instanceof Error
          ? caught
          : new Error('Actualisation du fil impossible');
      setTimelineError(error);
      setTimelineLoading(false);
      throw error;
    } finally {
      if (generation === requestGeneration.current) {
        setTimelineRefreshing(false);
      }
    }
  }, [applyTimelineResponse, partner.id]);

  useEffect(() => {
    const generation = ++requestGeneration.current;
    const controller = new AbortController();
    setTimelineItems([]);
    setOpenActions([]);
    setPagination(null);
    setTimelineError(null);
    setTimelineLoading(true);
    void getPartnerTimeline(partner.id, {
      limit: TIMELINE_PAGE_SIZE,
      signal: controller.signal,
    })
      .then((response) => {
        if (generation === requestGeneration.current) {
          applyTimelineResponse(response);
        }
      })
      .catch((caught) => {
        if (
          controller.signal.aborted ||
          generation !== requestGeneration.current
        ) {
          return;
        }
        setTimelineError(
          caught instanceof Error
            ? caught
            : new Error('Chargement du fil impossible'),
        );
      })
      .finally(() => {
        if (
          !controller.signal.aborted &&
          generation === requestGeneration.current
        ) {
          setTimelineLoading(false);
        }
      });

    return (): void => {
      requestGeneration.current += 1;
      controller.abort();
    };
  }, [applyTimelineResponse, partner.id]);

  const loadMore = async (): Promise<void> => {
    if (!pagination?.nextCursor || timelineLoadingMore) return;
    const generation = requestGeneration.current;
    setTimelineLoadingMore(true);
    try {
      const response = await getPartnerTimeline(partner.id, {
        cursor: pagination.nextCursor,
        limit: TIMELINE_PAGE_SIZE,
      });
      if (generation !== requestGeneration.current) return;
      setTimelineItems((current) => {
        const knownIds = new Set(current.map((item) => item.id));

        return [
          ...current,
          ...response.items.filter((item) => !knownIds.has(item.id)),
        ];
      });
      setPagination(response.pagination);
      setTimelineError(null);
    } catch (caught) {
      if (generation !== requestGeneration.current) return;
      const error =
        caught instanceof Error
          ? caught
          : new Error('Chargement des suivis précédents impossible');
      setTimelineError(error);
      toast.error(error.message);
    } finally {
      if (generation === requestGeneration.current) {
        setTimelineLoadingMore(false);
      }
    }
  };

  const refreshAfterMutation = async (): Promise<void> => {
    try {
      await refreshTimeline();
    } catch {
      toast.warning(
        'La modification est enregistrée, mais le fil n’a pas pu être actualisé.',
      );
    }
  };

  const toggleAction = async (
    entry: PartnerFollowUp,
    completed: boolean,
  ): Promise<void> => {
    if (actionSavingEntryId || !entry.action) return;
    setActionSavingEntryId(entry.id);
    try {
      const updated = await setPartnerActionCompleted(
        partner.id,
        entry.id,
        completed,
        entry.action.version,
      );
      onChange(updated);
      toast.success(completed ? 'Action terminée' : 'Action rouverte');
      await refreshAfterMutation();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Modification de l’action impossible',
      );
    } finally {
      setActionSavingEntryId(null);
    }
  };

  return (
    <div className="space-y-4">
      <PartnerStatusControl
        canManage={canManage}
        onChange={onChange}
        onTimelineRefresh={refreshTimeline}
        partner={partner}
      />

      <PartnerOpenActions
        actionSavingEntryId={actionSavingEntryId}
        canManage={canManage}
        entries={openActions}
        onToggleAction={toggleAction}
      />

      <PartnerFollowUpComposer
        onCreated={(updated) => {
          onChange(updated);
          void refreshAfterMutation();
        }}
        onOpenChange={setFollowUpOpen}
        open={followUpOpen}
        partner={partner}
      />

      {editingFollowUp && (
        <PartnerFollowUpEditor
          canViewInterlocutors={canViewInterlocutors}
          editableDeadlineMs={editingFollowUp.editableDeadlineMs}
          entry={editingFollowUp.entry}
          onConflict={() => {
            void refreshTimeline().catch(() => undefined);
          }}
          onOpenChange={(open) => {
            if (!open) setEditingFollowUp(null);
          }}
          onUpdated={(updated) => {
            onChange(updated);
            void refreshAfterMutation();
          }}
          open
          partner={partner}
        />
      )}

      <PartnerTimelineFeed
        actionSavingEntryId={actionSavingEntryId}
        canManage={canManage}
        error={timelineError}
        hasMore={pagination?.hasMore ?? false}
        items={timelineItems}
        loading={timelineLoading}
        loadingMore={timelineLoadingMore}
        onLoadMore={loadMore}
        onEdit={(entry, editableDeadlineMs) =>
          setEditingFollowUp({ editableDeadlineMs, entry })
        }
        onOpenComposer={() => setFollowUpOpen(true)}
        onRetry={refreshTimeline}
        onToggleAction={toggleAction}
        refreshing={timelineRefreshing}
      />
    </div>
  );
};
