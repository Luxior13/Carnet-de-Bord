'use client';

import { type UserRole } from '@repo/shared';
import { RotateCcw, ShieldCheck } from 'lucide-react';
import React, { type FC, useMemo } from 'react';

import {
  getAccessPermissionKeys,
  PERMISSION_POLES,
  type PermissionsData,
} from '$constants/permissions.constants';
import { Badge } from '$ui/badge';
import { Label } from '$ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';

import {
  buildPermissionOverrideChange,
  buildResetPermissionOverrides,
  evaluatePermissionMutationBatch,
  type PermissionChoiceState,
  type PermissionMutationDecision,
  type PermissionMutationPolicy,
} from './permission-editor-policy';
import {
  buildPermissionEditorState,
  countCategoryPermissionResults,
  countUsablePermissions,
  PERMISSION_EDITOR_CATEGORIES,
} from './permission-editor-view';
import { PermissionDecisionButton } from './PermissionDecisionButton';
import { PermissionRow } from './PermissionRow';
import styles from './PermissionsEditor.module.css';
import { PermissionStatePicker } from './PermissionStatePicker';
import { RoleBoundPermissionStatus } from './RoleBoundPermissionStatus';

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

const ACCESS_KEYS = new Set(getAccessPermissionKeys());

export const PermissionsEditor: FC<PermissionsEditorProps> = ({
  canChangePermission,
  disabled = false,
  headerControls,
  onChange,
  onSelectedPageChange,
  permissions,
  role,
  selectedPageKey,
}) => {
  const state = useMemo(
    () => buildPermissionEditorState(role, permissions),
    [role, permissions],
  );
  const permissionsMap = useMemo(
    () => new Map(Object.entries(permissions ?? {})),
    [permissions],
  );
  const customPermissionCount = [...permissionsMap.keys()].filter((key) =>
    ACCESS_KEYS.has(key),
  ).length;
  const { ready: readyCount, total: totalCount } = countUsablePermissions(
    state.effective,
  );
  const accessiblePages = PERMISSION_EDITOR_CATEGORIES.filter(
    (category) =>
      category.scope === 'page' &&
      state.effective.get(category.accessPermissionKey),
  ).length;
  const selectedCategory =
    PERMISSION_EDITOR_CATEGORIES.find(
      (category) => category.key === selectedPageKey,
    ) ?? PERMISSION_EDITOR_CATEGORIES[0];
  const selectedPole = PERMISSION_POLES.find(
    (pole) => pole.key === selectedCategory?.poleKey,
  );
  const selectedCategoryAccessPermission =
    selectedCategory?.scope === 'page'
      ? selectedCategory.permissions.find(
          (item) => item.key === selectedCategory.accessPermissionKey,
        )
      : undefined;
  const selectedCategoryResult = selectedCategory
    ? countCategoryPermissionResults(
        selectedCategory,
        state.configured,
        state.effective,
      )
    : null;
  const selectedPageIsAllowed = selectedCategoryAccessPermission
    ? state.effective.get(selectedCategoryAccessPermission.key) === true
    : false;
  const categoryOverrides =
    selectedCategory?.permissions.filter((item) =>
      permissionsMap.has(item.key),
    ) ?? [];
  const groups = new Map<
    string,
    (typeof PERMISSION_EDITOR_CATEGORIES)[number]['permissions']
  >();
  for (const permission of selectedCategory?.permissions ?? []) {
    if (permission.key === selectedCategoryAccessPermission?.key) continue;
    groups.set(permission.module, [
      ...(groups.get(permission.module) ?? []),
      permission,
    ]);
  }

  const getBatchDecision = (
    nextPermissions: PermissionsData | null,
  ): PermissionMutationDecision =>
    evaluatePermissionMutationBatch({
      accessPermissionKeys: ACCESS_KEYS,
      currentEffectivePermissions: state.effective,
      currentPermissionsMap: permissionsMap,
      disabled,
      nextPermissions,
      policy: canChangePermission,
      role,
    });
  const buildChange = (
    permissionKey: string,
    choice: PermissionChoiceState,
  ): PermissionsData | null =>
    buildPermissionOverrideChange({
      permissionKey,
      permissionsMap,
      roleBasePermissionsMap: state.roleDefaults,
      state: choice,
    });
  const buildReset = (keys: Iterable<string>): PermissionsData | null =>
    buildResetPermissionOverrides(permissionsMap, keys);
  const getDecision = (
    key: string,
    choice: PermissionChoiceState | 'reset',
  ): PermissionMutationDecision => {
    if (choice === 'reset' && !permissionsMap.has(key))
      return { allowed: false, reason: 'Aucune exception à réinitialiser.' };
    const batch = getBatchDecision(
      choice === 'reset' ? buildReset([key]) : buildChange(key, choice),
    );
    if (!batch.allowed || choice === 'reset' || !canChangePermission)
      return batch;

    return canChangePermission(key, choice === 'allow');
  };
  const changePermission = (
    key: string,
    choice: PermissionChoiceState,
  ): void => {
    if (getDecision(key, choice).allowed) onChange(buildChange(key, choice));
  };
  const reset = (keys: Iterable<string>): void => {
    const next = buildReset(keys);
    if (getBatchDecision(next).allowed) onChange(next);
  };

  return (
    <div className={styles.editor}>
      <header className={styles.header}>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-foreground text-sm font-semibold">
              Autorisations administratives
            </h3>
            {disabled && <Badge variant="outline">Lecture seule</Badge>}
          </div>
          <p className="text-muted-foreground max-w-2xl text-xs leading-5">
            Le rôle fournit les valeurs par défaut. Les exceptions adaptent les
            accès de ce compte.
          </p>
          <p
            className="text-muted-foreground text-xs leading-5"
            aria-live="polite"
          >
            {accessiblePages}/
            {
              PERMISSION_EDITOR_CATEGORIES.filter(
                (category) => category.scope === 'page',
              ).length
            }{' '}
            pages accessibles · {readyCount}/{totalCount} autorisations
            utilisables · {customPermissionCount} exception
            {customPermissionCount > 1 ? 's' : ''}
          </p>
        </div>
        {headerControls}
      </header>
      {selectedCategory && (
        <>
          <div className={styles.filters}>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="permission-pole">Pôle</Label>
              <Select
                value={selectedPole?.key}
                onValueChange={(key) => {
                  const first = PERMISSION_EDITOR_CATEGORIES.find(
                    (category) => category.poleKey === key,
                  );
                  if (first) onSelectedPageChange(first.key);
                }}
              >
                <SelectTrigger
                  id="permission-pole"
                  className="w-full min-w-0"
                  variant="compact"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent variant="compact">
                  {PERMISSION_POLES.filter((pole) =>
                    PERMISSION_EDITOR_CATEGORIES.some(
                      (category) => category.poleKey === pole.key,
                    ),
                  ).map((pole) => (
                    <SelectItem key={pole.key} value={pole.key}>
                      {pole.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="permission-page">Page ou fonction</Label>
              <Select
                value={selectedCategory.key}
                onValueChange={onSelectedPageChange}
              >
                <SelectTrigger
                  id="permission-page"
                  className="w-full min-w-0"
                  variant="compact"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent variant="compact">
                  {PERMISSION_EDITOR_CATEGORIES.filter(
                    (category) => category.poleKey === selectedPole?.key,
                  ).map((category) => (
                    <SelectItem key={category.key} value={category.key}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <section
            className="space-y-4 p-3 sm:p-4"
            aria-label={`Autorisations de la page ${selectedCategory.label}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-foreground text-sm font-semibold">
                    {selectedCategory.label}
                  </h3>
                  <Badge variant="outline">
                    {selectedCategoryResult?.ready}/
                    {selectedCategoryResult?.total} utilisables
                  </Badge>
                  {selectedCategory.assignment === 'role-bound' && (
                    <Badge variant="outline">Géré par le rôle</Badge>
                  )}
                  {!!selectedCategoryResult?.incomplete && (
                    <Badge variant="outline" className="text-warning">
                      {selectedCategoryResult.incomplete} à compléter
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-xs leading-5">
                  {selectedCategory.description}
                </p>
              </div>
              {categoryOverrides.length > 0 && !disabled && (
                <PermissionDecisionButton
                  accessibleLabel="Réinitialiser cette page"
                  decision={getBatchDecision(
                    buildReset(
                      selectedCategory.permissions.map((item) => item.key),
                    ),
                  )}
                  onClick={() =>
                    reset(selectedCategory.permissions.map((item) => item.key))
                  }
                  variant="ghost"
                  size="sm"
                >
                  <RotateCcw className="size-3.5" />
                  Réinitialiser cette page
                </PermissionDecisionButton>
              )}
            </div>
            {selectedCategoryAccessPermission && (
              <div
                className={styles.pageAccess}
                data-permission={selectedCategoryAccessPermission.key}
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-foreground text-sm font-medium">
                      {selectedCategoryAccessPermission.label}
                    </h4>
                    <Badge
                      variant="outline"
                      className={
                        selectedPageIsAllowed
                          ? 'text-success border-success/35'
                          : 'text-muted-foreground'
                      }
                    >
                      {selectedPageIsAllowed
                        ? 'Page accessible'
                        : 'Page inaccessible'}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs leading-5">
                    {selectedPageIsAllowed
                      ? 'Les actions ci-dessous restent soumises à leurs propres autorisations.'
                      : 'Autorisez cet accès pour rendre les actions de cette page utilisables.'}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {permissionsMap.has(selectedCategoryAccessPermission.key)
                      ? 'Exception personnalisée'
                      : 'Valeur héritée du rôle'}
                  </p>
                </div>
                {selectedCategoryAccessPermission.grantable ? (
                  disabled ? (
                    <span className="text-muted-foreground text-xs">
                      Lecture seule
                    </span>
                  ) : (
                    <PermissionStatePicker
                      allowDecision={getDecision(
                        selectedCategoryAccessPermission.key,
                        'allow',
                      )}
                      defaultState={
                        state.roleDefaults.get(
                          selectedCategoryAccessPermission.key,
                        )
                          ? 'allow'
                          : 'deny'
                      }
                      denyDecision={getDecision(
                        selectedCategoryAccessPermission.key,
                        'deny',
                      )}
                      permissionLabel={selectedCategoryAccessPermission.label}
                      resetDecision={getDecision(
                        selectedCategoryAccessPermission.key,
                        'reset',
                      )}
                      state={
                        state.configured.get(
                          selectedCategoryAccessPermission.key,
                        )
                          ? 'allow'
                          : 'deny'
                      }
                      onChange={(choice) =>
                        changePermission(
                          selectedCategoryAccessPermission.key,
                          choice,
                        )
                      }
                      onReset={() =>
                        reset([selectedCategoryAccessPermission.key])
                      }
                    />
                  )
                ) : (
                  <RoleBoundPermissionStatus
                    isEnabled={selectedPageIsAllowed}
                    role={role}
                  />
                )}
              </div>
            )}
            {!disabled &&
              selectedCategory.scope === 'page' &&
              selectedCategory.assignment !== 'role-bound' && (
                <p className="text-muted-foreground text-xs leading-5">
                  Autoriser active aussi les prérequis nécessaires. Refuser
                  retire les autorisations qui en dépendent. Les changements
                  prennent effet après enregistrement.
                </p>
              )}
            {[...groups].map(([module, items]) => (
              <section key={module} className="space-y-2" aria-label={module}>
                <h4 className="text-muted-foreground text-xs font-medium">
                  {module}
                </h4>
                <div className={styles.rows}>
                  {items.map((permission) => (
                    <PermissionRow
                      key={permission.key}
                      accessKey={
                        selectedCategory.scope === 'page'
                          ? selectedCategory.accessPermissionKey
                          : undefined
                      }
                      disabled={disabled}
                      getDecision={getDecision}
                      hasCustomChoice={permissionsMap.has(permission.key)}
                      onChange={changePermission}
                      onReset={(key) => reset([key])}
                      permission={permission}
                      role={role}
                      state={state}
                    />
                  ))}
                </div>
              </section>
            ))}
            {groups.size === 0 && (
              <p className="text-muted-foreground flex items-center gap-2 text-xs">
                <ShieldCheck className="size-4" />
                Cette page se pilote uniquement avec son autorisation d’accès.
              </p>
            )}
            {customPermissionCount > 0 && !disabled && (
              <PermissionDecisionButton
                accessibleLabel="Tout réinitialiser"
                decision={getBatchDecision(buildReset(ACCESS_KEYS))}
                onClick={() => reset(ACCESS_KEYS)}
                variant="ghost"
                size="sm"
              >
                <RotateCcw className="size-3.5" />
                Tout réinitialiser au rôle
              </PermissionDecisionButton>
            )}
          </section>
        </>
      )}
    </div>
  );
};
