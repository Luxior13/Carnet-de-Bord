'use client';

import { History, Loader2 } from 'lucide-react';
import Link from 'next/link';
import React, { type FC, useEffect, useRef, useState } from 'react';

import { ContentState } from '$components/layout/ContentState';
import { useUser } from '$context/UserContext';
import { Button } from '$ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '$ui/popover';

import { getPersonFieldHistory } from '../person.api';
import { formatPersonDateTime, getPersonFieldJournalHref } from '../person.ui';
import type { PersonFieldHistoryItem } from '../types/person.types';

type PersonFieldHistoryPopoverProps = {
  canViewAudit: boolean;
  fieldKey: string;
  label: string;
  personId: string;
  recordId?: string;
  revision: number;
  sectionKey: string;
};

const DECRYPTED_HISTORY_TTL_MS = 30_000;

const formatHistoryValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '')
    return 'Non renseigné';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'string' || typeof value === 'number')
    return String(value);

  return JSON.stringify(value);
};

const getActionLabel = (action: string): string => {
  switch (action.toUpperCase()) {
    case 'CREATE':
      return 'Ajout';
    case 'DELETE':
      return 'Suppression';
    case 'UPDATE':
      return 'Modification';
    default:
      return action;
  }
};

const HistoryEntry: FC<{ item: PersonFieldHistoryItem }> = ({ item }) => (
  <li className="border-border-divider space-y-2 border-b pb-3 last:border-0 last:pb-0">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <span className="text-sm font-medium">{getActionLabel(item.action)}</span>
      <time className="text-muted-foreground text-xs" dateTime={item.at}>
        {formatPersonDateTime(item.at)}
      </time>
    </div>
    <p className="text-muted-foreground text-xs">
      Par {item.actor.displayName}
      {item.actor.loginName ? ` (${item.actor.loginName})` : ''}
    </p>
    {(item.before !== null || item.after !== null) && (
      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <div className="bg-surface-inset min-w-0 rounded-md p-2">
          <dt className="text-muted-foreground">Avant</dt>
          <dd className="mt-1 break-words">
            {formatHistoryValue(item.before)}
          </dd>
        </div>
        <div className="bg-surface-inset min-w-0 rounded-md p-2">
          <dt className="text-muted-foreground">Après</dt>
          <dd className="mt-1 break-words">{formatHistoryValue(item.after)}</dd>
        </div>
      </dl>
    )}
  </li>
);

export const PersonFieldHistoryPopover: FC<PersonFieldHistoryPopoverProps> = ({
  canViewAudit,
  fieldKey,
  label,
  personId,
  recordId,
  revision,
  sectionKey,
}) => {
  const { authorizationRevision } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PersonFieldHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const clearExpiryTimer = (): void => {
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    expiryTimerRef.current = null;
  };

  useEffect(
    (): (() => void) => () => {
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
      requestIdRef.current += 1;
    },
    [],
  );

  useEffect((): void => {
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    expiryTimerRef.current = null;
    requestIdRef.current += 1;
    setItems([]);
    setError(null);
    setIsLoading(false);
    setOpen(false);
  }, [
    authorizationRevision,
    canViewAudit,
    fieldKey,
    personId,
    recordId,
    revision,
    sectionKey,
  ]);

  const load = async (): Promise<void> => {
    const requestId = ++requestIdRef.current;
    clearExpiryTimer();
    setError(null);
    setIsLoading(true);
    try {
      const response = await getPersonFieldHistory({
        fieldKey,
        personId,
        ...(recordId ? { recordId } : {}),
        sectionKey,
      });
      if (requestId === requestIdRef.current) {
        setItems(response.items);
        expiryTimerRef.current = setTimeout(() => {
          requestIdRef.current += 1;
          setItems([]);
          setError(null);
          setIsLoading(false);
          setOpen(false);
          expiryTimerRef.current = null;
        }, DECRYPTED_HISTORY_TTL_MS);
      }
    } catch (caught) {
      if (requestId === requestIdRef.current) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Impossible de charger l'historique",
        );
      }
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean): void => {
    setOpen(nextOpen);
    if (nextOpen) {
      void load();
    } else {
      clearExpiryTimer();
      requestIdRef.current += 1;
      setItems([]);
      setError(null);
      setIsLoading(false);
    }
  };

  const journalHref = getPersonFieldJournalHref({
    fieldKey,
    personId,
    ...(recordId ? { recordId } : {}),
    sectionKey,
  });

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          aria-label={`Afficher l'historique : ${label}`}
          className="size-7"
          size="icon"
          type="button"
          variant="ghost"
        >
          <History className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(26rem,calc(100vw-2rem))]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Historique</p>
            <p className="text-muted-foreground text-xs">{label}</p>
          </div>
          {isLoading && (
            <Loader2 aria-label="Chargement" className="size-4 animate-spin" />
          )}
        </div>
        <div className="mt-3">
          {error ? (
            <ContentState
              action={
                <Button onClick={() => void load()} size="sm" variant="outline">
                  Réessayer
                </Button>
              }
              description={error}
              kind="error"
              title="Historique indisponible"
            />
          ) : !isLoading && items.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              Aucun changement enregistré.
            </p>
          ) : (
            <ol className="space-y-3">
              {items.map((item) => (
                <HistoryEntry item={item} key={item.id} />
              ))}
            </ol>
          )}
        </div>
        {canViewAudit && (
          <Button asChild className="mt-3 w-full" size="sm" variant="outline">
            <Link href={journalHref}>Voir dans le journal d&apos;activité</Link>
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
};
