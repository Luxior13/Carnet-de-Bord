'use client';

import { UserRole } from '@repo/database';
import {
  Crown,
  Loader2,
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
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '$ui/card';
import { Label } from '$ui/label';
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

type PersonalPermissionRowProps = {
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

const PersonalPermissionRow: FC<PersonalPermissionRowProps> = ({
  canManagePermissions,
  hasCustomChoice,
  isAllowed,
  missingDependencyLabels,
  onChange,
  permission,
}) => (
  <div className="border-sidebar-border/60 bg-popover flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0 space-y-1">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <p className="text-foreground text-sm font-semibold">
          {permission.label}
        </p>
        <Badge variant="outline" className="rounded-full">
          {isAllowed ? 'Autorise' : 'Refuse'}
        </Badge>
        <Badge variant="secondary" className="rounded-full">
          {hasCustomChoice ? 'Manuel' : 'Role'}
        </Badge>
        {missingDependencyLabels.length > 0 && (
          <Badge
            variant="outline"
            className="border-amber-500/40 text-amber-300"
          >
            A completer
          </Badge>
        )}
      </div>
      <p className="text-muted-foreground max-w-3xl text-xs leading-5">
        {permission.description}
      </p>
      {missingDependencyLabels.length > 0 && (
        <p className="text-xs leading-5 text-amber-300/90">
          Prerequis : {missingDependencyLabels.join(', ')}
        </p>
      )}
    </div>
    <Switch
      checked={isAllowed}
      onCheckedChange={onChange}
      disabled={!canManagePermissions}
      aria-label={permission.label}
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
  const personalPermissionCount = ACCOUNT_PERMISSION_CATEGORIES.reduce(
    (total, category) => total + category.permissions.length,
    0,
  );
  const allowedPersonalPermissionCount = ACCOUNT_PERMISSION_CATEGORIES.reduce(
    (total, category) =>
      total +
      category.permissions.filter((permission) =>
        hasPermission(role, permission.key, permissions),
      ).length,
    0,
  );

  const handleSetPermission = (
    permissionKey: string,
    enabled: boolean,
  ): void => {
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
      <Card className="border-sidebar-border/60 overflow-hidden rounded-lg py-0">
        <CardContent className="space-y-4 p-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-amber-500/35 bg-amber-500/10 text-amber-300">
              <Crown className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-foreground font-semibold">
                  Compte personnel superadmin
                </h3>
                <Badge
                  variant="outline"
                  className="border-amber-500/40 text-amber-300"
                >
                  {getAccessLabel(user)}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 max-w-3xl text-sm leading-6">
                Ce compte dispose automatiquement des actions personnelles et ne
                se gere pas par restrictions manuelles.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-sidebar-border/60 overflow-hidden rounded-lg py-0">
      <CardHeader className="border-sidebar-border/60 bg-surface-muted border-b p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="border-sidebar-ring/35 bg-sidebar-ring/15 text-sidebar-ring flex size-10 shrink-0 items-center justify-center rounded-lg border">
              <UserCheck className="size-5" />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-foreground text-base">
                Compte personnel
              </CardTitle>
              <p className="text-muted-foreground mt-1 max-w-3xl text-sm leading-6">
                Actions que ce compte peut effectuer lui-meme depuis Mon compte.
              </p>
            </div>
          </div>
          <div className="border-sidebar-border/60 bg-surface-control flex items-center gap-2 rounded-lg border px-3 py-2">
            <ShieldCheck className="text-primary size-4 shrink-0" />
            <span className="text-foreground text-sm font-medium">
              {allowedPersonalPermissionCount}/{personalPermissionCount}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-3 sm:p-4">
        {ACCOUNT_PERMISSION_CATEGORIES.map((category) => (
          <section key={category.key} className="space-y-2">
            <div className="space-y-1">
              <Label className="text-foreground text-sm font-semibold">
                {category.label}
              </Label>
              <p className="text-muted-foreground text-xs">
                {category.description}
              </p>
            </div>
            <div className="space-y-2">
              {category.permissions.map((permission) => (
                <PersonalPermissionRow
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
          </section>
        ))}
      </CardContent>
      <CardFooter className="border-sidebar-border/60 bg-surface-muted/95 sticky bottom-3 z-20 justify-between gap-3 rounded-b-lg border-t p-3 shadow-[var(--shadow-panel)] backdrop-blur">
        <p className="text-muted-foreground text-xs">
          {hasChanges ? 'Modifications non enregistrees' : 'A jour'}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetPersonalPermissions}
            disabled={!canManagePermissions || isSaving}
          >
            <RotateCcw className="size-4" />
            Role
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
    </Card>
  );
};
