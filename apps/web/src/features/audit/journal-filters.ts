import { z } from 'zod';

import { FEATURES } from '$constants/feature-registry.constants';
import { type NavigationIconName } from '$constants/navigation-icon.constants';
import { type NavigationSpaceTone } from '$constants/navigation-theme.constants';
import {
  PERMISSION_CATEGORIES,
  PERMISSION_POLES,
} from '$constants/permissions.constants';

import {
  AUDIT_CONTEXT_FILTER_DEFAULTS,
  AUDIT_CONTEXT_FILTER_QUERY_KEYS,
  type AuditContextFilters,
  readAuditContextFilters,
  writeAuditContextFilters,
} from './audit-context-filters';
import { AUDIT_ACTION_OPTIONS, toValidAuditDate } from './audit-display';

export type JournalLogType = 'activity' | 'connections';
export type JournalExportFormat = 'csv' | 'json';

export type JournalFilters = AuditContextFilters & {
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

export type ActivityFilterOption = {
  icon: NavigationIconName;
  label: string;
  tone: NavigationSpaceTone;
  value: string;
};

export type ActiveFilterChip = {
  key: keyof JournalFilters;
  label: string;
};

export const ALL_FILTER_VALUE = 'all';
export const FILTER_QUERY_KEYS = [
  'action',
  'actorId',
  'category',
  ...AUDIT_CONTEXT_FILTER_QUERY_KEYS,
  'from',
  'logType',
  'pageKey',
  'period',
  'poleKey',
  'search',
  'targetUserId',
  'to',
] as const;

export const DEFAULT_FILTERS: JournalFilters = {
  action: ALL_FILTER_VALUE,
  actorId: '',
  category: ALL_FILTER_VALUE,
  ...AUDIT_CONTEXT_FILTER_DEFAULTS,
  from: '',
  logType: 'activity',
  pageKey: ALL_FILTER_VALUE,
  period: '30d',
  poleKey: ALL_FILTER_VALUE,
  search: '',
  targetUserId: '',
  to: '',
};

export const normalizeJournalPageKey = (pageKey: string): string =>
  pageKey === 'activity-journal' || pageKey === 'audit'
    ? FEATURES.systemActivity.audit.pageKey
    : pageKey;

export const PERIOD_OPTIONS = [
  { label: '24 dernières heures', value: '24h' },
  { label: '7 derniers jours', value: '7d' },
  { label: '30 derniers jours', value: '30d' },
  { label: '90 derniers jours', value: '90d' },
  { label: 'Toute période', value: ALL_FILTER_VALUE },
  { label: 'Plage personnalisée', value: 'custom' },
] as const;

export const AUDIT_CATEGORY_OPTIONS = [
  { label: 'Toutes les catégories', value: ALL_FILTER_VALUE },
  { label: 'Authentification', value: 'AUTH' },
  { label: 'Utilisateurs', value: 'USER' },
  { label: 'Autorisations', value: 'PERMISSION' },
  { label: 'Personnes', value: 'PERSON' },
  { label: 'Partenaires (historique)', value: 'PARTNER' },
  { label: 'Système', value: 'SYSTEM' },
] as const;

export const CONNECTION_ACTIONS = new Set([
  'ACCOUNT_LOCKED',
  'LOGIN_FAILED',
  'LOGIN_SUCCESS',
  'LOGOUT',
]);

export const CONNECTION_ACTION_OPTIONS = AUDIT_ACTION_OPTIONS.filter(
  (option) => {
    return (
      option.value === ALL_FILTER_VALUE || CONNECTION_ACTIONS.has(option.value)
    );
  },
);

export const ACTIVITY_ACTION_OPTIONS = AUDIT_ACTION_OPTIONS.filter(
  (option) => !CONNECTION_ACTIONS.has(option.value),
);

const isoDateTime = z.iso.datetime({ offset: true });
const MAX_CUSTOM_RANGE_MS = 366 * 24 * 60 * 60 * 1000;

export const validateJournalDateRange = (
  from: string,
  to: string,
): string | null => {
  if (!from || !to) return 'Renseignez une date de début et une date de fin.';
  if (
    !isoDateTime.safeParse(from).success ||
    !isoDateTime.safeParse(to).success
  )
    return 'Renseignez deux dates valides.';
  const duration = Date.parse(to) - Date.parse(from);
  if (duration <= 0)
    return 'La date de fin doit être égale ou postérieure à la date de début.';
  if (duration > MAX_CUSTOM_RANGE_MS)
    return 'La plage ne peut pas dépasser 366 jours. Utilisez « Toute période » pour consulter l’ensemble du journal.';

  return null;
};

/** Keep URL, controls and API on the same valid investigation context. */
export const normalizeJournalFilters = (
  input: JournalFilters,
): JournalFilters => {
  const filters = { ...input };
  const actions =
    filters.logType === 'connections'
      ? CONNECTION_ACTION_OPTIONS
      : ACTIVITY_ACTION_OPTIONS;
  if (!actions.some(({ value }) => value === filters.action))
    filters.action = ALL_FILTER_VALUE;
  if (!AUDIT_CATEGORY_OPTIONS.some(({ value }) => value === filters.category))
    filters.category = ALL_FILTER_VALUE;
  if (filters.logType === 'connections') {
    Object.assign(filters, AUDIT_CONTEXT_FILTER_DEFAULTS, {
      category: ALL_FILTER_VALUE,
      pageKey: ALL_FILTER_VALUE,
      poleKey: ALL_FILTER_VALUE,
    });
  }
  if (!filters.entityId || !filters.entityType)
    Object.assign(filters, AUDIT_CONTEXT_FILTER_DEFAULTS);
  if (!filters.fieldKey || !filters.sectionKey)
    Object.assign(filters, { fieldKey: '', recordId: '', sectionKey: '' });
  filters.poleKey = filters.poleKey.trim().slice(0, 100) || ALL_FILTER_VALUE;
  filters.pageKey =
    normalizeJournalPageKey(filters.pageKey.trim().slice(0, 100)) ||
    ALL_FILTER_VALUE;
  filters.actorId = filters.actorId.trim().slice(0, 191);
  filters.targetUserId = filters.targetUserId.trim().slice(0, 191);
  filters.search = normalizeJournalSearch(filters.search);
  if (
    !PERIOD_OPTIONS.some(({ value }) => value === filters.period) ||
    (filters.period === 'custom' &&
      validateJournalDateRange(filters.from, filters.to))
  ) {
    filters.period = DEFAULT_FILTERS.period;
  }
  if (filters.period !== 'custom') Object.assign(filters, { from: '', to: '' });

  return filters;
};

export const JOURNAL_POLE_OPTIONS: ActivityFilterOption[] = [
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

export const getPageOptions = (poleKey: string): ActivityFilterOption[] => {
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

export const normalizeJournalSearch = (value: string): string => {
  const normalizedValue = value.trim().slice(0, 120);
  const searchableCharacterCount =
    normalizedValue.match(/[\p{L}\p{N}]/gu)?.length ?? 0;

  return searchableCharacterCount >= 3 ? normalizedValue : '';
};

export const getFiltersFromSearchParams = (
  params: URLSearchParams,
): JournalFilters => {
  const logType = params.get('logType');
  const period = params.get('period');
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const isCustomPeriod =
    period === 'custom' && !!toValidAuditDate(from) && !!toValidAuditDate(to);

  return normalizeJournalFilters({
    action: params.get('action') || DEFAULT_FILTERS.action,
    actorId: params.get('actorId') || '',
    category: params.get('category') || DEFAULT_FILTERS.category,
    ...readAuditContextFilters(params),
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
  });
};

export const writeFiltersToSearchParams = (
  params: URLSearchParams,
  input: JournalFilters,
): URLSearchParams => {
  const filters = normalizeJournalFilters(input);
  FILTER_QUERY_KEYS.forEach((key) => params.delete(key));
  if (filters.logType !== DEFAULT_FILTERS.logType) {
    params.set('logType', filters.logType);
  }
  if (filters.period !== DEFAULT_FILTERS.period)
    params.set('period', filters.period);
  if (filters.search) params.set('search', filters.search);
  if (filters.actorId) params.set('actorId', filters.actorId);
  if (filters.targetUserId) params.set('targetUserId', filters.targetUserId);
  writeAuditContextFilters(params, filters);

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
    if (filters.pageKey !== ALL_FILTER_VALUE) {
      params.set('pageKey', filters.pageKey);
    }
  }
  if (filters.period === 'custom' && filters.from && filters.to) {
    params.set('from', filters.from);
    params.set('to', filters.to);
  }

  return params;
};

export const buildServerQuery = (
  input: JournalFilters,
  options: { exportFormat?: JournalExportFormat } = {},
): string => {
  const filters = normalizeJournalFilters(input);
  const params = new URLSearchParams({
    logType: filters.logType,
    period: filters.period,
  });

  if (options.exportFormat) params.set('format', options.exportFormat);
  if (filters.search) params.set('search', filters.search);
  if (filters.actorId) params.set('actorId', filters.actorId);
  if (filters.targetUserId) params.set('targetUserId', filters.targetUserId);
  writeAuditContextFilters(params, filters);
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

export const toDateInputValue = (isoValue: string): string => {
  const date = toValidAuditDate(isoValue);

  return date ? date.toLocaleDateString('sv-SE') : '';
};

export const toIsoDateBoundary = (
  dateValue: string,
  endOfDay: boolean,
): string => {
  const date = new Date(
    `${dateValue}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`,
  );

  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};
