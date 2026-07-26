'use client';

import {
  ArrowUpRight,
  Handshake,
  LoaderCircle,
  Megaphone,
  Pin,
  PinOff,
} from 'lucide-react';
import Link from 'next/link';
import React, { type FC } from 'react';

import { PARTNER_STATUS_LABELS } from '$features/partners/partner.constants';
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

const getStatusLabel = (value: string | null): string | null => {
  if (!value) return null;

  return (
    Object.entries(PARTNER_STATUS_LABELS).find(
      ([status]) => status === value,
    )?.[1] ?? value
  );
};

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
  const isAnnouncement = item.kind === 'ANNOUNCEMENT';
  const fromStatus =
    item.kind === 'PARTNER_EVENT'
      ? getStatusLabel(item.statusTransition.from)
      : null;
  const toStatus =
    item.kind === 'PARTNER_EVENT'
      ? getStatusLabel(item.statusTransition.to)
      : null;

  return (
    <article
      className={cn(
        'group border-border-default bg-surface-panel hover:border-border-strong relative overflow-hidden rounded-2xl border shadow-[var(--shadow-panel)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-panel-strong)]',
        isAnnouncement &&
          item.isPinned &&
          'border-primary/35 from-primary/10 via-surface-panel to-surface-panel bg-gradient-to-br',
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 left-0 w-1',
          isAnnouncement
            ? item.isPinned
              ? 'bg-primary'
              : 'bg-primary/55'
            : 'bg-info',
        )}
      />

      <div className="p-4 pl-5 sm:p-5 sm:pl-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl border',
              isAnnouncement
                ? 'border-primary/25 bg-primary/10 text-primary-emphasis'
                : 'border-info/25 bg-info/10 text-info',
            )}
          >
            {isAnnouncement ? (
              <Megaphone className="size-5" />
            ) : (
              <Handshake className="size-5" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isAnnouncement ? 'default' : 'info'}>
                {isAnnouncement ? 'Annonce' : 'Partenaires'}
              </Badge>
              {isAnnouncement && item.isPinned && (
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

            {item.kind === 'PARTNER_EVENT' && toStatus && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {fromStatus && (
                  <>
                    <Badge variant="secondary">{fromStatus}</Badge>
                    <span
                      aria-hidden="true"
                      className="text-muted-foreground text-xs"
                    >
                      →
                    </span>
                  </>
                )}
                <Badge variant="outline">{toStatus}</Badge>
              </div>
            )}

            <div className="border-border-subtle mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
              <p className="text-muted-foreground min-w-0 truncate text-xs">
                Par{' '}
                <span className="text-foreground font-medium">
                  {item.actor.displayName}
                </span>
              </p>
              <div className="flex items-center gap-1.5">
                {isAnnouncement && canManage && (
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
                {item.href && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={item.href}>
                      Voir la fiche
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
