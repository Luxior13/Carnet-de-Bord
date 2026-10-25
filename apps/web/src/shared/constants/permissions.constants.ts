import { UserRole } from '@repo/shared';

import {
  ACCOUNT_PERMISSION_CATEGORIES,
  BASELINE_PERMISSION_ITEMS,
  PERMISSION_CATEGORIES,
  type PermissionItem,
  PERMISSIONS,
  type PermissionsData,
  ROLE_BOUND_PERMISSION_ITEMS,
} from './permission-catalog.constants';

export {
  ACCOUNT_PERMISSION_CATEGORIES,
  PERMISSION_CATEGORIES,
  PERMISSION_POLES,
  type PermissionCategory,
  type PermissionItem,
  PERMISSIONS,
  type PermissionsData,
  ROADMAP_PERMISSIONS,
} from './permission-catalog.constants';

export const DELEGABLE_PERMISSION_CATEGORIES = PERMISSION_CATEGORIES.filter(
  (category) => category.assignment === 'delegable',
);
const ACCESS_PERMISSION_ITEMS = DELEGABLE_PERMISSION_CATEGORIES.flatMap(
  (category) => category.permissions,
).filter((permission) => permission.grantable);
const ACCOUNT_PERMISSION_ITEMS = ACCOUNT_PERMISSION_CATEGORIES.flatMap(
  (category) => category.permissions,
);
const ALL_PERMISSION_ITEMS = [
  ...BASELINE_PERMISSION_ITEMS,
  ...ROLE_BOUND_PERMISSION_ITEMS,
  ...ACCESS_PERMISSION_ITEMS,
  ...ACCOUNT_PERMISSION_ITEMS,
];
const ALL_PERMISSION_KEYS = ALL_PERMISSION_ITEMS.map(
  (permission) => permission.key,
);
const ALL_PERMISSION_KEYS_SET = new Set<string>(ALL_PERMISSION_KEYS);
const ACCESS_PERMISSION_KEYS = ACCESS_PERMISSION_ITEMS.map(
  (permission) => permission.key,
);
const ACCOUNT_PERMISSION_KEYS = ACCOUNT_PERMISSION_ITEMS.map(
  (permission) => permission.key,
);
const PERMISSION_ITEM_MAP = new Map<string, PermissionItem>(
  ALL_PERMISSION_ITEMS.map((permission) => [permission.key, permission]),
);
const DEPENDENT_PERMISSION_KEYS_MAP = ALL_PERMISSION_ITEMS.flatMap(
  (permission) =>
    (permission.dependencies ?? []).map(
      (dependency) => [dependency, permission.key] as const,
    ),
).reduce((dependents, [dependency, permissionKey]) => {
  dependents.set(dependency, [
    ...(dependents.get(dependency) ?? []),
    permissionKey,
  ]);

  return dependents;
}, new Map<string, string[]>());
const ALWAYS_ENABLED_PERMISSION_KEYS = new Set(
  ALL_PERMISSION_ITEMS.filter((permission) => permission.alwaysEnabled).map(
    (permission) => permission.key,
  ),
);
const GRANTABLE_PERMISSION_KEYS = new Set(
  ALL_PERMISSION_ITEMS.filter((permission) => permission.grantable).map(
    (permission) => permission.key,
  ),
);

export const isKnownPermissionKey = (permissionKey: string): boolean =>
  ALL_PERMISSION_KEYS_SET.has(permissionKey);

export const isPermissionAlwaysEnabled = (permissionKey: string): boolean =>
  ALWAYS_ENABLED_PERMISSION_KEYS.has(permissionKey);

export const isPermissionGrantable = (permissionKey: string): boolean =>
  GRANTABLE_PERMISSION_KEYS.has(permissionKey);

/**
 * Keeps only boolean overrides of individually grantable keys. Anything else
 * stored (unknown, retired or role-bound keys) has no effect and is dropped
 * at the next save.
 */
export const normalizePermissionOverrides = (
  permissions?: PermissionsData | null,
): PermissionsData | null => {
  const normalizedPermissions = Object.fromEntries(
    Object.entries(permissions ?? {}).filter(
      ([permissionKey, enabled]) =>
        typeof enabled === 'boolean' && isPermissionGrantable(permissionKey),
    ),
  ) as PermissionsData;

  return Object.keys(normalizedPermissions).length > 0
    ? normalizedPermissions
    : null;
};

export const getUnknownPermissionKeys = (
  permissions?: PermissionsData | null,
): string[] => {
  return Object.keys(permissions ?? {}).filter(
    (permissionKey) => !isKnownPermissionKey(permissionKey),
  );
};

/** Recognized keys that cannot be persisted as individual overrides. */
export const getNonAssignablePermissionKeys = (
  permissions?: PermissionsData | null,
): string[] => {
  return Object.keys(permissions ?? {}).filter(
    (permissionKey) =>
      isKnownPermissionKey(permissionKey) &&
      !isPermissionGrantable(permissionKey),
  );
};

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: [
    ...ACCOUNT_PERMISSION_KEYS,
    PERMISSIONS.DASHBOARD.VIEW,
    PERMISSIONS.SETTINGS.VIEW,
    PERMISSIONS.SETTINGS.UPDATE,
    ...ACCESS_PERMISSION_KEYS,
  ],
  USER: [...ACCOUNT_PERMISSION_KEYS, PERMISSIONS.DASHBOARD.VIEW],
};

const ROLE_PERMISSIONS_MAP = new Map<UserRole, string[]>(
  Object.entries(ROLE_PERMISSIONS) as [UserRole, string[]][],
);
const ACCESS_PERMISSION_KEYS_SET = new Set<string>(ACCESS_PERMISSION_KEYS);

/**
 * An ADMIN always holds every administrative access permission: access
 * overrides cannot restrict it. A USER only holds the ones granted to it.
 */
export const hasCompleteAccessByRole = (role: UserRole): boolean =>
  role === UserRole.ADMIN;

export const omitAccessPermissionOverrides = (
  permissions?: PermissionsData | null,
): PermissionsData | null => {
  const remainingPermissions = Object.fromEntries(
    Object.entries(permissions ?? {}).filter(
      ([permissionKey]) => !ACCESS_PERMISSION_KEYS_SET.has(permissionKey),
    ),
  ) as PermissionsData;

  return Object.keys(remainingPermissions).length > 0
    ? remainingPermissions
    : null;
};

export const normalizeRolePermissionOverrides = (
  role: UserRole,
  permissions?: PermissionsData | null,
): PermissionsData | null => {
  const normalizedPermissions = normalizePermissionOverrides(permissions);

  return hasCompleteAccessByRole(role)
    ? omitAccessPermissionOverrides(normalizedPermissions)
    : normalizedPermissions;
};

export const hasPermission = (
  role: UserRole,
  permissionKey: string,
  customPermissions?: PermissionsData | null,
): boolean => {
  if (!isKnownPermissionKey(permissionKey)) return false;

  const customPermissionsMap = new Map(
    Object.entries(
      normalizeRolePermissionOverrides(role, customPermissions) ?? {},
    ),
  );
  const resolvedPermissions = new Map<string, boolean>();
  const resolvingPermissions = new Set<string>();

  const resolvePermission = (currentPermissionKey: string): boolean => {
    const cached = resolvedPermissions.get(currentPermissionKey);
    if (cached !== undefined) return cached;
    if (resolvingPermissions.has(currentPermissionKey)) return false;
    if (!isKnownPermissionKey(currentPermissionKey)) return false;

    resolvingPermissions.add(currentPermissionKey);
    const directlyAllowed = isPermissionAlwaysEnabled(currentPermissionKey)
      ? true
      : customPermissionsMap.has(currentPermissionKey)
        ? (customPermissionsMap.get(currentPermissionKey) ?? false)
        : (ROLE_PERMISSIONS_MAP.get(role)?.includes(currentPermissionKey) ??
          false);
    const permission = PERMISSION_ITEM_MAP.get(currentPermissionKey);
    const allowed =
      directlyAllowed &&
      (permission?.dependencies ?? []).every((dependency) =>
        resolvePermission(dependency),
      );

    resolvingPermissions.delete(currentPermissionKey);
    resolvedPermissions.set(currentPermissionKey, allowed);

    return allowed;
  };

  return resolvePermission(permissionKey);
};

export const getRoleBasePermissions = (
  role: UserRole,
): Record<string, boolean> => {
  const rolePermissions = ROLE_PERMISSIONS_MAP.get(role) ?? [];

  return Object.fromEntries(
    ALL_PERMISSION_KEYS.map(
      (permissionKey) =>
        [
          permissionKey,
          isPermissionAlwaysEnabled(permissionKey) ||
            rolePermissions.includes(permissionKey),
        ] as const,
    ),
  );
};

export const getEffectivePermissions = (
  role: UserRole,
  customPermissions?: PermissionsData | null,
): Record<string, boolean> => {
  return Object.fromEntries(
    ALL_PERMISSION_KEYS.map((permissionKey) => [
      permissionKey,
      hasPermission(role, permissionKey, customPermissions),
    ]),
  ) as Record<string, boolean>;
};

export const getAllPermissionKeys = (): string[] => [...ALL_PERMISSION_KEYS];

export const getAccessPermissionKeys = (): string[] => [
  ...ACCESS_PERMISSION_KEYS,
];

export const getAccountPermissionKeys = (): string[] => [
  ...ACCOUNT_PERMISSION_KEYS,
];

export const getPermissionItem = (
  permissionKey: string,
): PermissionItem | undefined => PERMISSION_ITEM_MAP.get(permissionKey);

export const getDependentPermissionKeys = (
  permissionKey: string,
): readonly string[] => DEPENDENT_PERMISSION_KEYS_MAP.get(permissionKey) ?? [];

export const getPermissionDisplayLabel = (permissionKey: string): string =>
  getPermissionItem(permissionKey)?.label ?? permissionKey;

export const buildPermissionOverrides = (
  role: UserRole,
  enabledPermissionKeys: Iterable<string>,
): PermissionsData | null => {
  const requestedEnabledKeys = new Set(enabledPermissionKeys);
  const roleBasePermissions = getRoleBasePermissions(role);
  const roleBasePermissionsMap = new Map(Object.entries(roleBasePermissions));
  const resolvedRequestedState = new Map<string, boolean>();

  const isRequestedAndUsable = (permissionKey: string): boolean => {
    const cached = resolvedRequestedState.get(permissionKey);
    if (cached !== undefined) return cached;
    const permission = PERMISSION_ITEM_MAP.get(permissionKey);
    // Non-grantable prerequisites (for example the always-enabled personal
    // profile view) are policy invariants, not choices that callers have to
    // repeat in `enabledPermissionKeys`.
    const directlyEnabled = isPermissionGrantable(permissionKey)
      ? requestedEnabledKeys.has(permissionKey)
      : (roleBasePermissionsMap.get(permissionKey) ?? false);
    const enabled =
      directlyEnabled &&
      (permission?.dependencies ?? []).every((dependency) =>
        isRequestedAndUsable(dependency),
      );
    resolvedRequestedState.set(permissionKey, enabled);

    return enabled;
  };

  const overrides = Object.fromEntries(
    ALL_PERMISSION_KEYS.flatMap((permissionKey) => {
      if (!isPermissionGrantable(permissionKey)) return [];
      if (isPermissionAlwaysEnabled(permissionKey)) return [];
      const enabled = isRequestedAndUsable(permissionKey);

      if (roleBasePermissionsMap.get(permissionKey) === enabled) return [];

      return [[permissionKey, enabled] as const];
    }),
  ) as PermissionsData;

  return Object.keys(overrides).length > 0 ? overrides : null;
};

/**
 * Canonicalizes an override set and removes dormant grants. Disabling a
 * parent therefore stores explicit denies for role-granted dependants, while
 * an orphan grant on a denied dependency is discarded. An ADMIN keeps no
 * access override, whatever the scope.
 */
export const enforcePermissionDependencies = (
  role: UserRole,
  permissions?: PermissionsData | null,
  permissionScopeKeys?: readonly string[],
): PermissionsData | null => {
  const normalizedPermissions = normalizeRolePermissionOverrides(
    role,
    permissions,
  );
  const effectivePermissions = getEffectivePermissions(
    role,
    normalizedPermissions,
  );
  const effectivePermissionsMap = new Map(Object.entries(effectivePermissions));
  const enabledGrantableKeys = ALL_PERMISSION_KEYS.filter(
    (permissionKey) =>
      isPermissionGrantable(permissionKey) &&
      effectivePermissionsMap.get(permissionKey),
  );
  const grantableOverrides = buildPermissionOverrides(
    role,
    enabledGrantableKeys,
  );
  const scopedPermissionKeys = permissionScopeKeys
    ? new Set(permissionScopeKeys)
    : null;
  const preservedOutOfScopeOverrides = Object.fromEntries(
    Object.entries(normalizedPermissions ?? {}).filter(
      ([permissionKey]) =>
        scopedPermissionKeys !== null &&
        !scopedPermissionKeys.has(permissionKey),
    ),
  );
  const enforcedScopeOverrides = Object.fromEntries(
    Object.entries(grantableOverrides ?? {}).filter(
      ([permissionKey]) =>
        scopedPermissionKeys === null ||
        scopedPermissionKeys.has(permissionKey),
    ),
  );

  return normalizePermissionOverrides({
    ...preservedOutOfScopeOverrides,
    ...enforcedScopeOverrides,
  });
};

export const arePermissionOverridesEqual = (
  first?: PermissionsData | null,
  second?: PermissionsData | null,
): boolean => {
  const firstEntries = new Map(
    Object.entries(normalizePermissionOverrides(first) ?? {}),
  );
  const secondEntries = new Map(
    Object.entries(normalizePermissionOverrides(second) ?? {}),
  );

  if (firstEntries.size !== secondEntries.size) return false;

  for (const [permissionKey, firstValue] of firstEntries) {
    if (secondEntries.get(permissionKey) !== firstValue) return false;
  }

  return true;
};

const DEFAULT_ROLE_LABEL = 'Utilisateur';
const PROTECTED_ROLE_LABEL = 'Superadmin';

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrateur',
  USER: 'Utilisateur',
};

const getRoleLabel = (role: UserRole | string): string =>
  ROLE_LABELS[role as UserRole] || DEFAULT_ROLE_LABEL;

export const getAccessLabel = (user: {
  isProtected?: boolean;
  role: UserRole | string;
}): string =>
  user.isProtected ? PROTECTED_ROLE_LABEL : getRoleLabel(user.role);
