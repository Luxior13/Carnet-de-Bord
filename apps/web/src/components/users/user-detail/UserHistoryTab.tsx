'use client';

import {
  Archive,
  ArrowRight,
  Ban,
  CheckCircle,
  ChevronDown,
  Download,
  Filter,
  Globe,
  History,
  Key,
  LogIn,
  LogOut,
  type LucideIcon,
  Pencil,
  RefreshCw,
  Shield,
  UserCheck,
  UserMinus,
  UserPlus,
  XCircle,
} from 'lucide-react';
import React, { type FC, memo, useMemo, useState } from 'react';
import { toast } from 'sonner';

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
  getPermissionDisplayLabel,
  PERMISSION_CATEGORIES,
  PERMISSION_POLES,
} from '$constants/permissions.constants';
import type { AuditLogEntry } from '$types/auth.types';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Card, CardContent, CardFooter } from '$ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';
import { Skeleton } from '$ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';
import { cn } from '$utils/css.utils';

// ============================================
// TYPES
// ============================================

type UserHistoryTabProps = {
  auditLogs: AuditLogEntry[];
  canExport?: boolean;
  error?: string | null;
  exportHref?: string;
  facets?: UserHistoryFacets | null;
  filters?: UserHistoryFilters;
  hasMoreAuditLogs?: boolean;
  isAuditTruncated?: boolean;
  isExporting?: boolean;
  isLoading: boolean;
  isLoadingMore?: boolean;
  onExport?: () => void;
  onFiltersChange?: (filters: UserHistoryFilters) => void;
  onLoadMore?: () => void;
  onRetry?: () => void;
  perspective?: ActivityPerspective;
  totalAuditLogs?: number;
  userId: string;
};

type ActionCategoryKey =
  'access' | 'auth' | 'lifecycle' | 'other' | 'profile' | 'security' | 'system';
export type ActivityScope = 'all' | 'by' | 'on';
type ActivityScopeIconKey = 'by' | 'linked' | 'on';
type ActivityPerspective = 'managed' | 'personal';
const DEFAULT_ACTIVITY_SCOPE: ActivityScope = 'on';
const ALL_FILTER_VALUE = 'all';

export type UserHistoryFilters = {
  activityScope: ActivityScope;
  dateFilter: string;
  pageFilter: string;
  poleFilter: string;
};

export type UserHistoryFacet = {
  count: number;
  poleValue?: string | null;
  value: string;
};

export type UserHistoryFacets = {
  pages: {
    options: UserHistoryFacet[];
    total: number;
  };
  poles: {
    options: UserHistoryFacet[];
    total: number;
  };
  scopes: Record<ActivityScope, number>;
};

export const DEFAULT_USER_HISTORY_FILTERS: UserHistoryFilters = {
  activityScope: DEFAULT_ACTIVITY_SCOPE,
  dateFilter: '90',
  pageFilter: ALL_FILTER_VALUE,
  poleFilter: ALL_FILTER_VALUE,
};

type ActionConfig = {
  category: ActionCategoryKey;
  color: string;
  icon: LucideIcon;
  label: string;
};

type ActivityLocationInfo = {
  description: string;
  icon: NavigationIconName;
  pageKey: string;
  pageLabel: string;
  poleKey: string;
  poleLabel: string;
  tabKey: string;
  tabLabel: string;
  tone: NavigationSpaceTone;
};

type ActivityTabInfo = {
  tabKey: string;
  tabLabel: string;
};

type ActivityFilterOption = {
  count: number;
  icon: NavigationIconName;
  label: string;
  tone: NavigationSpaceTone;
  value: string;
};

type ActivityPoleInfo = {
  icon: NavigationIconName;
  key: string;
  label: string;
  tone: NavigationSpaceTone;
};

type ActivityScopeVisual = {
  className: string;
  icon: LucideIcon;
  label: string;
  value: ActivityScopeIconKey;
};

type ChangeDiff = {
  after: unknown;
  before: unknown;
  fieldKey: string;
};

// ============================================
// CONFIGURATION
// ============================================

const ACTION_CONFIG: Record<string, ActionConfig> = {
  // Auth actions
  ACCOUNT_LOCKED: {
    category: 'security',
    color: 'text-destructive bg-destructive/10',
    icon: Ban,
    label: 'Compte verrouillé',
  },
  LOGIN_FAILED: {
    category: 'auth',
    color: 'text-destructive bg-destructive/10',
    icon: XCircle,
    label: 'Échec connexion',
  },
  LOGIN_SUCCESS: {
    category: 'auth',
    color: 'text-primary-emphasis bg-primary/10',
    icon: CheckCircle,
    label: 'Connexion réussie',
  },
  LOGOUT: {
    category: 'auth',
    color: 'text-muted-foreground bg-muted',
    icon: LogOut,
    label: 'Déconnexion',
  },
  MFA_DISABLED: {
    category: 'security',
    color: 'text-warning bg-warning/10',
    icon: Shield,
    label: 'Double authentification désactivée',
  },
  MFA_ENABLED: {
    category: 'security',
    color: 'text-primary-emphasis bg-primary/10',
    icon: Shield,
    label: 'Application d’authentification configurée',
  },
  MFA_RECOVERY_CODE_USED: {
    category: 'security',
    color: 'text-warning bg-warning/10',
    icon: Key,
    label: 'Code de secours utilisé',
  },
  MFA_RECOVERY_CODES_REGENERATED: {
    category: 'security',
    color: 'text-primary-emphasis bg-primary/10',
    icon: RefreshCw,
    label: 'Codes de secours régénérés',
  },
  PASSWORD_CHANGE: {
    category: 'security',
    color: 'text-warning bg-warning/10',
    icon: Key,
    label: 'Mot de passe modifié',
  },
  PASSWORD_RESET: {
    category: 'security',
    color: 'text-warning bg-warning/10',
    icon: RefreshCw,
    label: 'Mot de passe réinitialisé',
  },
  // User actions
  PERMISSION_UPDATE: {
    category: 'access',
    color: 'text-primary-emphasis bg-primary/10',
    icon: Shield,
    label: 'Permissions modifiées',
  },
  SESSION_INVALIDATE: {
    category: 'security',
    color: 'text-warning bg-warning/10',
    icon: LogIn,
    label: 'Session révoquée',
  },
  USER_ACTIVATE: {
    category: 'lifecycle',
    color: 'text-primary-emphasis bg-primary/10',
    icon: UserCheck,
    label: 'Utilisateur activé',
  },
  USER_CREATE: {
    category: 'lifecycle',
    color: 'text-primary-emphasis bg-primary/10',
    icon: UserPlus,
    label: 'Utilisateur créé',
  },
  USER_DEACTIVATE: {
    category: 'lifecycle',
    color: 'text-warning bg-warning/10',
    icon: UserMinus,
    label: 'Utilisateur désactivé',
  },
  USER_DELETE: {
    category: 'lifecycle',
    color: 'text-destructive bg-destructive/10',
    icon: Archive,
    label: 'Utilisateur archivé',
  },
  USER_UPDATE: {
    category: 'profile',
    color: 'text-primary-emphasis bg-primary/10',
    icon: Pencil,
    label: 'Utilisateur modifié',
  },
};

const DEFAULT_CONFIG: ActionConfig = {
  category: 'other',
  color: 'text-muted-foreground bg-muted',
  icon: History,
  label: 'Action',
};

const ACTION_CATEGORY_LABELS = new Map<ActionCategoryKey, string>([
  ['access', 'Accès'],
  ['auth', 'Connexion'],
  ['lifecycle', 'Cycle de vie'],
  ['other', 'Autre'],
  ['profile', 'Profil'],
  ['security', 'Sécurité'],
  ['system', 'Technique'],
]);

const ACTIVITY_SCOPE_VISUALS: Record<
  ActivityScopeIconKey,
  ActivityScopeVisual
> = {
  by: {
    className: 'border-success/35 bg-success/10 text-success',
    icon: UserCheck,
    label: 'Actions de cet utilisateur',
    value: 'by',
  },
  linked: {
    className: 'border-border/70 bg-surface-muted text-muted-foreground',
    icon: History,
    label: 'Activité liée',
    value: 'linked',
  },
  on: {
    className: 'border-info/35 bg-info/10 text-info',
    icon: Shield,
    label: 'Sur ce compte',
    value: 'on',
  },
};

const mapAuditCategoryToActionCategory = (
  category: AuditLogEntry['category'],
): ActionCategoryKey => {
  if (category === 'AUTH') return 'auth';
  if (category === 'PERMISSION') return 'access';
  if (category === 'USER') return 'profile';
  if (category === 'SYSTEM') return 'system';

  return 'other';
};

const getActionConfig = (log: AuditLogEntry): ActionConfig => {
  const knownConfig = ACTION_CONFIG[log.action];

  if (knownConfig) return knownConfig;

  const category = mapAuditCategoryToActionCategory(log.category);

  if (category === 'system') {
    return {
      category,
      color: 'text-info bg-info/10',
      icon: Globe,
      label: log.description || DEFAULT_CONFIG.label,
    };
  }

  return {
    ...DEFAULT_CONFIG,
    category,
    label: log.description || DEFAULT_CONFIG.label,
  };
};

const isLogByViewedUser = (log: AuditLogEntry, viewedUserId: string): boolean =>
  log.userId === viewedUserId;

const isLogOnViewedUser = (log: AuditLogEntry, viewedUserId: string): boolean =>
  log.targetUserId === viewedUserId;

const isSelfTargetedActivity = (log: AuditLogEntry): boolean =>
  !!log.userId && !!log.targetUserId && log.userId === log.targetUserId;

const getLogSourceLabel = (
  log: AuditLogEntry,
  viewedUserId: string,
  perspective: ActivityPerspective,
): string => {
  const isByUser = isLogByViewedUser(log, viewedUserId);
  const isOnUser = isLogOnViewedUser(log, viewedUserId);

  if (perspective === 'personal') {
    if (isByUser && isOnUser) return 'Action réalisée sur mon compte';
    if (isByUser) return "Action que j'ai réalisée";
    if (isOnUser) return 'Événement sur mon compte';

    return 'Activité liée à mon compte';
  }

  if (isByUser && isOnUser) {
    return 'Action réalisée par cet utilisateur sur son compte';
  }
  if (isByUser) return 'Action réalisée par cet utilisateur';
  if (isOnUser) return 'Événement sur ce compte';

  return 'Activité liée à cet utilisateur';
};

const getActivityScopeVisual = (
  scope: ActivityScopeIconKey,
  perspective: ActivityPerspective,
): ActivityScopeVisual => {
  const visual =
    scope === 'by'
      ? ACTIVITY_SCOPE_VISUALS.by
      : scope === 'on'
        ? ACTIVITY_SCOPE_VISUALS.on
        : ACTIVITY_SCOPE_VISUALS.linked;

  if (perspective !== 'personal') return visual;

  const personalLabel =
    scope === 'by'
      ? 'Mes actions'
      : scope === 'on'
        ? 'Sur mon compte'
        : 'Activité liée à mon compte';

  return { ...visual, label: personalLabel };
};

const getLogScopeVisuals = (
  log: AuditLogEntry,
  viewedUserId: string,
  perspective: ActivityPerspective,
): ActivityScopeVisual[] => {
  const scopes: ActivityScopeVisual[] = [];

  if (isLogOnViewedUser(log, viewedUserId)) {
    scopes.push(getActivityScopeVisual('on', perspective));
  }

  if (isLogByViewedUser(log, viewedUserId)) {
    scopes.push(getActivityScopeVisual('by', perspective));
  }

  return scopes.length > 0
    ? scopes
    : [getActivityScopeVisual('linked', perspective)];
};

const getActivityScopeOptionVisuals = (
  scope: ActivityScope,
  perspective: ActivityPerspective,
): ActivityScopeVisual[] => {
  if (scope === 'by') return [getActivityScopeVisual('by', perspective)];
  if (scope === 'on') return [getActivityScopeVisual('on', perspective)];

  return [
    getActivityScopeVisual('on', perspective),
    getActivityScopeVisual('by', perspective),
  ];
};

const FALLBACK_SYSTEM_POLE: ActivityPoleInfo = {
  icon: 'Settings',
  key: 'system',
  label: 'Système',
  tone: 'system',
};

const getPermissionPole = (poleKey: string): ActivityPoleInfo =>
  PERMISSION_POLES.find((pole) => pole.key === poleKey) ?? FALLBACK_SYSTEM_POLE;

const getPermissionCategoryLocation = (
  pageKey: string,
  fallback: ActivityLocationInfo,
): ActivityLocationInfo => {
  const category = PERMISSION_CATEGORIES.find(
    (permissionCategory) => permissionCategory.key === pageKey,
  );

  if (!category) return fallback;

  const pole = getPermissionPole(category.poleKey);

  return {
    description: category.description,
    icon: category.icon,
    pageKey: category.key,
    pageLabel: category.label,
    poleKey: pole.key,
    poleLabel: pole.label,
    tabKey: fallback.tabKey,
    tabLabel: fallback.tabLabel,
    tone: category.tone,
  };
};

const DEFAULT_ACTIVITY_TAB: ActivityTabInfo = {
  tabKey: 'page',
  tabLabel: 'Page',
};

const getInferredActivityTab = (log: AuditLogEntry): ActivityTabInfo => {
  if (log.action === 'PERMISSION_UPDATE') {
    return { tabKey: 'access', tabLabel: 'Autorisations' };
  }

  if (log.action === 'USER_UPDATE') {
    return { tabKey: 'profile', tabLabel: 'Profil' };
  }

  if (
    log.action === 'ACCOUNT_LOCKED' ||
    log.action === 'MFA_DISABLED' ||
    log.action === 'MFA_ENABLED' ||
    log.action === 'MFA_RECOVERY_CODE_USED' ||
    log.action === 'MFA_RECOVERY_CODES_REGENERATED' ||
    log.action === 'PASSWORD_CHANGE' ||
    log.action === 'PASSWORD_RESET' ||
    log.action === 'SESSION_INVALIDATE'
  ) {
    return { tabKey: 'security', tabLabel: 'Sécurité' };
  }

  if (
    log.action === 'LOGIN_FAILED' ||
    log.action === 'LOGIN_SUCCESS' ||
    log.action === 'LOGOUT'
  ) {
    return { tabKey: 'auth', tabLabel: 'Connexions' };
  }

  if (
    log.action === 'USER_ACTIVATE' ||
    log.action === 'USER_CREATE' ||
    log.action === 'USER_DEACTIVATE' ||
    log.action === 'USER_DELETE'
  ) {
    return { tabKey: 'resume', tabLabel: 'Résumé' };
  }

  if (log.category === 'AUTH') {
    return { tabKey: 'auth', tabLabel: 'Connexions' };
  }
  if (log.category === 'PERMISSION') {
    return { tabKey: 'access', tabLabel: 'Autorisations' };
  }
  if (log.category === 'USER') return { tabKey: 'profile', tabLabel: 'Profil' };
  if (log.category === 'SYSTEM') {
    return { tabKey: 'technical', tabLabel: 'Technique' };
  }

  return DEFAULT_ACTIVITY_TAB;
};

const AUTH_ACTIVITY_LOCATION: ActivityLocationInfo = {
  description: 'Connexions, sessions et sécurité du compte.',
  icon: 'ShieldCheck',
  pageKey: 'authentication',
  pageLabel: 'Authentification',
  poleKey: 'system',
  poleLabel: 'Système',
  tabKey: 'auth',
  tabLabel: 'Connexions',
  tone: 'system',
};

const ACCOUNT_PROFILE_LOCATION: ActivityLocationInfo = {
  description: 'Profil personnel et sécurité du compte connecté.',
  icon: 'UserCheck',
  pageKey: 'account',
  pageLabel: 'Mon compte',
  poleKey: 'account',
  poleLabel: 'Espace personnel',
  tabKey: 'profile',
  tabLabel: 'Profil',
  tone: 'internal',
};

const ACCOUNT_SECURITY_LOCATION: ActivityLocationInfo = {
  ...ACCOUNT_PROFILE_LOCATION,
  tabKey: 'security',
  tabLabel: 'Sécurité',
};

const TECHNICAL_ACTIVITY_LOCATION: ActivityLocationInfo = {
  description: 'Événements techniques et traces système.',
  icon: 'Settings',
  pageKey: 'technical',
  pageLabel: 'Technique',
  poleKey: 'system',
  poleLabel: 'Système',
  tabKey: 'technical',
  tabLabel: 'Technique',
  tone: 'system',
};

const OTHER_ACTIVITY_LOCATION: ActivityLocationInfo = {
  description: 'Activités sans page applicative renseignée.',
  icon: 'History',
  pageKey: 'other',
  pageLabel: 'Page non renseignée',
  poleKey: 'other',
  poleLabel: 'Autre',
  tabKey: DEFAULT_ACTIVITY_TAB.tabKey,
  tabLabel: DEFAULT_ACTIVITY_TAB.tabLabel,
  tone: 'internal',
};

const USERS_ACTIVITY_LOCATION = getPermissionCategoryLocation('users', {
  ...FEATURES.users.audit,
  description: 'Gestion des utilisateurs du système.',
  icon: 'Users',
  tabKey: DEFAULT_ACTIVITY_TAB.tabKey,
  tabLabel: DEFAULT_ACTIVITY_TAB.tabLabel,
  tone: 'system',
});

const AUTH_ACTIVITY_ACTIONS = new Set([
  'ACCOUNT_LOCKED',
  'LOGIN_FAILED',
  'LOGIN_SUCCESS',
  'LOGOUT',
  'MFA_DISABLED',
  'MFA_ENABLED',
  'MFA_RECOVERY_CODE_USED',
  'MFA_RECOVERY_CODES_REGENERATED',
  'PASSWORD_CHANGE',
]);

const USERS_ACTIVITY_ACTIONS = new Set([
  'PASSWORD_RESET',
  'PERMISSION_UPDATE',
  'SESSION_INVALIDATE',
  'USER_ACTIVATE',
  'USER_CREATE',
  'USER_DEACTIVATE',
  'USER_DELETE',
  'USER_UPDATE',
]);

const normalizeFilterKey = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getMetadataString = (
  metadata: Record<string, unknown> | null,
  keys: string[],
): string | null => {
  const entries = Object.entries(metadata ?? {});

  for (const key of keys) {
    const match = entries.find(([entryKey]) => entryKey === key);

    if (!match) continue;

    const [, value] = match;

    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
};

const getMetadataActivityTab = (
  metadata: Record<string, unknown> | null,
): ActivityTabInfo | null => {
  const tabLabel = getMetadataString(metadata, [
    'tabLabel',
    'tab',
    'sectionTabLabel',
    'viewLabel',
  ]);

  if (!tabLabel) return null;

  const rawTabKey =
    getMetadataString(metadata, ['tabKey', 'tabId', 'viewKey']) ?? tabLabel;

  return {
    tabKey: normalizeFilterKey(rawTabKey) || DEFAULT_ACTIVITY_TAB.tabKey,
    tabLabel,
  };
};

const getLocationIcon = (poleKey: string): NavigationIconName => {
  if (poleKey.includes('account') || poleKey.includes('compte')) {
    return 'UserCheck';
  }
  if (poleKey.includes('dashboard')) return 'LayoutDashboard';
  if (poleKey.includes('treasury')) return 'Wallet';
  if (poleKey.includes('system') || poleKey.includes('systeme')) {
    return 'Settings';
  }

  return 'History';
};

const getMetadataLocation = (
  metadata: Record<string, unknown> | null,
): ActivityLocationInfo | null => {
  const poleLabel = getMetadataString(metadata, [
    'poleLabel',
    'pole',
    'sectionLabel',
    'areaLabel',
  ]);
  const pageLabel = getMetadataString(metadata, [
    'pageLabel',
    'page',
    'moduleLabel',
    'module',
    'routeLabel',
    'route',
  ]);

  if (!poleLabel && !pageLabel) return null;

  const rawPoleKey =
    getMetadataString(metadata, ['poleKey', 'poleId', 'sectionKey']) ??
    poleLabel ??
    OTHER_ACTIVITY_LOCATION.poleLabel;
  const rawPageKey =
    getMetadataString(metadata, ['pageKey', 'pageId', 'moduleKey']) ??
    pageLabel ??
    OTHER_ACTIVITY_LOCATION.pageLabel;
  const poleKey =
    normalizeFilterKey(rawPoleKey) || OTHER_ACTIVITY_LOCATION.poleKey;
  const pageKey =
    normalizeFilterKey(rawPageKey) || OTHER_ACTIVITY_LOCATION.pageKey;
  const metadataTab = getMetadataActivityTab(metadata);
  const permissionCategory = PERMISSION_CATEGORIES.find(
    (category) => category.key === pageKey,
  );

  if (permissionCategory) {
    const permissionLocation = getPermissionCategoryLocation(
      pageKey,
      OTHER_ACTIVITY_LOCATION,
    );

    return metadataTab
      ? { ...permissionLocation, ...metadataTab }
      : permissionLocation;
  }

  const permissionPole = PERMISSION_POLES.find((pole) => pole.key === poleKey);

  return {
    description: 'Page renseignée par les métadonnées du journal.',
    icon: getLocationIcon(poleKey),
    pageKey,
    pageLabel: pageLabel ?? OTHER_ACTIVITY_LOCATION.pageLabel,
    poleKey,
    poleLabel:
      poleLabel ?? permissionPole?.label ?? OTHER_ACTIVITY_LOCATION.poleLabel,
    tabKey: metadataTab?.tabKey ?? DEFAULT_ACTIVITY_TAB.tabKey,
    tabLabel: metadataTab?.tabLabel ?? DEFAULT_ACTIVITY_TAB.tabLabel,
    tone: permissionPole?.tone ?? OTHER_ACTIVITY_LOCATION.tone,
  };
};

const applyActivityTab = (
  log: AuditLogEntry,
  location: ActivityLocationInfo,
): ActivityLocationInfo => {
  const metadataTab = getMetadataActivityTab(log.metadata);

  return {
    ...location,
    ...(metadataTab ?? getInferredActivityTab(log)),
  };
};

const getActivityLocation = (log: AuditLogEntry): ActivityLocationInfo => {
  const metadataLocation = getMetadataLocation(log.metadata);

  if (metadataLocation) return applyActivityTab(log, metadataLocation);
  if (isSelfTargetedActivity(log)) {
    if (log.action === 'USER_UPDATE') return ACCOUNT_PROFILE_LOCATION;
    if (
      log.action === 'MFA_DISABLED' ||
      log.action === 'MFA_ENABLED' ||
      log.action === 'MFA_RECOVERY_CODE_USED' ||
      log.action === 'MFA_RECOVERY_CODES_REGENERATED' ||
      log.action === 'PASSWORD_CHANGE' ||
      log.action === 'SESSION_INVALIDATE'
    ) {
      return ACCOUNT_SECURITY_LOCATION;
    }
  }
  if (AUTH_ACTIVITY_ACTIONS.has(log.action)) {
    return applyActivityTab(log, AUTH_ACTIVITY_LOCATION);
  }
  if (USERS_ACTIVITY_ACTIONS.has(log.action)) {
    return applyActivityTab(log, USERS_ACTIVITY_LOCATION);
  }
  if (log.category === 'AUTH') {
    return applyActivityTab(log, AUTH_ACTIVITY_LOCATION);
  }
  if (log.category === 'PERMISSION' || log.category === 'USER') {
    return applyActivityTab(log, USERS_ACTIVITY_LOCATION);
  }
  if (log.category === 'SYSTEM') {
    return applyActivityTab(log, TECHNICAL_ACTIVITY_LOCATION);
  }

  return applyActivityTab(log, OTHER_ACTIVITY_LOCATION);
};

const buildLocationFilterOptions = (
  logs: AuditLogEntry[],
  level: 'page' | 'pole',
  allLabel: string,
  poleKey?: string,
): ActivityFilterOption[] => {
  const allOption: ActivityFilterOption = {
    count: 0,
    icon: 'Search',
    label: allLabel,
    tone: 'internal',
    value: ALL_FILTER_VALUE,
  };
  const options: ActivityFilterOption[] = [allOption];
  const optionMap = new Map([[ALL_FILTER_VALUE, allOption]]);

  logs.forEach((log) => {
    const location = getActivityLocation(log);

    if (
      level === 'page' &&
      poleKey &&
      poleKey !== ALL_FILTER_VALUE &&
      location.poleKey !== poleKey
    ) {
      return;
    }

    allOption.count += 1;

    const value = level === 'pole' ? location.poleKey : location.pageKey;
    const existingOption = optionMap.get(value);

    if (existingOption) {
      existingOption.count += 1;

      return;
    }

    const permissionPole = PERMISSION_POLES.find(
      (pole) => pole.key === location.poleKey,
    );
    const option = {
      count: 1,
      icon:
        level === 'pole'
          ? (permissionPole?.icon ?? getLocationIcon(location.poleKey))
          : location.icon,
      label:
        level === 'pole'
          ? (permissionPole?.label ?? location.poleLabel)
          : location.pageLabel,
      tone:
        level === 'pole'
          ? (permissionPole?.tone ?? location.tone)
          : location.tone,
      value,
    };

    optionMap.set(value, option);
    options.push(option);
  });

  return [
    allOption,
    ...options
      .slice(1)
      .sort((first, second) => first.label.localeCompare(second.label, 'fr')),
  ];
};

const formatFacetFallbackLabel = (value: string): string => {
  const label = value.replaceAll(/[-_.]+/g, ' ').trim();

  return label.length > 0
    ? `${label.charAt(0).toLocaleUpperCase('fr')}${label.slice(1)}`
    : 'Autre';
};

const buildServerLocationFilterOptions = (
  facets: readonly UserHistoryFacet[],
  logs: readonly AuditLogEntry[],
  level: 'page' | 'pole',
  allLabel: string,
  total: number,
  poleKey?: string,
): ActivityFilterOption[] => {
  const locations = logs.map(getActivityLocation);
  const options = facets
    .filter(
      (facet) =>
        level === 'pole' ||
        !poleKey ||
        poleKey === ALL_FILTER_VALUE ||
        facet.poleValue === poleKey,
    )
    .map((facet): ActivityFilterOption => {
      const loadedLocation = locations.find((location) =>
        level === 'pole'
          ? location.poleKey === facet.value
          : location.pageKey === facet.value &&
            (!facet.poleValue || location.poleKey === facet.poleValue),
      );
      const permissionPole = PERMISSION_POLES.find(
        (pole) =>
          pole.key === (level === 'pole' ? facet.value : facet.poleValue),
      );
      const permissionCategory =
        level === 'page'
          ? PERMISSION_CATEGORIES.find(
              (category) => category.key === facet.value,
            )
          : undefined;

      return {
        count: facet.count,
        icon:
          level === 'pole'
            ? (permissionPole?.icon ??
              loadedLocation?.icon ??
              getLocationIcon(facet.value))
            : (loadedLocation?.icon ??
              getLocationIcon(facet.poleValue ?? facet.value)),
        label:
          level === 'pole'
            ? (permissionPole?.label ??
              loadedLocation?.poleLabel ??
              formatFacetFallbackLabel(facet.value))
            : (permissionCategory?.label ??
              loadedLocation?.pageLabel ??
              formatFacetFallbackLabel(facet.value)),
        tone:
          permissionPole?.tone ??
          loadedLocation?.tone ??
          OTHER_ACTIVITY_LOCATION.tone,
        value: facet.value,
      };
    });

  return [
    {
      count: total,
      icon: 'Search',
      label: allLabel,
      tone: 'internal',
      value: ALL_FILTER_VALUE,
    },
    ...options.sort((first, second) =>
      first.label.localeCompare(second.label, 'fr'),
    ),
  ];
};

type ActivityScopeOption = {
  description: string;
  label: string;
  value: ActivityScope;
};

const getActivityScopeOptions = (
  perspective: ActivityPerspective,
): ActivityScopeOption[] =>
  perspective === 'personal'
    ? [
        {
          description: 'Tous les événements liés à mon compte',
          label: 'Tout',
          value: 'all',
        },
        {
          description: 'Sécurité, sessions et modifications de mon compte',
          label: 'Sur mon compte',
          value: 'on',
        },
        {
          description: "Connexions et actions que j'ai effectuées",
          label: 'Mes actions',
          value: 'by',
        },
      ]
    : [
        {
          description: 'Sécurité, sessions et modifications du compte',
          label: 'Sur ce compte',
          value: 'on',
        },
        {
          description: "Connexions et actions effectuées par l'utilisateur",
          label: 'Actions de cet utilisateur',
          value: 'by',
        },
        {
          description: 'Tous les événements liés à cet utilisateur',
          label: "Toute l'activité",
          value: 'all',
        },
      ];

const PERMISSION_CHANGE_FIELD_PREFIX = 'permissions.';

const DATE_FILTERS = [
  { label: 'Toute période', value: 'all' },
  { label: '7 derniers jours', value: '7' },
  { label: '30 derniers jours', value: '30' },
  { label: '90 derniers jours', value: '90' },
];

// ============================================
// HELPERS
// ============================================

const toValidDate = (date: Date | string | null): Date | null => {
  if (!date) return null;

  const parsedDate = new Date(date);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const formatRelativeTime = (date: Date | string | null): string => {
  const then = toValidDate(date);

  if (!then) return 'Date inconnue';

  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffSecs < 60) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;

  return then.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: then.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const formatFullDate = (date: Date | string | null): string => {
  const parsedDate = toValidDate(date);

  if (!parsedDate) return '';

  return parsedDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

type DateCategory = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'older';

const getDateCategory = (date: Date | string): DateCategory => {
  const now = new Date();
  const then = toValidDate(date);

  if (!then) return 'older';

  // Reset time to compare dates only
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thenDate = new Date(
    then.getFullYear(),
    then.getMonth(),
    then.getDate(),
  );

  const diffDays = Math.floor(
    (todayStart.getTime() - thenDate.getTime()) / 86400000,
  );

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return 'thisWeek';
  if (diffDays < 30) return 'thisMonth';

  return 'older';
};

const DATE_CATEGORY_LABELS = new Map<DateCategory, string>([
  ['older', 'Plus ancien'],
  ['thisMonth', 'Ce mois-ci'],
  ['thisWeek', 'Cette semaine'],
  ['today', "Aujourd'hui"],
  ['yesterday', 'Hier'],
]);

// Field name translations for display
const FIELD_LABELS = new Map<string, string>([
  ['amount', 'Montant'],
  ['description', 'Description'],
  ['contactEmail', 'Email de contact'],
  ['contactEmailVerifiedAt', 'Email de contact vérifié le'],
  ['email', 'Ancien email de connexion'],
  ['firstName', 'Prénom'],
  ['isActive', 'Actif'],
  ['lastName', 'Nom'],
  ['loginName', 'Identifiant de connexion'],
  ['name', 'Nom'],
  ['passwordChange', 'Mot de passe'],
  ['passwordReset', 'Mot de passe'],
  ['permissions', 'Permissions'],
  ['revokedSessions', 'Sessions révoquées'],
  ['role', 'Rôle'],
  ['sortOrder', 'Ordre'],
  ['staffProfile.department', 'Pôle'],
  ['staffProfile.discordId', 'ID Discord'],
  ['staffProfile.displayName', 'Nom affiché'],
  ['staffProfile.internalNote', 'Note interne'],
  ['staffProfile.jobTitle', 'Poste'],
  ['staffProfile.joinedAt', 'Arrivée staff'],
  ['staffProfile.phone', 'Téléphone'],
  ['staffProfile.timezone', 'Fuseau horaire'],
]);

const FACT_ONLY_CHANGE_KEYS = new Set([
  'passwordChange',
  'passwordReset',
  'revokedSessions',
]);

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const getPermissionChangeFieldKey = (permissionKey: string): string =>
  `${PERMISSION_CHANGE_FIELD_PREFIX}${permissionKey}`;

const getPermissionKeyFromChangeField = (fieldKey: string): string | null => {
  if (!fieldKey.startsWith(PERMISSION_CHANGE_FIELD_PREFIX)) return null;

  return fieldKey.slice(PERMISSION_CHANGE_FIELD_PREFIX.length);
};

const getChangeFieldLabel = (fieldKey: string): string => {
  const permissionKey = getPermissionKeyFromChangeField(fieldKey);

  if (permissionKey) {
    return getPermissionDisplayLabel(permissionKey);
  }

  return FIELD_LABELS.get(fieldKey) || fieldKey;
};

const toPermissionAuditMap = (value: unknown): Map<string, boolean> => {
  if (!isRecord(value)) return new Map();

  return new Map(
    Object.entries(value).flatMap(([permissionKey, enabled]) => {
      return typeof enabled === 'boolean'
        ? [[permissionKey, enabled] as const]
        : [];
    }),
  );
};

const getPermissionChangeDiffs = (
  before: unknown,
  after: unknown,
): ChangeDiff[] => {
  const beforePermissions = toPermissionAuditMap(before);
  const afterPermissions = toPermissionAuditMap(after);
  const permissionKeys = new Set([
    ...beforePermissions.keys(),
    ...afterPermissions.keys(),
  ]);

  return [...permissionKeys]
    .filter((permissionKey) => {
      return (
        beforePermissions.get(permissionKey) !==
        afterPermissions.get(permissionKey)
      );
    })
    .sort((left, right) =>
      getChangeFieldLabel(getPermissionChangeFieldKey(left)).localeCompare(
        getChangeFieldLabel(getPermissionChangeFieldKey(right)),
        'fr',
      ),
    )
    .map((permissionKey) => ({
      after: afterPermissions.has(permissionKey)
        ? afterPermissions.get(permissionKey)
        : null,
      before: beforePermissions.has(permissionKey)
        ? beforePermissions.get(permissionKey)
        : null,
      fieldKey: getPermissionChangeFieldKey(permissionKey),
    }));
};

// Format value for display
const formatChangeValue = (key: string, value: unknown): string => {
  if (getPermissionKeyFromChangeField(key)) {
    if (value === null || value === undefined) return 'Rôle par défaut';

    return value ? 'Autorisé' : 'Refusé';
  }

  if (key === 'passwordReset') {
    return value ? 'Mot de passe temporaire généré' : '(vide)';
  }

  if (key === 'passwordChange') {
    return value ? 'Mot de passe modifié' : '(vide)';
  }

  if (key === 'revokedSessions') {
    const count = Number(value);

    if (!Number.isFinite(count)) return String(value);

    return `${count} session${count > 1 ? 's' : ''}`;
  }

  if (value === null || value === undefined) return '(vide)';

  if (key === 'isActive') {
    return value ? 'Oui' : 'Non';
  }

  if (key === 'role') {
    return value === 'ADMIN' ? 'Administrateur' : 'Utilisateur';
  }

  if (key === 'amount') {
    return `${Number(value).toFixed(2)} EUR`;
  }

  if (key === 'staffProfile.joinedAt') {
    const parsedDate = toValidDate(value as string);

    if (!parsedDate) return '(vide)';

    return parsedDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  if (key === 'permissions') {
    if (typeof value === 'object' && value !== null) {
      const perms = value as Record<string, boolean>;
      const enabled = Object.entries(perms)
        .filter(([, v]) => v)
        .map(([k]) => k.split(':')[0]);
      if (enabled.length === 0) return '(aucune)';

      return enabled.join(', ');
    }

    return '(aucune)';
  }

  if (typeof value === 'string') {
    return value.length > 30 ? value.substring(0, 30) + '...' : value;
  }

  return String(value);
};

const escapeCsvCell = (value: string): string => {
  const safeValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
  const escapedValue = safeValue.replaceAll('"', '""');

  return `"${escapedValue}"`;
};

const activitySelectTriggerClassName =
  'border-border-control bg-surface-control text-foreground hover:border-border-strong hover:bg-surface-control-hover focus-visible:border-primary/45 focus-visible:bg-surface-control-focus focus-visible:ring-ring/35 h-11 w-full rounded-lg shadow-none';

const activitySelectContentClassName =
  'border-border-strong bg-popover text-foreground rounded-xl p-1.5 shadow-[var(--shadow-panel-strong)]';

const activitySelectItemClassName =
  'focus:bg-surface-tile-hover focus:text-accent-foreground rounded-lg py-2';

const getChangeDiffs = (
  metadata: Record<string, unknown> | null,
): ChangeDiff[] => {
  const beforeValues = metadata?.before as Record<string, unknown> | undefined;
  const afterValues = metadata?.after as Record<string, unknown> | undefined;

  if (beforeValues && afterValues) {
    const afterValuesByKey = new Map(Object.entries(afterValues));

    return Object.entries(beforeValues).flatMap(([fieldKey, before]) => {
      const after = afterValuesByKey.get(fieldKey);

      if (fieldKey === 'permissions') {
        return getPermissionChangeDiffs(before, after);
      }

      return [{ after, before, fieldKey }];
    });
  }

  if (metadata?.passwordReset === true) {
    return [{ after: true, before: null, fieldKey: 'passwordReset' }];
  }

  if (metadata?.passwordChange === true) {
    return [{ after: true, before: null, fieldKey: 'passwordChange' }];
  }

  if (typeof metadata?.revokedSessions === 'number') {
    return [
      {
        after: metadata.revokedSessions,
        before: null,
        fieldKey: 'revokedSessions',
      },
    ];
  }

  const changeValues = metadata?.changes as Record<
    string,
    { from?: unknown; to?: unknown }
  > | null;

  if (!changeValues || typeof changeValues !== 'object') return [];

  return Object.entries(changeValues)
    .filter(([, value]) => {
      return (
        isRecord(value) &&
        (Object.hasOwn(value, 'from') || Object.hasOwn(value, 'to'))
      );
    })
    .flatMap(([fieldKey, value]) => {
      if (fieldKey === 'permissions') {
        return getPermissionChangeDiffs(value.from, value.to);
      }

      return [{ after: value.to, before: value.from, fieldKey }];
    });
};

// ============================================
// COMPONENTS
// ============================================

const ActivitySelectVisualOption: FC<{
  count?: number;
  icon: NavigationIconName;
  label: string;
  tone: NavigationSpaceTone;
}> = ({ count, icon, label, tone }) => {
  const Icon = getNavigationIcon(icon);
  const toneClasses = getNavigationSpaceToneClasses(tone);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-md border',
          toneClasses.icon,
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {typeof count === 'number' && (
        <Badge variant="secondary" className="ml-auto shrink-0 text-xs">
          {count}
        </Badge>
      )}
    </div>
  );
};

const ActivityScopeIconGroup: FC<{
  scopes: ActivityScopeVisual[];
  size?: 'md' | 'sm';
}> = ({ scopes, size = 'sm' }) => (
  <span className="inline-flex items-center gap-1">
    {scopes.map((scope) => {
      const ScopeIcon = scope.icon;

      return (
        <Tooltip key={scope.value}>
          <TooltipTrigger asChild>
            <span
              aria-label={scope.label}
              className={cn(
                'inline-flex shrink-0 items-center justify-center rounded-md border',
                size === 'md' ? 'size-8' : 'size-7',
                scope.className,
              )}
            >
              <ScopeIcon className={size === 'md' ? 'size-4' : 'size-3.5'} />
            </span>
          </TooltipTrigger>
          <TooltipContent sideOffset={6}>{scope.label}</TooltipContent>
        </Tooltip>
      );
    })}
  </span>
);

const ActivityScopeSummary: FC<{ scopes: ActivityScopeVisual[] }> = ({
  scopes,
}) => (
  <span className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
    {scopes.map((scope) => {
      const ScopeIcon = scope.icon;

      return (
        <span
          key={scope.value}
          className={cn(
            'inline-flex max-w-full items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-xs font-medium',
            scope.className,
          )}
        >
          <ScopeIcon className="size-3 shrink-0" />
          <span className="min-w-0 truncate">{scope.label}</span>
        </span>
      );
    })}
  </span>
);

// Component to display a single change (before -> after)
const ChangeItem: FC<{
  after: unknown;
  before: unknown;
  fieldKey: string;
}> = ({ after, before, fieldKey }) => {
  const label = getChangeFieldLabel(fieldKey);
  const beforeStr = formatChangeValue(fieldKey, before);
  const afterStr = formatChangeValue(fieldKey, after);
  const isFactOnly = FACT_ONLY_CHANGE_KEYS.has(fieldKey);

  return (
    <div className="border-border/60 bg-background/40 grid gap-2 rounded-md border px-2.5 py-2 text-xs sm:grid-cols-[minmax(13rem,16rem)_minmax(0,1fr)] sm:items-center">
      <span
        className="text-foreground min-w-0 truncate font-semibold"
        title={label}
      >
        {label}
      </span>
      {isFactOnly ? (
        <span className="bg-primary/10 text-primary-emphasis min-w-0 rounded px-1.5 py-0.5 font-medium break-words">
          {afterStr}
        </span>
      ) : (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground/70 text-xs font-medium uppercase">
            Avant
          </span>
          <span className="bg-muted text-muted-foreground max-w-full rounded px-1.5 py-0.5 break-words line-through">
            {beforeStr}
          </span>
          <ArrowRight size={12} className="text-muted-foreground shrink-0" />
          <span className="text-primary-emphasis text-xs font-medium uppercase">
            Après
          </span>
          <span className="bg-primary/10 text-primary-emphasis max-w-full rounded px-1.5 py-0.5 break-words">
            {afterStr}
          </span>
        </div>
      )}
    </div>
  );
};

const ActivityListRow: FC<{
  config: ActionConfig;
  isOpen: boolean;
  location: ActivityLocationInfo;
  log: AuditLogEntry;
  onToggle: () => void;
  scopeVisuals: ActivityScopeVisual[];
}> = memo(({ config, isOpen, location, log, onToggle, scopeVisuals }) => {
  const Icon = config.icon;
  const LocationIcon = getNavigationIcon(location.icon);
  const locationToneClasses = getNavigationSpaceToneClasses(location.tone);
  const categoryLabel =
    ACTION_CATEGORY_LABELS.get(config.category) ??
    ACTION_CATEGORY_LABELS.get('other') ??
    'Autre';

  // Extract data from metadata
  const metadata = log.metadata as Record<string, unknown> | null;
  const changes = getChangeDiffs(metadata);
  const hasChanges = changes.length > 0;

  return (
    <article
      className={cn(
        'border-border/60 bg-surface-muted/35 relative overflow-hidden rounded-lg border transition-colors [contain-intrinsic-size:auto_5rem] [content-visibility:auto]',
        isOpen
          ? 'border-primary/35 bg-surface-inset/75'
          : 'hover:border-border hover:bg-surface-muted/60',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 left-0 w-1',
          locationToneClasses.accent,
        )}
      />
      <button
        type="button"
        aria-expanded={isOpen}
        className="group w-full cursor-pointer text-left"
        onClick={onToggle}
      >
        <div className="grid gap-3 px-3 py-3 sm:px-4 md:grid-cols-[minmax(0,1fr)_18rem_10rem_1.5rem] md:items-center">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg',
                config.color,
              )}
            >
              <Icon size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-1.5">
                <p
                  className="text-foreground min-w-0 truncate text-sm font-semibold"
                  title={config.label}
                >
                  {config.label}
                </p>
                <ChevronDown
                  size={14}
                  className={cn(
                    'text-muted-foreground ml-auto transition-transform md:hidden',
                    isOpen && 'rotate-180',
                  )}
                />
              </div>
              <ActivityScopeSummary scopes={scopeVisuals} />
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {hasChanges && (
                  <Badge
                    variant="secondary"
                    className="border-primary/20 bg-primary/15 text-primary-emphasis px-1.5 py-0 text-xs"
                  >
                    {changes.length}{' '}
                    {changes.length > 1 ? 'changements' : 'changement'}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="text-muted-foreground px-1.5 py-0 text-xs"
                >
                  {categoryLabel}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 md:hidden">
                <Badge
                  variant="outline"
                  className={cn(
                    'max-w-full px-1.5 py-0 text-xs',
                    locationToneClasses.soft,
                  )}
                >
                  <span
                    className={cn(
                      'mr-1 inline-block size-1.5 rounded-full',
                      locationToneClasses.dot,
                    )}
                  />
                  <span className="truncate">{location.poleLabel}</span>
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    'max-w-full px-1.5 py-0 text-xs',
                    locationToneClasses.soft,
                  )}
                >
                  <LocationIcon size={10} className="mr-1 shrink-0" />
                  <span className="truncate">{location.pageLabel}</span>
                </Badge>
                <Badge variant="outline" className="px-1.5 py-0 text-xs">
                  Onglet {location.tabLabel}
                </Badge>
              </div>
            </div>
          </div>
          <div className="hidden min-w-0 text-right md:block">
            <div
              className={cn(
                'min-w-0 rounded-lg border px-2 py-1.5',
                locationToneClasses.soft,
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-md border',
                    locationToneClasses.icon,
                  )}
                >
                  <LocationIcon size={13} />
                </span>
                <span className="min-w-0">
                  <span
                    className="block truncate text-xs font-medium opacity-80"
                    title={location.poleLabel}
                  >
                    {location.poleLabel}
                  </span>
                  <span
                    className="block truncate text-xs font-semibold"
                    title={location.pageLabel}
                  >
                    {location.pageLabel}
                  </span>
                </span>
              </div>
              <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs">
                <span
                  className={cn(
                    'size-1.5 shrink-0 rounded-full',
                    locationToneClasses.dot,
                  )}
                />
                <span className="text-muted-foreground/80 shrink-0">
                  Onglet
                </span>
                <span
                  className="min-w-0 truncate font-medium"
                  title={location.tabLabel}
                >
                  {location.tabLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="hidden min-w-0 md:block">
            <p className="text-foreground truncate text-xs font-medium">
              {formatRelativeTime(log.createdAt)}
            </p>
            <p className="text-muted-foreground/70 mt-0.5 truncate text-xs">
              {formatFullDate(log.createdAt)}
            </p>
          </div>
          <ChevronDown
            size={15}
            className={cn(
              'text-muted-foreground hidden justify-self-end transition-transform md:block',
              isOpen && 'rotate-180',
            )}
          />
        </div>
      </button>
      {isOpen && (
        <div className="border-border/65 bg-background/25 border-t px-3 py-3 sm:px-4">
          <div className="space-y-3 md:ml-[3.25rem]">
            {hasChanges && (
              <section className="border-primary/35 bg-primary/10 rounded-lg border p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="text-foreground text-xs font-semibold">
                    Changements
                  </p>
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary-emphasis text-xs"
                  >
                    {changes.length}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {changes.map((change) => (
                    <ChangeItem
                      key={change.fieldKey}
                      fieldKey={change.fieldKey}
                      before={change.before}
                      after={change.after}
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
              <div className="border-border/60 bg-surface-muted/35 mt-2 rounded-lg border px-3 py-2">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className="text-muted-foreground">
                    Action{' '}
                    <span className="text-foreground font-medium">
                      {log.action}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    Catégorie{' '}
                    <span className="text-foreground font-medium">
                      {log.category}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    ID{' '}
                    <span className="text-foreground font-medium">
                      {log.id}
                    </span>
                  </span>
                  {log.ipAddress && (
                    <span className="text-muted-foreground">
                      IP{' '}
                      <span className="text-foreground font-medium">
                        {log.ipAddress}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </details>
          </div>
        </div>
      )}
    </article>
  );
});

ActivityListRow.displayName = 'ActivityListRow';

// ============================================
// MAIN COMPONENT
// ============================================

export const UserHistoryTab: FC<UserHistoryTabProps> = ({
  auditLogs,
  canExport = false,
  error = null,
  exportHref,
  facets,
  filters,
  hasMoreAuditLogs = false,
  isAuditTruncated = false,
  isExporting = false,
  isLoading,
  isLoadingMore = false,
  onExport,
  onFiltersChange,
  onLoadMore,
  onRetry,
  perspective = 'managed',
  totalAuditLogs,
  userId,
}) => {
  const [localPoleFilter, setLocalPoleFilter] = useState(ALL_FILTER_VALUE);
  const [localPageFilter, setLocalPageFilter] = useState(ALL_FILTER_VALUE);
  const [localActivityScope, setLocalActivityScope] = useState<ActivityScope>(
    DEFAULT_ACTIVITY_SCOPE,
  );
  const [localDateFilter, setLocalDateFilter] = useState(ALL_FILTER_VALUE);
  const [showCount, setShowCount] = useState(20);
  const [openLogId, setOpenLogId] = useState<string | null>(null);
  const isServerFiltering = !!filters && !!onFiltersChange;
  const poleFilter = filters?.poleFilter ?? localPoleFilter;
  const pageFilter = filters?.pageFilter ?? localPageFilter;
  const activityScope = filters?.activityScope ?? localActivityScope;
  const dateFilter = filters?.dateFilter ?? localDateFilter;
  const isPageFilterLocked = poleFilter === ALL_FILTER_VALUE;
  const isPersonalPerspective = perspective === 'personal';
  const activityScopeOptions = getActivityScopeOptions(perspective);
  const journalTitle = isPersonalPerspective
    ? "Mon journal d'activité"
    : "Journal d'activité";
  const journalDescription = isPersonalPerspective
    ? '« Sur mon compte » regroupe les événements qui visent votre compte ; « Mes actions », ceux que vous avez déclenchés. Un même événement peut apparaître dans les deux vues.'
    : "« Sur ce compte » regroupe les événements qui visent l'utilisateur ; « Actions de cet utilisateur », ceux qu'il a déclenchés. Un même événement peut apparaître dans les deux vues.";

  const poleOptions = useMemo(() => {
    if (isServerFiltering && facets) {
      return buildServerLocationFilterOptions(
        facets.poles.options,
        auditLogs,
        'pole',
        'Tous les pôles',
        facets.poles.total,
      );
    }

    return buildLocationFilterOptions(auditLogs, 'pole', 'Tous les pôles');
  }, [auditLogs, facets, isServerFiltering]);

  const pageOptions = useMemo(() => {
    if (isPageFilterLocked) {
      return [
        {
          count: auditLogs.length,
          icon: 'Search',
          label: 'Toutes les pages',
          tone: 'internal',
          value: ALL_FILTER_VALUE,
        } satisfies ActivityFilterOption,
      ];
    }

    if (isServerFiltering && facets) {
      return buildServerLocationFilterOptions(
        facets.pages.options,
        auditLogs,
        'page',
        'Toutes les pages',
        facets.pages.total,
        poleFilter,
      );
    }

    return buildLocationFilterOptions(
      auditLogs,
      'page',
      'Toutes les pages',
      poleFilter,
    );
  }, [auditLogs, facets, isPageFilterLocked, isServerFiltering, poleFilter]);
  const effectivePageFilter = isPageFilterLocked
    ? ALL_FILTER_VALUE
    : pageFilter;

  const scopeCounts = useMemo(
    () =>
      isServerFiltering && facets
        ? facets.scopes
        : {
            all: auditLogs.length,
            by: auditLogs.filter((log) => isLogByViewedUser(log, userId))
              .length,
            on: auditLogs.filter((log) => isLogOnViewedUser(log, userId))
              .length,
          },
    [auditLogs, facets, isServerFiltering, userId],
  );

  const filteredLogs = useMemo(() => {
    if (isServerFiltering) return auditLogs;

    const now = new Date();

    return auditLogs.filter((log) => {
      // Location filters
      const location = getActivityLocation(log);

      if (poleFilter !== ALL_FILTER_VALUE) {
        if (location.poleKey !== poleFilter) return false;
      }

      if (effectivePageFilter !== ALL_FILTER_VALUE) {
        if (location.pageKey !== effectivePageFilter) return false;
      }

      // Scope filter
      if (activityScope !== 'all') {
        if (activityScope === 'by' && !isLogByViewedUser(log, userId)) {
          return false;
        }

        if (activityScope === 'on' && !isLogOnViewedUser(log, userId)) {
          return false;
        }
      }
      // Date filter
      if (dateFilter !== 'all') {
        const days = parseInt(dateFilter, 10);
        const logDate = toValidDate(log.createdAt);

        if (!logDate) return false;

        const diffDays = Math.floor(
          (now.getTime() - logDate.getTime()) / 86400000,
        );
        if (diffDays > days) return false;
      }

      return true;
    });
  }, [
    activityScope,
    auditLogs,
    dateFilter,
    effectivePageFilter,
    isServerFiltering,
    poleFilter,
    userId,
  ]);

  const displayedLogs = filteredLogs.slice(0, showCount);
  const renderedLogs = isServerFiltering ? filteredLogs : displayedLogs;
  const hasMore = !isServerFiltering && filteredLogs.length > showCount;
  const loadedAuditLogsCount = auditLogs.length;
  const effectiveTotalAuditLogs = totalAuditLogs ?? loadedAuditLogsCount;
  const hasTruncatedAuditLogs =
    isAuditTruncated && effectiveTotalAuditLogs > loadedAuditLogsCount;
  const hasActiveFilters =
    poleFilter !== ALL_FILTER_VALUE ||
    effectivePageFilter !== ALL_FILTER_VALUE ||
    activityScope !== DEFAULT_ACTIVITY_SCOPE ||
    dateFilter !== 'all';
  const hasAdvancedLocationFilters =
    poleFilter !== ALL_FILTER_VALUE || effectivePageFilter !== ALL_FILTER_VALUE;
  const selectedPoleOption =
    poleOptions.find((option) => option.value === poleFilter) ??
    poleOptions[0] ??
    ({
      count: auditLogs.length,
      icon: 'Search',
      label: 'Tous les pôles',
      tone: 'internal',
      value: ALL_FILTER_VALUE,
    } satisfies ActivityFilterOption);
  const selectedPageOption =
    pageOptions.find((option) => option.value === effectivePageFilter) ??
    pageOptions[0] ??
    ({
      count: filteredLogs.length,
      icon: 'Search',
      label: 'Toutes les pages',
      tone: 'internal',
      value: ALL_FILTER_VALUE,
    } satisfies ActivityFilterOption);
  const selectedPageLocation =
    effectivePageFilter === ALL_FILTER_VALUE
      ? null
      : (auditLogs
          .map((log) => getActivityLocation(log))
          .find((location) => location.pageKey === effectivePageFilter) ??
        null);
  const selectedPageTitle =
    effectivePageFilter === ALL_FILTER_VALUE
      ? 'Toutes les pages'
      : selectedPageOption.label;
  const selectedPageDescription =
    selectedPageLocation?.description ??
    (isPersonalPerspective
      ? poleFilter === ALL_FILTER_VALUE
        ? 'Tous les événements de votre compte, quelle que soit leur origine.'
        : `Événements de votre compte dans ${selectedPoleOption.label}.`
      : poleFilter === ALL_FILTER_VALUE
        ? 'Journal consolidé de tous les pôles et toutes les pages.'
        : `Journal consolidé des pages du pôle ${selectedPoleOption.label}.`);
  const selectedPageVisualOption =
    effectivePageFilter === ALL_FILTER_VALUE
      ? selectedPoleOption
      : selectedPageOption;

  const getScopeCount = (scope: ActivityScope): number => {
    if (scope === 'by') return scopeCounts.by;
    if (scope === 'on') return scopeCounts.on;

    return scopeCounts.all;
  };

  const handleActivityScopeChange = (scope: ActivityScope): void => {
    setLocalActivityScope(scope);
    onFiltersChange?.({
      activityScope: scope,
      dateFilter,
      pageFilter: effectivePageFilter,
      poleFilter,
    });
    setShowCount(20);
    setOpenLogId(null);
  };

  const handlePoleFilterChange = (value: string): void => {
    setLocalPoleFilter(value);
    setLocalPageFilter(ALL_FILTER_VALUE);
    onFiltersChange?.({
      activityScope,
      dateFilter,
      pageFilter: ALL_FILTER_VALUE,
      poleFilter: value,
    });
    setShowCount(20);
    setOpenLogId(null);
  };

  const handlePageFilterChange = (value: string): void => {
    if (isPageFilterLocked) return;

    setLocalPageFilter(value);
    onFiltersChange?.({
      activityScope,
      dateFilter,
      pageFilter: value,
      poleFilter,
    });
    setShowCount(20);
    setOpenLogId(null);
  };

  const handleDateFilterChange = (value: string): void => {
    setLocalDateFilter(value);
    onFiltersChange?.({
      activityScope,
      dateFilter: value,
      pageFilter: effectivePageFilter,
      poleFilter,
    });
    setShowCount(20);
    setOpenLogId(null);
  };

  const handleResetFilters = (): void => {
    setLocalPoleFilter(ALL_FILTER_VALUE);
    setLocalPageFilter(ALL_FILTER_VALUE);
    setLocalActivityScope(DEFAULT_ACTIVITY_SCOPE);
    setLocalDateFilter(ALL_FILTER_VALUE);
    onFiltersChange?.(DEFAULT_USER_HISTORY_FILTERS);
    setShowCount(20);
    setOpenLogId(null);
  };

  // Personal activity can still export the locally loaded subset. Managed
  // activity uses the server URL so the complete filtered journal is exported.
  const handleExport = (): void => {
    if (onExport) {
      onExport();

      return;
    }

    if (exportHref) {
      const link = document.createElement('a');
      link.href = exportHref;
      link.click();
      toast.success('Export complet lancé');

      return;
    }

    const maxExport = 500;
    const logsToExport = filteredLogs.slice(0, maxExport);

    const headers = [
      'Date',
      'Action',
      'Description',
      'Pôle',
      'Page',
      'Onglet',
      'IP',
      isPersonalPerspective ? 'Lien avec mon compte' : 'Lien avec le compte',
    ];
    const rows = logsToExport.map((log) => {
      const config = getActionConfig(log);
      const location = getActivityLocation(log);

      return [
        formatFullDate(log.createdAt),
        config.label,
        log.description || '',
        location.poleLabel,
        location.pageLabel,
        location.tabLabel,
        log.ipAddress || '',
        getLogSourceLabel(log, userId, perspective),
      ];
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map((row) => row.map(escapeCsvCell).join(';')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${isPersonalPerspective ? 'mon-activite' : 'activite-utilisateur'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    const message =
      filteredLogs.length > maxExport
        ? `${logsToExport.length} événement(s) exporté(s) (limite atteinte)`
        : `${logsToExport.length} événement(s) exporté(s)`;
    toast.success(message);
  };

  // Loading
  if (isLoading && auditLogs.length === 0) {
    return (
      <div className="space-y-4">
        {isPersonalPerspective && <h2 className="sr-only">Activité</h2>}
        <Skeleton className="h-32 rounded-md" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error && auditLogs.length === 0) {
    return (
      <Card className="border-destructive/35 bg-destructive/5 min-h-[280px] items-center justify-center rounded-lg py-0">
        {isPersonalPerspective && <h2 className="sr-only">Activité</h2>}
        <CardContent
          className="flex flex-col items-center p-8 text-center"
          role="alert"
        >
          <div className="border-destructive/35 bg-destructive/10 text-destructive flex size-16 items-center justify-center rounded-md border">
            <XCircle className="size-8" />
          </div>
          <h3 className="text-foreground mt-5 text-lg font-semibold">
            Activité indisponible
          </h3>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm">{error}</p>
          {onRetry && (
            <Button className="mt-4" onClick={onRetry} variant="outline">
              <RefreshCw className="size-4" />
              Réessayer
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Empty
  if (auditLogs.length === 0 && !isServerFiltering) {
    return (
      <Card className="border-border/70 min-h-[360px] items-center justify-center rounded-lg py-0">
        {isPersonalPerspective && <h2 className="sr-only">Activité</h2>}
        <CardContent className="flex flex-col items-center p-8">
          <div className="border-primary/35 bg-primary/15 text-primary-emphasis flex size-20 items-center justify-center rounded-md border">
            <History className="size-10" />
          </div>
          <h3 className="text-foreground mt-6 text-lg font-semibold">
            Aucune activité
          </h3>
          <p className="text-muted-foreground mt-2 max-w-xs text-center text-sm">
            {isPersonalPerspective
              ? 'Vos connexions, changements de profil et actions de sécurité apparaîtront ici.'
              : 'Les connexions, changements de profil, accès et actions de sécurité apparaîtront ici.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const SelectedPageIcon = getNavigationIcon(selectedPageVisualOption.icon);
  const selectedPageToneClasses = getNavigationSpaceToneClasses(
    selectedPageVisualOption.tone,
  );

  return (
    <Card
      aria-busy={isLoading || isLoadingMore}
      className="border-border/60 overflow-visible rounded-lg py-0"
    >
      <CardContent className="p-2.5 sm:p-3">
        <div className="space-y-3">
          {error && (
            <div
              className="border-destructive/35 bg-destructive/10 text-destructive flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
              role="alert"
            >
              <span>{error}</span>
              {onRetry && (
                <Button onClick={onRetry} size="sm" variant="outline">
                  <RefreshCw className="size-4" />
                  Réessayer
                </Button>
              )}
            </div>
          )}
          {!isPersonalPerspective && (
            <section className="border-border/55 bg-surface-muted overflow-hidden rounded-lg border">
              <div className="flex flex-col gap-4 p-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-foreground font-semibold">
                      {journalTitle}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {filteredLogs.length}/{auditLogs.length} affichés
                    </Badge>
                    {hasTruncatedAuditLogs && (
                      <Badge
                        variant="outline"
                        className="border-warning/40 text-warning text-xs"
                      >
                        Derniers {loadedAuditLogsCount}/
                        {effectiveTotalAuditLogs} chargés
                      </Badge>
                    )}
                    {hasActiveFilters && (
                      <Badge
                        variant="outline"
                        className="border-primary/40 text-primary-emphasis text-xs"
                      >
                        Filtres actifs
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground max-w-3xl text-sm leading-6">
                    {journalDescription}
                  </p>
                </div>
                <div className="flex min-w-0 flex-wrap gap-2 xl:justify-end">
                  <div className="min-w-44">
                    <Select
                      value={dateFilter}
                      onValueChange={handleDateFilterChange}
                    >
                      <SelectTrigger
                        aria-label="Filtrer par période"
                        className={activitySelectTriggerClassName}
                      >
                        <SelectValue placeholder="Période" />
                      </SelectTrigger>
                      <SelectContent className={activitySelectContentClassName}>
                        {DATE_FILTERS.map((filter) => (
                          <SelectItem
                            key={filter.value}
                            value={filter.value}
                            className={activitySelectItemClassName}
                          >
                            {filter.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'text-muted-foreground h-11 gap-1.5',
                      !hasActiveFilters && 'invisible',
                    )}
                    disabled={!hasActiveFilters}
                    onClick={handleResetFilters}
                  >
                    <RefreshCw className="size-3.5" />
                    Réinitialiser
                  </Button>
                  {canExport && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 gap-1.5"
                      onClick={handleExport}
                      disabled={filteredLogs.length === 0 || isExporting}
                    >
                      {isExporting ? (
                        <RefreshCw className="size-3.5 animate-spin" />
                      ) : (
                        <Download className="size-3.5" />
                      )}
                      {isExporting ? 'Préparation…' : 'Exporter'}
                    </Button>
                  )}
                </div>
              </div>
            </section>
          )}
          <section className="border-border/60 bg-surface overflow-hidden rounded-lg border">
            {isPersonalPerspective ? (
              <div className="border-border/55 bg-surface-muted space-y-4 border-b p-4">
                <div className="space-y-1">
                  <h2 className="text-foreground text-lg font-semibold">
                    Activité
                  </h2>
                  <p className="text-muted-foreground text-sm leading-6">
                    Consultez les événements liés à votre compte et les actions
                    que vous avez réalisées.
                  </p>
                  {hasTruncatedAuditLogs && (
                    <p className="text-warning text-xs">
                      Seuls les {loadedAuditLogsCount} événements les plus
                      récents sur {effectiveTotalAuditLogs} sont chargés.
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
                  <div className="min-w-0 flex-1 space-y-2">
                    <span
                      id="personal-activity-scope-label"
                      className="text-muted-foreground block text-xs font-medium"
                    >
                      Afficher
                    </span>
                    <div
                      aria-labelledby="personal-activity-scope-label"
                      className="border-border/60 bg-background/35 grid grid-cols-3 rounded-lg border p-1"
                      role="group"
                    >
                      {activityScopeOptions.map((scope) => {
                        const isActiveScope = activityScope === scope.value;

                        return (
                          <button
                            key={scope.value}
                            type="button"
                            aria-pressed={isActiveScope}
                            onClick={() =>
                              handleActivityScopeChange(scope.value)
                            }
                            className={cn(
                              'text-muted-foreground hover:text-foreground min-h-11 rounded-md px-2 text-xs font-medium transition-colors sm:text-sm',
                              isActiveScope &&
                                'bg-primary/15 text-primary-emphasis shadow-sm',
                            )}
                          >
                            {scope.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="min-w-44 space-y-2 xl:w-52">
                    <label
                      htmlFor="personal-activity-period"
                      className="text-muted-foreground block text-xs font-medium"
                    >
                      Période
                    </label>
                    <Select
                      value={dateFilter}
                      onValueChange={handleDateFilterChange}
                    >
                      <SelectTrigger
                        id="personal-activity-period"
                        className={activitySelectTriggerClassName}
                      >
                        <SelectValue placeholder="Période" />
                      </SelectTrigger>
                      <SelectContent className={activitySelectContentClassName}>
                        {DATE_FILTERS.map((filter) => (
                          <SelectItem
                            key={filter.value}
                            value={filter.value}
                            className={activitySelectItemClassName}
                          >
                            {filter.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <details className="group/filters border-border/60 bg-background/25 rounded-lg border">
                  <summary className="text-muted-foreground hover:text-foreground flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-sm font-medium transition-colors [&::-webkit-details-marker]:hidden">
                    <Filter className="size-4" />
                    Filtres avancés
                    {hasAdvancedLocationFilters && (
                      <Badge
                        variant="secondary"
                        className="bg-primary/15 text-primary-emphasis ml-1 text-xs"
                      >
                        Actifs
                      </Badge>
                    )}
                    <ChevronDown className="ml-auto size-4 transition-transform group-open/filters:rotate-180" />
                  </summary>
                  <div className="border-border/55 grid gap-3 border-t p-3 sm:grid-cols-2">
                    <div className="min-w-0 space-y-2">
                      <label
                        htmlFor="personal-activity-pole"
                        className="text-muted-foreground text-xs font-medium"
                      >
                        Pôle
                      </label>
                      <Select
                        value={poleFilter}
                        onValueChange={handlePoleFilterChange}
                      >
                        <SelectTrigger
                          id="personal-activity-pole"
                          className={activitySelectTriggerClassName}
                        >
                          <SelectValue>
                            <ActivitySelectVisualOption
                              icon={selectedPoleOption.icon}
                              label={selectedPoleOption.label}
                              count={selectedPoleOption.count}
                              tone={selectedPoleOption.tone}
                            />
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent
                          className={activitySelectContentClassName}
                        >
                          {poleOptions.map((filter) => (
                            <SelectItem
                              key={filter.value}
                              value={filter.value}
                              className={activitySelectItemClassName}
                            >
                              <ActivitySelectVisualOption
                                icon={filter.icon}
                                label={filter.label}
                                count={filter.count}
                                tone={filter.tone}
                              />
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-0 space-y-2">
                      <label
                        htmlFor="personal-activity-page"
                        className="text-muted-foreground text-xs font-medium"
                      >
                        Page
                      </label>
                      <Select
                        value={effectivePageFilter}
                        onValueChange={handlePageFilterChange}
                        disabled={isPageFilterLocked}
                      >
                        <SelectTrigger
                          id="personal-activity-page"
                          className={cn(
                            activitySelectTriggerClassName,
                            isPageFilterLocked && 'opacity-70',
                          )}
                        >
                          <SelectValue>
                            <ActivitySelectVisualOption
                              icon={selectedPageOption.icon}
                              label={selectedPageOption.label}
                              count={selectedPageOption.count}
                              tone={selectedPageOption.tone}
                            />
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent
                          className={activitySelectContentClassName}
                        >
                          {pageOptions.map((filter) => (
                            <SelectItem
                              key={filter.value}
                              value={filter.value}
                              className={activitySelectItemClassName}
                            >
                              <ActivitySelectVisualOption
                                icon={filter.icon}
                                label={filter.label}
                                count={filter.count}
                                tone={filter.tone}
                              />
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </details>

                <div className="flex flex-wrap justify-end gap-2">
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground h-11 gap-1.5"
                      onClick={handleResetFilters}
                    >
                      <RefreshCw className="size-3.5" />
                      Réinitialiser
                    </Button>
                  )}
                  {canExport && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 gap-1.5"
                      onClick={handleExport}
                      disabled={filteredLogs.length === 0 || isExporting}
                    >
                      {isExporting ? (
                        <RefreshCw className="size-3.5 animate-spin" />
                      ) : (
                        <Download className="size-3.5" />
                      )}
                      {isExporting ? 'Préparation…' : 'Exporter'}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="border-border/55 bg-surface-muted grid gap-4 border-b p-4 xl:grid-cols-[minmax(0,1fr)_40rem] xl:items-start">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={cn(
                      'flex size-11 shrink-0 items-center justify-center rounded-lg border',
                      selectedPageToneClasses.icon,
                    )}
                  >
                    <SelectedPageIcon className="size-5" />
                  </span>
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-foreground font-semibold">
                        {selectedPageTitle}
                      </h4>
                      <Badge variant="secondary" className="text-xs">
                        {filteredLogs.length} événement
                        {filteredLogs.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground max-w-2xl text-sm leading-6">
                      {selectedPageDescription}
                    </p>
                  </div>
                </div>
                <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
                  <div className="min-w-0 space-y-2">
                    <label
                      htmlFor="activity-pole"
                      className="text-muted-foreground text-xs font-medium"
                    >
                      Pôle
                    </label>
                    <Select
                      value={poleFilter}
                      onValueChange={handlePoleFilterChange}
                    >
                      <SelectTrigger
                        id="activity-pole"
                        className={activitySelectTriggerClassName}
                      >
                        <SelectValue>
                          <ActivitySelectVisualOption
                            icon={selectedPoleOption.icon}
                            label={selectedPoleOption.label}
                            count={selectedPoleOption.count}
                            tone={selectedPoleOption.tone}
                          />
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className={activitySelectContentClassName}>
                        {poleOptions.map((filter) => (
                          <SelectItem
                            key={filter.value}
                            value={filter.value}
                            className={activitySelectItemClassName}
                          >
                            <ActivitySelectVisualOption
                              icon={filter.icon}
                              label={filter.label}
                              count={filter.count}
                              tone={filter.tone}
                            />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0 space-y-2">
                    <label
                      htmlFor="activity-page"
                      className="text-muted-foreground text-xs font-medium"
                    >
                      Page
                    </label>
                    <Select
                      value={effectivePageFilter}
                      onValueChange={handlePageFilterChange}
                      disabled={isPageFilterLocked}
                    >
                      <SelectTrigger
                        id="activity-page"
                        className={cn(
                          activitySelectTriggerClassName,
                          isPageFilterLocked && 'opacity-70',
                        )}
                      >
                        <SelectValue>
                          <ActivitySelectVisualOption
                            icon={selectedPageOption.icon}
                            label={selectedPageOption.label}
                            count={selectedPageOption.count}
                            tone={selectedPageOption.tone}
                          />
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className={activitySelectContentClassName}>
                        {pageOptions.map((filter) => (
                          <SelectItem
                            key={filter.value}
                            value={filter.value}
                            className={activitySelectItemClassName}
                          >
                            <ActivitySelectVisualOption
                              icon={filter.icon}
                              label={filter.label}
                              count={filter.count}
                              tone={filter.tone}
                            />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-4 p-4">
              {!isPersonalPerspective && (
                <div className="grid gap-2 md:grid-cols-3">
                  {activityScopeOptions.map((scope) => {
                    const isActiveScope = activityScope === scope.value;
                    const scopeVisuals = getActivityScopeOptionVisuals(
                      scope.value,
                      perspective,
                    );

                    return (
                      <button
                        key={scope.value}
                        type="button"
                        aria-pressed={isActiveScope}
                        onClick={() => handleActivityScopeChange(scope.value)}
                        className={cn(
                          'border-border/60 bg-surface-muted hover:bg-accent/25 flex min-w-0 items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                          isActiveScope && 'border-primary/45 bg-primary/10',
                        )}
                      >
                        <ActivityScopeIconGroup
                          scopes={scopeVisuals}
                          size="md"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="text-foreground block truncate text-sm font-semibold">
                            {scope.label}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {scope.description}
                          </span>
                        </span>
                        <Badge
                          variant={isActiveScope ? 'secondary' : 'outline'}
                          className="shrink-0"
                        >
                          {getScopeCount(scope.value)}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="space-y-2">
                {!isPersonalPerspective && (
                  <div className="border-border/60 bg-surface-muted/45 text-muted-foreground hidden grid-cols-[minmax(0,1fr)_18rem_10rem_1.5rem] rounded-lg border px-4 py-2 text-xs font-medium md:grid">
                    <span>Événement</span>
                    <span>Emplacement</span>
                    <span className="text-right">Date</span>
                    <span />
                  </div>
                )}
                {filteredLogs.length === 0 ? (
                  <div className="border-border/60 flex flex-col items-center justify-center rounded-lg border py-16">
                    <div className="border-primary/35 bg-primary/15 text-primary-emphasis flex h-16 w-16 items-center justify-center rounded-md border">
                      <Filter className="h-8 w-8" />
                    </div>
                    <p className="text-muted-foreground mt-4 text-sm">
                      Aucun résultat pour ces filtres
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {((): React.ReactNode => {
                      let lastCategory: DateCategory | null = null;

                      return renderedLogs.map((log) => {
                        const config = getActionConfig(log);
                        const category = getDateCategory(log.createdAt);
                        const showSeparator = category !== lastCategory;
                        const location = getActivityLocation(log);
                        const scopeVisuals = getLogScopeVisuals(
                          log,
                          userId,
                          perspective,
                        );
                        lastCategory = category;

                        return (
                          <React.Fragment key={log.id}>
                            {showSeparator && (
                              <div className="text-muted-foreground px-1 pt-2 text-xs font-medium first:pt-0">
                                {DATE_CATEGORY_LABELS.get(category) ||
                                  'Plus ancien'}
                              </div>
                            )}
                            <ActivityListRow
                              log={log}
                              config={config}
                              location={location}
                              scopeVisuals={scopeVisuals}
                              isOpen={openLogId === log.id}
                              onToggle={() =>
                                setOpenLogId(
                                  openLogId === log.id ? null : log.id,
                                )
                              }
                            />
                          </React.Fragment>
                        );
                      });
                    })()}
                    {hasMore && (
                      <div className="pt-2 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border rounded-lg"
                          onClick={() => setShowCount((c) => c + 20)}
                        >
                          Charger plus ({filteredLogs.length - showCount}{' '}
                          restants)
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {!hasMore && hasMoreAuditLogs && (
                  <div className="pt-2 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border min-h-11 rounded-lg"
                      onClick={onLoadMore}
                      disabled={isLoadingMore || !onLoadMore}
                    >
                      {isLoadingMore && (
                        <RefreshCw className="size-4 animate-spin" />
                      )}
                      {isLoadingMore
                        ? 'Chargement…'
                        : 'Charger des événements plus anciens'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </CardContent>
      {!isPersonalPerspective && (
        <CardFooter className="border-border/60 text-muted-foreground bg-surface-muted/95 justify-center rounded-b-lg border-t px-4 py-3 text-center text-xs">
          {filteredLogs.length} événement{filteredLogs.length > 1 ? 's' : ''}
          {hasActiveFilters && ' (filtre)'}
        </CardFooter>
      )}
    </Card>
  );
};
