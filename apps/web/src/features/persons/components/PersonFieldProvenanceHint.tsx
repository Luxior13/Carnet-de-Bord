'use client';

import { History } from 'lucide-react';
import React, {
  type FC,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useUser } from '$context/UserContext';
import { Button } from '$ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';

import { getPersonFieldHistory } from '../person.api';
import { formatPersonDateTime } from '../person.ui';
import type { PersonAuditActor } from '../types/person.types';

export type PersonFieldProvenanceTarget = {
  fieldKey: string;
  label: string;
  personId: string;
  recordId?: string;
  revision: number;
  sectionKey: string;
};

type Provenance = {
  action: string;
  actor: PersonAuditActor;
  at: string;
};

type PersonFieldProvenanceHintProps = {
  target?: PersonFieldProvenanceTarget;
};

const getProvenanceLabel = (action: string): string =>
  action.toUpperCase() === 'CREATE' ? 'Renseigné' : 'Dernière modification';

export const PersonFieldProvenanceHint: FC<PersonFieldProvenanceHintProps> = ({
  target,
}) => {
  const { authorizationRevision, userData } = useUser();
  const [error, setError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [provenance, setProvenance] = useState<Provenance | null>(null);
  const [resolved, setResolved] = useState(false);
  const requestIdRef = useRef(0);
  const requestRef = useRef<AbortController | null>(null);
  const targetRef = useRef(target);
  const openRef = useRef(false);
  targetRef.current = target;

  const clearCachedProvenance = useCallback((): void => {
    requestIdRef.current += 1;
    requestRef.current?.abort();
    requestRef.current = null;
    setError(false);
    setLoading(false);
    setProvenance(null);
    setResolved(false);
  }, []);

  const load = useCallback(async (): Promise<void> => {
    const currentTarget = targetRef.current;
    if (!currentTarget || requestRef.current) return;

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15_000);
    setError(false);
    setLoading(true);
    try {
      const response = await getPersonFieldHistory({
        ...currentTarget,
        signal: controller.signal,
      });
      if (requestId !== requestIdRef.current) return;

      const latest = response.items[0];
      setProvenance(
        latest
          ? {
              action: latest.action,
              actor: latest.actor,
              at: latest.at,
            }
          : null,
      );
      setResolved(true);
    } catch {
      if (requestId === requestIdRef.current) setError(true);
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === controller) requestRef.current = null;
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearCachedProvenance();
    if (openRef.current) void load();

    return (): void => {
      requestIdRef.current += 1;
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [
    authorizationRevision,
    clearCachedProvenance,
    load,
    target?.fieldKey,
    target?.personId,
    target?.recordId,
    target?.revision,
    target?.sectionKey,
    userData?.id,
  ]);

  if (!target) return null;

  const handleOpenChange = (open: boolean): void => {
    openRef.current = open;
    setIsOpen(open);
    if (open && !loading && !resolved) void load();
    if (!open && requestRef.current) {
      requestIdRef.current += 1;
      requestRef.current.abort();
      requestRef.current = null;
      setLoading(false);
    }
  };

  return (
    <Tooltip onOpenChange={handleOpenChange} open={isOpen}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="inline"
          aria-label={`Historique : ${target.label}`}
          className="text-muted-foreground hover:bg-surface-control-hover hover:text-foreground focus-visible:ring-ring/40 inline-flex size-6 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-2"
          onClick={() => handleOpenChange(!isOpen)}
          type="button"
        >
          <History className="size-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72 space-y-0.5 px-3 py-2" side="top">
        {loading ? (
          <span>Chargement…</span>
        ) : error ? (
          <span>Information indisponible. Fermez puis réessayez.</span>
        ) : provenance ? (
          <>
            <p>
              {getProvenanceLabel(provenance.action)} par{' '}
              <span className="font-medium">
                {provenance.actor.displayName}
              </span>
              {provenance.actor.loginName
                ? ` (${provenance.actor.loginName})`
                : ''}
            </p>
            <time
              className="text-muted-foreground block"
              dateTime={provenance.at}
            >
              {formatPersonDateTime(provenance.at)}
            </time>
          </>
        ) : resolved ? (
          <span>Origine non enregistrée.</span>
        ) : (
          <span>Chargement…</span>
        )}
      </TooltipContent>
    </Tooltip>
  );
};
