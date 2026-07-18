'use client';

import {
  ChevronDown,
  Clipboard,
  Download,
  Filter,
  Home,
  Key,
  Loader2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { ContentState } from '$components/layout/ContentState';
import { PageHero } from '$components/layout/PageHero';
import { AccessDeniedState } from '$components/layout/PageState';
import { AdminStepUpDialog } from '$components/users/user-detail/AdminStepUpDialog';
import {
  canShowNavigationItem,
  type NavigationSpace,
  type NavItem,
} from '$constants/app.constants';
import { FEATURES } from '$constants/feature-registry.constants';
import {
  getNavigationIcon,
  type NavigationIconName,
} from '$constants/navigation-icon.constants';
import {
  getNavigationSpaceToneClasses,
  type NavigationSpaceTone,
} from '$constants/navigation-theme.constants';
import {
  hasPermission,
  PERMISSION_CATEGORIES,
  PERMISSION_POLES,
  PERMISSIONS,
} from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
import { type ApiResponse, ErrorCode } from '$types/api.types';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Input } from '$ui/input';
import { PageCanvas, PageShell } from '$ui/page-shell';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';
import { Skeleton } from '$ui/skeleton';
import { cn } from '$utils/css.utils';

import {
  AUDIT_ACTION_DISPLAY,
  AUDIT_ACTION_OPTIONS,
  type AuditChangeDiff,
  DEFAULT_AUDIT_ACTION_DISPLAY,
  formatAuditChangeValue,
  formatAuditFullDate,
  formatAuditRelativeTime,
  getAuditChangeDiffs,
  getAuditChangeFieldLabel,
  toValidAuditDate,
} from './audit-display';

type SystemActivityJournalPageProps = {
  item: NavItem;
  space: NavigationSpace;
};

type JournalLogType = 'activity' | 'connections';
type JournalExportFormat = 'csv' | 'json';

type JournalLog = {
  action: string;
  actorName: string | null;
  actorSnapshot?: IdentitySnapshot | null;
  category: string;
  createdAt: string;
  description: string;
  eventKind?: string | null;
  eventVersion?: number | null;
  id: string;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  outcome?: string | null;
  pageKey?: string | null;
  poleKey?: string | null;
  requestId?: string | null;
  severity?: string | null;
  stream?: string | null;
  tabKey?: string | null;
  targetName: string | null;
  targetSnapshot?: IdentitySnapshot | null;
  targetUserId: string | null;
  userAgent?: string | null;
  userId: string | null;
};

type IdentitySnapshot = {
  displayName?: string | null;
  loginName?: string | null;
};

type JournalResponse = {
  logs: JournalLog[];
  nextCursor: string | null;
  pageSize: number;
  sensitiveDetailsVisible?: boolean;
  snapshotAt?: string;
};

type JournalFilters = {
  action: string;
  actorId: string;
  category: string;
  from: string;
  logType: JournalLogType;
  pageKey: string;
  period: string;
  poleKey: string;
  search: string;
  targetUserId: string;
  to: string;
};

type ActivityLocationInfo = {
  icon: NavigationIconName;
  pageLabel: string;
  poleLabel: string;
  tabLabel: string;
  tone: NavigationSpaceTone;
};

type ActivityFilterOption = {
  icon: NavigationIconName;
  label: string;
  tone: NavigationSpaceTone;
  value: string;
};

type ActiveFilterChip = {
  key: keyof JournalFilters;
  label: string;
};

const PAGE_SIZE = 40;
const ALL_FILTER_VALUE = 'all';
const FILTER_QUERY_KEYS = [
  'action',
  'actorId',
  'category',
  'from',
  'logType',
  'pageKey',
  'period',
  'poleKey',
  'search',
  'targetUserId',
  'to',
] as const;

const DEFAULT_FILTERS: JournalFilters = {
  action: ALL_FILTER_VALUE,
  actorId: '',
  category: ALL_FILTER_VALUE,
  from: '',
  logType: 'activity',
  pageKey: ALL_FILTER_VALUE,
  period: '30d',
  poleKey: ALL_FILTER_VALUE,
  search: '',
  targetUserId: '',
  to: '',
};

const normalizeJournalPageKey = (pageKey: string): string =>
  pageKey === 'activity-journal' || pageKey === 'audit'
    ? FEATURES.systemActivity.audit.pageKey
    : pageKey;

const PERIOD_OPTIONS = [
  { label: '24 dernières heures', value: '24h' },
  { label: '7 derniers jours', value: '7d' },
  { label: '30 derniers jours', value: '30d' },
  { label: '90 derniers jours', value: '90d' },
  { label: 'Toute période', value: ALL_FILTER_VALUE },
  { label: 'Plage personnalisée', value: 'custom' },
] as const;

const AUDIT_CATEGORY_OPTIONS = [
  { label: 'Toutes les catégories', value: ALL_FILTER_VALUE },
  { label: 'Authentification', value: 'AUTH' },
  { label: 'Utilisateurs', value: 'USER' },
  { label: 'Autorisations', value: 'PERMISSION' },
  { label: 'Système', value: 'SYSTEM' },
] as const;

const CONNECTION_ACTIONS = new Set([
  'ACCOUNT_LOCKED',
  'LOGIN_FAILED',
  'LOGIN_SUCCESS',
  'LOGOUT',
]);

const CONNECTION_ACTION_OPTIONS = AUDIT_ACTION_OPTIONS.filter((option) => {
  return (
    option.value === ALL_FILTER_VALUE || CONNECTION_ACTIONS.has(option.value)
  );
});

const JOURNAL_POLE_OPTIONS: ActivityFilterOption[] = [
  {
    icon: 'Search',
    label: 'Tous les pôles',
    tone: 'internal',
    value: ALL_FILTER_VALUE,
  },
  {
    icon: 'UserCheck',
    label: 'Espace personnel',
    tone: 'internal',
    value: 'account',
  },
  ...PERMISSION_POLES.map((pole) => ({
    icon: pole.icon,
    label: pole.label,
    tone: pole.tone,
    value: pole.key,
  })),
];

const selectTriggerClassName =
  'border-border-control bg-surface-control text-foreground hover:border-border-strong hover:bg-surface-control-hover focus-visible:border-primary/45 focus-visible:bg-surface-control-focus focus-visible:ring-ring/35 h-10 w-full rounded-lg shadow-none';
const selectContentClassName =
  'border-border-strong bg-popover text-foreground rounded-xl p-1.5 shadow-[var(--shadow-panel-strong)]';
const selectItemClassName =
  'focus:bg-surface-tile-hover focus:text-accent-foreground rounded-lg py-2';

const getPageOptions = (poleKey: string): ActivityFilterOption[] => {
  const options: ActivityFilterOption[] = [
    {
      icon: 'Search',
      label: 'Toutes les pages',
      tone: 'internal',
      value: ALL_FILTER_VALUE,
    },
  ];

  if (poleKey === 'account') {
    options.push({
      icon: 'UserCheck',
      label: 'Mon compte',
      tone: 'internal',
      value: 'account',
    });
  }
  if (poleKey === 'system') {
    options.push({
      icon: 'ShieldCheck',
      label: 'Authentification',
      tone: 'system',
      value: 'authentication',
    });
  }

  options.push(
    ...PERMISSION_CATEGORIES.filter((category) => {
      return category.poleKey === poleKey;
    }).map((category) => ({
      icon: category.icon,
      label: category.label,
      tone: category.tone,
      value: category.key,
    })),
  );

  return options;
};

const normalizeJournalSearch = (value: string): string => {
  const normalizedValue = value.trim().slice(0, 120);
  const searchableCharacterCount =
    normalizedValue.match(/[\p{L}\p{N}]/gu)?.length ?? 0;

  return searchableCharacterCount >= 3 ? normalizedValue : '';
};

const getFiltersFromSearchParams = (
  params: URLSearchParams,
): JournalFilters => {
  const logType = params.get('logType');
  const period = params.get('period');
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const isCustomPeriod =
    period === 'custom' && !!toValidAuditDate(from) && !!toValidAuditDate(to);

  return {
    action: params.get('action') || DEFAULT_FILTERS.action,
    actorId: params.get('actorId') || '',
    category: params.get('category') || DEFAULT_FILTERS.category,
    from: isCustomPeriod ? from : '',
    logType: logType === 'connections' ? 'connections' : 'activity',
    pageKey: normalizeJournalPageKey(
      params.get('pageKey') || DEFAULT_FILTERS.pageKey,
    ),
    period:
      period &&
      PERIOD_OPTIONS.some((option) => option.value === period) &&
      (period !== 'custom' || isCustomPeriod)
        ? period
        : DEFAULT_FILTERS.period,
    poleKey: params.get('poleKey') || DEFAULT_FILTERS.poleKey,
    search: normalizeJournalSearch(params.get('search') ?? ''),
    targetUserId: params.get('targetUserId') || '',
    to: isCustomPeriod ? to : '',
  };
};

const writeFiltersToSearchParams = (
  params: URLSearchParams,
  filters: JournalFilters,
): URLSearchParams => {
  FILTER_QUERY_KEYS.forEach((key) => params.delete(key));
  if (filters.logType !== DEFAULT_FILTERS.logType) {
    params.set('logType', filters.logType);
  }
  if (filters.period !== DEFAULT_FILTERS.period)
    params.set('period', filters.period);
  if (filters.search) params.set('search', filters.search);
  if (filters.actorId) params.set('actorId', filters.actorId);
  if (filters.targetUserId) params.set('targetUserId', filters.targetUserId);

  if (filters.logType === 'connections') {
    if (filters.action !== ALL_FILTER_VALUE)
      params.set('action', filters.action);
  } else {
    if (filters.action !== ALL_FILTER_VALUE)
      params.set('action', filters.action);
    if (filters.category !== ALL_FILTER_VALUE) {
      params.set('category', filters.category);
    }
    if (filters.poleKey !== ALL_FILTER_VALUE)
      params.set('poleKey', filters.poleKey);
    if (
      filters.poleKey !== ALL_FILTER_VALUE &&
      filters.pageKey !== ALL_FILTER_VALUE
    ) {
      params.set('pageKey', filters.pageKey);
    }
  }
  if (filters.period === 'custom' && filters.from && filters.to) {
    params.set('from', filters.from);
    params.set('to', filters.to);
  }

  return params;
};

const buildServerQuery = (
  filters: JournalFilters,
  options: { exportFormat?: JournalExportFormat } = {},
): string => {
  const params = new URLSearchParams({
    logType: filters.logType,
    period: filters.period,
  });

  if (!options.exportFormat) params.set('limit', String(PAGE_SIZE));
  if (options.exportFormat) params.set('format', options.exportFormat);
  if (filters.search) params.set('search', filters.search);
  if (filters.actorId) params.set('actorId', filters.actorId);
  if (filters.targetUserId) params.set('targetUserId', filters.targetUserId);
  if (filters.period === 'custom') {
    params.set('from', filters.from);
    params.set('to', filters.to);
  }
  if (filters.logType === 'connections') {
    if (filters.action !== ALL_FILTER_VALUE) {
      params.set('connectionAction', filters.action);
    }
  } else {
    if (filters.action !== ALL_FILTER_VALUE)
      params.set('action', filters.action);
    if (filters.category !== ALL_FILTER_VALUE) {
      params.set('category', filters.category);
    }
    if (filters.poleKey !== ALL_FILTER_VALUE)
      params.set('poleKey', filters.poleKey);
    if (filters.pageKey !== ALL_FILTER_VALUE)
      params.set('pageKey', filters.pageKey);
  }

  return params.toString();
};

const getLocation = (log: JournalLog): ActivityLocationInfo => {
  const metadata = log.metadata;
  const poleKey =
    log.poleKey ??
    (typeof metadata?.poleKey === 'string' ? metadata.poleKey : null) ??
    (log.category === 'AUTH' ? 'system' : 'system');
  const pageKey = normalizeJournalPageKey(
    log.pageKey ??
      (typeof metadata?.pageKey === 'string' ? metadata.pageKey : null) ??
      (log.category === 'AUTH' ? 'authentication' : 'users'),
  );
  const pole = PERMISSION_POLES.find((candidate) => candidate.key === poleKey);
  const page = PERMISSION_CATEGORIES.find(
    (candidate) => candidate.key === pageKey,
  );
  const poleLabel =
    pole?.label ??
    (typeof metadata?.poleLabel === 'string' ? metadata.poleLabel : null) ??
    (poleKey === 'account' ? 'Espace personnel' : 'Système');
  const pageLabel =
    page?.label ??
    (typeof metadata?.pageLabel === 'string' ? metadata.pageLabel : null) ??
    (pageKey === 'authentication'
      ? 'Authentification'
      : pageKey === 'account'
        ? 'Mon compte'
        : 'Utilisateurs');
  const tabLabel =
    (typeof metadata?.tabLabel === 'string' ? metadata.tabLabel : null) ??
    log.tabKey ??
    (log.action === 'PERMISSION_UPDATE' ? 'Autorisations' : 'Page');

  return {
    icon:
      page?.icon ??
      pole?.icon ??
      (pageKey === 'authentication' ? 'ShieldCheck' : 'Users'),
    pageLabel,
    poleLabel,
    tabLabel,
    tone: page?.tone ?? pole?.tone ?? 'system',
  };
};

const isSameIdentity = (log: JournalLog): boolean => {
  if (log.userId && log.targetUserId) return log.userId === log.targetUserId;
  if (!log.actorName || !log.targetName) return false;

  return (
    log.actorName.trim().toLocaleLowerCase('fr') ===
    log.targetName.trim().toLocaleLowerCase('fr')
  );
};

const getIdentityLabel = (
  directName: string | null,
  snapshot: IdentitySnapshot | null | undefined,
  id: string | null,
): string | null => {
  return directName ?? snapshot?.displayName ?? snapshot?.loginName ?? id;
};

const ActivitySelectOption: FC<ActivityFilterOption> = ({
  icon,
  label,
  tone,
}) => {
  const Icon = getNavigationIcon(icon);
  const toneClasses = getNavigationSpaceToneClasses(tone);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-md border',
          toneClasses.icon,
        )}
      >
        <Icon className="size-3" />
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
};

const ChangeItem: FC<AuditChangeDiff> = ({ after, before, fieldKey }) => {
  const factOnly = [
    'passwordChange',
    'passwordReset',
    'revokedSessions',
  ].includes(fieldKey);

  return (
    <div className="border-border/60 bg-background/40 grid gap-2 rounded-md border px-2.5 py-2 text-xs sm:grid-cols-[minmax(11rem,14rem)_minmax(0,1fr)] sm:items-start">
      <span className="text-foreground font-semibold break-words">
        {getAuditChangeFieldLabel(fieldKey)}
      </span>
      {factOnly ? (
        <span className="bg-primary/10 text-primary-emphasis rounded px-1.5 py-0.5 font-medium break-all whitespace-pre-wrap">
          {formatAuditChangeValue(fieldKey, after)}
        </span>
      ) : (
        <div className="flex min-w-0 flex-wrap items-start gap-1.5">
          <span className="text-muted-foreground/70 font-medium uppercase">
            Avant
          </span>
          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 break-all whitespace-pre-wrap line-through">
            {formatAuditChangeValue(fieldKey, before)}
          </span>
          <span aria-hidden="true" className="text-muted-foreground">
            →
          </span>
          <span className="text-primary-emphasis font-medium uppercase">
            Après
          </span>
          <span className="bg-primary/10 text-primary-emphasis rounded px-1.5 py-0.5 break-all whitespace-pre-wrap">
            {formatAuditChangeValue(fieldKey, after)}
          </span>
        </div>
      )}
    </div>
  );
};

const CopyableTechnicalValue: FC<{ label: string; value: string }> = ({
  label,
  value,
}) => {
  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copié`);
    } catch {
      toast.error('Impossible de copier cette valeur');
    }
  };

  return (
    <div className="border-border/50 bg-background/35 grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)_auto] items-start gap-2 rounded-md border px-2.5 py-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <code className="text-foreground font-mono break-all whitespace-pre-wrap">
        {value}
      </code>
      <Button
        aria-label={`Copier ${label}`}
        className="size-7"
        onClick={() => void handleCopy()}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Clipboard className="size-3.5" />
      </Button>
    </div>
  );
};

const JournalCard: FC<{
  isOpen: boolean;
  log: JournalLog;
  onIdentityFilter: (
    identity: string,
    scope: 'actor' | 'target',
    userId: string | null,
  ) => void;
  onToggle: () => void;
}> = ({ isOpen, log, onIdentityFilter, onToggle }) => {
  const config = AUDIT_ACTION_DISPLAY.get(log.action) ?? {
    ...DEFAULT_AUDIT_ACTION_DISPLAY,
    label: log.action || DEFAULT_AUDIT_ACTION_DISPLAY.label,
  };
  const EventIcon = config.icon;
  const changes = getAuditChangeDiffs(log.metadata);
  const location = getLocation(log);
  const LocationIcon = getNavigationIcon(location.icon);
  const actorLabel =
    getIdentityLabel(log.actorName, log.actorSnapshot, log.userId) ?? 'Système';
  const targetLabel = getIdentityLabel(
    log.targetName,
    log.targetSnapshot,
    log.targetUserId,
  );
  const sameIdentity = isSameIdentity(log);
  const detailsId = `journal-details-${log.id}`;
  const normalizedOutcome = log.outcome?.toUpperCase();
  const normalizedSeverity = log.severity?.toUpperCase();
  const summaryStatus =
    normalizedSeverity === 'CRITICAL'
      ? { className: 'text-destructive', label: 'Critique' }
      : normalizedOutcome === 'FAILURE'
        ? { className: 'text-destructive', label: 'Échec' }
        : normalizedSeverity === 'WARNING'
          ? { className: 'text-warning', label: 'À surveiller' }
          : null;
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
  ].filter((entry): entry is [string, string] => !!entry[1]);

  return (
    <article
      className={cn(
        'border-border/60 bg-surface-muted/35 overflow-hidden rounded-lg border transition-colors',
        isOpen
          ? 'border-primary/35 bg-surface-inset/75'
          : 'hover:border-border hover:bg-surface-muted/60',
      )}
      data-log-id={log.id}
    >
      <div className="grid gap-2 px-3 py-2.5 sm:px-4 md:grid-cols-[minmax(0,1fr)_14rem_10rem_2rem] md:items-center">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={cn(
              'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border',
              config.color,
            )}
          >
            <EventIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <button
              aria-controls={detailsId}
              aria-expanded={isOpen}
              className="text-foreground block w-full text-left text-sm font-semibold"
              onClick={onToggle}
              type="button"
            >
              <span>{actorLabel}</span>{' '}
              <span className="text-muted-foreground font-normal">
                {config.sentence}
              </span>
              {targetLabel && !sameIdentity && <span> {targetLabel}</span>}
              {sameIdentity && (
                <span className="text-muted-foreground font-normal">
                  {' '}
                  sur son compte
                </span>
              )}
            </button>
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              {actorLabel !== 'Système' && (
                <button
                  className="hover:text-foreground underline-offset-2 hover:underline"
                  onClick={() =>
                    onIdentityFilter(actorLabel, 'actor', log.userId)
                  }
                  type="button"
                >
                  Acteur : {actorLabel}
                </button>
              )}
              {targetLabel && !sameIdentity && (
                <button
                  className="hover:text-foreground underline-offset-2 hover:underline"
                  onClick={() =>
                    onIdentityFilter(targetLabel, 'target', log.targetUserId)
                  }
                  type="button"
                >
                  Cible : {targetLabel}
                </button>
              )}
              {changes.length > 0 && (
                <span className="text-primary-emphasis">
                  {changes.length}{' '}
                  {changes.length > 1 ? 'changements' : 'changement'}
                </span>
              )}
              {summaryStatus && (
                <span className={summaryStatus.className}>
                  {summaryStatus.label}
                </span>
              )}
            </div>
            <time
              className="text-muted-foreground mt-1 block text-xs md:hidden"
              dateTime={log.createdAt}
              title={formatAuditFullDate(log.createdAt)}
            >
              {formatAuditRelativeTime(log.createdAt)} ·{' '}
              {formatAuditFullDate(log.createdAt)}
            </time>
          </div>
        </div>
        <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
          <LocationIcon className="size-3.5 shrink-0" />
          <span
            className="truncate"
            title={`${location.poleLabel} · ${location.pageLabel} · ${location.tabLabel}`}
          >
            {location.poleLabel} · {location.pageLabel} · {location.tabLabel}
          </span>
        </div>
        <time
          className="hidden min-w-0 text-right text-xs md:block"
          dateTime={log.createdAt}
          title={formatAuditFullDate(log.createdAt)}
        >
          <span className="text-foreground block font-medium">
            {formatAuditRelativeTime(log.createdAt)}
          </span>
          <span className="text-muted-foreground mt-0.5 block">
            {formatAuditFullDate(log.createdAt)}
          </span>
        </time>
        <Button
          aria-controls={detailsId}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Replier les détails' : 'Afficher les détails'}
          className="hidden size-8 md:inline-flex"
          onClick={onToggle}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ChevronDown
            className={cn(
              'size-4 transition-transform',
              isOpen && 'rotate-180',
            )}
          />
        </Button>
      </div>

      {isOpen && (
        <div
          className="border-border/65 bg-background/25 border-t px-3 py-3 sm:px-4"
          id={detailsId}
        >
          <div className="space-y-3 md:ml-10">
            {log.description && (
              <p className="text-muted-foreground text-sm leading-6">
                {log.description}
              </p>
            )}
            {changes.length > 0 && (
              <section aria-labelledby={`${detailsId}-changes`}>
                <h4
                  className="text-foreground mb-2 text-xs font-semibold"
                  id={`${detailsId}-changes`}
                >
                  Changements ({changes.length})
                </h4>
                <div className="space-y-1.5">
                  {changes.map((change) => (
                    <ChangeItem
                      key={change.fieldKey}
                      after={change.after}
                      before={change.before}
                      fieldKey={change.fieldKey}
                    />
                  ))}
                </div>
              </section>
            )}
            <details className="group/technical">
              <summary className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium transition-colors [&::-webkit-details-marker]:hidden">
                <Key className="size-3" />
                Détails techniques
                <ChevronDown className="size-3 transition-transform group-open/technical:rotate-180" />
              </summary>
              <div className="mt-2 space-y-1.5">
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
            </details>
          </div>
        </div>
      )}
    </article>
  );
};

const JournalSkeleton: FC = () => (
  <div aria-label="Chargement du journal" className="space-y-2" role="status">
    {Array.from({ length: 6 }).map((_, index) => (
      <Skeleton className="h-[4.5rem] rounded-lg" key={index} />
    ))}
  </div>
);

const toDateInputValue = (isoValue: string): string => {
  const date = toValidAuditDate(isoValue);

  return date ? date.toLocaleDateString('sv-SE') : '';
};

const toIsoDateBoundary = (dateValue: string, endOfDay: boolean): string => {
  const date = new Date(
    `${dateValue}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`,
  );

  return date.toISOString();
};

const getDownloadFilename = (
  response: Response,
  format: JournalExportFormat,
): string => {
  const disposition = response.headers.get('content-disposition');
  const match = disposition?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }

  return `journal-activite-${new Date().toISOString().slice(0, 10)}.${format}`;
};

export const SystemActivityJournalPage: FC<SystemActivityJournalPageProps> = ({
  item,
  space,
}) => {
  const { userData } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQueryString = searchParams.toString();
  const filters = useMemo(
    () => getFiltersFromSearchParams(new URLSearchParams(currentQueryString)),
    [currentQueryString],
  );
  const canAccessPage = canShowNavigationItem(userData, item);
  const canExport =
    !!userData &&
    (userData.isProtected ||
      hasPermission(
        userData.role,
        PERMISSIONS.AUDIT.EXPORT,
        userData.permissions,
      ));
  const Icon = getNavigationIcon(item.icon);
  const [searchInput, setSearchInput] = useState(filters.search);
  const [customFrom, setCustomFrom] = useState(toDateInputValue(filters.from));
  const [customTo, setCustomTo] = useState(toDateInputValue(filters.to));
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(
    filters.action !== ALL_FILTER_VALUE ||
      filters.category !== ALL_FILTER_VALUE ||
      filters.poleKey !== ALL_FILTER_VALUE ||
      filters.period === 'custom',
  );
  const [logs, setLogs] = useState<JournalLog[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [openLogId, setOpenLogId] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(canAccessPage);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedCursor, setFailedCursor] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [snapshotAt, setSnapshotAt] = useState<string | null>(null);
  const [sensitiveDetailsVisible, setSensitiveDetailsVisible] = useState(false);
  const [visibilityResolved, setVisibilityResolved] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingExportFormat, setPendingExportFormat] =
    useState<JournalExportFormat | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const filtersId = 'journal-advanced-filters';
  const eventsId = 'journal-events';
  const pageOptions = useMemo(
    () => getPageOptions(filters.poleKey),
    [filters.poleKey],
  );
  const selectedPole = JOURNAL_POLE_OPTIONS.find(
    (option) => option.value === filters.poleKey,
  ) ?? {
    icon: 'Search' as const,
    label: 'Tous les pôles',
    tone: 'internal' as const,
    value: ALL_FILTER_VALUE,
  };
  const selectedPage = pageOptions.find(
    (option) => option.value === filters.pageKey,
  ) ?? {
    icon: 'FileText' as const,
    label: filters.pageKey.replaceAll('-', ' ').replaceAll('/', ' / '),
    tone: 'internal' as const,
    value: filters.pageKey,
  };

  const navigateToFilters = useCallback(
    (nextFilters: JournalFilters, replace = false): void => {
      const params = writeFiltersToSearchParams(
        new URLSearchParams(currentQueryString),
        nextFilters,
      );
      const query = params.toString();
      const href = query ? `${pathname}?${query}` : pathname;

      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [currentQueryString, pathname, router],
  );

  const updateFilters = useCallback(
    (patch: Partial<JournalFilters>, replace = false): void => {
      const nextFilters = { ...filters, ...patch };

      if (nextFilters.poleKey === ALL_FILTER_VALUE) {
        nextFilters.pageKey = ALL_FILTER_VALUE;
      }
      if (nextFilters.logType === 'connections') {
        nextFilters.category = ALL_FILTER_VALUE;
        nextFilters.pageKey = ALL_FILTER_VALUE;
        nextFilters.poleKey = ALL_FILTER_VALUE;
      }
      navigateToFilters(nextFilters, replace);
    },
    [filters, navigateToFilters],
  );

  useEffect(() => {
    setSearchInput(filters.search);
    setCustomFrom(toDateInputValue(filters.from));
    setCustomTo(toDateInputValue(filters.to));
  }, [filters.from, filters.search, filters.to]);

  useEffect(() => {
    const normalizedSearch = normalizeJournalSearch(searchInput);
    if (normalizedSearch === filters.search) return;

    const timeout = window.setTimeout(() => {
      updateFilters({ search: normalizedSearch }, true);
    }, 350);

    return (): void => window.clearTimeout(timeout);
  }, [filters.search, searchInput, updateFilters]);

  const serverQuery = useMemo(() => buildServerQuery(filters), [filters]);

  const fetchLogs = useCallback(
    async (cursor?: string): Promise<void> => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const append = !!cursor;
      const params = new URLSearchParams(serverQuery);
      if (cursor) params.set('cursor', cursor);

      if (append) {
        setIsLoadingMore(true);
      } else {
        // The previous cursor belongs to the previous snapshot/filter set and
        // must never be reused while the replacement request is pending.
        setNextCursor(null);
        if (!hasLoadedOnceRef.current) setIsInitialLoading(true);
        else setIsRefreshing(true);
      }
      setError(null);

      try {
        const response = await fetch(
          `/api/systeme/journal-activite?${params.toString()}`,
          { cache: 'no-store', signal: controller.signal },
        );
        const body = (await response.json()) as ApiResponse<JournalResponse>;
        if (!response.ok || !body.success) {
          throw new Error(
            body.success
              ? 'Impossible de charger le journal'
              : body.error.message || 'Impossible de charger le journal',
          );
        }
        if (controller.signal.aborted) return;

        const firstNewLogId = append ? body.data.logs[0]?.id : null;
        setLogs((currentLogs) =>
          append ? [...currentLogs, ...body.data.logs] : body.data.logs,
        );
        setNextCursor(body.data.nextCursor);
        setSnapshotAt(body.data.snapshotAt ?? null);
        setSensitiveDetailsVisible(body.data.sensitiveDetailsVisible ?? false);
        setVisibilityResolved(true);
        setFailedCursor(null);
        setUpdatedAt(new Date());
        hasLoadedOnceRef.current = true;
        setHasLoadedOnce(true);

        if (firstNewLogId) {
          window.requestAnimationFrame(() => {
            const newCard = Array.from(
              document.querySelectorAll<HTMLElement>('[data-log-id]'),
            ).find((element) => element.dataset.logId === firstNewLogId);
            newCard?.querySelector<HTMLElement>('button')?.focus();
          });
        }
      } catch (fetchError) {
        if ((fetchError as { name?: string }).name === 'AbortError') return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Impossible de charger le journal',
        );
        setFailedCursor(cursor ?? null);
        if (!hasLoadedOnceRef.current) {
          hasLoadedOnceRef.current = true;
          setHasLoadedOnce(true);
        }
      } finally {
        if (abortControllerRef.current === controller) {
          setIsInitialLoading(false);
          setIsRefreshing(false);
          setIsLoadingMore(false);
        }
      }
    },
    [serverQuery],
  );

  useEffect(() => {
    if (!canAccessPage) return;
    setOpenLogId(null);
    void fetchLogs();

    return (): void => abortControllerRef.current?.abort();
  }, [canAccessPage, fetchLogs]);

  const handleIdentityFilter = (
    identity: string,
    scope: 'actor' | 'target',
    userId: string | null,
  ): void => {
    if (userId) {
      updateFilters(
        scope === 'actor'
          ? { actorId: userId, search: '' }
          : { search: '', targetUserId: userId },
      );
      setSearchInput('');

      return;
    }

    setSearchInput(identity);
    updateFilters({ search: identity });
  };

  const handlePeriodChange = (period: string): void => {
    if (period !== 'custom') {
      updateFilters({ from: '', period, to: '' });

      return;
    }

    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 7);
    const fromInput = from.toLocaleDateString('sv-SE');
    const toInput = to.toLocaleDateString('sv-SE');
    setCustomFrom(fromInput);
    setCustomTo(toInput);
    setShowAdvancedFilters(true);
    updateFilters({
      from: toIsoDateBoundary(fromInput, false),
      period: 'custom',
      to: toIsoDateBoundary(toInput, true),
    });
  };

  const handleApplyCustomPeriod = (): void => {
    if (!customFrom || !customTo) {
      toast.error('Choisissez une date de début et une date de fin');

      return;
    }
    if (customFrom > customTo) {
      toast.error('La date de début doit précéder la date de fin');

      return;
    }

    updateFilters({
      from: toIsoDateBoundary(customFrom, false),
      period: 'custom',
      to: toIsoDateBoundary(customTo, true),
    });
  };

  const handleResetFilters = (): void => {
    setSearchInput('');
    setCustomFrom('');
    setCustomTo('');
    navigateToFilters(DEFAULT_FILTERS);
  };

  const handleExport = useCallback(
    async (format: JournalExportFormat): Promise<void> => {
      try {
        setIsExporting(true);
        const response = await fetch(
          `/api/systeme/journal-activite?${buildServerQuery(filters, {
            exportFormat: format,
          })}`,
          { cache: 'no-store' },
        );

        if (!response.ok) {
          let errorBody: ApiResponse<never> | null = null;
          try {
            errorBody = (await response.clone().json()) as ApiResponse<never>;
          } catch {
            // The server can return a non-JSON infrastructure error.
          }
          if (
            errorBody &&
            !errorBody.success &&
            errorBody.error.code === ErrorCode.REAUTHENTICATION_REQUIRED
          ) {
            setPendingExportFormat(format);

            return;
          }
          throw new Error(
            errorBody && !errorBody.success
              ? errorBody.error.message
              : 'Impossible d’exporter le journal',
          );
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = getDownloadFilename(response, format);
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        if (response.headers.get('X-Export-Truncated') === 'true') {
          toast.warning(
            `Export ${format.toUpperCase()} limité aux 50 000 événements les plus récents`,
          );
        } else {
          toast.success(`Export ${format.toUpperCase()} prêt`);
        }
      } catch (exportError) {
        toast.error(
          exportError instanceof Error
            ? exportError.message
            : 'Impossible d’exporter le journal',
        );
      } finally {
        setIsExporting(false);
      }
    },
    [filters],
  );

  const activeFilterChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (filters.search)
      chips.push({ key: 'search', label: `Recherche : ${filters.search}` });
    if (filters.actorId) {
      const actor = logs.find((log) => log.userId === filters.actorId);

      chips.push({
        key: 'actorId',
        label: `Acteur : ${actor?.actorName ?? filters.actorId}`,
      });
    }
    if (filters.targetUserId) {
      const target = logs.find(
        (log) => log.targetUserId === filters.targetUserId,
      );

      chips.push({
        key: 'targetUserId',
        label: `Cible : ${target?.targetName ?? filters.targetUserId}`,
      });
    }
    if (filters.period !== DEFAULT_FILTERS.period) {
      chips.push({
        key: 'period',
        label:
          PERIOD_OPTIONS.find((option) => option.value === filters.period)
            ?.label ?? filters.period,
      });
    }
    if (filters.action !== ALL_FILTER_VALUE) {
      chips.push({
        key: 'action',
        label:
          AUDIT_ACTION_OPTIONS.find((option) => option.value === filters.action)
            ?.label ?? filters.action,
      });
    }
    if (
      filters.logType === 'activity' &&
      filters.category !== ALL_FILTER_VALUE
    ) {
      chips.push({
        key: 'category',
        label:
          AUDIT_CATEGORY_OPTIONS.find(
            (option) => option.value === filters.category,
          )?.label ?? filters.category,
      });
    }
    if (
      filters.logType === 'activity' &&
      filters.poleKey !== ALL_FILTER_VALUE
    ) {
      chips.push({ key: 'poleKey', label: selectedPole.label });
    }
    if (
      filters.logType === 'activity' &&
      filters.pageKey !== ALL_FILTER_VALUE
    ) {
      chips.push({ key: 'pageKey', label: selectedPage.label });
    }

    return chips;
  }, [filters, logs, selectedPage.label, selectedPole.label]);

  const removeFilter = (key: keyof JournalFilters): void => {
    if (key === 'period') {
      updateFilters({ from: '', period: DEFAULT_FILTERS.period, to: '' });

      return;
    }
    if (key === 'poleKey') {
      updateFilters({ pageKey: ALL_FILTER_VALUE, poleKey: ALL_FILTER_VALUE });

      return;
    }
    if (key === 'search') setSearchInput('');
    // key is restricted to the closed JournalFilters union.
    // eslint-disable-next-line security/detect-object-injection
    updateFilters({ [key]: DEFAULT_FILTERS[key] });
  };

  const liveStatus = isInitialLoading
    ? 'Chargement du journal'
    : isRefreshing
      ? 'Actualisation du journal'
      : `${logs.length} événements chargés${nextCursor ? ', davantage disponibles' : ''}`;

  if (!canAccessPage) {
    return (
      <AuthenticatedLayout
        breadcrumbs={[
          { href: space.href, label: space.label },
          { label: item.label },
        ]}
      >
        <AccessDeniedState
          actionHref="/tableau-de-bord"
          actionLabel="Retour au tableau de bord"
          description="Vous n'avez pas les permissions nécessaires pour accéder au journal global."
        />
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout
      breadcrumbs={[
        { href: space.href, label: space.label },
        { label: item.label },
      ]}
    >
      <PageShell className="py-0">
        <PageCanvas contentClassName="space-y-5">
          <PageHero
            actions={
              <Button asChild variant="outline">
                <Link href={space.href}>
                  <Home className="size-4" />
                  Accueil du pôle
                </Link>
              </Button>
            }
            description="Recherchez qui a fait quoi, sur quel compte, quand et dans quel contexte."
            eyebrow={
              <Badge
                className={getNavigationSpaceToneClasses(space.tone).soft}
                variant="outline"
              >
                {space.label}
              </Badge>
            }
            icon={<Icon className="size-5" />}
            title={item.label}
            tone={space.tone}
          />

          <section
            aria-label="Filtres du journal"
            className="border-border/70 bg-surface rounded-lg border p-4 shadow-[var(--shadow-panel)]"
          >
            <div className="grid gap-3 xl:grid-cols-[auto_minmax(14rem,1fr)_13rem_auto_auto] xl:items-end">
              <div>
                <span className="text-muted-foreground mb-1.5 block text-xs font-medium">
                  Journal
                </span>
                <div className="border-border-control bg-input inline-flex h-10 rounded-md border p-1">
                  {(['activity', 'connections'] as const).map((logType) => (
                    <button
                      aria-pressed={filters.logType === logType}
                      className={cn(
                        'rounded px-3 text-sm font-medium transition-colors',
                        filters.logType === logType
                          ? 'bg-primary/15 text-primary-emphasis'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                      key={logType}
                      onClick={() =>
                        updateFilters({ action: ALL_FILTER_VALUE, logType })
                      }
                      type="button"
                    >
                      {logType === 'activity' ? 'Activité' : 'Connexions'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  className="text-muted-foreground mb-1.5 block text-xs font-medium"
                  htmlFor="journal-search"
                >
                  Acteur, cible ou événement
                </label>
                <div className="relative">
                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    className="h-10 pr-9 pl-9"
                    id="journal-search"
                    maxLength={120}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Rechercher un membre (3 caractères minimum)…"
                    type="search"
                    value={searchInput}
                  />
                  {searchInput && (
                    <Button
                      aria-label="Effacer la recherche"
                      className="absolute top-1/2 right-1 size-8 -translate-y-1/2"
                      onClick={() => setSearchInput('')}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <label
                  className="text-muted-foreground mb-1.5 block text-xs font-medium"
                  htmlFor="journal-period"
                >
                  Période
                </label>
                <Select
                  value={filters.period}
                  onValueChange={handlePeriodChange}
                >
                  <SelectTrigger
                    className={selectTriggerClassName}
                    id="journal-period"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={selectContentClassName}>
                    {PERIOD_OPTIONS.map((option) => (
                      <SelectItem
                        className={selectItemClassName}
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                aria-controls={filtersId}
                aria-expanded={showAdvancedFilters}
                className="h-10"
                onClick={() => setShowAdvancedFilters((visible) => !visible)}
                type="button"
                variant="outline"
              >
                <SlidersHorizontal className="size-4" />
                Filtres
                {activeFilterChips.length > 0 && (
                  <Badge className="ml-1 px-1.5" variant="secondary">
                    {activeFilterChips.length}
                  </Badge>
                )}
              </Button>

              <Button
                aria-controls={eventsId}
                className="h-10"
                disabled={isRefreshing || isInitialLoading}
                onClick={() => void fetchLogs()}
                type="button"
                variant="outline"
              >
                <RefreshCw
                  className={cn(
                    'size-4',
                    (isRefreshing || isInitialLoading) && 'animate-spin',
                  )}
                />
                Actualiser
              </Button>
            </div>

            {showAdvancedFilters && (
              <div
                className="border-border/60 mt-4 grid gap-3 border-t pt-4 md:grid-cols-2 xl:grid-cols-4"
                id={filtersId}
              >
                <div>
                  <label
                    className="text-muted-foreground mb-1.5 block text-xs font-medium"
                    htmlFor="journal-action"
                  >
                    Action
                  </label>
                  <Select
                    value={filters.action}
                    onValueChange={(action) => updateFilters({ action })}
                  >
                    <SelectTrigger
                      className={selectTriggerClassName}
                      id="journal-action"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={selectContentClassName}>
                      {(filters.logType === 'connections'
                        ? CONNECTION_ACTION_OPTIONS
                        : AUDIT_ACTION_OPTIONS
                      ).map((option) => (
                        <SelectItem
                          className={selectItemClassName}
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {filters.logType === 'activity' && (
                  <>
                    <div>
                      <label
                        className="text-muted-foreground mb-1.5 block text-xs font-medium"
                        htmlFor="journal-category"
                      >
                        Catégorie
                      </label>
                      <Select
                        value={filters.category}
                        onValueChange={(category) =>
                          updateFilters({ category })
                        }
                      >
                        <SelectTrigger
                          className={selectTriggerClassName}
                          id="journal-category"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={selectContentClassName}>
                          {AUDIT_CATEGORY_OPTIONS.map((option) => (
                            <SelectItem
                              className={selectItemClassName}
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label
                        className="text-muted-foreground mb-1.5 block text-xs font-medium"
                        htmlFor="journal-pole"
                      >
                        Pôle
                      </label>
                      <Select
                        value={filters.poleKey}
                        onValueChange={(poleKey) =>
                          updateFilters({ pageKey: ALL_FILTER_VALUE, poleKey })
                        }
                      >
                        <SelectTrigger
                          className={selectTriggerClassName}
                          id="journal-pole"
                        >
                          <SelectValue>
                            <ActivitySelectOption {...selectedPole} />
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className={selectContentClassName}>
                          {JOURNAL_POLE_OPTIONS.map((option) => (
                            <SelectItem
                              className={selectItemClassName}
                              key={option.value}
                              value={option.value}
                            >
                              <ActivitySelectOption {...option} />
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label
                        className="text-muted-foreground mb-1.5 block text-xs font-medium"
                        htmlFor="journal-page"
                      >
                        Page
                      </label>
                      <Select
                        disabled={filters.poleKey === ALL_FILTER_VALUE}
                        value={filters.pageKey}
                        onValueChange={(pageKey) => updateFilters({ pageKey })}
                      >
                        <SelectTrigger
                          className={selectTriggerClassName}
                          id="journal-page"
                        >
                          <SelectValue>
                            <ActivitySelectOption {...selectedPage} />
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className={selectContentClassName}>
                          {pageOptions.map((option) => (
                            <SelectItem
                              className={selectItemClassName}
                              key={option.value}
                              value={option.value}
                            >
                              <ActivitySelectOption {...option} />
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="md:col-span-2 xl:col-span-4">
                  <span className="text-muted-foreground mb-1.5 block text-xs font-medium">
                    Plage de dates exacte
                  </span>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      aria-label="Date de début"
                      className="h-10 sm:max-w-48"
                      onChange={(event) => setCustomFrom(event.target.value)}
                      type="date"
                      value={customFrom}
                    />
                    <span className="text-muted-foreground hidden text-xs sm:block">
                      au
                    </span>
                    <Input
                      aria-label="Date de fin"
                      className="h-10 sm:max-w-48"
                      onChange={(event) => setCustomTo(event.target.value)}
                      type="date"
                      value={customTo}
                    />
                    <Button
                      className="h-10"
                      onClick={handleApplyCustomPeriod}
                      type="button"
                      variant="outline"
                    >
                      Appliquer la plage
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="border-border/60 mt-4 flex flex-col gap-3 border-t pt-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                {activeFilterChips.length === 0 ? (
                  <span className="text-muted-foreground text-xs">
                    Filtres par défaut
                  </span>
                ) : (
                  activeFilterChips.map((chip) => (
                    <Badge
                      className="max-w-full gap-1 pl-2"
                      key={chip.key}
                      variant="secondary"
                    >
                      <span className="truncate">{chip.label}</span>
                      <button
                        aria-label={`Retirer le filtre ${chip.label}`}
                        className="hover:text-foreground rounded p-0.5"
                        onClick={() => removeFilter(chip.key)}
                        type="button"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))
                )}
                {activeFilterChips.length > 0 && (
                  <Button
                    className="h-7 px-2 text-xs"
                    onClick={handleResetFilters}
                    type="button"
                    variant="ghost"
                  >
                    Réinitialiser
                  </Button>
                )}
              </div>
              {canExport && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground mr-1 text-xs">
                    Exporter la vue
                  </span>
                  {(['csv', 'json'] as const).map((format) => (
                    <Button
                      className="h-8 px-2.5 text-xs"
                      disabled={isExporting}
                      key={format}
                      onClick={() => void handleExport(format)}
                      type="button"
                      variant="outline"
                    >
                      {isExporting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Download className="size-3.5" />
                      )}
                      {format.toUpperCase()}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="journal-events-title" className="space-y-2">
            <div className="flex flex-wrap items-end justify-between gap-2 px-1">
              <div>
                <h2
                  className="text-foreground text-base font-semibold"
                  id="journal-events-title"
                >
                  Événements
                </h2>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {logs.length} chargé{logs.length > 1 ? 's' : ''}
                  {nextCursor ? ' · davantage disponibles' : ''}
                  {updatedAt
                    ? ` · actualisé à ${updatedAt.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    : ''}
                </p>
              </div>
              {hasLoadedOnce && visibilityResolved && (
                <Badge
                  title={
                    sensitiveDetailsVisible
                      ? 'Les détails techniques et confidentiels sont visibles.'
                      : 'Les changements de nom et de statut restent visibles. Les identifiants, emails, rôles, permissions, adresses IP et détails techniques sont masqués.'
                  }
                  variant="outline"
                >
                  {sensitiveDetailsVisible
                    ? 'Détails sensibles visibles'
                    : 'Détails sensibles masqués'}
                </Badge>
              )}
            </div>

            <div aria-live="polite" className="sr-only">
              {liveStatus}
            </div>
            {snapshotAt && (
              <span className="sr-only">
                Instantané du {formatAuditFullDate(snapshotAt)}
              </span>
            )}

            <div aria-busy={isInitialLoading || isRefreshing} id={eventsId}>
              {!hasLoadedOnce && isInitialLoading ? (
                <JournalSkeleton />
              ) : error && logs.length === 0 ? (
                <ContentState
                  action={
                    <Button
                      onClick={() => void fetchLogs()}
                      type="button"
                      variant="outline"
                    >
                      <RefreshCw className="size-4" />
                      Réessayer
                    </Button>
                  }
                  description={error}
                  kind="error"
                  layout="panel"
                  title="Journal indisponible"
                />
              ) : logs.length === 0 ? (
                <ContentState
                  description="Modifiez les filtres ou la période pour élargir la recherche."
                  icon={<Filter className="size-5" />}
                  layout="panel"
                  title="Aucun événement pour ces filtres"
                />
              ) : (
                <div className="space-y-2">
                  {isRefreshing && (
                    <div className="text-primary-emphasis flex items-center gap-2 px-1 text-xs">
                      <Loader2 className="size-3.5 animate-spin" />
                      Actualisation en cours… Les résultats restent affichés.
                    </div>
                  )}
                  {error && (
                    <ContentState
                      action={
                        <Button
                          disabled={isLoadingMore}
                          onClick={() =>
                            void fetchLogs(failedCursor ?? undefined)
                          }
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Réessayer
                        </Button>
                      }
                      description="Les événements déjà chargés restent affichés."
                      kind="error"
                      title={error}
                    />
                  )}
                  {logs.map((log) => (
                    <JournalCard
                      isOpen={openLogId === log.id}
                      key={log.id}
                      log={log}
                      onIdentityFilter={handleIdentityFilter}
                      onToggle={() =>
                        setOpenLogId((currentId) =>
                          currentId === log.id ? null : log.id,
                        )
                      }
                    />
                  ))}
                  {nextCursor && (
                    <div className="pt-2 text-center">
                      <Button
                        disabled={
                          isLoadingMore || isRefreshing || isInitialLoading
                        }
                        onClick={() => void fetchLogs(nextCursor)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {isLoadingMore ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                        Charger plus
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </PageCanvas>
      </PageShell>

      <AdminStepUpDialog
        actorLoginName={userData?.loginName ?? ''}
        description="Confirmez votre identité pour exporter les événements et leurs détails autorisés."
        onCancel={() => setPendingExportFormat(null)}
        onComplete={async () => {
          const format = pendingExportFormat;
          setPendingExportFormat(null);
          if (format) await handleExport(format);
        }}
        open={pendingExportFormat !== null}
        title="Confirmer l’export du journal"
      />
    </AuthenticatedLayout>
  );
};
