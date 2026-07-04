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

export type PermissionItem = {
  description: string;
  key: string;
  label: string;
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
        description: 'Accéder au tableau de bord et voir les statistiques',
        key: PERMISSIONS.DASHBOARD.VIEW,
        label: 'Voir le tableau de bord',
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
        description: 'Consulter la liste des utilisateurs',
        key: PERMISSIONS.USERS.VIEW,
        label: 'Voir les utilisateurs',
      },
      {
        description: 'Créer de nouveaux comptes utilisateur',
        key: PERMISSIONS.USERS.CREATE,
        label: 'Créer des utilisateurs',
      },
      {
        description: 'Modifier les informations des utilisateurs',
        key: PERMISSIONS.USERS.UPDATE,
        label: 'Modifier les utilisateurs',
      },
      {
        description: 'Supprimer des comptes utilisateur',
        key: PERMISSIONS.USERS.DELETE,
        label: 'Supprimer des utilisateurs',
      },
      {
        description: 'Réinitialiser les mots de passe',
        key: PERMISSIONS.USERS.RESET_PASSWORD,
        label: 'Réinitialiser les mots de passe',
      },
      {
        description: 'Modifier les permissions des utilisateurs',
        key: PERMISSIONS.USERS.EDIT_PERMISSIONS,
        label: 'Gérer les permissions',
      },
    ],
  },
  {
    color: 'green',
    description: 'Acces financier strict',
    icon: 'Wallet',
    key: 'treasury',
    label: 'Tresorerie',
    permissions: [
      {
        description: 'Consulter les tableaux, operations et bilans financiers',
        key: PERMISSIONS.TREASURY.VIEW,
        label: 'Voir la tresorerie',
      },
      {
        description: 'Modifier les donnees et operations financieres',
        key: PERMISSIONS.TREASURY.EDIT,
        label: 'Modifier la tresorerie',
      },
      {
        description: 'Exporter les donnees et documents financiers',
        key: PERMISSIONS.TREASURY.EXPORT,
        label: 'Exporter la tresorerie',
      },
      {
        description: 'Valider les actions financieres sensibles',
        key: PERMISSIONS.TREASURY.VALIDATE,
        label: 'Valider la tresorerie',
      },
    ],
  },
];

const ALL_PERMISSION_KEYS = PERMISSION_CATEGORIES.flatMap((category) =>
  category.permissions.map((permission) => permission.key),
);

const ALL_PERMISSION_KEYS_SET = new Set<string>(ALL_PERMISSION_KEYS);

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

  if (customPermissionsMap.has(permissionKey)) {
    return customPermissionsMap.get(permissionKey) ?? false;
  }

  return ROLE_PERMISSIONS_MAP.get(role)?.includes(permissionKey) ?? false;
};

export const getEffectivePermissions = (
  role: UserRole,
  customPermissions?: PermissionsData | null,
): Record<string, boolean> => {
  const rolePermissions = ROLE_PERMISSIONS_MAP.get(role) ?? [];

  return Object.fromEntries([
    ...PERMISSION_CATEGORIES.flatMap((category) =>
      category.permissions.map(
        (permission) =>
          [permission.key, rolePermissions.includes(permission.key)] as const,
      ),
    ),
    ...Object.entries(customPermissions ?? {}).filter(([permissionKey]) =>
      isKnownPermissionKey(permissionKey),
    ),
  ]);
};

export const getAllPermissionKeys = (): string[] => {
  return [...ALL_PERMISSION_KEYS];
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
