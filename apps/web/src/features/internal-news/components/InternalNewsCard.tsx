'use client';

import { LoaderCircle, Megaphone, Pin, PinOff } from 'lucide-react';
import React, { type FC } from 'react';

import { DEFAULT_APPLICATION_TIME_ZONE } from '$constants/time.constants';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Card } from '$ui/card';
import { ServiceIcon } from '$ui/service-icon';
import { cn } from '$utils/css.utils';

import type { InternalNewsItem } from '../internal-news.types';

const formatOccurrence = (value: string): string =>
  new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: DEFAULT_APPLICATION_TIME_ZONE,
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
    <Card
      as="article"
      className={cn(
        'group hover:border-border-strong relative transition-colors duration-200',
        item.isPinned && 'border-primary/35 bg-surface-selected',
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 left-0 w-1',
          item.isPinned ? 'bg-primary' : 'bg-border-default',
        )}
      />

      <div className="p-4 pl-5 sm:p-5 sm:pl-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <ServiceIcon>
            <Megaphone className="size-5" />
          </ServiceIcon>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Annonce</Badge>
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

            <h3 className="mt-3 text-base leading-6 font-semibold [overflow-wrap:anywhere]">
              {item.title}
            </h3>
            <p className="text-muted-foreground mt-1.5 max-w-[70ch] text-sm leading-6 [overflow-wrap:anywhere] whitespace-pre-wrap">
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
                  className="size-10 lg:size-8"
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
    </Card>
  );
};
