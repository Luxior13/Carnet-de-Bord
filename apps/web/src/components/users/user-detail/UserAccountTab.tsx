'use client';

import { UserRole } from '@repo/shared';
import { Crown, LockKeyhole, RotateCcw } from 'lucide-react';
import React, { type FC, useMemo, useRef } from 'react';

import { SectionActionBar } from '$components/layout/SectionActionBar';
import { AuthorizationsHeader } from '$components/users/AuthorizationsHeader';
import { PermissionInfoButton } from '$components/users/PermissionInfoButton';
import styles from '$components/users/PermissionsEditor.module.css';
import {
  ACCOUNT_PERMISSION_CATEGORIES,
  getAccessLabel,
  getAccountPermissionKeys,
  getRoleBasePermissions,
  hasPermission,
  type PermissionItem,
  type PermissionsData,
} from '$constants/permissions.constants';
import type { UserType } from '$types/auth.types';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Card, CardContent } from '$ui/card';
import { StatusBadge } from '$ui/status-badge';
import { Switch } from '$ui/switch';

type UserAccountTabProps = {
  canManagePermissions: boolean;
  canSave: boolean;
  hasChanges: boolean;
  isRefreshing?: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
  permissions: PermissionsData | null;
  role: UserRole;
  setPermissions: (permissions: PermissionsData | null) => void;
  user: UserType;
};

type ConfigurablePermissionRowProps = {
  canManagePermissions: boolean;
  hasCustomChoice: boolean;
  isAllowed: boolean;
  isSaving: boolean;
  missingDependencyLabels: string[];
  onChange: (checked: boolean) => void;
  permission: PermissionItem;
};

const toPermissionsData = (
  permissionsMap: Map<string, boolean>,
): PermissionsData | null => {
  if (permissionsMap.size === 0) return null;

  return Object.fromEntries(permissionsMap) as PermissionsData;
};

const ACCOUNT_PERMISSION_ITEMS = ACCOUNT_PERMISSION_CATEGORIES.flatMap(
  (category) => category.permissions,
);

const ESSENTIAL_ACCOUNT_PERMISSION_ITEMS = ACCOUNT_PERMISSION_ITEMS.filter(
  (permission) => permission.alwaysEnabled,
);

const CONFIGURABLE_ACCOUNT_PERMISSION_ITEMS = ACCOUNT_PERMISSION_ITEMS.filter(
  (permission) => !permission.alwaysEnabled,
);

const ACCOUNT_PERMISSION_ITEM_MAP = new Map(
  ACCOUNT_PERMISSION_ITEMS.map((permission) => [permission.key, permission]),
);

const ACCOUNT_PERMISSION_LABEL_MAP = new Map(
  ACCOUNT_PERMISSION_ITEMS.map((permission) => [
    permission.key,
    permission.label,
  ]),
);

const ACCOUNT_DEPENDENT_KEYS_MAP = ACCOUNT_PERMISSION_ITEMS.reduce(
  (dependentsMap, permission) => {
    for (const dependencyKey of permission.dependencies ?? []) {
      dependentsMap.set(dependencyKey, [
        ...(dependentsMap.get(dependencyKey) ?? []),
        permission.key,
      ]);
    }

    return dependentsMap;
  },
  new Map<string, string[]>(),
);

const getRecursiveAccountDependencies = (
  permissionKey: string,
  visitedPermissionKeys = new Set<string>(),
): string[] => {
  if (visitedPermissionKeys.has(permissionKey)) return [];
  visitedPermissionKeys.add(permissionKey);

  const permission = ACCOUNT_PERMISSION_ITEM_MAP.get(permissionKey);
  const dependencies = permission?.dependencies ?? [];

  return dependencies.flatMap((dependencyKey) => [
    dependencyKey,
    ...getRecursiveAccountDependencies(dependencyKey, visitedPermissionKeys),
  ]);
};

const getRecursiveAccountDependents = (
  permissionKey: string,
  visitedPermissionKeys = new Set<string>(),
): string[] => {
  if (visitedPermissionKeys.has(permissionKey)) return [];
  visitedPermissionKeys.add(permissionKey);

  const dependents = ACCOUNT_DEPENDENT_KEYS_MAP.get(permissionKey) ?? [];

  return dependents.flatMap((dependentKey) => [
    dependentKey,
    ...getRecursiveAccountDependents(dependentKey, visitedPermissionKeys),
  ]);
};

const writePermissionChoice = (
  permissionsMap: Map<string, boolean>,
  roleBasePermissionsMap: Map<string, boolean>,
  permissionKey: string,
  enabled: boolean,
): void => {
  const roleBaseEnabled = roleBasePermissionsMap.get(permissionKey) ?? false;

  if (enabled === roleBaseEnabled) {
    permissionsMap.delete(permissionKey);
  } else {
    permissionsMap.set(permissionKey, enabled);
  }
};

// Same row as the administrative view: title, details popover, state,
// switch on the right edge (26 October 2026).
const ConfigurablePermissionRow: FC<ConfigurablePermissionRowProps> = ({
  canManagePermissions,
  hasCustomChoice,
  isAllowed,
  isSaving,
  missingDependencyLabels,
  onChange,
  permission,
}) => (
  <div className={styles.row} data-permission={permission.key}>
    <div className={styles.rowSummary}>
      <div className={styles.rowHeading}>
        <p className="text-foreground min-w-0 text-sm font-semibold">
          {permission.label}
        </p>
        <PermissionInfoButton
          description={permission.description}
          label={permission.label}
        />
        <span id={`account-permission-${permission.key}-state`}>
          {hasCustomChoice ? (
            <StatusBadge tone="muted">Exception personnalisée</StatusBadge>
          ) : (
            <span className="sr-only">Valeur héritée du rôle</span>
          )}
        </span>
      </div>
      {missingDependencyLabels.length > 0 && (
        <p className="text-warning text-xs leading-5">
          Prérequis : {missingDependencyLabels.join(', ')}
        </p>
      )}
    </div>
    <div className={styles.rowControls}>
      <Switch
        checked={isAllowed}
        onCheckedChange={onChange}
        disabled={!canManagePermissions || isSaving}
        aria-label={permission.label}
        aria-describedby={`account-permission-${permission.key}-state`}
      />
    </div>
  </div>
);

const EssentialPermissionRow: FC<{ permission: PermissionItem }> = ({
  permission,
}) => (
  <div className={styles.row} data-permission={permission.key}>
    <div className={styles.rowSummary}>
      <div className={styles.rowHeading}>
        <p className="text-foreground min-w-0 text-sm font-semibold">
          {permission.label}
        </p>
        <PermissionInfoButton
          description={permission.description}
          label={permission.label}
        />
      </div>
    </div>
    <div className={styles.rowControls}>
      {/* The rubric already says it; the lock alone keeps rows on one line. */}
      <LockKeyhole
        aria-hidden="true"
        className="text-muted-foreground size-4"
      />
      <span className="sr-only">Toujours disponible</span>
    </div>
  </div>
);

export const UserAccountTab: FC<UserAccountTabProps> = ({
  canManagePermissions,
  canSave,
  hasChanges,
  isRefreshing = false,
  isSaving,
  onCancel,
  onSave,
  permissions,
  role,
  setPermissions,
  user,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const handleCancel = (): void => {
    onCancel();
    requestAnimationFrame(() => {
      const field = cardRef.current?.querySelector<HTMLElement>(
        '[role="switch"]:not(:disabled)',
      );
      const heading = cardRef.current?.querySelector<HTMLElement>('h2');
      (field ?? heading)?.focus();
    });
  };
  const permissionsMap = useMemo(
    () => new Map(Object.entries(permissions ?? {})),
    [permissions],
  );
  const roleBasePermissions = useMemo(
    () => getRoleBasePermissions(role),
    [role],
  );
  const roleBasePermissionsMap = useMemo(
    () => new Map(Object.entries(roleBasePermissions)),
    [roleBasePermissions],
  );
  const accountPermissionKeys = useMemo(() => getAccountPermissionKeys(), []);
  const hasConfigurableOverrides = CONFIGURABLE_ACCOUNT_PERMISSION_ITEMS.some(
    (permission) => permissionsMap.has(permission.key),
  );

  const handleSetPermission = (
    permissionKey: string,
    enabled: boolean,
  ): void => {
    if (!canManagePermissions || isSaving) return;
    if (ACCOUNT_PERMISSION_ITEM_MAP.get(permissionKey)?.alwaysEnabled) return;

    const nextPermissionsMap = new Map(permissionsMap);

    writePermissionChoice(
      nextPermissionsMap,
      roleBasePermissionsMap,
      permissionKey,
      enabled,
    );

    if (enabled) {
      for (const dependencyKey of getRecursiveAccountDependencies(
        permissionKey,
      )) {
        writePermissionChoice(
          nextPermissionsMap,
          roleBasePermissionsMap,
          dependencyKey,
          true,
        );
      }
    } else {
      for (const dependentKey of getRecursiveAccountDependents(permissionKey)) {
        writePermissionChoice(
          nextPermissionsMap,
          roleBasePermissionsMap,
          dependentKey,
          false,
        );
      }
    }

    setPermissions(toPermissionsData(nextPermissionsMap));
  };

  const handleResetPersonalPermissions = (): void => {
    if (!canManagePermissions || isSaving) return;
    const nextPermissionsMap = new Map(permissionsMap);

    for (const permissionKey of accountPermissionKeys) {
      nextPermissionsMap.delete(permissionKey);
    }

    setPermissions(toPermissionsData(nextPermissionsMap));
  };

  if (user.isProtected) {
    return (
      <Card>
        <AuthorizationsHeader />
        <CardContent className="space-y-4 p-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="border-warning/35 bg-warning/10 text-warning flex size-11 shrink-0 items-center justify-center rounded-lg border">
              <Crown className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-foreground text-base leading-6 font-semibold">
                  Autonomie du compte
                </h2>
                <Badge
                  variant="outline"
                  className="border-warning/40 text-warning"
                >
                  {getAccessLabel(user)}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 max-w-3xl text-xs leading-5">
                Le superadmin dispose automatiquement de toutes les actions
                personnelles. Son autonomie ne peut pas être restreinte.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card ref={cardRef} role="region" aria-labelledby="account-autonomy-title">
      <AuthorizationsHeader
        aside={
          !canManagePermissions && (
            <Badge className="w-fit shrink-0" variant="secondary">
              Lecture seule
            </Badge>
          )
        }
        summary={
          <>
            <h2 className="sr-only" id="account-autonomy-title" tabIndex={-1}>
              Autonomie du compte
            </h2>
            <span>Ce qu’il peut faire depuis Mon compte</span>
            <PermissionInfoButton
              description="Ce que cet utilisateur peut faire lui-même depuis Mon compte. Une exception remplace la valeur de son rôle ; « Réinitialiser au rôle » la retire."
              label="Autonomie du compte"
            />
          </>
        }
      />
      <CardContent className="space-y-4 p-4 sm:p-5">
        <section aria-label="Options configurables" className={styles.group}>
          <h3 className={styles.groupHeading}>Réglable</h3>
          <div className={styles.rows}>
            {CONFIGURABLE_ACCOUNT_PERMISSION_ITEMS.map((permission) => (
              <ConfigurablePermissionRow
                key={permission.key}
                permission={permission}
                canManagePermissions={canManagePermissions}
                hasCustomChoice={permissionsMap.has(permission.key)}
                isAllowed={hasPermission(role, permission.key, permissions)}
                isSaving={isSaving}
                missingDependencyLabels={(permission.dependencies ?? [])
                  .filter(
                    (dependencyKey) =>
                      !hasPermission(role, dependencyKey, permissions),
                  )
                  .map(
                    (dependencyKey) =>
                      ACCOUNT_PERMISSION_LABEL_MAP.get(dependencyKey) ??
                      dependencyKey,
                  )}
                onChange={(checked) =>
                  handleSetPermission(permission.key, checked)
                }
              />
            ))}
          </div>
        </section>
        {/* Shown, not folded: help goes in popovers, never in a disclosure. */}
        <section aria-label="Droits essentiels" className={styles.group}>
          <h3 className={styles.groupHeading}>Toujours disponible</h3>
          <div className={styles.rows}>
            {ESSENTIAL_ACCOUNT_PERMISSION_ITEMS.map((permission) => (
              <EssentialPermissionRow
                key={permission.key}
                permission={permission}
              />
            ))}
          </div>
        </section>
      </CardContent>
      {canManagePermissions && (hasChanges || hasConfigurableOverrides) && (
        <SectionActionBar
          placement="docked"
          hasChanges={hasChanges}
          isResolvingConflict={isRefreshing}
          isSaving={isSaving && !isRefreshing}
          label="Enregistrement des accès personnels"
          onCancel={handleCancel}
          onSave={onSave}
          saveDisabled={!canSave}
          status={hasChanges ? undefined : 'Exception personnalisée active'}
          extraActions={
            hasConfigurableOverrides && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetPersonalPermissions}
                disabled={isSaving}
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                Réinitialiser au rôle
              </Button>
            )
          }
        />
      )}
    </Card>
  );
};
