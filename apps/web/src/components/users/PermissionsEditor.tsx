'use client';

import { UserRole } from '@repo/shared';
import { ChevronDown, CircleAlert, RotateCcw, ShieldCheck } from 'lucide-react';
import React, { type FC, memo, useCallback, useMemo } from 'react';

import {
  buildPermissionOverrideChange as buildPermissionOverrideChangeData,
  buildResetPermissionOverrides as buildResetPermissionOverridesData,
  evaluatePermissionMutationBatch,
  type PermissionChoiceState,
  type PermissionMutationDecision,
  type PermissionMutationPolicy,
} from '$components/users/permission-editor-policy';
import { PermissionDecisionButton } from '$components/users/PermissionDecisionButton';
import { PermissionStatePicker } from '$components/users/PermissionStatePicker';
import { getNavigationIcon } from '$constants/navigation-icon.constants';
import {
  getNavigationSpaceToneClasses,
  type NavigationSpaceTone,
} from '$constants/navigation-theme.constants';
import {
  getAccessPermissionKeys,
  getEffectivePermissions,
  getPermissionItem,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';
import { cn } from '$utils/css.utils';

type PermissionsEditorProps = {
  canChangePermission?: PermissionMutationPolicy;
  disabled?: boolean;
  headerControls?: React.ReactNode;
  onChange: (permissions: PermissionsData | null) => void;
  onSelectedPageChange: (pageKey: string) => void;
  permissions: PermissionsData | null;
  role: UserRole;
  selectedPageKey: string;
};

type PermissionResultState =
  'allowed' | 'denied' | 'incomplete' | 'page-blocked';

type PermissionModuleGroup = {
  module: string;
  permissions: PermissionItem[];
};

const permissionSelectTriggerClassName =
  'border-border-control bg-surface-control text-foreground hover:border-border-strong hover:bg-surface-control-hover focus-visible:border-primary/45 focus-visible:bg-surface-control-focus focus-visible:ring-ring/35 h-11 w-full rounded-lg shadow-none';

const permissionSelectContentClassName =
  'border-border-strong bg-popover text-foreground rounded-xl p-1.5 shadow-[var(--shadow-panel-strong)]';

const permissionSelectItemClassName =
  'focus:bg-surface-tile-hover focus:text-accent-foreground rounded-lg py-2';

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
  delegate: 'Déléguer',
  delete: 'Supprimer',
  export: 'Exporter',
  grant: 'Accorder',
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

const getRiskBadgeClassName = (risk: PermissionRisk): string => {
  if (risk === 'critical') return 'border-destructive/40 text-destructive';
  if (risk === 'sensitive') return 'border-warning/40 text-warning';

  return 'border-border/70 text-muted-foreground';
};

const getRiskBorderClassName = (risk: PermissionRisk): string => {
  if (risk === 'critical') return 'border-l-destructive/70';
  if (risk === 'sensitive') return 'border-l-warning/70';

  return 'border-l-primary/45';
};

const getPermissionResultLabel = (
  resultState: PermissionResultState,
): string => {
  if (resultState === 'page-blocked') return 'Page inaccessible';
  if (resultState === 'incomplete') return 'À compléter';
  if (resultState === 'allowed') return 'Autorisé';

  return 'Refusé';
};

const getPermissionResultBadgeClassName = (
  resultState: PermissionResultState,
): string => {
  if (resultState === 'page-blocked') {
    return 'border-warning/45 bg-warning/15 text-warning';
  }

  if (resultState === 'incomplete') {
    return 'border-warning/45 bg-warning/15 text-warning';
  }

  if (resultState === 'allowed') {
    return 'border-success/35 bg-success/15 text-success';
  }

  return 'border-destructive/30 bg-destructive/10 text-destructive';
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

  const missingDependencies = new Set<string>();
  const visitedPermissionKeys = new Set<string>();

  const visitDependencies = (permissionKey: string): void => {
    if (visitedPermissionKeys.has(permissionKey)) return;
    visitedPermissionKeys.add(permissionKey);

    const currentPermission = getPermissionItem(permissionKey);

    for (const dependencyKey of currentPermission?.dependencies ?? []) {
      if (!(effectivePermissionsMap.get(dependencyKey) ?? false)) {
        missingDependencies.add(dependencyKey);
        continue;
      }

      visitDependencies(dependencyKey);
    }
  };

  visitDependencies(permission.key);

  return [...missingDependencies];
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
    return 'border-success/35 bg-success/15 text-success';
  }

  if (status === 'partial') {
    return 'border-warning/40 bg-warning/15 text-warning';
  }

  return 'border-border/65 bg-accent/20 text-muted-foreground';
};

const getCategoryAccessPermission = (
  category: PermissionCategory,
): PermissionItem | undefined => {
  return category.permissions.find(
    (permission) => permission.key === category.accessPermissionKey,
  );
};

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
          <span className="border-border/65 bg-background/35 text-muted-foreground rounded-md border px-1.5 py-0.5 text-xs leading-none font-semibold">
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
  getDecision: (
    permissionKey: string,
    state: PermissionChoiceState | 'reset',
  ) => PermissionMutationDecision;
  onChange: (permissionKey: string, state: PermissionChoiceState) => void;
  onReset: (permissionKey: string) => void;
  permission: PermissionItem;
  view: PermissionViewModel;
};

const PermissionCard: FC<PermissionCardProps> = memo(
  ({ getDecision, onChange, onReset, permission, view }) => {
    return (
      <div
        className={cn(
          'border-border/60 bg-surface/80 overflow-hidden rounded-lg border border-l-2',
          getRiskBorderClassName(permission.risk),
          view.hasMissingDependencies && 'bg-warning/10',
          !view.isEnabled &&
            !view.hasMissingDependencies &&
            'bg-surface-inset/55',
        )}
      >
        <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <h5 className="text-foreground text-sm font-semibold">
                {permission.label}
              </h5>
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
              {view.hasCustomChoice && (
                <Badge
                  variant="outline"
                  className="border-primary/40 bg-primary/10 text-primary-emphasis text-xs"
                >
                  Exception personnalisée
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground line-clamp-2 text-xs leading-5">
              {permission.description}
            </p>
            {view.hasMissingDependencies ? (
              <p className="text-warning text-xs">
                {view.isBlockedByPage
                  ? 'La page est inaccessible sans : '
                  : 'À autoriser aussi : '}
                {view.missingDependencyLabels.join(', ')}
              </p>
            ) : null}
            <details className="group/details w-fit max-w-full">
              <summary className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer list-none items-center gap-1 text-xs font-medium transition-colors [&::-webkit-details-marker]:hidden">
                Détails et héritage
                <ChevronDown className="size-3.5 transition-transform group-open/details:rotate-180" />
              </summary>
              <div className="border-border/55 text-muted-foreground mt-2 space-y-1.5 border-l pl-3 text-xs leading-5">
                <p>Action : {ACTION_LABELS[permission.action]}</p>
                <p>
                  Valeur du rôle :{' '}
                  {view.isRoleDefaultEnabled ? 'autorisée' : 'refusée'}
                </p>
                <p>
                  Valeur appliquée : {view.isEnabled ? 'autorisée' : 'refusée'}
                </p>
                {view.dependencyLabels.length > 0 && (
                  <p>
                    Autorisation requise : {view.dependencyLabels.join(', ')}
                  </p>
                )}
              </div>
            </details>
          </div>
          <PermissionStatePicker
            allowDecision={getDecision(permission.key, 'allow')}
            defaultState={view.defaultState}
            denyDecision={getDecision(permission.key, 'deny')}
            permissionLabel={permission.label}
            resetDecision={
              view.hasCustomChoice
                ? getDecision(permission.key, 'reset')
                : { allowed: false, reason: 'Aucune exception à réinitialiser' }
            }
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
    canChangePermission,
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

    const getBatchPermissionDecision = useCallback(
      (nextPermissions: PermissionsData | null): PermissionMutationDecision =>
        evaluatePermissionMutationBatch({
          accessPermissionKeys,
          currentEffectivePermissions: effectivePermissionsMap,
          currentPermissionsMap: permissionsMap,
          disabled,
          nextPermissions,
          policy: canChangePermission,
          role,
        }),
      [
        accessPermissionKeys,
        canChangePermission,
        disabled,
        effectivePermissionsMap,
        permissionsMap,
        role,
      ],
    );

    const buildPermissionOverrideChange = useCallback(
      (
        permissionKey: string,
        state: PermissionChoiceState,
      ): PermissionsData | null =>
        buildPermissionOverrideChangeData({
          permissionKey,
          permissionsMap,
          roleBasePermissionsMap,
          state,
        }),
      [permissionsMap, roleBasePermissionsMap],
    );

    const buildResetPermissionOverrides = useCallback(
      (permissionKeys: Iterable<string>): PermissionsData | null =>
        buildResetPermissionOverridesData(permissionsMap, permissionKeys),
      [permissionsMap],
    );

    const getPermissionControlDecision = useCallback(
      (
        permissionKey: string,
        state: PermissionChoiceState | 'reset',
      ): PermissionMutationDecision => {
        if (state === 'reset') {
          if (!customPermissionKeys.has(permissionKey)) {
            return {
              allowed: false,
              reason: 'Aucune exception à réinitialiser.',
            };
          }

          return getBatchPermissionDecision(
            buildResetPermissionOverrides([permissionKey]),
          );
        }

        const batchDecision = getBatchPermissionDecision(
          buildPermissionOverrideChange(permissionKey, state),
        );
        if (!batchDecision.allowed || !canChangePermission) {
          return batchDecision;
        }

        return canChangePermission(permissionKey, state === 'allow');
      },
      [
        buildPermissionOverrideChange,
        buildResetPermissionOverrides,
        canChangePermission,
        customPermissionKeys,
        getBatchPermissionDecision,
      ],
    );

    const handleSetPermissionOverride = useCallback(
      (permissionKey: string, state: PermissionChoiceState) => {
        const nextPermissions = buildPermissionOverrideChange(
          permissionKey,
          state,
        );
        if (!getBatchPermissionDecision(nextPermissions).allowed) return;

        onChange(nextPermissions);
      },
      [buildPermissionOverrideChange, getBatchPermissionDecision, onChange],
    );

    const handleResetPermissionOverride = useCallback(
      (permissionKey: string) => {
        const nextPermissions = buildResetPermissionOverrides([permissionKey]);
        if (!getBatchPermissionDecision(nextPermissions).allowed) return;

        onChange(nextPermissions);
      },
      [buildResetPermissionOverrides, getBatchPermissionDecision, onChange],
    );

    const handleResetCategoryOverrides = useCallback(
      (categoryKey: string) => {
        const category = PERMISSION_CATEGORIES.find(
          (item) => item.key === categoryKey,
        );
        if (!category) return;

        const nextPermissions = buildResetPermissionOverrides(
          category.permissions.map((permission) => permission.key),
        );
        if (!getBatchPermissionDecision(nextPermissions).allowed) return;

        onChange(nextPermissions);
      },
      [buildResetPermissionOverrides, getBatchPermissionDecision, onChange],
    );

    const handleResetAllOverrides = useCallback(() => {
      const nextPermissions =
        buildResetPermissionOverrides(accessPermissionKeys);
      if (!getBatchPermissionDecision(nextPermissions).allowed) return;

      onChange(nextPermissions);
    }, [
      accessPermissionKeys,
      buildResetPermissionOverrides,
      getBatchPermissionDecision,
      onChange,
    ]);

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
    const resetAllDecision =
      customPermissionCount > 0
        ? getBatchPermissionDecision(
            buildResetPermissionOverrides(accessPermissionKeys),
          )
        : { allowed: false, reason: 'Aucune exception à réinitialiser.' };
    const resetSelectedCategoryDecision =
      selectedCategory && selectedCategoryOverrideCount > 0
        ? getBatchPermissionDecision(
            buildResetPermissionOverrides(
              selectedCategory.permissions.map((permission) => permission.key),
            ),
          )
        : { allowed: false, reason: 'Aucune exception à réinitialiser.' };
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
        <h2 className="sr-only">Autorisations administratives</h2>
        <section className="border-border/55 bg-surface-muted overflow-hidden rounded-lg border">
          <div className="flex flex-col gap-4 p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-foreground font-semibold">
                  Autorisations administratives
                </h3>
                {customPermissionCount > 0 && (
                  <Badge
                    variant="outline"
                    className="border-primary/40 text-primary-emphasis text-xs"
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
                Le rôle définit les autorisations par défaut. Seules les pages
                réellement en ligne dont les autorisations sont délégables
                apparaissent ici. Tableau de bord, recherche, feuille de route,
                notifications personnelles et Mon compte restent disponibles
                pour tout compte actif.
              </p>
            </div>
            {(headerControls || customPermissionCount > 0) && (
              <div className="flex min-w-0 flex-wrap gap-2 xl:justify-end">
                {headerControls && (
                  <div className="min-w-0 flex-1 sm:flex-none lg:min-w-56">
                    {headerControls}
                  </div>
                )}
                <PermissionDecisionButton
                  accessibleLabel="Tout réinitialiser"
                  concealed={customPermissionCount === 0}
                  decision={resetAllDecision}
                  onClick={handleResetAllOverrides}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground gap-1.5"
                >
                  <RotateCcw className="size-3.5" />
                  Tout réinitialiser
                </PermissionDecisionButton>
              </div>
            )}
          </div>
        </section>
        {selectedCategory && (
          <section className="border-border/60 bg-surface overflow-hidden rounded-lg border">
            <div className="border-border/55 bg-surface-muted grid gap-4 border-b p-4 xl:grid-cols-[minmax(0,1fr)_40rem] xl:items-start">
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
                    <h3 className="text-foreground font-semibold">
                      {selectedCategory.label}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {selectedCategoryResult?.ready ?? 0}/
                      {selectedCategoryResult?.total ?? 0} utilisables
                    </Badge>
                    {(selectedCategoryResult?.incomplete ?? 0) > 0 && (
                      <Badge
                        variant="outline"
                        className="border-warning/40 text-warning text-xs"
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
                      ? 'border-success/30 bg-success/10'
                      : 'border-warning/35 bg-warning/10',
                  )}
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          selectedPageIsAllowed
                            ? 'border-success/35 text-success'
                            : 'border-warning/40 text-warning',
                        )}
                      >
                        {selectedPageIsAllowed
                          ? 'Page accessible'
                          : 'Page inaccessible'}
                      </Badge>
                      <span className="text-foreground text-sm font-semibold">
                        {selectedCategoryAccessPermission.label}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs leading-5">
                      Cette autorisation contrôle l’accès à toute la page. Les
                      autorisations ci-dessous en dépendent.
                    </p>
                    {isSelectedPageDefaultDenied && (
                      <p className="text-warning text-xs">
                        Accès déjà refusé par le rôle : choisir Refuser ne crée
                        pas de modification à enregistrer.
                      </p>
                    )}
                  </div>
                  <PermissionStatePicker
                    allowDecision={getPermissionControlDecision(
                      selectedCategoryAccessPermission.key,
                      'allow',
                    )}
                    defaultState={selectedPageAccessView.defaultState}
                    denyDecision={getPermissionControlDecision(
                      selectedCategoryAccessPermission.key,
                      'deny',
                    )}
                    permissionLabel={selectedCategoryAccessPermission.label}
                    resetDecision={
                      selectedPageAccessView.hasCustomChoice
                        ? getPermissionControlDecision(
                            selectedCategoryAccessPermission.key,
                            'reset',
                          )
                        : {
                            allowed: false,
                            reason: 'Aucune exception à réinitialiser',
                          }
                    }
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
                  <PermissionDecisionButton
                    accessibleLabel="Réinitialiser cette page"
                    decision={resetSelectedCategoryDecision}
                    onClick={() =>
                      handleResetCategoryOverrides(selectedCategory.key)
                    }
                    variant="outline"
                    className="justify-start gap-2"
                  >
                    <RotateCcw className="size-4" />
                    Réinitialiser cette page
                  </PermissionDecisionButton>
                )}
                {selectedPageIsAllowed ? (
                  <div className="border-border/60 bg-surface-muted flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2">
                    <ShieldCheck className="text-success size-4 shrink-0" />
                    <p className="text-muted-foreground text-xs">
                      Les autorisations accordées seront utilisables sur cette
                      page.
                    </p>
                  </div>
                ) : (
                  <div className="border-warning/35 bg-warning/10 flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2">
                    <CircleAlert className="text-warning size-4 shrink-0" />
                    <p className="text-warning text-xs">
                      La page est inaccessible : les autorisations détaillées
                      restent visibles mais ne seront pas utilisables.
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
                          <h4 className="text-foreground text-sm font-semibold">
                            {group.module}
                          </h4>
                          <p className="text-muted-foreground text-xs">
                            {group.permissions.length} autorisation
                            {group.permissions.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        {group.permissions.map((permission) => (
                          <PermissionCard
                            key={permission.key}
                            getDecision={getPermissionControlDecision}
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
                <div className="border-border/60 bg-surface-muted flex flex-col items-center justify-center rounded-lg border p-6 text-center">
                  <ShieldCheck className="text-primary-emphasis size-7" />
                  <p className="text-foreground mt-3 text-sm font-medium">
                    Aucune autorisation supplémentaire
                  </p>
                  <p className="text-muted-foreground mt-1 max-w-sm text-xs leading-5">
                    Cette page se pilote uniquement avec son autorisation
                    d’accès.
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
