'use client';

import { UserRole } from '@repo/database';
import {
  ChevronDown,
  Crown,
  Loader2,
  LockKeyhole,
  RotateCcw,
  Save,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import React, { type FC, useMemo } from 'react';

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
import { Card, CardContent, CardFooter, CardHeader } from '$ui/card';
import { Switch } from '$ui/switch';

type UserAccountTabProps = {
  canManagePermissions: boolean;
  canSave: boolean;
  hasChanges: boolean;
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

const CONFIGURABLE_ACCOUNT_PERMISSION_CATEGORIES =
  ACCOUNT_PERMISSION_CATEGORIES.flatMap((category) => {
    const permissions = category.permissions.filter(
      (permission) => !permission.alwaysEnabled,
    );

    return permissions.length > 0 ? [{ ...category, permissions }] : [];
  });

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

const ConfigurablePermissionRow: FC<ConfigurablePermissionRowProps> = ({
  canManagePermissions,
  hasCustomChoice,
  isAllowed,
  missingDependencyLabels,
  onChange,
  permission,
}) => (
  <div className="border-border/60 bg-popover flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
    <div className="min-w-0 space-y-1">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h5 className="text-foreground text-sm font-semibold">
          {permission.label}
        </h5>
        <Badge
          variant={isAllowed ? 'secondary' : 'outline'}
          className="rounded-full"
        >
          {isAllowed ? 'Autorisé' : 'Refusé'} ·{' '}
          {hasCustomChoice ? 'Personnalisé' : 'Rôle'}
        </Badge>
        {missingDependencyLabels.length > 0 && (
          <Badge variant="outline" className="border-warning/40 text-warning">
            À compléter
          </Badge>
        )}
      </div>
      <p
        id={`account-permission-${permission.key}-description`}
        className="text-muted-foreground max-w-3xl text-xs leading-5"
      >
        {permission.description}
      </p>
      {missingDependencyLabels.length > 0 && (
        <p className="text-warning/90 text-xs leading-5">
          Prérequis : {missingDependencyLabels.join(', ')}
        </p>
      )}
    </div>
    <Switch
      checked={isAllowed}
      onCheckedChange={onChange}
      disabled={!canManagePermissions}
      aria-label={permission.label}
      aria-describedby={`account-permission-${permission.key}-description`}
      className="self-start sm:self-center"
    />
  </div>
);

export const UserAccountTab: FC<UserAccountTabProps> = ({
  canManagePermissions,
  canSave,
  hasChanges,
  isSaving,
  onCancel,
  onSave,
  permissions,
  role,
  setPermissions,
  user,
}) => {
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
  const configurablePermissionCount =
    CONFIGURABLE_ACCOUNT_PERMISSION_ITEMS.length;
  const allowedConfigurablePermissionCount =
    CONFIGURABLE_ACCOUNT_PERMISSION_ITEMS.filter((permission) =>
      hasPermission(role, permission.key, permissions),
    ).length;
  const hasConfigurableOverrides = CONFIGURABLE_ACCOUNT_PERMISSION_ITEMS.some(
    (permission) => permissionsMap.has(permission.key),
  );

  const handleSetPermission = (
    permissionKey: string,
    enabled: boolean,
  ): void => {
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
    const nextPermissionsMap = new Map(permissionsMap);

    for (const permissionKey of accountPermissionKeys) {
      nextPermissionsMap.delete(permissionKey);
    }

    setPermissions(toPermissionsData(nextPermissionsMap));
  };

  if (user.isProtected) {
    return (
      <Card className="border-border/60 overflow-hidden rounded-lg py-0">
        <CardContent className="space-y-4 p-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="border-warning/35 bg-warning/10 text-warning flex size-11 shrink-0 items-center justify-center rounded-lg border">
              <Crown className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-foreground font-semibold">
                  Compte personnel
                </h2>
                <Badge
                  variant="outline"
                  className="border-warning/40 text-warning"
                >
                  {getAccessLabel(user)}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 max-w-3xl text-sm leading-6">
                Le super-administrateur dispose automatiquement de toutes les
                actions personnelles. Son autonomie ne peut pas être restreinte.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 overflow-hidden rounded-lg py-0">
      <CardHeader className="border-border/60 bg-surface-muted border-b p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="border-primary/35 bg-primary/15 text-primary-emphasis flex size-10 shrink-0 items-center justify-center rounded-lg border">
              <UserCheck className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-foreground text-base font-semibold">
                Compte personnel
              </h2>
              <p className="text-muted-foreground mt-1 max-w-3xl text-sm leading-6">
                Actions que cet utilisateur peut effectuer lui-même depuis Mon
                compte.
              </p>
            </div>
          </div>
          <div className="border-border/60 bg-surface-control flex items-center gap-2 rounded-lg border px-3 py-2">
            <ShieldCheck className="text-primary-emphasis size-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-foreground text-sm font-medium">
                {configurablePermissionCount} option
                {configurablePermissionCount > 1 ? 's' : ''} configurable
                {configurablePermissionCount > 1 ? 's' : ''}
              </p>
              <p className="text-muted-foreground text-xs">
                {allowedConfigurablePermissionCount} autorisée
                {allowedConfigurablePermissionCount > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {!canManagePermissions && (
            <Badge variant="secondary" className="w-fit rounded-full">
              Lecture seule
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-3 sm:p-4">
        <details className="group border-primary/25 bg-primary/[0.04] overflow-hidden rounded-lg border">
          <summary className="hover:bg-primary/[0.06] flex min-h-12 cursor-pointer list-none items-center gap-3 px-3 py-2.5 transition-colors sm:px-4 [&::-webkit-details-marker]:hidden">
            <span className="border-primary/30 bg-primary/10 text-primary-emphasis flex size-9 shrink-0 items-center justify-center rounded-lg border">
              <LockKeyhole className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-foreground block text-sm font-semibold">
                Fonctions essentielles garanties
              </span>
              <span className="text-muted-foreground mt-0.5 block text-xs leading-5">
                Consultation et sécurisation du compte, toujours disponibles.
              </span>
            </span>
            <Badge variant="outline" className="shrink-0 rounded-full">
              {ESSENTIAL_ACCOUNT_PERMISSION_ITEMS.length}
            </Badge>
            <ChevronDown className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-primary/20 grid gap-x-6 gap-y-3 border-t px-4 py-3 sm:grid-cols-2">
            {ESSENTIAL_ACCOUNT_PERMISSION_ITEMS.map((permission) => (
              <div key={permission.key} className="min-w-0">
                <p className="text-foreground text-sm font-medium">
                  {permission.label}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs leading-5">
                  {permission.description}
                </p>
              </div>
            ))}
          </div>
        </details>

        <section className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-foreground text-sm font-semibold">
              {configurablePermissionCount > 1
                ? 'Options configurables'
                : 'Option configurable'}
            </h3>
            <p className="text-muted-foreground text-xs leading-5">
              Sans choix personnalisé, chaque option conserve la valeur prévue
              par le rôle de l&apos;utilisateur.
            </p>
          </div>
          {CONFIGURABLE_ACCOUNT_PERMISSION_CATEGORIES.map((category) => (
            <div key={category.key} className="space-y-2">
              <div className="space-y-1">
                <h4 className="text-foreground text-sm font-semibold">
                  {category.label}
                </h4>
                <p className="text-muted-foreground text-xs">
                  {category.description}
                </p>
              </div>
              <div className="space-y-2">
                {category.permissions.map((permission) => (
                  <ConfigurablePermissionRow
                    key={permission.key}
                    permission={permission}
                    canManagePermissions={canManagePermissions}
                    hasCustomChoice={permissionsMap.has(permission.key)}
                    isAllowed={hasPermission(role, permission.key, permissions)}
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
            </div>
          ))}
        </section>
      </CardContent>
      {canManagePermissions && (
        <CardFooter className="border-border/60 bg-surface-muted/95 sticky bottom-3 z-20 flex-col items-stretch justify-between gap-3 rounded-b-lg border-t p-3 shadow-[var(--shadow-panel)] backdrop-blur sm:flex-row sm:items-center">
          <p className="text-muted-foreground text-xs">
            {hasChanges ? 'Modifications non enregistrées' : 'À jour'}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetPersonalPermissions}
              disabled={isSaving || !hasConfigurableOverrides}
              title="Réinitialiser les options aux valeurs du rôle"
            >
              <RotateCcw className="size-4" />
              Réinitialiser au rôle
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={!hasChanges || isSaving}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={onSave}
              disabled={isSaving || !canSave}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSaving ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <Save size={16} className="mr-2" />
              )}
              Enregistrer
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};
