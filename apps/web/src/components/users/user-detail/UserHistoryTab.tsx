'use client';

import {
  ArrowRight,
  Ban,
  Calendar,
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
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import React, { type FC, memo, useMemo, useState } from 'react';
import { toast } from 'sonner';

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
import { cn } from '$utils/css.utils';

// ============================================
// TYPES
// ============================================

type UserHistoryTabProps = {
  auditLogs: AuditLogEntry[];
  isLoading: boolean;
  userId: string;
};

type ActionConfig = {
  category: string;
  color: string;
  icon: LucideIcon;
  label: string;
};

type ChangeDiff = {
  after: unknown;
  before: unknown;
  fieldKey: string;
};

const SECURITY_ACTIONS = new Set([
  'ACCOUNT_LOCKED',
  'PASSWORD_CHANGE',
  'PASSWORD_RESET',
  'SESSION_INVALIDATE',
]);

const ADMINISTRATION_ACTIONS = new Set([
  'PERMISSION_UPDATE',
  'USER_ACTIVATE',
  'USER_CREATE',
  'USER_DEACTIVATE',
  'USER_DELETE',
  'USER_UPDATE',
]);

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
    color: 'text-primary bg-primary/10',
    icon: CheckCircle,
    label: 'Connexion réussie',
  },
  LOGOUT: {
    category: 'auth',
    color: 'text-muted-foreground bg-muted',
    icon: LogOut,
    label: 'Déconnexion',
  },
  PASSWORD_CHANGE: {
    category: 'security',
    color: 'text-amber-400 bg-amber-500/10',
    icon: Key,
    label: 'Mot de passe modifié',
  },
  PASSWORD_RESET: {
    category: 'security',
    color: 'text-amber-400 bg-amber-500/10',
    icon: RefreshCw,
    label: 'Mot de passe réinitialisé',
  },
  // User actions
  PERMISSION_UPDATE: {
    category: 'admin',
    color: 'text-primary bg-primary/10',
    icon: Shield,
    label: 'Permissions modifiées',
  },
  SESSION_INVALIDATE: {
    category: 'security',
    color: 'text-amber-400 bg-amber-500/10',
    icon: LogIn,
    label: 'Session révoquée',
  },
  USER_ACTIVATE: {
    category: 'admin',
    color: 'text-primary bg-primary/10',
    icon: UserCheck,
    label: 'Utilisateur activé',
  },
  USER_CREATE: {
    category: 'admin',
    color: 'text-primary bg-primary/10',
    icon: UserPlus,
    label: 'Utilisateur créé',
  },
  USER_DEACTIVATE: {
    category: 'admin',
    color: 'text-amber-400 bg-amber-500/10',
    icon: UserMinus,
    label: 'Utilisateur désactivé',
  },
  USER_DELETE: {
    category: 'admin',
    color: 'text-destructive bg-destructive/10',
    icon: Trash2,
    label: 'Utilisateur supprimé',
  },
  USER_UPDATE: {
    category: 'admin',
    color: 'text-primary bg-primary/10',
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

const CATEGORY_FILTERS = [
  { icon: Filter, label: 'Toutes', value: 'all' },
  { icon: LogIn, label: 'Connexions', value: 'auth' },
  { icon: Shield, label: 'Sécurité', value: 'security' },
  { icon: Users, label: 'Administration', value: 'admin' },
];

const SOURCE_FILTERS = [
  { label: 'Tous', value: 'all' },
  { label: 'Fait par lui', value: 'by' },
  { label: 'Sur son compte', value: 'on' },
];

const DATE_FILTERS = [
  { label: 'Tout', value: 'all' },
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

  if (diffSecs < 60) return "A l'instant";
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
  ['email', 'Email'],
  ['firstName', 'Prénom'],
  ['isActive', 'Actif'],
  ['lastName', 'Nom'],
  ['name', 'Nom'],
  ['permissions', 'Permissions'],
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

// Format value for display
const formatChangeValue = (key: string, value: unknown): string => {
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

const getChangeDiffs = (
  metadata: Record<string, unknown> | null,
): ChangeDiff[] => {
  const beforeValues = metadata?.before as Record<string, unknown> | undefined;
  const afterValues = metadata?.after as Record<string, unknown> | undefined;

  if (beforeValues && afterValues) {
    const afterValuesByKey = new Map(Object.entries(afterValues));

    return Object.entries(beforeValues).map(([fieldKey, before]) => ({
      after: afterValuesByKey.get(fieldKey),
      before,
      fieldKey,
    }));
  }

  const changeValues = metadata?.changes as Record<
    string,
    { from?: unknown; to?: unknown }
  > | null;

  if (!changeValues || typeof changeValues !== 'object') return [];

  return Object.entries(changeValues)
    .filter(([, value]) => {
      return (
        value && typeof value === 'object' && ('from' in value || 'to' in value)
      );
    })
    .map(([fieldKey, value]) => ({
      after: value.to,
      before: value.from,
      fieldKey,
    }));
};

// ============================================
// COMPONENTS
// ============================================

const getStatIconClassName = (color?: string): string => {
  if (color?.includes('amber')) {
    return 'border-amber-500/35 bg-amber-500/10 text-amber-400';
  }

  return 'border-sidebar-ring/35 bg-sidebar-ring/15 text-sidebar-ring';
};

const StatCard: FC<{
  color?: string;
  icon: LucideIcon;
  label: string;
  value: number;
}> = ({ color, icon: Icon, label, value }) => (
  <Card className="group border-sidebar-border/70 relative overflow-hidden rounded-xl py-0 transition-all hover:shadow-md">
    <CardContent className="p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-foreground text-xl font-semibold tracking-tight">
            {value}
          </p>
          <p className="text-muted-foreground mt-1 text-xs font-medium">
            {label}
          </p>
        </div>
        <div
          className={cn(
            'flex size-9 items-center justify-center rounded-lg border',
            getStatIconClassName(color),
          )}
        >
          <Icon className="size-4" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Component to display a single change (before -> after)
const ChangeItem: FC<{
  after: unknown;
  before: unknown;
  fieldKey: string;
}> = ({ after, before, fieldKey }) => {
  const label = FIELD_LABELS.get(fieldKey) || fieldKey;
  const beforeStr = formatChangeValue(fieldKey, before);
  const afterStr = formatChangeValue(fieldKey, after);

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-muted-foreground font-medium">{label}:</span>
      <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 line-through">
        {beforeStr}
      </span>
      <ArrowRight size={12} className="text-muted-foreground" />
      <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5">
        {afterStr}
      </span>
    </div>
  );
};

const TimelineItem: FC<{
  config: ActionConfig;
  isOpen: boolean;
  isTargetedAction: boolean;
  log: AuditLogEntry;
  onToggle: () => void;
}> = memo(({ config, isOpen, isTargetedAction, log, onToggle }) => {
  const Icon = config.icon;

  // Extract data from metadata
  const metadata = log.metadata as Record<string, unknown> | null;
  const targetName = metadata?.targetName as string | undefined;
  const changes = getChangeDiffs(metadata);
  const hasChanges = changes.length > 0;

  return (
    <button
      type="button"
      aria-expanded={isOpen}
      className={cn(
        'group w-full cursor-pointer overflow-hidden rounded-lg border p-2.5 text-left transition-all sm:p-3',
        isOpen
          ? 'border-border bg-popover'
          : 'hover:border-border hover:bg-accent/60 border-transparent',
      )}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform',
            config.color,
            isOpen && 'scale-105',
          )}
        >
          <Icon size={16} />
        </div>
        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-foreground text-sm font-medium">
                  {config.label}
                </p>
                {isTargetedAction && (
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary px-1.5 py-0 text-[10px]"
                  >
                    sur compte
                  </Badge>
                )}
                {hasChanges && (
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary px-1.5 py-0 text-[10px]"
                  >
                    {changes.length} modif.
                  </Badge>
                )}
              </div>
              {targetName && (
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  {targetName}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-muted-foreground text-xs">
                {formatRelativeTime(log.createdAt)}
              </span>
              <ChevronDown
                size={14}
                className={cn(
                  'text-muted-foreground transition-transform',
                  isOpen && 'rotate-180',
                )}
              />
            </div>
          </div>
          {/* Expanded details */}
          {isOpen && (
            <div className="mt-3 space-y-2">
              {/* Date and IP on same line */}
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="flex items-center gap-1.5">
                  <Calendar size={12} />
                  {formatFullDate(log.createdAt)}
                </span>
                {log.ipAddress && (
                  <span className="flex items-center gap-1.5">
                    <Globe size={12} />
                    {log.ipAddress}
                  </span>
                )}
              </div>
              {/* Changes diff */}
              {hasChanges && (
                <div className="border-border bg-card space-y-1.5 rounded-lg border p-2.5">
                  {changes.map((change) => (
                    <ChangeItem
                      key={change.fieldKey}
                      fieldKey={change.fieldKey}
                      before={change.before}
                      after={change.after}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
});

TimelineItem.displayName = 'TimelineItem';

// ============================================
// MAIN COMPONENT
// ============================================

export const UserHistoryTab: FC<UserHistoryTabProps> = ({
  auditLogs,
  isLoading,
  userId,
}) => {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [showCount, setShowCount] = useState(20);
  const [openLogId, setOpenLogId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const connectionEvents = auditLogs.filter((log) => {
      const config = ACTION_CONFIG[log.action] || DEFAULT_CONFIG;

      return config.category === 'auth';
    }).length;
    const securityEvents = auditLogs.filter((log) =>
      SECURITY_ACTIONS.has(log.action),
    ).length;
    const administrationEvents = auditLogs.filter((log) =>
      ADMINISTRATION_ACTIONS.has(log.action),
    ).length;

    return {
      administration: administrationEvents,
      connections: connectionEvents,
      security: securityEvents,
      total: auditLogs.length,
    };
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    const now = new Date();

    return auditLogs.filter((log) => {
      // Category filter
      if (categoryFilter !== 'all') {
        const config = ACTION_CONFIG[log.action] || DEFAULT_CONFIG;
        if (config.category !== categoryFilter) return false;
      }
      // Source filter
      if (sourceFilter !== 'all') {
        const isByUser = log.userId === userId;
        if (sourceFilter === 'by' && !isByUser) return false;
        if (sourceFilter === 'on' && isByUser) return false;
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
  }, [auditLogs, categoryFilter, sourceFilter, dateFilter, userId]);

  const displayedLogs = filteredLogs.slice(0, showCount);
  const hasMore = filteredLogs.length > showCount;

  // Export to CSV (limited to 500 rows)
  const handleExport = (): void => {
    const maxExport = 500;
    const logsToExport = filteredLogs.slice(0, maxExport);

    const headers = ['Date', 'Action', 'Description', 'IP', 'Source'];
    const rows = logsToExport.map((log) => {
      const config = ACTION_CONFIG[log.action] || DEFAULT_CONFIG;
      const isByUser = log.userId === userId;

      return [
        formatFullDate(log.createdAt),
        config.label,
        log.description || '',
        log.ipAddress || '',
        isByUser ? 'Fait par lui' : 'Sur son compte',
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
    link.download = `activité_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    const message =
      filteredLogs.length > maxExport
        ? `${logsToExport.length} événement(s) exporté(s) (limite atteinte)`
        : `${logsToExport.length} événement(s) exporté(s)`;
    toast.success(message);
  };

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Empty
  if (auditLogs.length === 0) {
    return (
      <Card className="border-sidebar-border/70 min-h-[360px] items-center justify-center rounded-xl py-0">
        <CardContent className="flex flex-col items-center p-8">
          <div className="border-sidebar-ring/35 bg-sidebar-ring/15 text-sidebar-ring flex size-20 items-center justify-center rounded-xl border">
            <History className="size-10" />
          </div>
          <h3 className="text-foreground mt-6 text-lg font-semibold">
            Aucune activité
          </h3>
          <p className="text-muted-foreground mt-2 max-w-xs text-center text-sm">
            Les connexions, changements de sécurité et actions administratives
            apparaîtront ici.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="shrink-0">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total" value={stats.total} icon={History} />
          <StatCard
            label="Connexions"
            value={stats.connections}
            color="text-primary"
            icon={LogIn}
          />
          <StatCard
            label="Sécurité"
            value={stats.security}
            color="text-amber-400"
            icon={Shield}
          />
          <StatCard
            label="Administration"
            value={stats.administration}
            color="text-primary"
            icon={Users}
          />
        </div>
      </div>
      {/* Filters */}
      <Card className="border-sidebar-border/70 shrink-0 overflow-hidden rounded-xl py-0">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="border-border h-9 w-[160px] rounded-lg text-sm">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_FILTERS.map((filter) => {
                  const FilterIcon = filter.icon;

                  return (
                    <SelectItem key={filter.value} value={filter.value}>
                      <div className="flex items-center gap-2">
                        <FilterIcon
                          size={14}
                          className="text-muted-foreground"
                        />
                        <span>{filter.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="border-border h-9 w-[150px] rounded-lg text-sm">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_FILTERS.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="border-border h-9 w-[150px] rounded-lg text-sm">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                {DATE_FILTERS.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(categoryFilter !== 'all' ||
              sourceFilter !== 'all' ||
              dateFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-9 rounded-lg"
                onClick={() => {
                  setCategoryFilter('all');
                  setSourceFilter('all');
                  setDateFilter('all');
                }}
              >
                <RefreshCw size={14} className="mr-1.5" />
                Réinitialiser
              </Button>
            )}
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-lg"
              onClick={handleExport}
              disabled={filteredLogs.length === 0}
            >
              <Download size={14} className="mr-1.5" />
              <span className="hidden sm:inline">Exporter</span>
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Timeline */}
      <Card className="border-sidebar-border/70 gap-0 overflow-hidden rounded-xl py-0">
        <CardContent className="p-0">
          <div className="px-3 sm:px-4">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="border-sidebar-ring/35 bg-sidebar-ring/15 text-sidebar-ring flex h-16 w-16 items-center justify-center rounded-xl border">
                  <Filter className="h-8 w-8" />
                </div>
                <p className="text-muted-foreground mt-4 text-sm">
                  Aucun résultat pour ces filtres
                </p>
              </div>
            ) : (
              <div className="pb-4">
                {((): React.ReactNode => {
                  let lastCategory: DateCategory | null = null;

                  return displayedLogs.map((log) => {
                    const config = ACTION_CONFIG[log.action] || DEFAULT_CONFIG;
                    const isTargetedAction = log.userId !== userId;
                    const category = getDateCategory(log.createdAt);
                    const showSeparator = category !== lastCategory;
                    lastCategory = category;

                    return (
                      <div key={log.id}>
                        {showSeparator && (
                          <div className="bg-card flex items-center gap-3 px-1 py-2">
                            <div className="bg-sidebar-border/70 h-px flex-1" />
                            <span className="text-muted-foreground text-xs font-medium">
                              {DATE_CATEGORY_LABELS.get(category) ||
                                'Plus ancien'}
                            </span>
                            <div className="bg-sidebar-border/70 h-px flex-1" />
                          </div>
                        )}
                        <TimelineItem
                          log={log}
                          config={config}
                          isTargetedAction={isTargetedAction}
                          isOpen={openLogId === log.id}
                          onToggle={() =>
                            setOpenLogId(openLogId === log.id ? null : log.id)
                          }
                        />
                      </div>
                    );
                  });
                })()}
                {hasMore && (
                  <div className="pt-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border rounded-lg"
                      onClick={() => setShowCount((c) => c + 20)}
                    >
                      Charger plus ({filteredLogs.length - showCount} restants)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
        {/* Footer */}
        <CardFooter className="border-sidebar-border/65 text-muted-foreground shrink-0 justify-center border-t bg-[#1f293b] px-4 py-3 text-center text-xs">
          {filteredLogs.length} événement{filteredLogs.length > 1 ? 's' : ''}
          {(categoryFilter !== 'all' ||
            sourceFilter !== 'all' ||
            dateFilter !== 'all') &&
            ' (filtre)'}
        </CardFooter>
      </Card>
    </div>
  );
};
