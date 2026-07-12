'use client';

import { UserRole } from '@repo/database';
import {
  Check,
  CircleAlert,
  type LucideIcon,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';
import React, { type FC, memo, useCallback, useMemo } from 'react';

import { getNavigationIcon } from '$constants/navigation-icon.constants';
import {
  getNavigationSpaceToneClasses,
  type NavigationSpaceTone,
} from '$constants/navigation-theme.constants';
import {
  getAccessPermissionKeys,
  getEffectivePermissions,
  getRoleBasePermissions,
  PERMISSION_CATEGORIES,
  PERMISSION_POLES,
  type PermissionAction,
  type PermissionCategory,
  type PermissionItem,
  type PermissionRisk,
  type PermissionsData,
} from '$constants/permissions.constants';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';
import { cn } from '$utils/css.utils';

type PermissionsEditorProps = {
  disabled?: boolean;
  headerControls?: React.ReactNode;
  onChange: (permissions: PermissionsData | null) => void;
  onSelectedPageChange: (pageKey: string) => void;
  permissions: PermissionsData | null;
  role: UserRole;
  selectedPageKey: string;
};

type PermissionChoiceState = 'allow' | 'deny';
type PermissionResultState =
  'allowed' | 'denied' | 'incomplete' | 'page-blocked';

type PermissionModuleGroup = {
  module: string;
  permissions: PermissionItem[];
};

const permissionSelectTriggerClassName =
  'border-sidebar-border/70 bg-surface text-sidebar-foreground hover:bg-sidebar-accent/25 focus-visible:border-sidebar-ring/45 focus-visible:ring-sidebar-ring/35 h-11 w-full shadow-none';

const permissionSelectContentClassName =
  'border-sidebar-border bg-surface-raised/98 text-sidebar-foreground rounded-md p-1.5 shadow-[var(--shadow-panel-strong)]';

const permissionSelectItemClassName =
  'focus:bg-sidebar-accent/55 focus:text-sidebar-accent-foreground rounded-md py-2';

type SelectVisualOptionProps = {
  icon: Parameters<typeof getNavigationIcon>[0];
  label: string;
  result?: PermissionCategoryResult;
  tone: NavigationSpaceTone;
};

type PermissionCategoryResult = {
  enabled: number;
  incomplete: number;
  ready: number;
  total: number;
};

type PermissionAccessStatus = 'full' | 'none' | 'partial';

type PermissionViewModel = {
  defaultState: PermissionChoiceState;
  dependencyLabels: string[];
  hasCustomChoice: boolean;
  hasMissingDependencies: boolean;
  isBlockedByPage: boolean;
  isEnabled: boolean;
  isRoleDefaultEnabled: boolean;
  missingDependencyLabels: string[];
  overrideState: PermissionChoiceState;
  resultState: PermissionResultState;
  riskLabel: string | null;
};

const ACTION_LABELS: Record<PermissionAction, string> = {
  approve: 'Approuver',
  archive: 'Archiver',
  assign: 'Assigner',
  create: 'Créer',
  delete: 'Supprimer',
  export: 'Exporter',
  manage: 'Gérer',
  reset: 'Réinitialiser',
  restore: 'Restaurer',
  revoke: 'Révoquer',
  send: 'Envoyer',
  sync: 'Synchroniser',
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

const getRiskBorderClassName = (risk: PermissionRisk): string => {
  if (risk === 'critical') return 'border-l-destructive/70';
  if (risk === 'sensitive') return 'border-l-amber-400/70';

  return 'border-l-primary/45';
};

const getPermissionResultLabel = (
  resultState: PermissionResultState,
): string => {
  if (resultState === 'page-blocked') return 'Page bloquée';
  if (resultState === 'incomplete') return 'À compléter';
  if (resultState === 'allowed') return 'Autorisé';

  return 'Refusé';
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
    return 'border-chart-3/35 bg-chart-3/15 text-chart-3';
  }

  return 'border-destructive/30 bg-destructive/10 text-destructive';
};

const getPermissionOriginLabel = (hasCustomChoice: boolean): string =>
  hasCustomChoice ? 'Manuel' : 'Rôle';

const getPermissionOriginBadgeClassName = (hasCustomChoice: boolean): string =>
  hasCustomChoice
    ? 'border-primary/40 bg-primary/10 text-primary'
    : 'border-border/70 text-muted-foreground';

const getStateButtonClassName = (
  option: PermissionChoiceState,
  currentState: PermissionChoiceState,
): string => {
  if (option !== currentState) {
    return 'border-transparent text-muted-foreground hover:bg-accent/70 hover:text-foreground';
  }

  if (option === 'allow') {
    return 'border-chart-3/35 bg-chart-3/15 text-chart-3 shadow-none';
  }

  return 'border-destructive/40 bg-destructive/15 text-destructive shadow-none';
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
): PermissionCategoryResult => {
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

const EMPTY_PERMISSION_RESULT: PermissionCategoryResult = {
  enabled: 0,
  incomplete: 0,
  ready: 0,
  total: 0,
};

const sumPermissionResults = (
  results: PermissionCategoryResult[],
): PermissionCategoryResult => {
  return results.reduce<PermissionCategoryResult>(
    (total, result) => ({
      enabled: total.enabled + result.enabled,
      incomplete: total.incomplete + result.incomplete,
      ready: total.ready + result.ready,
      total: total.total + result.total,
    }),
    EMPTY_PERMISSION_RESULT,
  );
};

const getPermissionAccessStatus = (
  result: PermissionCategoryResult,
): PermissionAccessStatus => {
  if (result.total > 0 && result.ready === result.total) return 'full';
  if (result.ready === 0 && result.incomplete === 0) return 'none';

  return 'partial';
};

const getPermissionAccessStatusLabel = (
  status: PermissionAccessStatus,
): string => {
  if (status === 'full') return 'Complet';
  if (status === 'none') return 'Aucun';

  return 'Partiel';
};

const getPermissionAccessBadgeClassName = (
  status: PermissionAccessStatus,
): string => {
  if (status === 'full') {
    return 'border-chart-3/35 bg-chart-3/15 text-chart-3';
  }

  if (status === 'partial') {
    return 'border-amber-500/40 bg-amber-500/15 text-amber-300';
  }

  return 'border-sidebar-border/65 bg-sidebar-accent/20 text-sidebar-foreground/62';
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
  canReset: boolean;
  defaultState: PermissionChoiceState;
  disabled: boolean;
  onChange: (state: PermissionChoiceState) => void;
  onReset: () => void;
  permissionLabel: string;
  state: PermissionChoiceState;
};

const PermissionStatePicker: FC<PermissionStatePickerProps> = memo(
  ({
    canReset,
    defaultState,
    disabled,
    onChange,
    onReset,
    permissionLabel,
    state,
  }) => {
    return (
      <div className="flex min-w-0 items-center gap-1.5">
        <div
          className="border-border/70 bg-popover grid min-w-0 flex-1 grid-cols-2 gap-1 rounded-lg border p-1 sm:min-w-[12.5rem] sm:flex-none"
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
                    <span className="ml-1 hidden sm:inline">
                      {option.label}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent sideOffset={6}>{option.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled || !canReset}
              onClick={onReset}
              className="text-muted-foreground hover:text-foreground size-9 shrink-0"
              aria-label={`Revenir au rôle pour ${permissionLabel}`}
            >
              <RotateCcw className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6}>
            Défaut du rôle : {defaultState === 'allow' ? 'autorisé' : 'refusé'}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  },
);

PermissionStatePicker.displayName = 'PermissionStatePicker';

const SelectVisualOption: FC<SelectVisualOptionProps> = ({
  icon,
  label,
  result,
  tone,
}) => {
  const OptionIcon = getNavigationIcon(icon);
  const optionTone = getNavigationSpaceToneClasses(tone);
  const accessStatus = result ? getPermissionAccessStatus(result) : null;

  return (
    <span className="flex w-full min-w-0 items-center gap-2">
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-md',
          optionTone.icon,
        )}
      >
        <OptionIcon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {result && accessStatus && (
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          <span className="border-sidebar-border/65 bg-background/35 text-sidebar-foreground/70 rounded-md border px-1.5 py-0.5 text-xs leading-none font-semibold">
            {result.ready}/{result.total}
          </span>
          <span
            className={cn(
              'rounded-md border px-1.5 py-0.5 text-xs leading-none font-semibold',
              getPermissionAccessBadgeClassName(accessStatus),
            )}
          >
            {getPermissionAccessStatusLabel(accessStatus)}
          </span>
        </span>
      )}
    </span>
  );
};

type PermissionCardProps = {
  disabled: boolean;
  onChange: (permissionKey: string, state: PermissionChoiceState) => void;
  onReset: (permissionKey: string) => void;
  permission: PermissionItem;
  view: PermissionViewModel;
};

const PermissionCard: FC<PermissionCardProps> = memo(
  ({ disabled, onChange, onReset, permission, view }) => {
    return (
      <div
        className={cn(
          'border-sidebar-border/60 bg-surface/80 overflow-hidden rounded-lg border border-l-2',
          getRiskBorderClassName(permission.risk),
          view.hasMissingDependencies && 'bg-amber-500/10',
          !view.isEnabled && !view.hasMissingDependencies && 'bg-popover/55',
        )}
      >
        <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <h6 className="text-foreground text-sm font-semibold">
                {permission.label}
              </h6>
              <Badge
                variant="outline"
                className="text-muted-foreground border-border/70 text-xs"
              >
                {ACTION_LABELS[permission.action]}
              </Badge>
              {view.riskLabel && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs',
                    getRiskBadgeClassName(permission.risk),
                  )}
                >
                  {view.riskLabel}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  getPermissionOriginBadgeClassName(view.hasCustomChoice),
                )}
              >
                {getPermissionOriginLabel(view.hasCustomChoice)}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs leading-5">
              {permission.description}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant={
                  view.resultState === 'allowed' ? 'secondary' : 'outline'
                }
                className={cn(
                  'w-fit text-xs',
                  getPermissionResultBadgeClassName(view.resultState),
                )}
              >
                {getPermissionResultLabel(view.resultState)}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {view.hasCustomChoice
                  ? `Surcharge : ${view.isEnabled ? 'autorisé' : 'refusé'}`
                  : `Rôle : ${view.isRoleDefaultEnabled ? 'autorisé' : 'refusé'}`}
              </span>
            </div>
            {view.hasMissingDependencies ? (
              <p className="text-xs text-amber-300">
                {view.isBlockedByPage
                  ? 'La page est bloquée par : '
                  : 'À autoriser aussi : '}
                {view.missingDependencyLabels.join(', ')}
              </p>
            ) : (
              view.dependencyLabels.length > 0 && (
                <p className="text-muted-foreground/85 text-xs">
                  Accès lié : {view.dependencyLabels.join(', ')}
                </p>
              )
            )}
          </div>
          <PermissionStatePicker
            canReset={view.hasCustomChoice}
            defaultState={view.defaultState}
            disabled={disabled}
            permissionLabel={permission.label}
            state={view.overrideState}
            onChange={(state) => onChange(permission.key, state)}
            onReset={() => onReset(permission.key)}
          />
        </div>
      </div>
    );
  },
);

PermissionCard.displayName = 'PermissionCard';

export const PermissionsEditor: FC<PermissionsEditorProps> = memo(
  ({
    disabled = false,
    headerControls,
    onChange,
    onSelectedPageChange,
    permissions,
    role,
    selectedPageKey,
  }) => {
    const permissionsMap = useMemo(
      () => new Map(Object.entries(permissions ?? {})),
      [permissions],
    );
    const customPermissionKeys = useMemo(
      () => new Set(permissionsMap.keys()),
      [permissionsMap],
    );
    const accessPermissionKeys = useMemo(
      () => new Set(getAccessPermissionKeys()),
      [],
    );
    const customAccessPermissionKeys = useMemo(
      () =>
        new Set(
          [...customPermissionKeys].filter((permissionKey) =>
            accessPermissionKeys.has(permissionKey),
          ),
        ),
      [accessPermissionKeys, customPermissionKeys],
    );
    const roleBasePermissions = useMemo(
      () => getRoleBasePermissions(role),
      [role],
    );
    const roleBasePermissionsMap = useMemo(
      () => new Map(Object.entries(roleBasePermissions)),
      [roleBasePermissions],
    );
    const effectivePermissions = useMemo(
      () => getEffectivePermissions(role, permissions),
      [role, permissions],
    );
    const effectivePermissionsMap = useMemo(
      () => new Map(Object.entries(effectivePermissions)),
      [effectivePermissions],
    );
    const categoryResultMap = useMemo(
      () =>
        new Map(
          PERMISSION_CATEGORIES.map(
            (category) =>
              [
                category.key,
                countCategoryPermissionResults(
                  category,
                  effectivePermissionsMap,
                ),
              ] as const,
          ),
        ),
      [effectivePermissionsMap],
    );
    const poleResultMap = useMemo(
      () =>
        new Map(
          PERMISSION_POLES.map((pole) => {
            const poleResults = PERMISSION_CATEGORIES.filter(
              (category) => category.poleKey === pole.key,
            ).map(
              (category) =>
                categoryResultMap.get(category.key) ?? EMPTY_PERMISSION_RESULT,
            );

            return [pole.key, sumPermissionResults(poleResults)] as const;
          }),
        ),
      [categoryResultMap],
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
        const enabled = state === 'allow';
        const roleBaseEnabled =
          roleBasePermissionsMap.get(permissionKey) ?? false;

        if (enabled === roleBaseEnabled) {
          nextPermissionsMap.delete(permissionKey);
        } else {
          nextPermissionsMap.set(permissionKey, enabled);
        }

        onChange(toPermissionsData(nextPermissionsMap));
      },
      [onChange, permissionsMap, roleBasePermissionsMap],
    );

    const handleResetPermissionOverride = useCallback(
      (permissionKey: string) => {
        const nextPermissionsMap = new Map(permissionsMap);
        nextPermissionsMap.delete(permissionKey);

        onChange(toPermissionsData(nextPermissionsMap));
      },
      [onChange, permissionsMap],
    );

    const handleResetCategoryOverrides = useCallback(
      (categoryKey: string) => {
        const category = PERMISSION_CATEGORIES.find(
          (item) => item.key === categoryKey,
        );
        if (!category) return;

        const nextPermissionsMap = new Map(permissionsMap);

        for (const permission of category.permissions) {
          nextPermissionsMap.delete(permission.key);
        }

        onChange(toPermissionsData(nextPermissionsMap));
      },
      [onChange, permissionsMap],
    );

    const handleResetAllOverrides = useCallback(() => {
      const nextPermissionsMap = new Map(permissionsMap);

      for (const permissionKey of accessPermissionKeys) {
        nextPermissionsMap.delete(permissionKey);
      }

      onChange(toPermissionsData(nextPermissionsMap));
    }, [accessPermissionKeys, onChange, permissionsMap]);

    const handlePoleChange = useCallback(
      (poleKey: string) => {
        const firstPoleCategory = PERMISSION_CATEGORIES.find(
          (category) => category.poleKey === poleKey,
        );

        if (!firstPoleCategory) return;

        onSelectedPageChange(firstPoleCategory.key);
      },
      [onSelectedPageChange],
    );

    const customPermissionCount = customAccessPermissionKeys.size;
    const selectedCategory =
      PERMISSION_CATEGORIES.find(
        (category) => category.key === selectedPageKey,
      ) ??
      PERMISSION_CATEGORIES[0] ??
      null;
    const selectedPole =
      PERMISSION_POLES.find((pole) => pole.key === selectedCategory?.poleKey) ??
      PERMISSION_POLES[0] ??
      null;
    const selectedPoleCategories = selectedPole
      ? PERMISSION_CATEGORIES.filter(
          (category) => category.poleKey === selectedPole.key,
        )
      : PERMISSION_CATEGORIES;
    const selectedCategoryTone = getNavigationSpaceToneClasses(
      selectedCategory?.tone ?? 'system',
    );
    const selectedCategoryIconClassName = selectedCategoryTone.icon;
    const selectedCategoryResult = selectedCategory
      ? (categoryResultMap.get(selectedCategory.key) ?? EMPTY_PERMISSION_RESULT)
      : null;
    const selectedCategoryAccessPermission = selectedCategory
      ? getCategoryAccessPermission(selectedCategory)
      : undefined;
    const selectedCategoryAccessPermissionKey =
      selectedCategoryAccessPermission?.key;
    const selectedCategoryOverrideCount =
      selectedCategory?.permissions.filter((permission) =>
        customPermissionKeys.has(permission.key),
      ).length ?? 0;
    const selectedCategoryGroups = useMemo(
      () =>
        groupPermissionsByModule(
          selectedCategory?.permissions.filter(
            (permission) =>
              permission.key !== selectedCategoryAccessPermissionKey,
          ) ?? [],
        ),
      [selectedCategory, selectedCategoryAccessPermissionKey],
    );
    const selectedPageIsAllowed = selectedCategoryAccessPermission
      ? (effectivePermissionsMap.get(selectedCategoryAccessPermission.key) ??
        false)
      : true;

    const getPermissionViewModel = useCallback(
      (permission: PermissionItem): PermissionViewModel => {
        const isEnabled = effectivePermissionsMap.get(permission.key) ?? false;
        const overrideState = getPermissionOverrideState(
          effectivePermissionsMap,
          permission.key,
        );
        const hasCustomChoice = customPermissionKeys.has(permission.key);
        const isRoleDefaultEnabled =
          roleBasePermissionsMap.get(permission.key) ?? false;
        const defaultState: PermissionChoiceState = isRoleDefaultEnabled
          ? 'allow'
          : 'deny';
        const riskLabel = RISK_LABELS[permission.risk];
        const dependencies = permission.dependencies ?? [];
        const missingDependencies = getMissingPermissionDependencies(
          permission,
          effectivePermissionsMap,
        );
        const hasMissingDependencies = missingDependencies.length > 0;
        const isBlockedByPage = missingDependencies.some(
          (dependency) => dependency === selectedCategoryAccessPermissionKey,
        );
        const dependencyLabels = dependencies.map(
          (dependency) => permissionLabelMap.get(dependency) ?? dependency,
        );
        const missingDependencyLabels = missingDependencies.map(
          (dependency) => permissionLabelMap.get(dependency) ?? dependency,
        );
        const resultState: PermissionResultState = isBlockedByPage
          ? 'page-blocked'
          : hasMissingDependencies
            ? 'incomplete'
            : isEnabled
              ? 'allowed'
              : 'denied';

        return {
          defaultState,
          dependencyLabels,
          hasCustomChoice,
          hasMissingDependencies,
          isBlockedByPage,
          isEnabled,
          isRoleDefaultEnabled,
          missingDependencyLabels,
          overrideState,
          resultState,
          riskLabel,
        };
      },
      [
        customPermissionKeys,
        effectivePermissionsMap,
        permissionLabelMap,
        roleBasePermissionsMap,
        selectedCategoryAccessPermissionKey,
      ],
    );

    const selectedPageAccessView = selectedCategoryAccessPermission
      ? getPermissionViewModel(selectedCategoryAccessPermission)
      : null;
    const isSelectedPageDefaultDenied =
      selectedPageAccessView?.defaultState === 'deny' &&
      !selectedPageAccessView.hasCustomChoice;

    return (
      <div className="space-y-3">
        <section className="border-sidebar-border/55 bg-surface-muted overflow-hidden rounded-lg border">
          <div className="flex flex-col gap-4 p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-foreground font-semibold">
                  Accès par page
                </h3>
                {customPermissionCount > 0 && (
                  <Badge
                    variant="outline"
                    className="border-primary/40 text-primary text-xs"
                  >
                    {customPermissionCount} exception
                    {customPermissionCount > 1 ? 's' : ''}
                  </Badge>
                )}
                {disabled && (
                  <Badge variant="outline" className="text-xs">
                    Lecture seule
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground max-w-3xl text-sm leading-6">
                Le rôle définit la base. Les réglages ci-dessous ajoutent
                seulement les exceptions nécessaires, page par page.
              </p>
            </div>
            {(headerControls || customPermissionCount > 0) && (
              <div className="flex min-w-0 flex-wrap gap-2 xl:justify-end">
                {headerControls && (
                  <div className="min-w-0 flex-1 sm:flex-none lg:min-w-56">
                    {headerControls}
                  </div>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled || customPermissionCount === 0}
                  aria-hidden={customPermissionCount === 0}
                  tabIndex={customPermissionCount === 0 ? -1 : undefined}
                  onClick={handleResetAllOverrides}
                  className={cn(
                    'text-muted-foreground hover:text-foreground gap-1.5',
                    customPermissionCount === 0 && 'invisible',
                  )}
                >
                  <RotateCcw className="size-3.5" />
                  Tout réinitialiser
                </Button>
              </div>
            )}
          </div>
        </section>
        {selectedCategory && (
          <section className="border-sidebar-border/60 bg-surface overflow-hidden rounded-lg border">
            <div className="border-sidebar-border/55 bg-surface-muted grid gap-4 border-b p-4 xl:grid-cols-[minmax(0,1fr)_40rem] xl:items-start">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-lg',
                    selectedCategoryIconClassName,
                  )}
                >
                  {React.createElement(
                    getNavigationIcon(selectedCategory.icon),
                    { className: 'size-5' },
                  )}
                </span>
                <div className="min-w-0 space-y-2">
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
                        {selectedCategoryResult?.incomplete} à compléter
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground max-w-2xl text-sm leading-6">
                    {selectedCategory.description}
                  </p>
                </div>
              </div>
              <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
                <div className="min-w-0 space-y-2">
                  <label
                    htmlFor="permission-pole"
                    className="text-muted-foreground text-xs font-medium"
                  >
                    Pôle
                  </label>
                  <Select
                    value={selectedPole?.key}
                    onValueChange={handlePoleChange}
                  >
                    <SelectTrigger
                      id="permission-pole"
                      className={permissionSelectTriggerClassName}
                    >
                      <SelectValue>
                        {selectedPole && (
                          <SelectVisualOption
                            icon={selectedPole.icon}
                            label={selectedPole.label}
                            result={poleResultMap.get(selectedPole.key)}
                            tone={selectedPole.tone}
                          />
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className={permissionSelectContentClassName}>
                      {PERMISSION_POLES.map((pole) => (
                        <SelectItem
                          key={pole.key}
                          value={pole.key}
                          className={permissionSelectItemClassName}
                        >
                          <SelectVisualOption
                            icon={pole.icon}
                            label={pole.label}
                            result={poleResultMap.get(pole.key)}
                            tone={pole.tone}
                          />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0 space-y-2">
                  <label
                    htmlFor="permission-page"
                    className="text-muted-foreground text-xs font-medium"
                  >
                    Page
                  </label>
                  <Select
                    value={selectedCategory.key}
                    onValueChange={onSelectedPageChange}
                  >
                    <SelectTrigger
                      id="permission-page"
                      className={permissionSelectTriggerClassName}
                    >
                      <SelectValue>
                        <SelectVisualOption
                          icon={selectedCategory.icon}
                          label={selectedCategory.label}
                          result={selectedCategoryResult ?? undefined}
                          tone={selectedCategory.tone}
                        />
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className={permissionSelectContentClassName}>
                      {selectedPoleCategories.map((category) => (
                        <SelectItem
                          key={category.key}
                          value={category.key}
                          className={permissionSelectItemClassName}
                        >
                          <SelectVisualOption
                            icon={category.icon}
                            label={category.label}
                            result={categoryResultMap.get(category.key)}
                            tone={category.tone}
                          />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-4">
              {selectedCategoryAccessPermission && selectedPageAccessView && (
                <div
                  className={cn(
                    'grid gap-3 rounded-lg border p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center',
                    selectedPageIsAllowed
                      ? 'border-chart-3/30 bg-chart-3/10'
                      : 'border-amber-500/35 bg-amber-500/10',
                  )}
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          selectedPageIsAllowed
                            ? 'border-chart-3/35 text-chart-3'
                            : 'border-amber-500/40 text-amber-300',
                        )}
                      >
                        {selectedPageIsAllowed
                          ? 'Page accessible'
                          : 'Page bloquée'}
                      </Badge>
                      <span className="text-foreground text-sm font-semibold">
                        {selectedCategoryAccessPermission.label}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs leading-5">
                      Cette permission ouvre ou ferme l’accès global à la page.
                      Les actions ci-dessous en dépendent.
                    </p>
                    {isSelectedPageDefaultDenied && (
                      <p className="text-xs text-amber-300">
                        Déjà bloquée par le rôle : choisir Refuser ne crée pas
                        de modification à enregistrer.
                      </p>
                    )}
                  </div>
                  <PermissionStatePicker
                    canReset={selectedPageAccessView.hasCustomChoice}
                    defaultState={selectedPageAccessView.defaultState}
                    disabled={disabled}
                    permissionLabel={selectedCategoryAccessPermission.label}
                    state={selectedPageAccessView.overrideState}
                    onChange={(state) =>
                      handleSetPermissionOverride(
                        selectedCategoryAccessPermission.key,
                        state,
                      )
                    }
                    onReset={() =>
                      handleResetPermissionOverride(
                        selectedCategoryAccessPermission.key,
                      )
                    }
                  />
                </div>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                {selectedCategoryOverrideCount > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    onClick={() =>
                      handleResetCategoryOverrides(selectedCategory.key)
                    }
                    className="justify-start gap-2"
                  >
                    <RotateCcw className="size-4" />
                    Réinitialiser cette page
                  </Button>
                )}
                {selectedPageIsAllowed ? (
                  <div className="border-sidebar-border/60 bg-surface-muted flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2">
                    <ShieldCheck className="text-chart-3 size-4 shrink-0" />
                    <p className="text-muted-foreground text-xs">
                      Les actions autorisées seront utilisables sur cette page.
                    </p>
                  </div>
                ) : (
                  <div className="flex min-w-0 items-center gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2">
                    <CircleAlert className="size-4 shrink-0 text-amber-300" />
                    <p className="text-xs text-amber-200">
                      La page est bloquée : les actions fines restent visibles
                      mais ne seront pas utilisables.
                    </p>
                  </div>
                )}
              </div>
              {selectedCategoryGroups.length > 0 ? (
                <div className="space-y-4">
                  {selectedCategoryGroups.map((group) => (
                    <div key={group.module} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h5 className="text-foreground text-sm font-semibold">
                            {group.module}
                          </h5>
                          <p className="text-muted-foreground text-xs">
                            {group.permissions.length} action
                            {group.permissions.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        {group.permissions.map((permission) => (
                          <PermissionCard
                            key={permission.key}
                            disabled={disabled}
                            permission={permission}
                            view={getPermissionViewModel(permission)}
                            onChange={handleSetPermissionOverride}
                            onReset={handleResetPermissionOverride}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-sidebar-border/60 bg-surface-muted flex flex-col items-center justify-center rounded-lg border p-6 text-center">
                  <ShieldCheck className="text-primary size-7" />
                  <p className="text-foreground mt-3 text-sm font-medium">
                    Aucune action supplémentaire
                  </p>
                  <p className="text-muted-foreground mt-1 max-w-sm text-xs leading-5">
                    Cette page se pilote uniquement avec son accès global.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    );
  },
);

PermissionsEditor.displayName = 'PermissionsEditor';
