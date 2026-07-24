'use client';

import {
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Loader2,
} from 'lucide-react';
import React, { type FC, useMemo, useState } from 'react';

import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { cn } from '$utils/css.utils';

import {
  getPartnerActionDuePresentation,
  sortOpenPartnerActions,
} from '../partner-timeline.ui';
import type { PartnerFollowUp } from '../types/partner.types';

const COMPACT_ACTION_COUNT = 3;

export const PartnerOpenActions: FC<{
  actionSavingEntryId: string | null;
  canManage: boolean;
  entries: readonly PartnerFollowUp[];
  onToggleAction: (entry: PartnerFollowUp, completed: boolean) => Promise<void>;
}> = ({ actionSavingEntryId, canManage, entries, onToggleAction }) => {
  const [showAll, setShowAll] = useState(false);
  const sortedEntries = useMemo(
    () => sortOpenPartnerActions(entries),
    [entries],
  );
  const visibleEntries = showAll
    ? sortedEntries
    : sortedEntries.slice(0, COMPACT_ACTION_COUNT);
  const hiddenCount = sortedEntries.length - COMPACT_ACTION_COUNT;

  if (!entries.length) return null;

  return (
    <section
      aria-labelledby="partner-open-actions-title"
      className="bg-surface rounded-xl border px-4 py-3"
    >
      <div className="flex items-center gap-2">
        <ClipboardList className="text-muted-foreground size-4" />
        <h2 className="text-sm font-semibold" id="partner-open-actions-title">
          À faire
        </h2>
        <Badge variant="secondary">{entries.length}</Badge>
      </div>
      <div className="mt-2 divide-y">
        {visibleEntries.map((entry) => {
          if (!entry.action) return null;
          const due = getPartnerActionDuePresentation(entry.action.dueOn);

          return (
            <div
              className="flex flex-wrap items-center gap-3 py-2 first:pt-1 last:pb-0"
              key={entry.id}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {entry.action.description}
                </p>
                <p
                  className={cn(
                    'text-muted-foreground mt-0.5 text-xs',
                    due.isOverdue && 'text-destructive',
                  )}
                >
                  {due.label}
                </p>
                <p
                  className="text-muted-foreground mt-1 line-clamp-1 text-xs"
                  title={entry.text}
                >
                  Contexte : {entry.text}
                </p>
              </div>
              {canManage && (
                <Button
                  disabled={actionSavingEntryId !== null}
                  onClick={() => void onToggleAction(entry, true)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {actionSavingEntryId === entry.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Terminer
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {hiddenCount > 0 && (
        <Button
          className="mt-2"
          onClick={() => setShowAll((current) => !current)}
          size="sm"
          type="button"
          variant="ghost"
        >
          {showAll ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
          {showAll ? 'Réduire' : `Afficher les ${hiddenCount} autres`}
        </Button>
      )}
    </section>
  );
};
