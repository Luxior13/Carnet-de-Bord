import { UserRole } from '@repo/database';

export const PERMISSIONS = {
  DASHBOARD: {
    VIEW: 'dashboard:view',
  },
  TREASURY: {
    EDIT: 'treasury:edit',
    EXPORT: 'treasury:export',
    VALIDATE: 'treasury:validate',
    VIEW: 'treasury:view',
  },
  USERS: {
    CREATE: 'users:create',
    DELETE: 'users:delete',
    EDIT_PERMISSIONS: 'users:edit_permissions',
    RESET_PASSWORD: 'users:reset_password',
    UPDATE: 'users:update',
    VIEW: 'users:view',
  },
} as const;

export const ROLE_TEMPLATES = {
  ADMIN_COMPLET: {
    label: 'Admin complet',
    permissions: [
      PERMISSIONS.DASHBOARD.VIEW,
      ...Object.values(PERMISSIONS.TREASURY),
      ...Object.values(PERMISSIONS.USERS),
    ],
  },
  GESTION_UTILISATEURS: {
    label: 'Gestion utilisateurs',
    permissions: [
      PERMISSIONS.DASHBOARD.VIEW,
      ...Object.values(PERMISSIONS.USERS),
    ],
  },
  LECTURE_SEULE: {
    label: 'Lecture seule',
    permissions: [PERMISSIONS.DASHBOARD.VIEW, PERMISSIONS.USERS.VIEW],
  },
} as const;

export type PermissionAction =
  | 'create'
  | 'delete'
  | 'export'
  | 'manage'
  | 'reset'
  | 'update'
  | 'validate'
  | 'view';

export type PermissionRisk = 'critical' | 'default' | 'sensitive';

export type PermissionItem = {
  action: PermissionAction;
  dependencies?: string[];
  description: string;
  key: string;
  label: string;
  module: string;
  risk: PermissionRisk;
};

export type PermissionCategory = {
  color: string;
  description: string;
  icon: string;
  key: string;
  label: string;
  permissions: PermissionItem[];
};

export type PermissionsData = Record<string, boolean>;

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    color: 'blue',
    description: 'Accès au tableau de bord',
    icon: 'LayoutDashboard',
    key: 'dashboard',
    label: 'Tableau de bord',
    permissions: [
      {
        action: 'view',
        description: 'Accéder au tableau de bord et voir les statistiques',
        key: PERMISSIONS.DASHBOARD.VIEW,
        label: 'Voir le tableau de bord',
        module: "Vue d'ensemble",
        risk: 'default',
      },
    ],
  },
  {
    color: 'violet',
    description: 'Gestion des utilisateurs du système',
    icon: 'Users',
    key: 'users',
    label: 'Utilisateurs',
    permissions: [
      {
        action: 'view',
        description: 'Consulter la liste des utilisateurs',
        key: PERMISSIONS.USERS.VIEW,
        label: 'Voir les utilisateurs',
        module: 'Comptes',
        risk: 'default',
      },
      {
        action: 'create',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: 'Créer de nouveaux comptes utilisateur',
        key: PERMISSIONS.USERS.CREATE,
        label: 'Créer des utilisateurs',
        module: 'Comptes',
        risk: 'sensitive',
      },
      {
        action: 'update',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: 'Modifier les informations des utilisateurs',
        key: PERMISSIONS.USERS.UPDATE,
        label: 'Modifier les utilisateurs',
        module: 'Comptes',
        risk: 'sensitive',
      },
      {
        action: 'delete',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: 'Supprimer des comptes utilisateur',
        key: PERMISSIONS.USERS.DELETE,
        label: 'Supprimer des utilisateurs',
        module: 'Comptes',
        risk: 'critical',
      },
      {
        action: 'reset',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: 'Réinitialiser les mots de passe',
        key: PERMISSIONS.USERS.RESET_PASSWORD,
        label: 'Réinitialiser les mots de passe',
        module: 'Securite',
        risk: 'critical',
      },
      {
        action: 'manage',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: 'Modifier les permissions des utilisateurs',
        key: PERMISSIONS.USERS.EDIT_PERMISSIONS,
        label: 'Gerer les permissions',
        module: 'Accès',
        risk: 'critical',
      },
    ],
  },
  {
    color: 'green',
    description: 'Accès financier strict',
    icon: 'Wallet',
    key: 'treasury',
    label: 'Trésorerie',
    permissions: [
      {
        action: 'view',
        description: 'Consulter les tableaux, operations et bilans financiers',
        key: PERMISSIONS.TREASURY.VIEW,
        label: 'Voir la tresorerie',
        module: 'Finance',
        risk: 'sensitive',
      },
      {
        action: 'update',
        dependencies: [PERMISSIONS.TREASURY.VIEW],
        description: 'Modifier les données et opérations financières',
        key: PERMISSIONS.TREASURY.EDIT,
        label: 'Modifier la tresorerie',
        module: 'Finance',
        risk: 'critical',
      },
      {
        action: 'export',
        dependencies: [PERMISSIONS.TREASURY.VIEW],
        description: 'Exporter les données et documents financiers',
        key: PERMISSIONS.TREASURY.EXPORT,
        label: 'Exporter la tresorerie',
        module: 'Exports',
        risk: 'sensitive',
      },
      {
        action: 'validate',
        dependencies: [PERMISSIONS.TREASURY.VIEW],
        description: 'Valider les actions financieres sensibles',
        key: PERMISSIONS.TREASURY.VALIDATE,
        label: 'Valider la tresorerie',
        module: 'Validations',
        risk: 'critical',
      },
    ],
  },
];

const ALL_PERMISSION_KEYS = PERMISSION_CATEGORIES.flatMap((category) =>
  category.permissions.map((permission) => permission.key),
);

const ALL_PERMISSION_KEYS_SET = new Set<string>(ALL_PERMISSION_KEYS);
const PERMISSION_ITEM_MAP = new Map<string, PermissionItem>(
  PERMISSION_CATEGORIES.flatMap((category) =>
    category.permissions.map((permission) => [permission.key, permission]),
  ),
);

export const isKnownPermissionKey = (permissionKey: string): boolean =>
  ALL_PERMISSION_KEYS_SET.has(permissionKey);

export const getUnknownPermissionKeys = (
  permissions?: PermissionsData | null,
): string[] => {
  return Object.keys(permissions ?? {}).filter(
    (permissionKey) => !isKnownPermissionKey(permissionKey),
  );
};

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: [
    PERMISSIONS.DASHBOARD.VIEW,
    ...Object.values(PERMISSIONS.TREASURY),
    ...Object.values(PERMISSIONS.USERS),
  ],
  USER: [PERMISSIONS.DASHBOARD.VIEW],
};

const ROLE_PERMISSIONS_MAP = new Map<UserRole, string[]>(
  Object.entries(ROLE_PERMISSIONS) as [UserRole, string[]][],
);

export const hasPermission = (
  role: UserRole,
  permissionKey: string,
  customPermissions?: PermissionsData | null,
): boolean => {
  if (!isKnownPermissionKey(permissionKey)) {
    return false;
  }

  const customPermissionsMap = new Map(Object.entries(customPermissions ?? {}));
  const visitedPermissionKeys = new Set<string>();

  const hasPermissionWithDependencies = (
    currentPermissionKey: string,
  ): boolean => {
    if (visitedPermissionKeys.has(currentPermissionKey)) return true;
    visitedPermissionKeys.add(currentPermissionKey);

    if (!isKnownPermissionKey(currentPermissionKey)) return false;

    const isDirectlyAllowed = customPermissionsMap.has(currentPermissionKey)
      ? (customPermissionsMap.get(currentPermissionKey) ?? false)
      : (ROLE_PERMISSIONS_MAP.get(role)?.includes(currentPermissionKey) ??
        false);

    if (!isDirectlyAllowed) return false;

    const permission = PERMISSION_ITEM_MAP.get(currentPermissionKey);

    return (permission?.dependencies ?? []).every((dependency) =>
      hasPermissionWithDependencies(dependency),
    );
  };

  return hasPermissionWithDependencies(permissionKey);
};

export const getRoleBasePermissions = (
  role: UserRole,
): Record<string, boolean> => {
  const rolePermissions = ROLE_PERMISSIONS_MAP.get(role) ?? [];

  return Object.fromEntries(
    PERMISSION_CATEGORIES.flatMap((category) =>
      category.permissions.map(
        (permission) =>
          [permission.key, rolePermissions.includes(permission.key)] as const,
      ),
    ),
  );
};

export const getEffectivePermissions = (
  role: UserRole,
  customPermissions?: PermissionsData | null,
): Record<string, boolean> => {
  return Object.fromEntries([
    ...Object.entries(getRoleBasePermissions(role)),
    ...Object.entries(customPermissions ?? {}).filter(([permissionKey]) =>
      isKnownPermissionKey(permissionKey),
    ),
  ]);
};

export const getAllPermissionKeys = (): string[] => {
  return [...ALL_PERMISSION_KEYS];
};

export const getPermissionItem = (
  permissionKey: string,
): PermissionItem | undefined => {
  return PERMISSION_ITEM_MAP.get(permissionKey);
};

export const buildPermissionOverrides = (
  role: UserRole,
  enabledPermissionKeys: Iterable<string>,
): PermissionsData | null => {
  const enabledKeys = new Set(enabledPermissionKeys);
  const roleBasePermissions = getRoleBasePermissions(role);
  const roleBasePermissionsMap = new Map(Object.entries(roleBasePermissions));
  const overrides = Object.fromEntries(
    ALL_PERMISSION_KEYS.flatMap((permissionKey) => {
      const enabled = enabledKeys.has(permissionKey);

      if ((roleBasePermissionsMap.get(permissionKey) ?? false) === enabled) {
        return [];
      }

      return [[permissionKey, enabled] as const];
    }),
  ) as PermissionsData;

  return Object.keys(overrides).length > 0 ? overrides : null;
};

export const countCategoryPermissions = (
  categoryKey: string,
  effectivePermissions: Record<string, boolean>,
): { enabled: number; total: number } => {
  const category = PERMISSION_CATEGORIES.find(
    (item) => item.key === categoryKey,
  );
  if (!category) return { enabled: 0, total: 0 };

  const total = category.permissions.length;
  const effectivePermissionsMap = new Map(Object.entries(effectivePermissions));
  const enabled = category.permissions.filter((permission) =>
    effectivePermissionsMap.get(permission.key),
  ).length;

  return { enabled, total };
};

export const DEFAULT_ROLE_LABEL = 'Utilisateur';
export const PROTECTED_ROLE_LABEL = 'Superadmin';

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrateur',
  USER: 'Utilisateur',
};

export const getRoleLabel = (role: UserRole | string): string => {
  return ROLE_LABELS[role as UserRole] || DEFAULT_ROLE_LABEL;
};

export const getAccessLabel = (user: {
  isProtected?: boolean;
  role: UserRole | string;
}): string => {
  return user.isProtected ? PROTECTED_ROLE_LABEL : getRoleLabel(user.role);
};

export const DEFAULT_ROLE_COLOR: 'default' | 'secondary' = 'secondary';

export const ROLE_COLORS: Record<UserRole, 'default' | 'secondary'> = {
  ADMIN: 'default',
  USER: 'secondary',
};

export const getRoleColor = (
  role: UserRole | string,
): 'default' | 'secondary' => {
  return ROLE_COLORS[role as UserRole] || DEFAULT_ROLE_COLOR;
};
