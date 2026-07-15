'use client';

import {
  ArrowRight,
  Ban,
  CheckCircle,
  ChevronDown,
  Filter,
  History,
  Home,
  Key,
  Loader2,
  LogIn,
  LogOut,
  type LucideIcon,
  Pencil,
  RefreshCw,
  Shield,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import React, {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { ContentState } from '$components/layout/ContentState';
import { PageHero } from '$components/layout/PageHero';
import { AccessDeniedState } from '$components/layout/PageState';
import {
  canShowNavigationItem,
  type NavigationSpace,
  type NavItem,
} from '$constants/app.constants';
import {
  getNavigationIcon,
  type NavigationIconName,
} from '$constants/navigation-icon.constants';
import {
  getNavigationSpaceToneClasses,
  type NavigationSpaceTone,
} from '$constants/navigation-theme.constants';
import {
  getPermissionItem,
  PERMISSION_CATEGORIES,
  PERMISSION_POLES,
} from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
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

type SystemActivityJournalPageProps = {
  item: NavItem;
  space: NavigationSpace;
};

type JournalLog = {
  action: string;
  actorName: string | null;
  category: string;
  createdAt: string;
  description: string;
  id: string;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  targetName: string | null;
  targetUserId: string | null;
  userId: string | null;
};

type JournalResponse = {
  logs: JournalLog[];
  nextCursor: string | null;
  pageSize: number;
};

type ActionConfig = {
  category: ActionCategoryKey;
  color: string;
  icon: LucideIcon;
  label: string;
};

type ActionCategoryKey =
  'access' | 'auth' | 'lifecycle' | 'other' | 'profile' | 'security' | 'system';

type ChangeDiff = {
  after: unknown;
  before: unknown;
  fieldKey: string;
};

type ActivityLocationInfo = {
  icon: NavigationIconName;
  pageKey: string;
  pageLabel: string;
  poleKey: string;
  poleLabel: string;
  tabLabel: string;
  tone: NavigationSpaceTone;
};

type ScopeVisual = {
  className: string;
  icon: LucideIcon;
  label: string;
  value: string;
};

type ActivityFilterOption = {
  icon: NavigationIconName;
  label: string;
  tone: NavigationSpaceTone;
  value: string;
};

type ConnectionEventFilterOption = {
  color: string;
  icon: LucideIcon;
  label: string;
  value: string;
};

type JournalLogType = 'activity' | 'connections';

const PAGE_SIZE = 40;
const ALL_FILTER_VALUE = 'all';
const PERMISSION_CHANGE_FIELD_PREFIX = 'permissions.';

const PERIOD_OPTIONS = [
  { label: '24 dernières heures', value: '24h' },
  { label: '7 derniers jours', value: '7d' },
  { label: '30 derniers jours', value: '30d' },
  { label: '90 derniers jours', value: '90d' },
  { label: 'Toute période', value: ALL_FILTER_VALUE },
];

const JOURNAL_TYPE_OPTIONS: Array<{
  description: string;
  icon: LucideIcon;
  label: string;
  value: JournalLogType;
}> = [
  {
    description: 'Actions métier et changements sensibles',
    icon: History,
    label: 'Activité',
    value: 'activity',
  },
  {
    description: 'Connexions, échecs et déconnexions',
    icon: LogIn,
    label: 'Connexions',
    value: 'connections',
  },
];

const ALL_POLE_OPTION: ActivityFilterOption = {
  icon: 'Search',
  label: 'Tous les pôles',
  tone: 'internal',
  value: ALL_FILTER_VALUE,
};

const ACCOUNT_POLE_OPTION: ActivityFilterOption = {
  icon: 'UserCheck',
  label: 'Espace personnel',
  tone: 'internal',
  value: 'account',
};

const ALL_PAGE_OPTION: ActivityFilterOption = {
  icon: 'Search',
  label: 'Toutes les pages',
  tone: 'internal',
  value: ALL_FILTER_VALUE,
};

const ACCOUNT_PAGE_OPTION: ActivityFilterOption = {
  icon: 'UserCheck',
  label: 'Mon compte',
  tone: 'internal',
  value: 'account',
};

const AUTHENTICATION_PAGE_OPTION: ActivityFilterOption = {
  icon: 'ShieldCheck',
  label: 'Authentification',
  tone: 'system',
  value: 'authentication',
};

const JOURNAL_POLE_OPTIONS: ActivityFilterOption[] = [
  ALL_POLE_OPTION,
  ACCOUNT_POLE_OPTION,
  ...PERMISSION_POLES.map((pole) => ({
    icon: pole.icon,
    label: pole.label,
    tone: pole.tone,
    value: pole.key,
  })),
];

const ALL_CONNECTION_EVENT_OPTION: ConnectionEventFilterOption = {
  color: 'border-sidebar-border/70 bg-surface-muted text-muted-foreground',
  icon: Shield,
  label: 'Tous les événements',
  value: ALL_FILTER_VALUE,
};

const CONNECTION_EVENT_OPTIONS: ConnectionEventFilterOption[] = [
  ALL_CONNECTION_EVENT_OPTION,
  {
    color: 'border-success/35 bg-success/10 text-success',
    icon: LogIn,
    label: 'Connexions réussies',
    value: 'LOGIN_SUCCESS',
  },
  {
    color: 'border-destructive/35 bg-destructive/10 text-destructive',
    icon: XCircle,
    label: 'Connexions échouées',
    value: 'LOGIN_FAILED',
  },
  {
    color: 'border-sidebar-ring/35 bg-sidebar-ring/15 text-sidebar-ring',
    icon: LogOut,
    label: 'Déconnexions',
    value: 'LOGOUT',
  },
  {
    color: 'border-destructive/35 bg-destructive/10 text-destructive',
    icon: Ban,
    label: 'Comptes verrouillés',
    value: 'ACCOUNT_LOCKED',
  },
];

const activitySelectTriggerClassName =
  'border-sidebar-border/70 bg-surface text-sidebar-foreground hover:bg-sidebar-accent/25 focus-visible:border-sidebar-ring/45 focus-visible:ring-sidebar-ring/35 h-11 w-full shadow-none';

const activitySelectContentClassName =
  'border-sidebar-border bg-surface-raised/98 text-sidebar-foreground rounded-md p-1.5 shadow-[var(--shadow-panel-strong)]';

const activitySelectItemClassName =
  'focus:bg-sidebar-accent/55 focus:text-sidebar-accent-foreground rounded-md py-2';

const ACTION_CONFIG = new Map<string, ActionConfig>(
  Object.entries({
    ACCOUNT_LOCKED: {
      category: 'security',
      color: 'border-destructive/35 bg-destructive/10 text-destructive',
      icon: Ban,
      label: 'Compte verrouillé',
    },
    LOGIN_FAILED: {
      category: 'auth',
      color: 'border-destructive/35 bg-destructive/10 text-destructive',
      icon: XCircle,
      label: 'Connexion échouée',
    },
    LOGIN_SUCCESS: {
      category: 'auth',
      color: 'border-success/35 bg-success/10 text-success',
      icon: LogIn,
      label: 'Connexion réussie',
    },
    LOGOUT: {
      category: 'auth',
      color: 'border-sidebar-ring/35 bg-sidebar-ring/15 text-sidebar-ring',
      icon: LogOut,
      label: 'Déconnexion',
    },
    MFA_DISABLED: {
      category: 'security',
      color: 'border-warning/35 bg-warning/10 text-warning',
      icon: Shield,
      label: 'Double authentification désactivée',
    },
    MFA_ENABLED: {
      category: 'security',
      color: 'border-success/35 bg-success/10 text-success',
      icon: Shield,
      label: 'Application d’authentification configurée',
    },
    MFA_RECOVERY_CODE_USED: {
      category: 'security',
      color: 'border-warning/35 bg-warning/10 text-warning',
      icon: Key,
      label: 'Code de secours utilisé',
    },
    MFA_RECOVERY_CODES_REGENERATED: {
      category: 'security',
      color: 'border-info/35 bg-info/10 text-info',
      icon: RefreshCw,
      label: 'Codes de secours régénérés',
    },
    PASSWORD_CHANGE: {
      category: 'security',
      color: 'border-warning/35 bg-warning/10 text-warning',
      icon: Key,
      label: 'Mot de passe modifié',
    },
    PASSWORD_RESET: {
      category: 'security',
      color: 'border-warning/35 bg-warning/10 text-warning',
      icon: RefreshCw,
      label: 'Mot de passe réinitialisé',
    },
    PERMISSION_UPDATE: {
      category: 'access',
      color: 'border-info/35 bg-info/10 text-info',
      icon: Shield,
      label: 'Permissions modifiées',
    },
    SESSION_INVALIDATE: {
      category: 'security',
      color: 'border-warning/35 bg-warning/10 text-warning',
      icon: RefreshCw,
      label: 'Sessions invalidées',
    },
    USER_ACTIVATE: {
      category: 'lifecycle',
      color: 'border-success/35 bg-success/10 text-success',
      icon: CheckCircle,
      label: 'Utilisateur activé',
    },
    USER_CREATE: {
      category: 'lifecycle',
      color: 'border-success/35 bg-success/10 text-success',
      icon: UserPlus,
      label: 'Utilisateur créé',
    },
    USER_DEACTIVATE: {
      category: 'lifecycle',
      color: 'border-warning/35 bg-warning/10 text-warning',
      icon: UserMinus,
      label: 'Utilisateur désactivé',
    },
    USER_DELETE: {
      category: 'lifecycle',
      color: 'border-destructive/35 bg-destructive/10 text-destructive',
      icon: Trash2,
      label: 'Utilisateur supprimé',
    },
    USER_UPDATE: {
      category: 'profile',
      color: 'border-info/35 bg-info/10 text-info',
      icon: Pencil,
      label: 'Utilisateur modifié',
    },
  }),
);

const DEFAULT_ACTION_CONFIG: ActionConfig = {
  category: 'other',
  color: 'border-sidebar-border/70 bg-surface-muted text-muted-foreground',
  icon: History,
  label: 'Action',
};

const CATEGORY_LABELS = new Map<ActionCategoryKey, string>([
  ['access', 'Accès'],
  ['auth', 'Connexion'],
  ['lifecycle', 'Cycle de vie'],
  ['other', 'Autre'],
  ['profile', 'Profil'],
  ['security', 'Sécurité'],
  ['system', 'Technique'],
]);

const FIELD_LABELS = new Map<string, string>([
  ['contactEmail', 'Email de contact'],
  ['contactEmailVerifiedAt', 'Email de contact vérifié le'],
  ['email', 'Ancien email de connexion'],
  ['firstName', 'Prénom'],
  ['isActive', 'Actif'],
  ['lastName', 'Nom'],
  ['loginName', 'Identifiant de connexion'],
  ['passwordChange', 'Mot de passe'],
  ['passwordReset', 'Mot de passe'],
  ['permissions', 'Permissions'],
  ['revokedSessions', 'Sessions révoquées'],
  ['role', 'Rôle'],
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

const AUTH_LOCATION: ActivityLocationInfo = {
  icon: 'ShieldCheck',
  pageKey: 'authentication',
  pageLabel: 'Authentification',
  poleKey: 'system',
  poleLabel: 'Système',
  tabLabel: 'Connexions',
  tone: 'system',
};

const ACCOUNT_PROFILE_LOCATION: ActivityLocationInfo = {
  icon: 'UserCheck',
  pageKey: 'account',
  pageLabel: 'Mon compte',
  poleKey: 'account',
  poleLabel: 'Espace personnel',
  tabLabel: 'Profil',
  tone: 'internal',
};

const ACCOUNT_SECURITY_LOCATION: ActivityLocationInfo = {
  ...ACCOUNT_PROFILE_LOCATION,
  tabLabel: 'Sécurité',
};

const USERS_LOCATION: ActivityLocationInfo = {
  icon: 'Users',
  pageKey: 'users',
  pageLabel: 'Utilisateurs & permissions',
  poleKey: 'system',
  poleLabel: 'Système',
  tabLabel: 'Page',
  tone: 'system',
};

const SYSTEM_LOCATION: ActivityLocationInfo = {
  icon: 'Settings',
  pageKey: 'technical',
  pageLabel: 'Technique',
  poleKey: 'system',
  poleLabel: 'Système',
  tabLabel: 'Technique',
  tone: 'system',
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const toValidDate = (date: Date | string | null): Date | null => {
  if (!date) return null;

  const parsedDate = new Date(date);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const formatRelativeTime = (date: Date | string | null): string => {
  const then = toValidDate(date);
  if (!then) return 'Date inconnue';

  const now = new Date();
  const diffMs = then.getTime() - now.getTime();
  const isFuture = diffMs > 0;
  const absDiffMs = Math.abs(diffMs);
  const diffMins = Math.floor(absDiffMs / 60000);
  const diffHours = Math.floor(absDiffMs / 3600000);
  const diffDays = Math.floor(absDiffMs / 86400000);

  if (isFuture) {
    if (diffMins < 1) return "Dans moins d'une minute";
    if (diffMins < 60) return `Dans ${diffMins} min`;
    if (diffHours < 24) return `Dans ${diffHours}h`;
    if (diffDays < 7) return `Dans ${diffDays}j`;
  } else {
    if (diffMins < 1) return "A l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
  }

  return then.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatFullDate = (date: Date | string | null): string => {
  const parsedDate = toValidDate(date);
  if (!parsedDate) return 'Date inconnue';

  return parsedDate.toLocaleString('fr-FR', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const getActionConfig = (log: JournalLog): ActionConfig => {
  return (
    ACTION_CONFIG.get(log.action) ?? {
      ...DEFAULT_ACTION_CONFIG,
      label: log.description || log.action,
    }
  );
};

const ActivitySelectVisualOption: FC<ActivityFilterOption> = ({
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
          'flex size-7 shrink-0 items-center justify-center rounded-md border',
          toneClasses.icon,
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </div>
  );
};

const ConnectionEventSelectOption: FC<ConnectionEventFilterOption> = ({
  color,
  icon: Icon,
  label,
}) => (
  <div className="flex min-w-0 items-center gap-2">
    <span
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-md border',
        color,
      )}
    >
      <Icon className="size-3.5" />
    </span>
    <span className="min-w-0 flex-1 truncate">{label}</span>
  </div>
);

const getJournalPageOptions = (poleKey: string): ActivityFilterOption[] => {
  if (poleKey === ALL_FILTER_VALUE) return [ALL_PAGE_OPTION];

  const options: ActivityFilterOption[] = [ALL_PAGE_OPTION];

  if (poleKey === 'account') {
    options.push(ACCOUNT_PAGE_OPTION);
  }

  if (poleKey === 'system') {
    options.push(AUTHENTICATION_PAGE_OPTION);
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

const getPermissionChangeFieldKey = (permissionKey: string): string =>
  `${PERMISSION_CHANGE_FIELD_PREFIX}${permissionKey}`;

const getPermissionKeyFromChangeField = (fieldKey: string): string | null => {
  if (!fieldKey.startsWith(PERMISSION_CHANGE_FIELD_PREFIX)) return null;

  return fieldKey.slice(PERMISSION_CHANGE_FIELD_PREFIX.length);
};

const getChangeFieldLabel = (fieldKey: string): string => {
  const permissionKey = getPermissionKeyFromChangeField(fieldKey);

  if (permissionKey) {
    return getPermissionItem(permissionKey)?.label ?? permissionKey;
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

  if (key === 'isActive') return value ? 'Oui' : 'Non';
  if (key === 'role') {
    return value === 'ADMIN' ? 'Administrateur' : 'Utilisateur';
  }
  if (key === 'staffProfile.joinedAt') {
    const parsedDate = toValidDate(value as string);

    return parsedDate
      ? parsedDate.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '(vide)';
  }
  if (typeof value === 'string') {
    return value.length > 42 ? `${value.slice(0, 42)}...` : value;
  }

  return String(value);
};

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

  if (!changeValues || !isRecord(changeValues)) return [];

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

const getMetadataString = (
  metadata: Record<string, unknown> | null,
  keys: string[],
): string | null => {
  if (!metadata) return null;

  const entries = Object.entries(metadata);

  for (const key of keys) {
    const value = entries.find(([entryKey]) => entryKey === key)?.[1];

    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
};

const getLocationIcon = (poleKey: string): NavigationIconName => {
  if (poleKey.includes('account') || poleKey.includes('compte')) {
    return 'UserCheck';
  }
  if (poleKey.includes('treasury')) return 'Wallet';
  if (poleKey.includes('system') || poleKey.includes('systeme')) {
    return 'Settings';
  }

  return 'LayoutDashboard';
};

const isSelfTargetedActivity = (log: JournalLog): boolean => {
  return !!log.userId && !!log.targetUserId && log.userId === log.targetUserId;
};

const getActivityLocation = (log: JournalLog): ActivityLocationInfo => {
  const metadata = log.metadata;
  const rawPageKey = getMetadataString(metadata, ['pageKey', 'pageId']);
  const rawPoleKey = getMetadataString(metadata, ['poleKey', 'sectionKey']);
  const pageLabel = getMetadataString(metadata, ['pageLabel', 'moduleLabel']);
  const poleLabel = getMetadataString(metadata, ['poleLabel', 'sectionLabel']);
  const tabLabel = getMetadataString(metadata, [
    'tabLabel',
    'tab',
    'viewLabel',
  ]);

  if (rawPageKey || rawPoleKey || pageLabel || poleLabel) {
    const pageKey = rawPageKey ?? 'unknown';
    const poleKey = rawPoleKey ?? 'system';
    const category = PERMISSION_CATEGORIES.find(
      (permissionCategory) => permissionCategory.key === pageKey,
    );
    const pole = PERMISSION_POLES.find(
      (permissionPole) => permissionPole.key === poleKey,
    );

    return {
      icon: category?.icon ?? pole?.icon ?? getLocationIcon(poleKey),
      pageKey,
      pageLabel: pageLabel ?? category?.label ?? 'Page non renseignée',
      poleKey,
      poleLabel: poleLabel ?? pole?.label ?? 'Système',
      tabLabel: tabLabel ?? 'Page',
      tone: category?.tone ?? pole?.tone ?? 'system',
    };
  }

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

  if (log.action === 'PASSWORD_RESET' || log.action === 'SESSION_INVALIDATE') {
    return {
      ...USERS_LOCATION,
      tabLabel: 'Sécurité',
    };
  }

  if (
    log.action === 'LOGIN_SUCCESS' ||
    log.action === 'LOGIN_FAILED' ||
    log.action === 'LOGOUT' ||
    log.action === 'PASSWORD_CHANGE' ||
    log.action === 'ACCOUNT_LOCKED'
  ) {
    return {
      ...AUTH_LOCATION,
      tabLabel:
        log.action === 'PASSWORD_CHANGE' || log.action === 'ACCOUNT_LOCKED'
          ? 'Sécurité'
          : AUTH_LOCATION.tabLabel,
    };
  }

  if (log.category === 'SYSTEM') return SYSTEM_LOCATION;

  return {
    ...USERS_LOCATION,
    tabLabel:
      log.action === 'PERMISSION_UPDATE'
        ? 'Accès'
        : log.action === 'USER_UPDATE'
          ? 'Profil'
          : log.action === 'USER_ACTIVATE' ||
              log.action === 'USER_CREATE' ||
              log.action === 'USER_DEACTIVATE' ||
              log.action === 'USER_DELETE'
            ? 'Résumé'
            : 'Page',
  };
};

const getScopeVisuals = (log: JournalLog): ScopeVisual[] => {
  const visuals: ScopeVisual[] = [];

  if (log.actorName || log.userId) {
    visuals.push({
      className: 'border-success/35 bg-success/10 text-success',
      icon: UserCheck,
      label: `Réalisé par ${log.actorName ?? log.userId}`,
      value: 'actor',
    });
  }
  if (log.targetName || log.targetUserId) {
    visuals.push({
      className: 'border-info/35 bg-info/10 text-info',
      icon: Shield,
      label: `Concernant ${log.targetName ?? log.targetUserId}`,
      value: 'target',
    });
  }

  return visuals.length > 0
    ? visuals
    : [
        {
          className:
            'border-sidebar-border/70 bg-surface-muted text-muted-foreground',
          icon: History,
          label: 'Activité système',
          value: 'system',
        },
      ];
};

const ScopeSummary: FC<{ scopes: ScopeVisual[] }> = ({ scopes }) => (
  <span className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
    {scopes.map((scope) => {
      const Icon = scope.icon;

      return (
        <span
          key={scope.value}
          className={cn(
            'inline-flex max-w-full items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-xs font-medium',
            scope.className,
          )}
        >
          <Icon className="size-3 shrink-0" />
          <span className="min-w-0 truncate">{scope.label}</span>
        </span>
      );
    })}
  </span>
);

const ChangeItem: FC<ChangeDiff> = ({ after, before, fieldKey }) => {
  const label = getChangeFieldLabel(fieldKey);
  const isFactOnly = FACT_ONLY_CHANGE_KEYS.has(fieldKey);
  const beforeValue = formatChangeValue(fieldKey, before);
  const afterValue = formatChangeValue(fieldKey, after);

  return (
    <div className="border-sidebar-border/60 bg-background/40 grid gap-2 rounded-md border px-2.5 py-2 text-xs sm:grid-cols-[minmax(13rem,16rem)_minmax(0,1fr)] sm:items-center">
      <span
        className="text-foreground min-w-0 truncate font-semibold"
        title={label}
      >
        {label}
      </span>
      {isFactOnly ? (
        <span className="bg-primary/10 text-primary min-w-0 rounded px-1.5 py-0.5 font-medium break-words">
          {afterValue}
        </span>
      ) : (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground/70 text-xs font-medium uppercase">
            Avant
          </span>
          <span className="bg-muted text-muted-foreground max-w-full rounded px-1.5 py-0.5 break-words line-through">
            {beforeValue}
          </span>
          <ArrowRight size={12} className="text-muted-foreground shrink-0" />
          <span className="text-primary/80 text-xs font-medium uppercase">
            Après
          </span>
          <span className="bg-primary/10 text-primary max-w-full rounded px-1.5 py-0.5 break-words">
            {afterValue}
          </span>
        </div>
      )}
    </div>
  );
};

const JournalCard: FC<{
  isOpen: boolean;
  log: JournalLog;
  onToggle: () => void;
}> = ({ isOpen, log, onToggle }) => {
  const config = getActionConfig(log);
  const changes = getChangeDiffs(log.metadata);
  const location = getActivityLocation(log);
  const locationToneClasses = getNavigationSpaceToneClasses(location.tone);
  const LocationIcon = getNavigationIcon(location.icon);
  const EventIcon = config.icon;
  const categoryLabel =
    CATEGORY_LABELS.get(config.category) ?? CATEGORY_LABELS.get('other');
  const scopeVisuals = getScopeVisuals(log);

  return (
    <article
      className={cn(
        'border-sidebar-border/60 bg-surface-muted/35 relative overflow-hidden rounded-lg border transition-colors',
        isOpen
          ? 'border-sidebar-ring/35 bg-popover/75'
          : 'hover:border-sidebar-border hover:bg-surface-muted/60',
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
                'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg border',
                config.color,
              )}
            >
              <EventIcon size={17} />
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
              <ScopeSummary scopes={scopeVisuals} />
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {changes.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="border-primary/20 bg-primary/15 text-primary px-1.5 py-0 text-xs"
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
          <div className="hidden min-w-0 md:block">
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
          <div className="hidden min-w-0 text-right md:block">
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
        <div className="border-sidebar-border/65 bg-background/25 border-t px-3 py-3 sm:px-4">
          <div className="space-y-3 md:ml-[3.25rem]">
            {changes.length > 0 && (
              <section className="border-sidebar-ring/35 bg-sidebar-ring/10 rounded-lg border p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="text-foreground text-xs font-semibold">
                    Changements
                  </p>
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary text-xs"
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
              <div className="border-sidebar-border/60 bg-surface-muted/35 mt-2 rounded-lg border px-3 py-2">
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
};

const JournalSkeleton: FC = () => (
  <div className="space-y-2" role="status" aria-label="Chargement">
    {Array.from({ length: 6 }).map((_, index) => (
      <Skeleton key={index} className="h-24 rounded-lg" />
    ))}
  </div>
);

export const SystemActivityJournalPage: FC<SystemActivityJournalPageProps> = ({
  item,
  space,
}) => {
  const { userData } = useUser();
  const canAccessPage = canShowNavigationItem(userData, item);
  const Icon = getNavigationIcon(item.icon);
  const [period, setPeriod] = useState('30d');
  const [logType, setLogType] = useState<JournalLogType>('activity');
  const [connectionEventFilter, setConnectionEventFilter] =
    useState(ALL_FILTER_VALUE);
  const [poleFilter, setPoleFilter] = useState(ALL_FILTER_VALUE);
  const [pageFilter, setPageFilter] = useState(ALL_FILTER_VALUE);
  const [logs, setLogs] = useState<JournalLog[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [openLogId, setOpenLogId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedCursor, setFailedCursor] = useState<string | null>(null);
  const isConnectionJournal = logType === 'connections';
  const isPageFilterLocked = poleFilter === ALL_FILTER_VALUE;
  const effectivePageFilter = isPageFilterLocked
    ? ALL_FILTER_VALUE
    : pageFilter;
  const pageOptions = useMemo(
    () => getJournalPageOptions(poleFilter),
    [poleFilter],
  );
  const selectedPoleOption =
    JOURNAL_POLE_OPTIONS.find((option) => option.value === poleFilter) ??
    ALL_POLE_OPTION;
  const selectedPageOption =
    pageOptions.find((option) => option.value === effectivePageFilter) ??
    ALL_PAGE_OPTION;
  const selectedConnectionEventOption =
    CONNECTION_EVENT_OPTIONS.find(
      (option) => option.value === connectionEventFilter,
    ) ?? ALL_CONNECTION_EVENT_OPTION;
  const requestSequenceRef = useRef(0);
  const filterControlsGridClassName =
    'grid gap-3 xl:grid-cols-[18rem_18rem_13rem_auto] xl:items-end';

  const queryParams = useMemo(() => {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      logType,
      period,
    });

    if (logType === 'connections') {
      if (connectionEventFilter !== ALL_FILTER_VALUE) {
        params.set('connectionAction', connectionEventFilter);
      }
    } else {
      if (poleFilter !== ALL_FILTER_VALUE) params.set('poleKey', poleFilter);
      if (effectivePageFilter !== ALL_FILTER_VALUE) {
        params.set('pageKey', effectivePageFilter);
      }
    }

    return params;
  }, [connectionEventFilter, effectivePageFilter, logType, period, poleFilter]);

  const handleLogTypeChange = (value: JournalLogType): void => {
    if (value === logType) return;

    requestSequenceRef.current += 1;
    setLogType(value);
    setOpenLogId(null);
  };

  const handlePoleFilterChange = (value: string): void => {
    if (value === poleFilter) return;

    requestSequenceRef.current += 1;
    setPoleFilter(value);
    setPageFilter(ALL_FILTER_VALUE);
    setOpenLogId(null);
  };

  const handlePageFilterChange = (value: string): void => {
    if (isPageFilterLocked) return;
    if (value === pageFilter) return;

    requestSequenceRef.current += 1;
    setPageFilter(value);
    setOpenLogId(null);
  };

  const handleConnectionEventFilterChange = (value: string): void => {
    if (value === connectionEventFilter) return;

    requestSequenceRef.current += 1;
    setConnectionEventFilter(value);
    setOpenLogId(null);
  };

  const fetchLogs = useCallback(
    async (cursor?: string): Promise<void> => {
      const params = new URLSearchParams(queryParams);
      const append = !!cursor;
      const requestId = requestSequenceRef.current + 1;

      requestSequenceRef.current = requestId;

      if (cursor) params.set('cursor', cursor);

      try {
        if (append) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
          setError(null);
        }

        const response = await fetch(
          `/api/systeme/journal-activite?${params.toString()}`,
        );
        const body = (await response.json()) as {
          data?: JournalResponse;
          error?: { message?: string };
          success: boolean;
        };

        if (!response.ok || !body.success || !body.data) {
          throw new Error(
            body.error?.message ||
              "Impossible de charger le journal d'activité",
          );
        }

        const responseData = body.data;

        if (requestSequenceRef.current !== requestId) return;

        setError(null);
        setFailedCursor(null);
        setLogs((currentLogs) =>
          append ? [...currentLogs, ...responseData.logs] : responseData.logs,
        );
        setNextCursor(responseData.nextCursor);
      } catch (fetchError) {
        if (requestSequenceRef.current !== requestId) return;

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Impossible de charger le journal d'activité",
        );
        setFailedCursor(cursor ?? null);
      } finally {
        if (requestSequenceRef.current === requestId) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [queryParams],
  );

  useEffect(() => {
    setLogs([]);
    setNextCursor(null);
    setOpenLogId(null);
    if (canAccessPage) {
      void fetchLogs();
    }
  }, [canAccessPage, fetchLogs]);

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
            description="Historique central des connexions, changements utilisateurs et actions sensibles du site privé."
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
          <section className="border-sidebar-border/70 bg-surface rounded-lg border p-4 shadow-[var(--shadow-panel)]">
            <div className="space-y-3">
              <div className="space-y-3">
                <p className="text-foreground text-sm font-semibold">
                  Filtres du journal
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {JOURNAL_TYPE_OPTIONS.map((option) => {
                    const TypeIcon = option.icon;
                    const isActiveType = logType === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={isActiveType}
                        onClick={() => handleLogTypeChange(option.value)}
                        className={cn(
                          'border-sidebar-border/60 bg-surface-muted hover:bg-sidebar-accent/25 flex min-w-0 items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                          isActiveType && 'border-primary/45 bg-primary/10',
                        )}
                      >
                        <span
                          className={cn(
                            'flex size-8 shrink-0 items-center justify-center rounded-md border',
                            isActiveType
                              ? 'border-primary/35 bg-primary/15 text-primary'
                              : 'border-sidebar-border/70 bg-background/45 text-muted-foreground',
                          )}
                        >
                          <TypeIcon className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="text-foreground block truncate text-sm font-semibold">
                            {option.label}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {option.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className={filterControlsGridClassName}>
                {isConnectionJournal ? (
                  <div className="space-y-2 xl:col-span-2">
                    <label
                      htmlFor="journal-connection-event"
                      className="text-muted-foreground text-xs font-medium"
                    >
                      Événement
                    </label>
                    <Select
                      value={connectionEventFilter}
                      onValueChange={handleConnectionEventFilterChange}
                    >
                      <SelectTrigger
                        id="journal-connection-event"
                        className={activitySelectTriggerClassName}
                      >
                        <SelectValue>
                          <ConnectionEventSelectOption
                            color={selectedConnectionEventOption.color}
                            icon={selectedConnectionEventOption.icon}
                            label={selectedConnectionEventOption.label}
                            value={selectedConnectionEventOption.value}
                          />
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className={activitySelectContentClassName}>
                        {CONNECTION_EVENT_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            className={activitySelectItemClassName}
                          >
                            <ConnectionEventSelectOption
                              color={option.color}
                              icon={option.icon}
                              label={option.label}
                              value={option.value}
                            />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label
                        htmlFor="journal-pole"
                        className="text-muted-foreground text-xs font-medium"
                      >
                        Pôle
                      </label>
                      <Select
                        value={poleFilter}
                        onValueChange={handlePoleFilterChange}
                      >
                        <SelectTrigger
                          id="journal-pole"
                          className={activitySelectTriggerClassName}
                        >
                          <SelectValue>
                            <ActivitySelectVisualOption
                              icon={selectedPoleOption.icon}
                              label={selectedPoleOption.label}
                              tone={selectedPoleOption.tone}
                              value={selectedPoleOption.value}
                            />
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent
                          className={activitySelectContentClassName}
                        >
                          {JOURNAL_POLE_OPTIONS.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                              className={activitySelectItemClassName}
                            >
                              <ActivitySelectVisualOption
                                icon={option.icon}
                                label={option.label}
                                tone={option.tone}
                                value={option.value}
                              />
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="journal-page"
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
                          id="journal-page"
                          className={cn(
                            activitySelectTriggerClassName,
                            isPageFilterLocked && 'opacity-70',
                          )}
                        >
                          <SelectValue>
                            <ActivitySelectVisualOption
                              icon={selectedPageOption.icon}
                              label={selectedPageOption.label}
                              tone={selectedPageOption.tone}
                              value={selectedPageOption.value}
                            />
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent
                          className={activitySelectContentClassName}
                        >
                          {pageOptions.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                              className={activitySelectItemClassName}
                            >
                              <ActivitySelectVisualOption
                                icon={option.icon}
                                label={option.label}
                                tone={option.tone}
                                value={option.value}
                              />
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <label
                    htmlFor="journal-period"
                    className="text-muted-foreground text-xs font-medium"
                  >
                    Période
                  </label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger
                      id="journal-period"
                      className={activitySelectTriggerClassName}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={activitySelectContentClassName}>
                      {PERIOD_OPTIONS.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className={activitySelectItemClassName}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-md"
                  onClick={() => void fetchLogs()}
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={cn('size-4', isLoading && 'animate-spin')}
                  />
                  Actualiser
                </Button>
              </div>
            </div>
          </section>
          <section className="space-y-2">
            <div className="border-sidebar-border/60 bg-surface-muted/45 text-muted-foreground hidden grid-cols-[minmax(0,1fr)_18rem_10rem_1.5rem] rounded-lg border px-4 py-2 text-xs font-medium md:grid">
              <span>Événement</span>
              <span>Emplacement</span>
              <span className="text-right">Date</span>
              <span />
            </div>
            {isLoading ? (
              <JournalSkeleton />
            ) : error && logs.length === 0 ? (
              <ContentState
                action={
                  <Button
                    disabled={isLoading}
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
                    key={log.id}
                    log={log}
                    isOpen={openLogId === log.id}
                    onToggle={() =>
                      setOpenLogId(openLogId === log.id ? null : log.id)
                    }
                  />
                ))}
                {nextCursor && (
                  <div className="pt-2 text-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void fetchLogs(nextCursor)}
                      disabled={isLoadingMore}
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
          </section>
        </PageCanvas>
      </PageShell>
    </AuthenticatedLayout>
  );
};
