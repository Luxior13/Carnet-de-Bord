import { type UserRole } from '@repo/shared';

import { getFeatureById } from '$constants/feature-registry.constants';
import {
  getEffectivePermissions,
  getPermissionItem,
  getRoleBasePermissions,
  normalizePermissionOverrides,
  PERMISSION_CATEGORIES,
  type PermissionCategory,
  type PermissionItem,
  type PermissionsData,
} from '$constants/permissions.constants';

/** Only capabilities belonging to currently usable pages are presented. */
export const PERMISSION_EDITOR_CATEGORIES = PERMISSION_CATEGORIES.flatMap(
  (category): Array<PermissionCategory & { scope: 'page' | 'cross-page' }> => {
    if (getFeatureById(category.key)?.availability !== 'live') return [];

    return [{ ...category, scope: 'page' }];
  },
);

export type PermissionEditorState = {
  configured: ReadonlyMap<string, boolean>;
  effective: ReadonlyMap<string, boolean>;
  roleDefaults: ReadonlyMap<string, boolean>;
};

export type PermissionCategoryResult = {
  enabled: number;
  incomplete: number;
  ready: number;
  total: number;
};

/** Keep the saved/draft choice distinct from access after dependencies. */
export const buildPermissionEditorState = (
  role: UserRole,
  permissions: PermissionsData | null,
): PermissionEditorState => {
  const overrides = normalizePermissionOverrides(permissions);
  const roleDefaults = new Map(Object.entries(getRoleBasePermissions(role)));
  const configured = new Map(roleDefaults);
  for (const [key, value] of Object.entries(overrides ?? {})) {
    configured.set(key, value);
  }
  const effective = new Map(
    Object.entries(getEffectivePermissions(role, overrides)),
  );

  return { configured, effective, roleDefaults };
};

export const getMissingPermissionDependencies = (
  permission: PermissionItem,
  configured: ReadonlyMap<string, boolean>,
  effective: ReadonlyMap<string, boolean>,
): string[] => {
  if (!configured.get(permission.key)) return [];
  const missing = new Set<string>();
  const visited = new Set<string>();
  const visit = (key: string): void => {
    if (visited.has(key)) return;
    visited.add(key);
    for (const dependency of getPermissionItem(key)?.dependencies ?? []) {
      if (!effective.get(dependency)) missing.add(dependency);
      visit(dependency);
    }
  };
  visit(permission.key);

  return [...missing];
};

export const countCategoryPermissionResults = (
  category: PermissionCategory,
  configured: ReadonlyMap<string, boolean>,
  effective: ReadonlyMap<string, boolean>,
): PermissionCategoryResult => ({
  enabled: category.permissions.filter((item) => configured.get(item.key))
    .length,
  incomplete: category.permissions.filter(
    (item) => configured.get(item.key) && !effective.get(item.key),
  ).length,
  ready: category.permissions.filter((item) => effective.get(item.key)).length,
  total: category.permissions.length,
});

/** Use the same live administrative scope in the editor and the saved overview. */
export const countUsablePermissions = (
  effective: ReadonlyMap<string, boolean>,
): Pick<PermissionCategoryResult, 'ready' | 'total'> => {
  const permissions = PERMISSION_EDITOR_CATEGORIES.flatMap(
    (category) => category.permissions,
  );

  return {
    ready: permissions.filter((item) => effective.get(item.key)).length,
    total: permissions.length,
  };
};
