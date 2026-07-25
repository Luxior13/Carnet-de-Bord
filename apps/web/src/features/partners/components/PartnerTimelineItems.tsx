'use client';

import {
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardList,
  Handshake,
  Loader2,
  PencilLine,
  RotateCcw,
} from 'lucide-react';
import React, { type FC, type ReactNode, useEffect, useState } from 'react';

import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';
import { cn } from '$utils/css.utils';

import { PARTNER_STATUS_LABELS } from '../partner.constants';
import {
  formatPartnerCivilDate,
  formatPartnerDateTime,
  getPartnerActionDuePresentation,
} from '../partner-timeline.ui';
import type { PartnerFollowUp } from '../types/partner.types';
import type { PartnerTimelineItem } from '../types/partner-timeline.types';

const formatPeriod = (
  startedOn: string | null,
  endedOn: string | null,
  isFinished: boolean,
): string => {
  if (!isFinished) {
    return startedOn
      ? `début le ${formatPartnerCivilDate(startedOn)}`
      : 'date de début non renseignée';
  }
  if (startedOn && endedOn) {
    return `du ${formatPartnerCivilDate(startedOn)} au ${formatPartnerCivilDate(endedOn)}`;
  }
  if (startedOn) {
    return `début le ${formatPartnerCivilDate(startedOn)} · fin non renseignée`;
  }
  if (endedOn) {
    return `début non renseigné · terminée le ${formatPartnerCivilDate(endedOn)}`;
  }

  return 'dates non renseignées';
};

type TimelineEventItem = Extract<PartnerTimelineItem, { kind: 'EVENT' }>;

type TimelineEventPresentation = {
  detail: string | null;
  icon: ReactNode;
  title: string;
};

const getTimelineEventPresentation = (
  item: TimelineEventItem,
): TimelineEventPresentation => {
  switch (item.eventType) {
    case 'RELATIONSHIP_CREATED': {
      if (item.payload.source === 'migration') {
        return {
          detail: `${PARTNER_STATUS_LABELS[item.payload.status]} · l’historique antérieur n’était pas reconstructible`,
          icon: <Handshake className="size-4" />,
          title: 'État de la relation repris à la mise en place du suivi',
        };
      }
      const period =
        item.payload.startedOn || item.payload.endedOn
          ? ` · ${formatPeriod(
              item.payload.startedOn,
              item.payload.endedOn,
              item.payload.status === 'ENDED',
            )}`
          : '';

      return {
        detail: `Statut à la création : ${PARTNER_STATUS_LABELS[item.payload.status]}${period}`,
        icon: <Handshake className="size-4" />,
        title: 'Relation créée',
      };
    }
    case 'STATUS_CHANGED': {
      const resumesAfterActive =
        item.payload.fromStatus === 'ACTIVE' &&
        item.payload.toStatus === 'DISCUSSION';
      const period =
        item.payload.startedOn || item.payload.endedOn
          ? formatPeriod(
              item.payload.startedOn,
              item.payload.endedOn,
              item.payload.toStatus === 'ENDED' || resumesAfterActive,
            )
          : null;
      const closingNote = item.payload.closingNote
        ? `Précision : ${item.payload.closingNote}`
        : null;

      return {
        detail: [
          `${PARTNER_STATUS_LABELS[item.payload.fromStatus]} → ${PARTNER_STATUS_LABELS[item.payload.toStatus]}`,
          period,
          closingNote,
        ]
          .filter(Boolean)
          .join(' · '),
        icon:
          item.payload.toStatus === 'ENDED' || resumesAfterActive ? (
            <CalendarClock className="size-4" />
          ) : (
            <Handshake className="size-4" />
          ),
        title:
          item.payload.toStatus === 'ACTIVE'
            ? 'Relation activée'
            : item.payload.toStatus === 'ENDED'
              ? 'Relation terminée'
              : item.payload.toStatus === 'DISCUSSION'
                ? resumesAfterActive
                  ? 'Relation clôturée, échanges repris'
                  : item.payload.fromStatus === 'PROSPECT'
                    ? 'Échanges commencés'
                    : 'Échanges repris'
                : 'Relation classée sans suite',
      };
    }
    case 'PERIOD_CORRECTED':
      return {
        detail: `${PARTNER_STATUS_LABELS[item.payload.status]} · ${formatPeriod(
          item.payload.startedOn,
          item.payload.endedOn,
          item.payload.status === 'ENDED',
        )}${
          item.payload.closingNote
            ? ` · Précision : ${item.payload.closingNote}`
            : ''
        }`,
        icon: <PencilLine className="size-4" />,
        title: 'Période corrigée',
      };
    case 'ACTION_COMPLETED':
      return {
        detail: item.payload.dueOn
          ? `Échéance prévue le ${formatPartnerCivilDate(item.payload.dueOn)}`
          : null,
        icon: <CheckCircle2 className="size-4" />,
        title: `Action terminée : « ${item.payload.description} »`,
      };
    case 'ACTION_REOPENED':
      return {
        detail: item.payload.dueOn
          ? `Nouvelle échéance : ${formatPartnerCivilDate(item.payload.dueOn)}`
          : 'Sans échéance',
        icon: <RotateCcw className="size-4" />,
        title: `Action rouverte : « ${item.payload.description} »`,
      };
    case 'ACTION_UPDATED':
      return {
        detail: item.payload.dueOn
          ? `Échéance : ${formatPartnerCivilDate(item.payload.dueOn)}`
          : 'Sans échéance',
        icon: <PencilLine className="size-4" />,
        title: `Action modifiée : « ${item.payload.description} »`,
      };
  }
};

export const PartnerTimelineEvent: FC<{ item: TimelineEventItem }> = ({
  item,
}) => {
  const presentation = getTimelineEventPresentation(item);

  return (
    <article className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 py-2.5">
      <span className="bg-surface-muted text-muted-foreground flex size-8 items-center justify-center rounded-full">
        {presentation.icon}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-medium">{presentation.title}</p>
        {presentation.detail && (
          <p className="text-muted-foreground mt-0.5 text-sm">
            {presentation.detail}
          </p>
        )}
        <p className="text-muted-foreground mt-1 text-xs">
          {item.actor.displayName} ·{' '}
          <time dateTime={item.occurredAt}>
            {formatPartnerDateTime(item.occurredAt)}
          </time>
        </p>
      </div>
    </article>
  );
};

export const PartnerFollowUpNote: FC<{
  actionSavingEntryId: string | null;
  canManage: boolean;
  entry: PartnerFollowUp;
  onEdit: (entry: PartnerFollowUp, editableDeadlineMs: number) => void;
  onToggleAction: (entry: PartnerFollowUp, completed: boolean) => Promise<void>;
}> = ({ actionSavingEntryId, canManage, entry, onEdit, onToggleAction }) => {
  const actionDue = entry.action
    ? getPartnerActionDuePresentation(entry.action.dueOn)
    : null;
  const [editableDeadlineMs, setEditableDeadlineMs] = useState<number | null>(
    null,
  );

  useEffect((): (() => void) | undefined => {
    if (!entry.editPolicy.canEdit) {
      setEditableDeadlineMs(null);

      return;
    }

    const remainingMs = Number.isFinite(entry.editPolicy.remainingMs)
      ? Math.max(0, entry.editPolicy.remainingMs)
      : entry.editPolicy.editableUntil
        ? Math.max(
            0,
            new Date(entry.editPolicy.editableUntil).getTime() - Date.now(),
          )
        : 0;
    if (remainingMs <= 0) {
      setEditableDeadlineMs(null);

      return;
    }

    const deadline = Date.now() + remainingMs;
    setEditableDeadlineMs(deadline);
    const timeout = window.setTimeout(
      () => setEditableDeadlineMs(null),
      remainingMs,
    );

    return () => window.clearTimeout(timeout);
  }, [
    entry.editPolicy.canEdit,
    entry.editPolicy.editableUntil,
    entry.editPolicy.remainingMs,
  ]);

  return (
    <article
      className="bg-surface rounded-xl border p-4 shadow-[var(--shadow-panel)]"
      id={`suivi-${entry.id}`}
    >
      <div className="mb-3 flex min-w-0 items-start gap-3">
        <span className="bg-primary/10 text-primary-emphasis flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase">
          {entry.author.displayName.trim().charAt(0) || '—'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
            <p className="truncate text-sm font-semibold">
              {entry.author.displayName}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <time
                className="text-muted-foreground text-xs"
                dateTime={entry.occurredAt}
              >
                {formatPartnerDateTime(entry.occurredAt)}
              </time>
              {canManage && editableDeadlineMs !== null && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      aria-label="Modifier cette note"
                      className="size-7 rounded-md"
                      onClick={() => onEdit(entry, editableDeadlineMs)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <PencilLine className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Modifier cette note</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
          {entry.entryVersion > 1 && (
            <p className="text-muted-foreground mt-0.5 text-xs">
              Modifiée le {formatPartnerDateTime(entry.updatedAt)}
            </p>
          )}
        </div>
      </div>

      <p className="text-sm leading-6 whitespace-pre-wrap">{entry.text}</p>

      {entry.contact && (
        <Badge className="mt-3" variant="secondary">
          Interlocuteur · {entry.contact.displayName}
        </Badge>
      )}

      {entry.action && actionDue && (
        <div className="bg-surface-muted mt-3 rounded-lg border px-3 py-2.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {entry.action.completedAt ? (
                  <CheckCircle2 className="text-success size-4 shrink-0" />
                ) : (
                  <ClipboardList className="text-muted-foreground size-4 shrink-0" />
                )}
                <p className="text-sm font-medium">
                  {entry.action.description}
                </p>
              </div>
              <p
                className={cn(
                  'text-muted-foreground mt-1 pl-6 text-xs',
                  !entry.action.completedAt &&
                    actionDue.isOverdue &&
                    'text-destructive',
                )}
              >
                {entry.action.completedAt
                  ? `Terminée le ${formatPartnerDateTime(entry.action.completedAt)}${
                      entry.action.completedBy
                        ? ` par ${entry.action.completedBy.displayName}`
                        : ''
                    }`
                  : actionDue.label}
              </p>
            </div>
            {canManage && (
              <Button
                disabled={actionSavingEntryId !== null}
                onClick={() =>
                  void onToggleAction(entry, entry.action?.completedAt === null)
                }
                size="sm"
                type="button"
                variant={entry.action.completedAt ? 'ghost' : 'outline'}
              >
                {actionSavingEntryId === entry.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : entry.action.completedAt ? (
                  <RotateCcw className="size-4" />
                ) : (
                  <Check className="size-4" />
                )}
                {entry.action.completedAt ? 'Rouvrir' : 'Terminer'}
              </Button>
            )}
          </div>
        </div>
      )}
    </article>
  );
};
