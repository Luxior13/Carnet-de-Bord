'use client';

import { LoaderCircle, Megaphone, Pin, PinOff } from 'lucide-react';
import React, { type FC } from 'react';

import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { cn } from '$utils/css.utils';

import type { InternalNewsItem } from '../internal-news.types';

const APPLICATION_TIME_ZONE = 'Europe/Paris';

const formatOccurrence = (value: string): string =>
  new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: APPLICATION_TIME_ZONE,
  }).format(new Date(value));

type InternalNewsCardProps = {
  canManage: boolean;
  item: InternalNewsItem;
  onTogglePin: (item: InternalNewsItem) => void;
  pinPending: boolean;
};

export const InternalNewsCard: FC<InternalNewsCardProps> = ({
  canManage,
  item,
  onTogglePin,
  pinPending,
}) => {
  return (
    <article
      className={cn(
        'group border-border-default bg-surface-panel hover:border-border-strong relative overflow-hidden rounded-2xl border shadow-[var(--shadow-panel)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-panel-strong)]',
        item.isPinned &&
          'border-primary/35 from-primary/10 via-surface-panel to-surface-panel bg-gradient-to-br',
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 left-0 w-1',
          item.isPinned ? 'bg-primary' : 'bg-primary/55',
        )}
      />

      <div className="p-4 pl-5 sm:p-5 sm:pl-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <span className="border-primary/25 bg-primary/10 text-primary-emphasis flex size-10 shrink-0 items-center justify-center rounded-xl border">
            <Megaphone className="size-5" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">Annonce</Badge>
              {item.isPinned && (
                <Badge variant="secondary">
                  <Pin className="size-3" />
                  Épinglée
                </Badge>
              )}
              <span className="text-muted-foreground text-xs">
                {formatOccurrence(item.occurredAt)}
              </span>
            </div>

            <h2 className="mt-3 text-base leading-6 font-semibold sm:text-lg">
              {item.title}
            </h2>
            <p className="text-muted-foreground mt-1.5 text-sm leading-6 whitespace-pre-wrap">
              {item.body}
            </p>

            <div className="border-border-subtle mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
              <p className="text-muted-foreground min-w-0 truncate text-xs">
                Par{' '}
                <span className="text-foreground font-medium">
                  {item.actor.displayName}
                </span>
              </p>
              {canManage && (
                <Button
                  aria-label={
                    item.isPinned
                      ? "Désépingler l'actualité"
                      : "Épingler l'actualité"
                  }
                  className="size-8"
                  disabled={pinPending}
                  onClick={() => onTogglePin(item)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  {pinPending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : item.isPinned ? (
                    <PinOff className="size-4" />
                  ) : (
                    <Pin className="size-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
