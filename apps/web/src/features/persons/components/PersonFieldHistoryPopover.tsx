'use client';

import { History, X } from 'lucide-react';
import Link from 'next/link';
import React, { type FC, useEffect, useRef, useState } from 'react';

import { ContentState } from '$components/layout/ContentState';
import { useUser } from '$context/UserContext';
import { Button } from '$ui/button';
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from '$ui/popover';
import { Skeleton } from '$ui/skeleton';

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

const formatHistoryValue = (value: unknown, fieldKey?: string): string => {
  if (value === null || value === undefined || value === '')
    return 'Non renseigné';
  if (fieldKey === 'isPrimary' && typeof value === 'boolean')
    return value ? 'Principal' : 'Secondaire';
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

const getFieldLabel = (fieldKey: string): string => {
  switch (fieldKey) {
    case 'birthDate':
      return 'Date de naissance';
    case 'email':
      return 'Adresse email';
    case 'firstName':
      return 'Prénom';
    case 'identifier':
      return 'Identifiant';
    case 'isPrimary':
      return 'Statut principal';
    case 'label':
      return 'Libellé';
    case 'lastName':
      return 'Nom';
    case 'networkKey':
      return 'Réseau';
    case 'nickname':
      return 'Pseudo principal';
    case 'phone':
      return 'Numéro de téléphone';
    case 'profileUrl':
      return 'URL du profil';
    case 'structureStatus':
      return 'Statut dans la structure';
    default:
      return fieldKey;
  }
};

const HistoryChange: FC<{
  after: unknown | null;
  before: unknown | null;
  fieldKey: string;
}> = ({ after, before, fieldKey }) => {
  const hasAfter = after !== null && after !== undefined && after !== '';
  const hasBefore = before !== null && before !== undefined && before !== '';

  if (hasBefore && hasAfter) {
    return (
      <dl className="bg-surface-inset mt-2 grid min-w-0 items-center gap-1 rounded-md px-3 py-2 text-xs sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-2">
        <div className="min-w-0">
          <dt className="text-muted-foreground">Avant</dt>
          <dd className="mt-0.5 break-words">
            {formatHistoryValue(before, fieldKey)}
          </dd>
        </div>
        <span
          className="text-muted-foreground hidden sm:block"
          aria-hidden="true"
        >
          →
        </span>
        <div className="min-w-0">
          <dt className="text-muted-foreground">Après</dt>
          <dd className="mt-0.5 break-words">
            {formatHistoryValue(after, fieldKey)}
          </dd>
        </div>
      </dl>
    );
  }
  if (hasAfter) {
    return (
      <p className="bg-surface-inset mt-2 rounded-md px-3 py-2 text-xs break-words">
        <span className="text-muted-foreground">Valeur ajoutée : </span>
        {formatHistoryValue(after, fieldKey)}
      </p>
    );
  }
  if (hasBefore) {
    return (
      <p className="bg-surface-inset mt-2 rounded-md px-3 py-2 text-xs break-words">
        <span className="text-muted-foreground">Valeur supprimée : </span>
        {formatHistoryValue(before, fieldKey)}
      </p>
    );
  }

  return null;
};

const HistoryEntry: FC<{
  fieldKey: string;
  item: PersonFieldHistoryItem;
}> = ({ fieldKey, item }) => (
  <li className="py-3 first:pt-0 last:pb-0">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <p className="text-sm">
        <span className="font-medium">{getFieldLabel(fieldKey)}</span>
        <span className="text-muted-foreground">
          {' · '}
          {getActionLabel(item.action).toLowerCase()}
        </span>
      </p>
      <time className="text-muted-foreground text-xs" dateTime={item.at}>
        {formatPersonDateTime(item.at)}
      </time>
    </div>
    <p className="text-muted-foreground mt-1 text-xs">
      Par {item.actor.displayName}
      {item.actor.loginName ? ` (${item.actor.loginName})` : ''}
    </p>
    <HistoryChange
      after={item.after}
      before={item.before}
      fieldKey={fieldKey}
    />
  </li>
);

const HistoryLoading: FC = () => (
  <div
    aria-label="Chargement de l'historique"
    className="space-y-3"
    role="status"
  >
    {[0, 1].map((item) => (
      <div className="border-border-divider space-y-2 border-b pb-3" key={item}>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    ))}
  </div>
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
  const [isExpired, setIsExpired] = useState(false);
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
    setIsExpired(false);
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
    setIsExpired(false);
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
          setIsExpired(true);
          setIsLoading(false);
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
      setIsExpired(false);
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
      <PopoverContent
        align="end"
        className="flex max-h-[min(36rem,calc(100svh-2rem))] w-[min(28rem,calc(100vw-2rem))] flex-col overflow-hidden p-0"
      >
        <div className="border-border-divider flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Historique</p>
            <p className="text-muted-foreground text-xs">{label}</p>
          </div>
          <PopoverClose asChild>
            <Button
              aria-label="Fermer l'historique"
              className="size-8"
              size="icon"
              type="button"
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
          </PopoverClose>
        </div>
        <div aria-live="polite" className="min-h-0 flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <HistoryLoading />
          ) : error ? (
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
          ) : isExpired ? (
            <div className="py-3 text-center">
              <p className="text-sm font-medium">Historique masqué</p>
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                Les valeurs ont été effacées après 30 secondes.
              </p>
              <Button
                className="mt-3"
                onClick={() => void load()}
                size="sm"
                type="button"
                variant="outline"
              >
                Recharger l&apos;historique
              </Button>
            </div>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground py-5 text-center text-sm">
              Aucun changement enregistré.
            </p>
          ) : (
            <ol className="divide-border-divider divide-y">
              {items.map((item) => (
                <HistoryEntry fieldKey={fieldKey} item={item} key={item.id} />
              ))}
            </ol>
          )}
        </div>
        {canViewAudit && (
          <div className="border-border-divider border-t p-3">
            <Button asChild className="w-full" size="sm" variant="outline">
              <Link href={journalHref}>Voir l&apos;historique complet</Link>
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
