'use client';

import { ArrowLeft, Pencil, Plus, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import React, {
  type FC,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useUser } from '$context/UserContext';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Skeleton } from '$ui/skeleton';

import { getPersonFieldHistory } from '../person.api';
import { formatPersonDateTime, getPersonFieldJournalHref } from '../person.ui';
import type { PersonFieldHistoryItem } from '../types/person.types';

export type PersonFieldHistoryTarget = {
  canViewAudit: boolean;
  fieldKey: string;
  label: string;
  personId: string;
  recordId: string;
  revision: number;
  sectionKey: string;
};

type PersonFieldHistoryPanelProps = PersonFieldHistoryTarget & {
  onClose: () => void;
};

const DECRYPTED_HISTORY_TTL_MS = 30_000;

const formatValue = (value: unknown, fieldKey: string): string => {
  if (value === null || value === undefined || value === '') {
    return 'Non renseigné';
  }
  if (fieldKey === 'isPrimary' && typeof value === 'boolean') {
    return value ? 'Principal' : 'Secondaire';
  }
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  return JSON.stringify(value);
};

const HistoryActionBadge: FC<{ action: string }> = ({ action }) => {
  switch (action.toUpperCase()) {
    case 'CREATE':
      return (
        <Badge variant="success">
          <Plus />
          Ajout
        </Badge>
      );
    case 'DELETE':
      return (
        <Badge variant="destructive">
          <Trash2 />
          Suppression
        </Badge>
      );
    default:
      return (
        <Badge variant="info">
          <Pencil />
          Modification
        </Badge>
      );
  }
};

const HistoryEntry: FC<{
  fieldKey: string;
  item: PersonFieldHistoryItem;
}> = ({ fieldKey, item }) => (
  <li className="space-y-1.5 py-3 first:pt-0 last:pb-0">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <HistoryActionBadge action={item.action} />
      <time className="text-muted-foreground text-xs" dateTime={item.at}>
        {formatPersonDateTime(item.at)}
      </time>
    </div>
    <p className="text-muted-foreground text-xs">
      Par {item.actor.displayName}
      {item.actor.loginName ? ` (${item.actor.loginName})` : ''}
    </p>
    <p className="text-xs break-words">
      <span className="text-muted-foreground">
        {item.before === null ? 'Valeur ajoutée : ' : 'Avant : '}
      </span>
      {formatValue(item.before === null ? item.after : item.before, fieldKey)}
      {item.before !== null && item.after !== null && (
        <>
          <span className="text-muted-foreground"> → Après : </span>
          {formatValue(item.after, fieldKey)}
        </>
      )}
      {item.before !== null && item.after === null && (
        <span className="text-muted-foreground"> → Valeur supprimée</span>
      )}
    </p>
  </li>
);

export const PersonFieldHistoryPanel: FC<PersonFieldHistoryPanelProps> = ({
  canViewAudit,
  fieldKey,
  label,
  onClose,
  personId,
  recordId,
  revision,
  sectionKey,
}) => {
  const { authorizationRevision } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [items, setItems] = useState<PersonFieldHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async (): Promise<void> => {
    const requestId = ++requestIdRef.current;
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    expiryTimerRef.current = null;
    setError(null);
    setExpired(false);
    setItems([]);
    setLoading(true);
    try {
      const response = await getPersonFieldHistory({
        fieldKey,
        personId,
        recordId,
        sectionKey,
      });
      if (requestId !== requestIdRef.current) return;
      setItems(response.items);
      expiryTimerRef.current = setTimeout(() => {
        requestIdRef.current += 1;
        setItems([]);
        setExpired(true);
        setLoading(false);
        expiryTimerRef.current = null;
      }, DECRYPTED_HISTORY_TTL_MS);
    } catch (caught) {
      if (requestId === requestIdRef.current) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Impossible de charger l'historique",
        );
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [fieldKey, personId, recordId, sectionKey]);

  useEffect(() => {
    void load();

    return (): void => {
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
      requestIdRef.current += 1;
    };
  }, [authorizationRevision, load, revision]);

  const journalHref = getPersonFieldJournalHref({
    fieldKey,
    personId,
    recordId,
    sectionKey,
  });

  return (
    <aside
      aria-label={`Historique : ${label}`}
      className="border-border-divider min-w-0 lg:border-l lg:pl-5"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Historique</p>
          <p className="text-muted-foreground truncate text-xs">{label}</p>
        </div>
        <Button
          aria-label="Revenir aux informations"
          className="shrink-0 lg:hidden"
          onClick={onClose}
          size="sm"
          type="button"
          variant="outline"
        >
          <ArrowLeft className="size-4" />
          Retour
        </Button>
        <Button
          aria-label="Fermer l'historique"
          className="hidden size-8 shrink-0 lg:inline-flex"
          onClick={onClose}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div aria-live="polite">
        {loading ? (
          <div
            aria-label="Chargement de l'historique"
            className="space-y-3"
            role="status"
          >
            {[0, 1].map((item) => (
              <div className="space-y-2" key={item}>
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="space-y-3">
            <p className="text-destructive text-xs">{error}</p>
            <Button
              onClick={() => void load()}
              size="sm"
              type="button"
              variant="outline"
            >
              Réessayer
            </Button>
          </div>
        ) : expired ? (
          <div className="space-y-3">
            <p className="text-muted-foreground text-xs">
              Historique masqué après 30 secondes.
            </p>
            <Button
              onClick={() => void load()}
              size="sm"
              type="button"
              variant="outline"
            >
              Recharger
            </Button>
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-xs">
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

      {canViewAudit && !loading && (
        <Button
          asChild
          className="mt-4 h-8 px-0 text-xs"
          size="sm"
          variant="link"
        >
          <Link href={journalHref}>Voir dans le journal complet</Link>
        </Button>
      )}
    </aside>
  );
};
