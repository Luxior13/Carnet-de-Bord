'use client';

import { UserRole } from '@repo/database';
import {
  Check,
  ChevronDown,
  CircleAlert,
  LayoutDashboard,
  type LucideIcon,
  Search,
  ShieldCheck,
  ShieldOff,
  SlidersHorizontal,
  Sparkles,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import React, { type FC, memo, useCallback, useMemo, useState } from 'react';

import {
  buildPermissionOverrides,
  getEffectivePermissions,
  PERMISSION_CATEGORIES,
  type PermissionAction,
  type PermissionCategory,
  type PermissionItem,
  type PermissionRisk,
  type PermissionsData,
  ROLE_TEMPLATES,
} from '$constants/permissions.constants';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '$ui/dropdown-menu';
import { Input } from '$ui/input';
import { ScrollArea } from '$ui/scroll-area';
import { Separator } from '$ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '$ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';
import { cn } from '$utils/css.utils';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Wallet,
};

type ColorConfig = {
  bg: string;
  border: string;
  icon: string;
  ring: string;
};

const defaultColorConfig: ColorConfig = {
  bg: 'bg-primary/10',
  border: 'border-primary/35',
  icon: 'text-primary',
  ring: 'ring-primary/20',
};

const colorClasses: Record<string, ColorConfig> = {
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/35',
    icon: 'text-amber-400',
    ring: 'ring-amber-500/20',
  },
  blue: defaultColorConfig,
  green: {
    bg: 'bg-[#5fbd7b]/10',
    border: 'border-[#5fbd7b]/35',
    icon: 'text-[#97e6ad]',
    ring: 'ring-[#5fbd7b]/20',
  },
  violet: {
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/35',
    icon: 'text-violet-300',
    ring: 'ring-violet-500/20',
  },
};

type PermissionsEditorProps = {
  disabled?: boolean;
  headerControls?: React.ReactNode;
  onChange: (permissions: PermissionsData | null) => void;
  permissions: PermissionsData | null;
  role: UserRole;
};

type PermissionFilter =
  | 'all'
  | 'custom'
  | 'disabled'
  | 'enabled'
  | 'incomplete';
type PermissionChoiceState = 'allow' | 'deny';
type PermissionResultState =
  | 'allowed'
  | 'denied'
  | 'incomplete'
  | 'page-blocked';

type VisiblePermissionCategory = PermissionCategory & {
  permissions: PermissionItem[];
};

type PermissionModuleGroup = {
  module: string;
  permissions: PermissionItem[];
};

const FILTER_OPTIONS: Array<{
  icon: LucideIcon;
  label: string;
  value: PermissionFilter;
}> = [
  { icon: SlidersHorizontal, label: 'Toutes', value: 'all' },
  { icon: ShieldCheck, label: 'Autorisees', value: 'enabled' },
  { icon: ShieldOff, label: 'Refusees', value: 'disabled' },
  { icon: CircleAlert, label: 'A completer', value: 'incomplete' },
  { icon: Sparkles, label: 'Modifiees', value: 'custom' },
];

const ACTION_LABELS: Record<PermissionAction, string> = {
  create: 'Creer',
  delete: 'Supprimer',
  export: 'Exporter',
  manage: 'Gerer',
  reset: 'Reinitialiser',
  update: 'Modifier',
  validate: 'Valider',
  view: 'Voir',
};

const RISK_LABELS: Record<PermissionRisk, string | null> = {
  critical: 'Critique',
  default: null,
  sensitive: 'Sensible',
};

const OVERRIDE_STATE_OPTIONS: Array<{
  icon: LucideIcon;
  label: string;
  value: PermissionChoiceState;
}> = [
  { icon: Check, label: 'Autoriser', value: 'allow' },
  { icon: X, label: 'Refuser', value: 'deny' },
];

const getRiskBadgeClassName = (risk: PermissionRisk): string => {
  if (risk === 'critical') return 'border-destructive/40 text-destructive';
  if (risk === 'sensitive') return 'border-amber-500/40 text-amber-400';

  return 'border-border/70 text-muted-foreground';
};

const getPermissionRowClassName = (
  isEnabled: boolean,
  hasMissingDependencies: boolean,
): string => {
  if (hasMissingDependencies) return 'bg-amber-500/10';
  if (!isEnabled) return 'bg-popover/55';

  return 'bg-surface/80';
};

const getRiskBorderClassName = (risk: PermissionRisk): string => {
  if (risk === 'critical') return 'border-l-destructive/70';
  if (risk === 'sensitive') return 'border-l-amber-400/70';

  return 'border-l-primary/45';
};

const getPermissionResultLabel = (
  resultState: PermissionResultState,
): string => {
  if (resultState === 'page-blocked') return 'Page bloquee';
  if (resultState === 'incomplete') return 'A completer';
  if (resultState === 'allowed') return 'Autorise';

  return 'Refuse';
};

const getPermissionResultBadgeClassName = (
  resultState: PermissionResultState,
): string => {
  if (resultState === 'page-blocked') {
    return 'border-amber-500/45 bg-amber-500/15 text-amber-300';
  }

  if (resultState === 'incomplete') {
    return 'border-amber-500/45 bg-amber-500/15 text-amber-300';
  }

  if (resultState === 'allowed') {
    return 'bg-[#5fbd7b]/15 text-[#b6f1c6]';
  }

  return 'border-destructive/30 bg-destructive/10 text-destructive';
};

const getStateButtonClassName = (
  option: PermissionChoiceState,
  currentState: PermissionChoiceState,
): string => {
  if (option !== currentState) {
    return 'border-transparent text-muted-foreground hover:bg-accent/70 hover:text-foreground';
  }

  if (option === 'allow') {
    return 'border-[#5fbd7b]/35 bg-[#5fbd7b]/15 text-[#b6f1c6] shadow-sm';
  }

  if (option === 'deny') {
    return 'border-destructive/40 bg-destructive/15 text-destructive shadow-sm';
  }

  return 'border-primary/30 bg-primary/10 text-primary shadow-sm';
};

const toPermissionsData = (
  permissionsMap: Map<string, boolean>,
): PermissionsData | null => {
  if (permissionsMap.size === 0) return null;

  return Object.fromEntries(permissionsMap) as PermissionsData;
};

const getPermissionOverrideState = (
  effectivePermissionsMap: Map<string, boolean>,
  permissionKey: string,
): PermissionChoiceState => {
  return effectivePermissionsMap.get(permissionKey) ? 'allow' : 'deny';
};

const groupPermissionsByModule = (
  permissions: PermissionItem[],
): PermissionModuleGroup[] => {
  const groups = new Map<string, PermissionItem[]>();

  for (const permission of permissions) {
    const existingPermissions = groups.get(permission.module) ?? [];

    groups.set(permission.module, [...existingPermissions, permission]);
  }

  return Array.from(groups.entries()).map(([module, modulePermissions]) => ({
    module,
    permissions: modulePermissions,
  }));
};

const getMissingPermissionDependencies = (
  permission: PermissionItem,
  effectivePermissionsMap: Map<string, boolean>,
): string[] => {
  const isEnabled = effectivePermissionsMap.get(permission.key) ?? false;

  if (!isEnabled) return [];

  return (permission.dependencies ?? []).filter(
    (dependency) => !(effectivePermissionsMap.get(dependency) ?? false),
  );
};

const countCategoryPermissionResults = (
  category: PermissionCategory,
  effectivePermissionsMap: Map<string, boolean>,
): {
  enabled: number;
  incomplete: number;
  ready: number;
  total: number;
} => {
  const total = category.permissions.length;
  const enabled = category.permissions.filter(
    (permission) => effectivePermissionsMap.get(permission.key) ?? false,
  ).length;
  const incomplete = category.permissions.filter(
    (permission) =>
      getMissingPermissionDependencies(permission, effectivePermissionsMap)
        .length > 0,
  ).length;

  return {
    enabled,
    incomplete,
    ready: enabled - incomplete,
    total,
  };
};

const getCategoryAccessPermission = (
  category: PermissionCategory,
): PermissionItem | undefined => {
  return (
    category.permissions.find((permission) => permission.action === 'view') ??
    category.permissions[0]
  );
};

type PermissionStatePickerProps = {
  disabled: boolean;
  onChange: (state: PermissionChoiceState) => void;
  permissionLabel: string;
  state: PermissionChoiceState;
};

const PermissionStatePicker: FC<PermissionStatePickerProps> = memo(
  ({ disabled, onChange, permissionLabel, state }) => {
    return (
      <div
        className="border-border/70 bg-popover grid min-w-[12.5rem] grid-cols-2 gap-1 rounded-lg border p-1"
        role="group"
        aria-label={`Choix de la permission ${permissionLabel}`}
      >
        {OVERRIDE_STATE_OPTIONS.map((option) => {
          const OptionIcon = option.icon;

          return (
            <Tooltip key={option.value}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => onChange(option.value)}
                  className={cn(
                    'h-8 rounded-md border px-2 text-xs font-medium',
                    getStateButtonClassName(option.value, state),
                  )}
                  aria-pressed={state === option.value}
                  aria-label={`${option.label} ${permissionLabel}`}
                >
                  <OptionIcon className="size-3.5" />
                  <span className="ml-1 hidden sm:inline">{option.label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>{option.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    );
  },
);

PermissionStatePicker.displayName = 'PermissionStatePicker';

export const PermissionsEditor: FC<PermissionsEditorProps> = memo(
  ({ disabled = false, headerControls, onChange, permissions, role }) => {
    const [selectedCategoryKey, setSelectedCategoryKey] = useState(
      () => PERMISSION_CATEGORIES[0]?.key ?? '',
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [permissionFilter, setPermissionFilter] =
      useState<PermissionFilter>('all');

    const permissionsMap = useMemo(
      () => new Map(Object.entries(permissions ?? {})),
      [permissions],
    );
    const customPermissionKeys = useMemo(
      () => new Set(permissionsMap.keys()),
      [permissionsMap],
    );
    const effectivePermissions = useMemo(
      () => getEffectivePermissions(role, permissions),
      [role, permissions],
    );
    const effectivePermissionsMap = useMemo(
      () => new Map(Object.entries(effectivePermissions)),
      [effectivePermissions],
    );
    const permissionLabelMap = useMemo(
      () =>
        new Map(
          PERMISSION_CATEGORIES.flatMap((category) =>
            category.permissions.map(
              (permission) => [permission.key, permission.label] as const,
            ),
          ),
        ),
      [],
    );

    const handleSetPermissionOverride = useCallback(
      (permissionKey: string, state: PermissionChoiceState) => {
        const nextPermissionsMap = new Map(permissionsMap);

        nextPermissionsMap.set(permissionKey, state === 'allow');

        onChange(toPermissionsData(nextPermissionsMap));
      },
      [onChange, permissionsMap],
    );

    const handleSetCategoryPageAccess = useCallback(
      (categoryKey: string, allowed: boolean) => {
        const category = PERMISSION_CATEGORIES.find(
          (item) => item.key === categoryKey,
        );
        if (!category) return;

        const accessPermission = getCategoryAccessPermission(category);
        if (!accessPermission) return;

        const nextPermissionsMap = new Map(permissionsMap);
        nextPermissionsMap.set(accessPermission.key, allowed);

        onChange(toPermissionsData(nextPermissionsMap));
      },
      [onChange, permissionsMap],
    );

    const handleApplyTemplate = useCallback(
      (templateKey: keyof typeof ROLE_TEMPLATES) => {
        const template = Object.entries(ROLE_TEMPLATES).find(
          ([key]) => key === templateKey,
        )?.[1];
        if (!template) return;

        onChange(buildPermissionOverrides(role, template.permissions));
      },
      [onChange, role],
    );

    const totalPermissions = PERMISSION_CATEGORIES.reduce(
      (acc, category) => acc + category.permissions.length,
      0,
    );
    const enabledPermissions =
      Object.values(effectivePermissions).filter(Boolean).length;
    const incompletePermissionCount = PERMISSION_CATEGORIES.reduce(
      (total, category) =>
        total +
        countCategoryPermissionResults(category, effectivePermissionsMap)
          .incomplete,
      0,
    );
    const readyPermissionCount = enabledPermissions - incompletePermissionCount;
    const customPermissionCount = customPermissionKeys.size;
    const allEnabled = enabledPermissions === totalPermissions;
    const noneEnabled = enabledPermissions === 0;
    const deniedPermissionCount = totalPermissions - enabledPermissions;
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();
    const hasActiveFilters =
      normalizedSearchQuery.length > 0 || permissionFilter !== 'all';

    const visibleCategories = useMemo<VisiblePermissionCategory[]>(() => {
      return PERMISSION_CATEGORIES.map((category) => {
        const categorySearchText =
          `${category.label} ${category.description} ${category.key}`.toLowerCase();
        const categoryMatchesSearch =
          normalizedSearchQuery.length === 0 ||
          categorySearchText.includes(normalizedSearchQuery);

        const visiblePermissions = category.permissions.filter((permission) => {
          const isEnabled =
            effectivePermissionsMap.get(permission.key) ?? false;
          const isCustom = customPermissionKeys.has(permission.key);
          const hasMissingDependencies =
            getMissingPermissionDependencies(
              permission,
              effectivePermissionsMap,
            ).length > 0;
          const permissionSearchText =
            `${permission.label} ${permission.description} ${permission.module} ${permission.action} ${permission.key}`.toLowerCase();
          const matchesSearch =
            categoryMatchesSearch ||
            permissionSearchText.includes(normalizedSearchQuery);

          if (!matchesSearch) return false;
          if (permissionFilter === 'enabled') return isEnabled;
          if (permissionFilter === 'disabled') return !isEnabled;
          if (permissionFilter === 'incomplete') {
            return hasMissingDependencies;
          }
          if (permissionFilter === 'custom') return isCustom;

          return true;
        });

        return {
          ...category,
          permissions: visiblePermissions,
        };
      }).filter((category) => category.permissions.length > 0);
    }, [
      customPermissionKeys,
      effectivePermissionsMap,
      normalizedSearchQuery,
      permissionFilter,
    ]);

    const selectedCategory =
      visibleCategories.find(
        (category) => category.key === selectedCategoryKey,
      ) ??
      visibleCategories[0] ??
      null;
    const selectedCategoryColors = selectedCategory
      ? (colorClasses[selectedCategory.color] ?? defaultColorConfig)
      : defaultColorConfig;
    const selectedCategoryIconClassName = `${selectedCategoryColors.bg} ${selectedCategoryColors.icon}`;
    const selectedCategoryGroups = useMemo(
      () =>
        selectedCategory
          ? groupPermissionsByModule(selectedCategory.permissions)
          : [],
      [selectedCategory],
    );
    const selectedCategoryResult = selectedCategory
      ? countCategoryPermissionResults(
          selectedCategory,
          effectivePermissionsMap,
        )
      : null;
    const selectedCategoryAccessPermission = selectedCategory
      ? getCategoryAccessPermission(selectedCategory)
      : undefined;

    return (
      <div className="space-y-3">
        <div className="border-sidebar-border/65 bg-surface-muted flex flex-col gap-3 rounded-lg border p-3">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="text-foreground font-semibold">Permissions</h3>
              <Badge
                variant="secondary"
                className={cn(
                  'text-xs',
                  allEnabled && 'bg-primary/10 text-primary',
                  noneEnabled && 'bg-muted text-muted-foreground',
                )}
              >
                {readyPermissionCount}/{totalPermissions} utilisables
              </Badge>
              {incompletePermissionCount > 0 && (
                <Badge
                  variant="outline"
                  className="border-amber-500/40 text-xs text-amber-300"
                >
                  {incompletePermissionCount} a completer
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {deniedPermissionCount} refusee
                {deniedPermissionCount > 1 ? 's' : ''}
              </Badge>
              {customPermissionCount > 0 && (
                <Badge
                  variant="outline"
                  className="border-primary/40 text-primary text-xs"
                >
                  {customPermissionCount} choix manuel
                  {customPermissionCount > 1 ? 's' : ''}
                </Badge>
              )}
              {disabled && (
                <Badge variant="outline" className="text-xs">
                  Lecture seule
                </Badge>
              )}
            </div>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              {headerControls && (
                <div className="min-w-0 lg:min-w-56">{headerControls}</div>
              )}
              <div className="flex flex-wrap gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={disabled}
                      className="gap-2"
                    >
                      <Sparkles size={14} />
                      Modeles
                      <ChevronDown size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {Object.entries(ROLE_TEMPLATES).map(([key, template]) => (
                      <DropdownMenuItem
                        key={key}
                        onClick={() =>
                          handleApplyTemplate(
                            key as keyof typeof ROLE_TEMPLATES,
                          )
                        }
                      >
                        {template.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Rechercher une permission ou un module..."
                className="bg-popover h-9 pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {FILTER_OPTIONS.map((filter) => {
                const FilterIcon = filter.icon;
                const isActive = permissionFilter === filter.value;

                return (
                  <Button
                    key={filter.value}
                    type="button"
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setPermissionFilter(filter.value)}
                    className={cn(
                      'h-8 gap-1.5',
                      isActive && '[&>svg]:text-primary font-medium',
                    )}
                  >
                    <FilterIcon className="size-3.5" />
                    {filter.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
        {visibleCategories.length > 0 && selectedCategory ? (
          <div className="grid gap-3 xl:grid-cols-[18rem_minmax(0,1fr)]">
            <aside className="border-sidebar-border/70 bg-surface overflow-hidden rounded-lg border">
              <div className="p-2">
                <p className="text-muted-foreground px-2 pb-2 text-[11px] font-semibold tracking-[0.14em] uppercase">
                  Poles
                </p>
                <div className="space-y-1">
                  {visibleCategories.map((category) => {
                    const Icon = iconMap[category.icon] || LayoutDashboard;
                    const colors =
                      colorClasses[category.color] ?? defaultColorConfig;
                    const isSelected = selectedCategory.key === category.key;
                    const categoryResult = countCategoryPermissionResults(
                      category,
                      effectivePermissionsMap,
                    );
                    const categoryOverrideCount = category.permissions.filter(
                      (permission) => customPermissionKeys.has(permission.key),
                    ).length;

                    return (
                      <Button
                        key={category.key}
                        type="button"
                        variant="ghost"
                        onClick={() => setSelectedCategoryKey(category.key)}
                        className={cn(
                          'h-auto w-full justify-start gap-2 rounded-lg border border-transparent p-2.5 text-left',
                          isSelected &&
                            `${colors.bg} ${colors.border} ${colors.ring} ring-1`,
                        )}
                      >
                        <span
                          className={cn(
                            'flex size-8 shrink-0 items-center justify-center rounded-md',
                            colors.bg,
                            colors.icon,
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="text-foreground block truncate text-sm font-medium">
                            {category.label}
                          </span>
                          <span className="text-muted-foreground mt-0.5 block text-xs">
                            {categoryResult.ready}/{categoryResult.total}{' '}
                            utilisable
                            {categoryResult.ready > 1 ? 's' : ''}
                            {categoryResult.incomplete > 0
                              ? ` - ${categoryResult.incomplete} a completer`
                              : ''}
                            {hasActiveFilters
                              ? ` - ${category.permissions.length} affichee${category.permissions.length > 1 ? 's' : ''}`
                              : ''}
                          </span>
                        </span>
                        {categoryOverrideCount > 0 && (
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {categoryOverrideCount}
                          </Badge>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <Separator className="bg-sidebar-border/60" />
              <div className="text-muted-foreground grid grid-cols-3 gap-1 p-2 text-center text-[11px]">
                <span>
                  <strong className="block text-xs text-[#b6f1c6]">
                    {readyPermissionCount}
                  </strong>
                  autorisees
                </span>
                <span>
                  <strong className="block text-xs text-amber-300">
                    {incompletePermissionCount}
                  </strong>
                  a completer
                </span>
                <span>
                  <strong className="text-destructive block text-xs">
                    {deniedPermissionCount}
                  </strong>
                  refusees
                </span>
              </div>
            </aside>
            <section className="border-sidebar-border/70 bg-surface overflow-hidden rounded-lg border">
              <div className="border-sidebar-border/65 bg-surface-muted flex flex-col gap-3 border-b p-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-lg',
                      selectedCategoryIconClassName,
                    )}
                  >
                    {React.createElement(
                      iconMap[selectedCategory.icon] || LayoutDashboard,
                      { className: 'size-5' },
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-foreground font-semibold">
                        {selectedCategory.label}
                      </h4>
                      <Badge variant="secondary" className="text-xs">
                        {selectedCategoryResult?.ready ?? 0}/
                        {selectedCategoryResult?.total ?? 0} utilisables
                      </Badge>
                      {(selectedCategoryResult?.incomplete ?? 0) > 0 && (
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 text-xs text-amber-300"
                        >
                          {selectedCategoryResult?.incomplete} a completer
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {selectedCategory.description}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedCategoryAccessPermission && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disabled}
                        onClick={() =>
                          handleSetCategoryPageAccess(
                            selectedCategory.key,
                            true,
                          )
                        }
                        className="gap-1.5"
                      >
                        <Check className="size-3.5" />
                        Autoriser la page
                      </Button>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={disabled}
                            onClick={() =>
                              handleSetCategoryPageAccess(
                                selectedCategory.key,
                                false,
                              )
                            }
                            className="border-destructive/35 text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5"
                          >
                            <X className="size-3.5" />
                            Bloquer la page
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={6}>
                          Refuse seulement{' '}
                          {selectedCategoryAccessPermission.label}
                        </TooltipContent>
                      </Tooltip>
                    </>
                  )}
                </div>
              </div>
              <ScrollArea
                className="h-[clamp(26rem,58vh,44rem)]"
                viewportClassName="pr-3"
              >
                <div className="space-y-4 p-3">
                  {selectedCategoryGroups.map((group) => (
                    <div
                      key={group.module}
                      className="border-sidebar-border/70 overflow-hidden rounded-lg border"
                    >
                      <div className="bg-surface-muted border-sidebar-border/65 flex items-center justify-between gap-2 border-b px-3 py-2">
                        <div>
                          <h5 className="text-foreground text-sm font-semibold">
                            {group.module}
                          </h5>
                          <p className="text-muted-foreground text-xs">
                            {group.permissions.length} permission
                            {group.permissions.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="h-9 min-w-[16rem] px-3">
                              Permission
                            </TableHead>
                            <TableHead className="h-9 min-w-[8rem] px-3">
                              Resultat
                            </TableHead>
                            <TableHead className="h-9 min-w-[17rem] px-3">
                              Choix
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.permissions.map((permission) => {
                            const isEnabled =
                              effectivePermissionsMap.get(permission.key) ??
                              false;
                            const overrideState = getPermissionOverrideState(
                              effectivePermissionsMap,
                              permission.key,
                            );
                            const hasCustomChoice = customPermissionKeys.has(
                              permission.key,
                            );
                            const riskLabel = RISK_LABELS[permission.risk];
                            const dependencies = permission.dependencies ?? [];
                            const missingDependencies =
                              getMissingPermissionDependencies(
                                permission,
                                effectivePermissionsMap,
                              );
                            const hasMissingDependencies =
                              missingDependencies.length > 0;
                            const isBlockedByPage = missingDependencies.some(
                              (dependency) =>
                                dependency ===
                                selectedCategoryAccessPermission?.key,
                            );
                            const dependencyLabels = dependencies.map(
                              (dependency) =>
                                permissionLabelMap.get(dependency) ??
                                dependency,
                            );
                            const missingDependencyLabels =
                              missingDependencies.map(
                                (dependency) =>
                                  permissionLabelMap.get(dependency) ??
                                  dependency,
                              );
                            const resultState: PermissionResultState =
                              isBlockedByPage
                                ? 'page-blocked'
                                : hasMissingDependencies
                                  ? 'incomplete'
                                  : isEnabled
                                    ? 'allowed'
                                    : 'denied';

                            return (
                              <TableRow
                                key={permission.key}
                                className={cn(
                                  'hover:bg-accent/35 border-l-2',
                                  getRiskBorderClassName(permission.risk),
                                  getPermissionRowClassName(
                                    isEnabled,
                                    hasMissingDependencies,
                                  ),
                                )}
                              >
                                <TableCell className="px-3 py-3 align-top">
                                  <div className="flex min-w-0 flex-col gap-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-foreground text-sm font-medium">
                                        {permission.label}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="text-muted-foreground border-border/70 text-[10px]"
                                      >
                                        {ACTION_LABELS[permission.action]}
                                      </Badge>
                                      {riskLabel && (
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            'text-[10px]',
                                            getRiskBadgeClassName(
                                              permission.risk,
                                            ),
                                          )}
                                        >
                                          {riskLabel}
                                        </Badge>
                                      )}
                                      {hasCustomChoice && (
                                        <Badge
                                          variant="outline"
                                          className="border-primary/40 text-primary text-[10px]"
                                        >
                                          Choix manuel
                                        </Badge>
                                      )}
                                      {hasMissingDependencies && (
                                        <Badge
                                          variant="outline"
                                          className="border-amber-500/40 text-[10px] text-amber-400"
                                        >
                                          {isBlockedByPage
                                            ? 'Page bloquee'
                                            : 'Acces lie manquant'}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-muted-foreground text-xs">
                                      {permission.description}
                                    </p>
                                    {hasMissingDependencies ? (
                                      <p className="text-[11px] text-amber-300">
                                        {isBlockedByPage
                                          ? 'Page bloquee par : '
                                          : 'A autoriser aussi : '}
                                        {missingDependencyLabels.join(', ')}
                                      </p>
                                    ) : (
                                      dependencies.length > 0 && (
                                        <p className="text-muted-foreground/85 text-[11px]">
                                          Acces lie :{' '}
                                          {dependencyLabels.join(', ')}
                                        </p>
                                      )
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="px-3 py-3 align-top">
                                  <div className="flex flex-col gap-1">
                                    <Badge
                                      variant={
                                        resultState === 'allowed'
                                          ? 'secondary'
                                          : 'outline'
                                      }
                                      className={cn(
                                        'w-fit text-xs',
                                        getPermissionResultBadgeClassName(
                                          resultState,
                                        ),
                                      )}
                                    >
                                      {getPermissionResultLabel(resultState)}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell className="px-3 py-3 align-top">
                                  <PermissionStatePicker
                                    disabled={disabled}
                                    permissionLabel={permission.label}
                                    state={overrideState}
                                    onChange={(state) =>
                                      handleSetPermissionOverride(
                                        permission.key,
                                        state,
                                      )
                                    }
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </section>
          </div>
        ) : (
          <div className="border-sidebar-border/70 bg-surface flex flex-col items-center justify-center rounded-lg border p-8 text-center">
            <Search className="text-muted-foreground size-8" />
            <p className="text-foreground mt-3 text-sm font-medium">
              Aucune permission trouvee
            </p>
            <p className="text-muted-foreground mt-1 max-w-sm text-xs">
              Ajustez la recherche ou changez de filtre pour afficher
              d&apos;autres permissions.
            </p>
          </div>
        )}
      </div>
    );
  },
);

PermissionsEditor.displayName = 'PermissionsEditor';
