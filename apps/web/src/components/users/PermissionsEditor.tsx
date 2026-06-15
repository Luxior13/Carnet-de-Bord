'use client';

import { UserRole } from '@repo/database';
import {
  Check,
  ChevronDown,
  LayoutDashboard,
  type LucideIcon,
  RotateCcw,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import React, { type FC, memo, useCallback, useMemo, useState } from 'react';

import {
  countCategoryPermissions,
  getEffectivePermissions,
  PERMISSION_CATEGORIES,
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
import { Switch } from '$ui/switch';
import { cn } from '$utils/css.utils';

// Icon mapping for categories
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
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
  ring: 'ring-blue-500/20',
};

// Color classes for categories
const colorClasses: Record<string, ColorConfig> = {
  amber: {
    bg: 'bg-amber-500/10',
    icon: 'text-amber-500',
    ring: 'ring-amber-500/20',
  },
  blue: defaultColorConfig,
  violet: {
    bg: 'bg-primary/10',
    icon: 'text-primary',
    ring: 'ring-primary/20',
  },
};

type PermissionsEditorProps = {
  disabled?: boolean;
  onChange: (permissions: PermissionsData | null) => void;
  permissions: PermissionsData | null;
  role: UserRole;
};

export const PermissionsEditor: FC<PermissionsEditorProps> = memo(
  ({ disabled = false, onChange, permissions, role }) => {
    // Only one category open at a time (accordion behavior)
    const [openCategory, setOpenCategory] = useState<string | null>(null);

    // Get effective permissions
    const effectivePermissions = useMemo(
      () => getEffectivePermissions(role, permissions),
      [role, permissions],
    );

    // Toggle a permission
    const handleToggle = useCallback(
      (permKey: string, checked: boolean) => {
        const newPermissions = { ...(permissions || {}) };
        newPermissions[permKey] = checked;
        onChange(newPermissions);
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

        const newPermissions = { ...(permissions || {}) };

        for (const perm of category.permissions) {
          newPermissions[perm.key] = enable;
        }

        onChange(newPermissions);
      },
      [permissions, onChange],
    );

    // Toggle all permissions globally
    const handleToggleAll = useCallback(
      (enable: boolean) => {
        const newPermissions: PermissionsData = {};

        for (const category of PERMISSION_CATEGORIES) {
          for (const perm of category.permissions) {
            newPermissions[perm.key] = enable;
          }
        }

        onChange(newPermissions);
      },
      [onChange],
    );

    // Apply a template
    const handleApplyTemplate = useCallback(
      (templateKey: keyof typeof ROLE_TEMPLATES) => {
        const template = ROLE_TEMPLATES[templateKey];
        const newPermissions: PermissionsData = {};

        // First, set all to false
        for (const category of PERMISSION_CATEGORIES) {
          for (const perm of category.permissions) {
            newPermissions[perm.key] = false;
          }
        }

        // Then enable template permissions
        for (const permKey of template.permissions) {
          newPermissions[permKey] = true;
        }

        onChange(newPermissions);
      },
      [onChange],
    );

    // Reset all permissions
    const handleResetAll = useCallback(() => {
      onChange(null);
    }, [onChange]);

    // Toggle category open/close (accordion - only one at a time)
    const toggleCategory = useCallback((key: string) => {
      setOpenCategory((prev) => (prev === key ? null : key));
    }, []);

    // Count total permissions
    const totalPermissions = PERMISSION_CATEGORIES.reduce(
      (acc, cat) => acc + cat.permissions.length,
      0,
    );
    const enabledPermissions =
      Object.values(effectivePermissions).filter(Boolean).length;
    const allEnabled = enabledPermissions === totalPermissions;
    const noneEnabled = enabledPermissions === 0;

    return (
      <div className="space-y-4">
        {/* Header with stats and actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-foreground font-semibold">Permissions</h3>
              <Badge
                variant="secondary"
                className={cn(
                  'text-xs',
                  allEnabled && 'bg-emerald-500/10 text-emerald-400',
                  noneEnabled && 'bg-red-500/10 text-red-400',
                )}
              >
                {enabledPermissions}/{totalPermissions} actives
              </Badge>
            </div>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Definissez les droits d&apos;acces de l&apos;utilisateur
            </p>
          </div>
          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {/* Template dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  className="gap-2"
                >
                  <Sparkles size={14} />
                  Templates
                  <ChevronDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {Object.entries(ROLE_TEMPLATES).map(([key, template]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() =>
                      handleApplyTemplate(key as keyof typeof ROLE_TEMPLATES)
                    }
                  >
                    {template.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Global toggle buttons */}
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
              <span className="hidden sm:inline">Tout desactiver</span>
            </Button>
            {/* Reset button */}
            {permissions && Object.keys(permissions).length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetAll}
                disabled={disabled}
                className="text-muted-foreground gap-1.5"
              >
                <RotateCcw size={14} />
              </Button>
            )}
          </div>
        </div>
        {/* Permission Categories */}
        <div className="space-y-3">
          {PERMISSION_CATEGORIES.map((category) => {
            const Icon = iconMap[category.icon] || LayoutDashboard;
            const colors = colorClasses[category.color] ?? defaultColorConfig;
            const isOpen = openCategory === category.key;
            const { enabled, total } = countCategoryPermissions(
              category.key,
              effectivePermissions,
            );
            const categoryAllEnabled = enabled === total;
            const categoryNoneEnabled = enabled === 0;

            return (
              <Collapsible
                key={category.key}
                open={isOpen}
                onOpenChange={() => toggleCategory(category.key)}
              >
                <div
                  className={cn(
                    'border-border overflow-hidden rounded-lg border transition-all',
                    isOpen && `ring-1 ${colors.ring}`,
                  )}
                >
                  {/* Category Header */}
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={disabled}
                      className={cn(
                        'h-auto w-full justify-between rounded-none p-3 text-left',
                        'hover:bg-accent/60',
                        isOpen && 'border-border border-b',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                            colors.bg,
                          )}
                        >
                          <Icon size={20} className={colors.icon} />
                        </div>
                        <div>
                          <span className="text-foreground font-medium">
                            {category.label}
                          </span>
                          <p className="text-muted-foreground text-xs">
                            {category.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-xs',
                            categoryAllEnabled &&
                              'bg-emerald-500/10 text-emerald-400',
                            categoryNoneEnabled && 'bg-red-500/10 text-red-400',
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
                          Tout :
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
                          Desactiver
                        </Button>
                      </div>
                      {/* Permissions list */}
                      <div className="space-y-2">
                        {category.permissions.map((perm) => {
                          const isEnabled =
                            effectivePermissions[perm.key] ?? false;

                          return (
                            <div
                              key={perm.key}
                              className={cn(
                                'flex items-center justify-between rounded-lg border p-3 transition-all',
                                isEnabled
                                  ? 'border-emerald-500/20 bg-emerald-500/10'
                                  : 'border-border bg-background/35',
                              )}
                            >
                              <div className="flex-1 pr-4">
                                <span className="text-foreground text-sm font-medium">
                                  {perm.label}
                                </span>
                                <p className="text-muted-foreground text-xs">
                                  {perm.description}
                                </p>
                              </div>
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) =>
                                  handleToggle(perm.key, checked)
                                }
                                disabled={disabled}
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
        </div>
      </div>
    );
  },
);

PermissionsEditor.displayName = 'PermissionsEditor';
