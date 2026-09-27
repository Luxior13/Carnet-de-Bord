'use client';

import { ChevronDown, Clipboard, Filter, Key } from 'lucide-react';
import { type FC } from 'react';
import { toast } from 'sonner';

import { Disclosure } from '$components/layout/Disclosure';
import { PERMISSION_CATEGORIES } from '$constants/permissions.constants';
import { Button } from '$ui/button';
import { cn } from '$utils/css.utils';

import {
  formatPersonAuditValue,
  getPersonAuditFieldLabel,
  getPersonAuditSectionLabel,
} from '../persons/person-audit-display';
import {
  type AuditChangeDiff,
  formatAuditChangeValue,
  formatAuditFullDate,
  getAuditActionDisplay,
  getAuditChangeDiffs,
  getAuditChangeFieldLabel,
} from './audit-display';
import { normalizeJournalPageKey } from './journal-filters';
import type {
  PersonJournalFieldChange,
  SystemActivityJournalLog as JournalLog,
} from './system-activity.types';

const operationLabels = new Map([
  ['CREATE', 'Ajout'],
  ['UPDATE', 'Modification'],
  ['DELETE', 'Suppression'],
]);

const ChangeItem: FC<{
  change: AuditChangeDiff | PersonJournalFieldChange;
}> = ({ change }) => {
  const { after, before, fieldKey } = change;
  const personChange = 'sectionKey' in change ? change : null;
  const factOnly = [
    'passwordChange',
    'passwordReset',
    'revokedSessions',
  ].includes(fieldKey);
  const format = (value: unknown): string =>
    (personChange ? formatPersonAuditValue(fieldKey, value) : null) ??
    formatAuditChangeValue(fieldKey, value);

  return (
    <div className="border-border-divider grid min-w-0 gap-2 border-b py-3 last:border-0 @min-[40rem]/page:grid-cols-[13rem_minmax(0,1fr)]">
      <div className="min-w-0 space-y-1">
        <p className="text-foreground text-sm font-medium">
          {personChange
            ? getPersonAuditFieldLabel(fieldKey)
            : getAuditChangeFieldLabel(fieldKey)}
        </p>
        {personChange && (
          <p className="text-muted-foreground text-xs leading-5 break-words">
            {getPersonAuditSectionLabel(personChange.sectionKey)} ·{' '}
            {operationLabels.get(personChange.action) ?? personChange.action}
            {personChange.recordId && (
              <span className="block">
                Enregistrement :{' '}
                <code className="break-all">{personChange.recordId}</code>
              </span>
            )}
          </p>
        )}
      </div>
      {factOnly ? (
        <p className="text-foreground text-sm break-all whitespace-pre-wrap">
          {format(after)}
        </p>
      ) : (
        <dl className="grid min-w-0 gap-3 text-sm @min-[48rem]/page:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-muted-foreground mb-1 text-xs">Avant</dt>
            <dd className="text-muted-foreground break-all whitespace-pre-wrap">
              {format(before)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground mb-1 text-xs">Après</dt>
            <dd className="text-foreground break-all whitespace-pre-wrap">
              {format(after)}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
};

const CopyableTechnicalValue: FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="border-border-divider grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 border-b py-2 text-xs last:border-0">
    <div className="min-w-0 space-y-1">
      <p className="text-muted-foreground">{label}</p>
      <code className="text-foreground block break-all whitespace-pre-wrap">
        {value}
      </code>
    </div>
    <Button
      aria-label={`Copier ${label}`}
      className="size-11 rounded-[8px] lg:size-10"
      size="icon"
      type="button"
      variant="ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          toast.success('Valeur copiée');
        } catch {
          toast.error('Impossible de copier cette valeur');
        }
      }}
    >
      <Clipboard aria-hidden="true" className="size-4" />
    </Button>
  </div>
);

const getLocationLabel = (log: JournalLog): string => {
  const pageKey = normalizeJournalPageKey(
    log.pageKey ??
      (typeof log.metadata?.pageKey === 'string' ? log.metadata.pageKey : ''),
  );
  const knownPage = PERMISSION_CATEGORIES.find(
    ({ key }) => key === pageKey,
  )?.label;
  if (knownPage) return knownPage;
  if (typeof log.metadata?.pageLabel === 'string')
    return log.metadata.pageLabel;
  if (pageKey === 'account') return 'Mon compte';
  if (log.category === 'AUTH') return 'Authentification';
  if (log.category === 'PERSON') return 'Personnes';
  if (log.category === 'PARTNER') return 'Partenaires (historique)';
  if (log.category === 'USER' || log.category === 'PERMISSION')
    return 'Utilisateurs';

  return 'Système';
};

export const JournalEventRow: FC<{
  isOpen: boolean;
  log: JournalLog;
  onIdentityFilter: (
    identity: string,
    scope: 'actor' | 'target',
    userId: string | null,
  ) => void;
  onToggle: () => void;
}> = ({ isOpen, log, onIdentityFilter, onToggle }) => {
  const config = getAuditActionDisplay(log.action, log.metadata);
  const EventIcon = config.icon;
  const changes: (AuditChangeDiff | PersonJournalFieldChange)[] = log
    .fieldChanges?.length
    ? log.fieldChanges
    : getAuditChangeDiffs(log.metadata);
  const actorLabel =
    log.actorName ??
    log.actorSnapshot?.displayName ??
    log.actorSnapshot?.loginName ??
    log.userId ??
    'Système';
  const targetLabel =
    log.targetName ??
    log.targetSnapshot?.displayName ??
    log.targetSnapshot?.loginName ??
    log.targetUserId;
  const locationLabel = getLocationLabel(log);
  const entityLabel =
    log.entityType === 'PERSON' && log.entityId
      ? (log.entityDisplayName ?? `Fiche indisponible · ${log.entityId}`)
      : (log.entityDisplayName ?? log.entityId);
  const objectLabel = entityLabel ?? targetLabel;
  const detailsId = `journal-details-${log.id}`;
  const status =
    log.severity === 'CRITICAL'
      ? { color: 'text-destructive border-destructive/40', label: 'Critique' }
      : log.outcome === 'FAILURE'
        ? { color: 'text-destructive border-destructive/40', label: 'Échec' }
        : log.severity === 'WARNING'
          ? { color: 'text-warning border-warning/40', label: 'À surveiller' }
          : null;
  const date = new Date(log.createdAt);
  const shortDate = Number.isNaN(date.getTime())
    ? 'Date inconnue'
    : date.toLocaleString('fr-FR', {
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
  const technicalValues = [
    ['Action', log.action],
    ['Catégorie', log.category],
    ['Identifiant', log.id],
    ['Requête', log.requestId],
    ['Adresse IP', log.ipAddress],
    ['Navigateur', log.userAgent],
    ['Type', log.eventKind],
    ['Flux', log.stream],
    ['Résultat', log.outcome],
    ['Gravité', log.severity],
    ['Version', log.eventVersion?.toString()],
    ['Type d’entité', log.entityType],
    ['Identifiant d’entité', log.entityId],
    ['Auteur (identifiant)', log.userId],
    ['Compte concerné (identifiant)', log.targetUserId],
    ['Onglet', log.tabKey],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <article
      className="border-border-divider min-w-0 border-b last:border-b-0"
      data-log-id={log.id}
    >
      <button
        type="button"
        aria-controls={detailsId}
        aria-expanded={isOpen}
        onClick={onToggle}
        className={cn(
          'text-foreground hover:bg-surface-control-hover focus-visible:bg-surface-control-hover focus-visible:outline-ring grid w-full min-w-0 cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)_1.25rem] items-start gap-x-3 gap-y-1 px-4 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 @min-[34rem]/page:grid-cols-[1.25rem_minmax(0,1fr)_10rem_1.25rem] @min-[48rem]/page:grid-cols-[1.25rem_minmax(0,1fr)_10rem_10rem_1.25rem] @min-[64rem]/page:grid-cols-[1.25rem_minmax(0,1fr)_13rem_10rem_1.25rem]',
          isOpen && 'bg-surface-control-hover',
        )}
      >
        <EventIcon
          aria-hidden="true"
          className="text-muted-foreground col-start-1 row-start-1 mt-0.5 size-4"
        />
        <span className="col-start-2 row-start-1 min-w-0" data-event-summary>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium break-words">
            {config.label}
            {status && (
              <span
                className={cn(
                  'rounded border px-1.5 text-xs leading-4 font-normal',
                  status.color,
                )}
              >
                {status.label}
              </span>
            )}
          </span>
          <span className="text-muted-foreground mt-1 block text-xs leading-5 break-words">
            {objectLabel ? `${objectLabel} · ${locationLabel}` : locationLabel}
          </span>
          <span className="text-muted-foreground mt-1 block text-xs leading-5 break-words @min-[48rem]/page:hidden">
            Par {actorLabel}
          </span>
        </span>
        <span className="col-start-3 row-start-1 hidden min-w-0 text-sm leading-5 break-words @min-[48rem]/page:block">
          {actorLabel}
        </span>
        <time
          className="text-muted-foreground col-start-2 row-start-2 text-xs leading-5 tabular-nums @min-[34rem]/page:col-start-3 @min-[34rem]/page:row-start-1 @min-[34rem]/page:text-right @min-[48rem]/page:col-start-4"
          dateTime={log.createdAt}
          title={formatAuditFullDate(log.createdAt)}
        >
          {shortDate}
        </time>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'col-start-3 row-start-1 mt-0.5 size-4 @min-[34rem]/page:col-start-4 @min-[48rem]/page:col-start-5',
            isOpen && 'rotate-180',
          )}
        />
      </button>
      {isOpen && (
        <div
          className="border-border-divider bg-surface-panel border-t px-4 py-4"
          id={detailsId}
        >
          <div className="space-y-4">
            <p className="text-muted-foreground text-xs">
              {formatAuditFullDate(log.createdAt)}
            </p>
            {log.description && (
              <p className="text-foreground text-sm leading-6 break-words">
                {log.description}
              </p>
            )}
            {log.entityType === 'PERSON' && log.entityDisplayName && (
              <p className="text-muted-foreground text-xs">
                Nom actuel de la fiche : {log.entityDisplayName}. Les valeurs
                ci-dessous correspondent à l’événement.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {actorLabel !== 'Système' && (
                <Button
                  className="h-auto min-h-11 max-w-full rounded-[8px] py-2 whitespace-normal lg:min-h-10"
                  variant="outline"
                  onClick={() =>
                    onIdentityFilter(actorLabel, 'actor', log.userId)
                  }
                >
                  <Filter aria-hidden="true" className="size-4 shrink-0" />
                  <span className="break-words">
                    Filtrer par auteur : {actorLabel}
                  </span>
                </Button>
              )}
              {targetLabel && (
                <Button
                  className="h-auto min-h-11 max-w-full rounded-[8px] py-2 whitespace-normal lg:min-h-10"
                  variant="outline"
                  onClick={() =>
                    onIdentityFilter(targetLabel, 'target', log.targetUserId)
                  }
                >
                  <Filter aria-hidden="true" className="size-4 shrink-0" />
                  <span className="break-words">
                    Filtrer par compte concerné : {targetLabel}
                  </span>
                </Button>
              )}
            </div>
            {changes.length > 0 && (
              <section aria-labelledby={`${detailsId}-changes`}>
                <h3
                  className="text-foreground text-sm font-semibold"
                  id={`${detailsId}-changes`}
                >
                  Changements ({changes.length})
                </h3>
                {changes.map((change) => (
                  <ChangeItem
                    key={'id' in change ? change.id : change.fieldKey}
                    change={change}
                  />
                ))}
              </section>
            )}
            <Disclosure
              className="[&>button]:min-h-11 lg:[&>button]:min-h-10 [&>button>svg]:transition-none"
              label="Détails techniques"
              icon={<Key aria-hidden="true" className="size-4" />}
            >
              <div className="mt-2">
                {technicalValues.map(([label, value]) => (
                  <CopyableTechnicalValue
                    key={label}
                    label={label}
                    value={value}
                  />
                ))}
                {log.metadata && (
                  <CopyableTechnicalValue
                    label="Métadonnées"
                    value={JSON.stringify(log.metadata, null, 2)}
                  />
                )}
              </div>
            </Disclosure>
          </div>
        </div>
      )}
    </article>
  );
};
