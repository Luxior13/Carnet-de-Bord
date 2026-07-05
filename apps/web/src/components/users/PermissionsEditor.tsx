'use client';

import { UserRole } from '@repo/database';
import {
  Check,
  ChevronDown,
  LayoutDashboard,
  type LucideIcon,
  RotateCcw,
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
  countCategoryPermissions,
  getEffectivePermissions,
  PERMISSION_CATEGORIES,
  type PermissionCategory,
  type PermissionItem,
  type PermissionsData,
  ROLE_TEMPLATES,
} from '$constants/permissions.constants';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '$ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '$ui/dropdown-menu';
import { Input } from '$ui/input';
import { Switch } from '$ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';
import { cn } from '$utils/css.utils';

// Icon mapping for categories
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Wallet,
};

// Color config type
type ColorConfig = {
  bg: string;
  icon: string;
  ring: string;
};

// Default color (blue)
const defaultColorConfig: ColorConfig = {
  bg: 'bg-primary/10',
  icon: 'text-primary',
  ring: 'ring-primary/20',
};

// Color classes for categories
const colorClasses: Record<string, ColorConfig> = {
  amber: {
    bg: 'bg-amber-500/10',
    icon: 'text-amber-400',
    ring: 'ring-amber-500/20',
  },
  blue: defaultColorConfig,
  green: {
    bg: 'bg-[#5fbd7b]/10',
    icon: 'text-[#97e6ad]',
    ring: 'ring-[#5fbd7b]/20',
  },
  violet: {
    bg: 'bg-primary/10',
    icon: 'text-primary',
    ring: 'ring-primary/20',
  },
};

type PermissionsEditorProps = {
  disabled?: boolean;
  headerControls?: React.ReactNode;
  onChange: (permissions: PermissionsData | null) => void;
  permissions: PermissionsData | null;
  role: UserRole;
};

type PermissionFilter = 'all' | 'custom' | 'disabled' | 'enabled';

type VisiblePermissionCategory = PermissionCategory & {
  permissions: PermissionItem[];
};

type PermissionTone = 'critical' | 'default' | 'sensitive';

const FILTER_OPTIONS: Array<{
  icon: LucideIcon;
  label: string;
  value: PermissionFilter;
}> = [
  { icon: SlidersHorizontal, label: 'Toutes', value: 'all' },
  { icon: ShieldCheck, label: 'Actives', value: 'enabled' },
  { icon: ShieldOff, label: 'Inactives', value: 'disabled' },
  { icon: Sparkles, label: 'Personnalisées', value: 'custom' },
];

const getPermissionTone = (permissionKey: string): PermissionTone => {
  if (permissionKey.includes(':delete')) return 'critical';
  if (
    permissionKey.includes('reset_password') ||
    permissionKey.includes('edit_permissions') ||
    (permissionKey.startsWith('treasury:') && permissionKey !== 'treasury:view')
  ) {
    return 'sensitive';
  }

  return 'default';
};

const getPermissionToneLabel = (tone: PermissionTone): string | null => {
  if (tone === 'critical') return 'Critique';
  if (tone === 'sensitive') return 'Sensible';

  return null;
};

const getPermissionRowClassName = (
  isEnabled: boolean,
  tone: PermissionTone,
): string => {
  if (!isEnabled) return 'border-border/70 bg-popover';
  if (tone === 'critical') return 'border-destructive/30 bg-destructive/10';
  if (tone === 'sensitive') return 'border-amber-500/25 bg-amber-500/10';

  return 'border-primary/25 bg-primary/10';
};

const getPermissionIconClassName = (
  isEnabled: boolean,
  tone: PermissionTone,
): string => {
  if (!isEnabled) return 'bg-muted text-muted-foreground';
  if (tone === 'critical') return 'bg-destructive/10 text-destructive';
  if (tone === 'sensitive') return 'bg-amber-500/10 text-amber-400';

  return 'bg-primary/10 text-primary';
};

export const PermissionsEditor: FC<PermissionsEditorProps> = memo(
  ({ disabled = false, headerControls, onChange, permissions, role }) => {
    const [openCategories, setOpenCategories] = useState<Set<string>>(
      () => new Set(),
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [permissionFilter, setPermissionFilter] =
      useState<PermissionFilter>('all');

    // Get effective permissions
    const effectivePermissions = useMemo(
      () => getEffectivePermissions(role, permissions),
      [role, permissions],
    );
    const effectivePermissionsMap = useMemo(
      () => new Map(Object.entries(effectivePermissions)),
      [effectivePermissions],
    );
    const customPermissionKeys = useMemo(
      () => new Set(Object.keys(permissions ?? {})),
      [permissions],
    );

    // Toggle a permission
    const handleToggle = useCallback(
      (permKey: string, checked: boolean) => {
        onChange(
          Object.fromEntries([
            ...Object.entries(permissions || {}),
            [permKey, checked],
          ]) as PermissionsData,
        );
      },
      [permissions, onChange],
    );

    // Toggle all permissions in a category
    const handleToggleCategory = useCallback(
      (categoryKey: string, enable: boolean) => {
        const category = PERMISSION_CATEGORIES.find(
          (c) => c.key === categoryKey,
        );
        if (!category) return;

        onChange(
          Object.fromEntries([
            ...Object.entries(permissions || {}),
            ...category.permissions.map((perm) => [perm.key, enable] as const),
          ]) as PermissionsData,
        );
      },
      [permissions, onChange],
    );

    // Toggle all permissions globally
    const handleToggleAll = useCallback(
      (enable: boolean) => {
        onChange(
          Object.fromEntries(
            PERMISSION_CATEGORIES.flatMap((category) =>
              category.permissions.map((perm) => [perm.key, enable] as const),
            ),
          ) as PermissionsData,
        );
      },
      [onChange],
    );

    // Apply a template
    const handleApplyTemplate = useCallback(
      (templateKey: keyof typeof ROLE_TEMPLATES) => {
        const template = Object.entries(ROLE_TEMPLATES).find(
          ([key]) => key === templateKey,
        )?.[1];
        if (!template) return;

        const enabledKeys = new Set<string>(template.permissions);

        onChange(
          Object.fromEntries(
            PERMISSION_CATEGORIES.flatMap((category) =>
              category.permissions.map(
                (perm) => [perm.key, enabledKeys.has(perm.key)] as const,
              ),
            ),
          ) as PermissionsData,
        );
      },
      [onChange],
    );

    // Reset all permissions
    const handleResetAll = useCallback(() => {
      onChange(null);
    }, [onChange]);

    const handleCategoryOpenChange = useCallback(
      (key: string, open: boolean) => {
        setOpenCategories((currentOpenCategories) => {
          const nextOpenCategories = new Set(currentOpenCategories);

          if (open) {
            nextOpenCategories.add(key);
          } else {
            nextOpenCategories.delete(key);
          }

          return nextOpenCategories;
        });
      },
      [],
    );

    // Count total permissions
    const totalPermissions = PERMISSION_CATEGORIES.reduce(
      (acc, cat) => acc + cat.permissions.length,
      0,
    );
    const enabledPermissions =
      Object.values(effectivePermissions).filter(Boolean).length;
    const inactivePermissions = totalPermissions - enabledPermissions;
    const customPermissionCount = customPermissionKeys.size;
    const allEnabled = enabledPermissions === totalPermissions;
    const noneEnabled = enabledPermissions === 0;
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
          const permissionSearchText =
            `${permission.label} ${permission.description} ${permission.key}`.toLowerCase();
          const matchesSearch =
            categoryMatchesSearch ||
            permissionSearchText.includes(normalizedSearchQuery);

          if (!matchesSearch) return false;
          if (permissionFilter === 'enabled') return isEnabled;
          if (permissionFilter === 'disabled') return !isEnabled;
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
                {enabledPermissions}/{totalPermissions} actives
              </Badge>
              <Badge variant="outline" className="text-xs">
                {inactivePermissions} inactive
                {inactivePermissions > 1 ? 's' : ''}
              </Badge>
              {customPermissionCount > 0 && (
                <Badge
                  variant="outline"
                  className="border-amber-500/40 text-xs text-amber-400"
                >
                  {customPermissionCount} personnalisée
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
                      Modèles
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleAll(true)}
                  disabled={disabled || allEnabled}
                  className="gap-1.5"
                >
                  <Check size={14} />
                  <span className="hidden sm:inline">Tout activer</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleAll(false)}
                  disabled={disabled || noneEnabled}
                  className="gap-1.5"
                >
                  <X size={14} />
                  <span className="hidden sm:inline">Tout désactiver</span>
                </Button>
                {permissions && Object.keys(permissions).length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetAll}
                        disabled={disabled}
                        className="text-muted-foreground gap-1.5"
                        aria-label="Réinitialiser les permissions"
                      >
                        <RotateCcw size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>
                      Réinitialiser les permissions
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Rechercher une permission, un module ou une clé..."
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
        {/* Permission Categories */}
        <div className="space-y-3">
          {visibleCategories.map((category) => {
            const Icon = iconMap[category.icon] || LayoutDashboard;
            const colors = colorClasses[category.color] ?? defaultColorConfig;
            const isOpen = hasActiveFilters || openCategories.has(category.key);
            const { enabled, total } = countCategoryPermissions(
              category.key,
              effectivePermissions,
            );
            const categoryAllEnabled = enabled === total;
            const categoryNoneEnabled = enabled === 0;
            const categoryIconClassName = categoryAllEnabled
              ? 'bg-primary/10 text-primary'
              : categoryNoneEnabled
                ? 'bg-muted text-muted-foreground'
                : `${colors.bg} ${colors.icon}`;

            return (
              <Collapsible
                key={category.key}
                open={isOpen}
                onOpenChange={(open) =>
                  handleCategoryOpenChange(category.key, open)
                }
              >
                <div
                  className={cn(
                    'border-sidebar-border/70 bg-surface overflow-hidden rounded-lg border transition-all',
                    isOpen &&
                      'border-primary/30 ring-primary/20 bg-surface ring-1',
                  )}
                >
                  {/* Category Header */}
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className={cn(
                        'h-auto w-full justify-between rounded-none p-3 text-left',
                        'hover:bg-accent/60',
                        isOpen && 'border-primary/20 border-b',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                            categoryIconClassName,
                          )}
                        >
                          <Icon size={20} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-foreground block truncate font-medium">
                            {category.label}
                          </span>
                          <p className="text-muted-foreground truncate text-xs">
                            {category.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {hasActiveFilters && (
                          <Badge variant="outline" className="text-xs">
                            {category.permissions.length} affichee
                            {category.permissions.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-xs',
                            categoryAllEnabled && 'bg-primary/10 text-primary',
                            categoryNoneEnabled &&
                              'bg-muted text-muted-foreground',
                          )}
                        >
                          {enabled}/{total}
                        </Badge>
                        <ChevronDown
                          size={16}
                          className={cn(
                            'text-muted-foreground transition-transform',
                            isOpen && 'rotate-180',
                          )}
                        />
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  {/* Category Content */}
                  <CollapsibleContent>
                    <div className="p-3 pt-0">
                      {/* Quick toggle all in category */}
                      <div className="border-border mb-3 flex items-center justify-end gap-2 border-b pb-3">
                        <span className="text-muted-foreground text-xs">
                          Module :
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={disabled || categoryAllEnabled}
                          onClick={() =>
                            handleToggleCategory(category.key, true)
                          }
                        >
                          <Check size={12} className="mr-1" />
                          Activer
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={disabled || categoryNoneEnabled}
                          onClick={() =>
                            handleToggleCategory(category.key, false)
                          }
                        >
                          <X size={12} className="mr-1" />
                          Désactiver
                        </Button>
                      </div>
                      {/* Permissions list */}
                      <div className="grid gap-2 xl:grid-cols-2">
                        {category.permissions.map((perm) => {
                          const isEnabled =
                            effectivePermissionsMap.get(perm.key) ?? false;
                          const isCustom = customPermissionKeys.has(perm.key);
                          const tone = getPermissionTone(perm.key);
                          const toneLabel = getPermissionToneLabel(tone);

                          return (
                            <div
                              key={perm.key}
                              className={cn(
                                'flex items-center justify-between gap-3 rounded-lg border p-2.5 transition-all',
                                getPermissionRowClassName(isEnabled, tone),
                              )}
                            >
                              <div className="flex min-w-0 flex-1 gap-2.5">
                                <span
                                  className={cn(
                                    'flex size-7 shrink-0 items-center justify-center rounded-md',
                                    getPermissionIconClassName(isEnabled, tone),
                                  )}
                                >
                                  {isEnabled ? (
                                    <Check className="size-4" />
                                  ) : (
                                    <X className="size-4" />
                                  )}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-foreground text-sm font-medium">
                                      {perm.label}
                                    </span>
                                    {toneLabel && (
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          'text-[10px]',
                                          tone === 'sensitive' &&
                                            'border-amber-500/40 text-amber-400',
                                          tone === 'critical' &&
                                            'border-destructive/40 text-destructive',
                                        )}
                                      >
                                        {toneLabel}
                                      </Badge>
                                    )}
                                    {isCustom && (
                                      <Badge
                                        variant="outline"
                                        className="border-primary/40 text-primary text-[10px]"
                                      >
                                        Personnalisée
                                      </Badge>
                                    )}
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span
                                          className="text-muted-foreground/80 border-border/70 inline-flex h-5 cursor-help items-center rounded border px-1.5 font-mono text-[10px]"
                                          title={perm.key}
                                        >
                                          Cle
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent sideOffset={6}>
                                        <span className="font-mono">
                                          {perm.key}
                                        </span>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                  <p className="text-muted-foreground mt-1 text-xs">
                                    {perm.description}
                                  </p>
                                </div>
                              </div>
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) =>
                                  handleToggle(perm.key, checked)
                                }
                                disabled={disabled}
                                aria-label={`${isEnabled ? 'Désactiver' : 'Activer'} ${perm.label}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
          {visibleCategories.length === 0 && (
            <div className="border-sidebar-border/70 bg-surface flex flex-col items-center justify-center rounded-lg border p-8 text-center">
              <Search className="text-muted-foreground size-8" />
              <p className="text-foreground mt-3 text-sm font-medium">
                Aucune permission trouvée
              </p>
              <p className="text-muted-foreground mt-1 max-w-sm text-xs">
                Ajustez la recherche ou changez de filtre pour afficher
                d&apos;autres permissions.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  },
);

PermissionsEditor.displayName = 'PermissionsEditor';
