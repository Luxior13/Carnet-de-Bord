import { UserRole } from '@repo/database';

import type { NavigationIconName } from '$constants/navigation-icon.constants';
import type { NavigationSpaceTone } from '$constants/navigation-theme.constants';

export const PERMISSIONS = {
  ACCOUNT: {
    CHANGE_PASSWORD: 'account:change_password',
    UPDATE_PROFILE: 'account:update_profile',
    VIEW_ACTIVITY: 'account:view_activity',
    VIEW_PROFILE: 'account:view_profile',
    VIEW_SECURITY: 'account:view_security',
  },
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
    EXPORT: 'users:export',
    MANAGE_ROLES: 'users:manage_roles',
    MANAGE_STATUS: 'users:manage_status',
    RESET_PASSWORD: 'users:reset_password',
    RESTORE: 'users:restore',
    REVOKE_SESSIONS: 'users:revoke_sessions',
    UPDATE_LOGIN: 'users:update_login',
    UPDATE_PROFILE: 'users:update_profile',
    VIEW: 'users:view',
    VIEW_ACCESS: 'users:view_access',
    VIEW_ACTIVITY: 'users:view_activity',
    VIEW_SESSIONS: 'users:view_sessions',
  },
} as const;

export type PermissionPole = {
  icon: NavigationIconName;
  key: string;
  label: string;
  tone: NavigationSpaceTone;
};

export const PERMISSION_POLES = [
  {
    icon: 'LayoutDashboard',
    key: 'dashboard',
    label: 'Tableau de bord',
    tone: 'dashboard',
  },
  {
    icon: 'Settings',
    key: 'system',
    label: 'Systeme',
    tone: 'system',
  },
  {
    icon: 'Wallet',
    key: 'treasury',
    label: 'Tresorerie',
    tone: 'treasury',
  },
] as const satisfies readonly PermissionPole[];

export type PermissionPoleKey = (typeof PERMISSION_POLES)[number]['key'];

export type PermissionAction =
  | 'create'
  | 'delete'
  | 'export'
  | 'manage'
  | 'reset'
  | 'restore'
  | 'revoke'
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
  description: string;
  icon: NavigationIconName;
  key: string;
  label: string;
  permissions: PermissionItem[];
  poleKey: PermissionPoleKey;
  tone: NavigationSpaceTone;
};

export type AccountPermissionCategory = {
  description: string;
  icon: NavigationIconName;
  key: string;
  label: string;
  permissions: PermissionItem[];
  tone: NavigationSpaceTone;
};

export type PermissionsData = Record<string, boolean>;

export const ACCOUNT_PERMISSION_CATEGORIES: AccountPermissionCategory[] = [
  {
    description: 'Identite visible et modifiable depuis Mon compte.',
    icon: 'UserCheck',
    key: 'account-profile',
    label: 'Profil personnel',
    permissions: [
      {
        action: 'view',
        description: 'Consulter son profil depuis la page Mon compte',
        key: PERMISSIONS.ACCOUNT.VIEW_PROFILE,
        label: 'Voir son profil personnel',
        module: 'Profil',
        risk: 'default',
      },
      {
        action: 'update',
        dependencies: [PERMISSIONS.ACCOUNT.VIEW_PROFILE],
        description: 'Modifier son prenom et son nom depuis la page Mon compte',
        key: PERMISSIONS.ACCOUNT.UPDATE_PROFILE,
        label: 'Modifier son profil personnel',
        module: 'Profil',
        risk: 'default',
      },
    ],
    tone: 'internal',
  },
  {
    description: 'Mot de passe et securite du compte connecte.',
    icon: 'ShieldCheck',
    key: 'account-security',
    label: 'Securite personnelle',
    permissions: [
      {
        action: 'view',
        description: 'Voir les informations de securite de son compte',
        key: PERMISSIONS.ACCOUNT.VIEW_SECURITY,
        label: 'Voir sa securite',
        module: 'Securite',
        risk: 'default',
      },
      {
        action: 'update',
        dependencies: [PERMISSIONS.ACCOUNT.VIEW_SECURITY],
        description: 'Changer son mot de passe depuis Mon compte',
        key: PERMISSIONS.ACCOUNT.CHANGE_PASSWORD,
        label: 'Changer son mot de passe',
        module: 'Mot de passe',
        risk: 'sensitive',
      },
    ],
    tone: 'internal',
  },
  {
    description: 'Historique visible depuis son propre compte.',
    icon: 'History',
    key: 'account-activity',
    label: 'Activite personnelle',
    permissions: [
      {
        action: 'view',
        description: 'Consulter les activites liees a son propre compte',
        key: PERMISSIONS.ACCOUNT.VIEW_ACTIVITY,
        label: 'Voir son activite',
        module: 'Activite',
        risk: 'default',
      },
    ],
    tone: 'internal',
  },
];

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    description: 'Vue globale du site prive selon les permissions.',
    icon: 'LayoutDashboard',
    key: 'dashboard',
    label: "Vue d'ensemble",
    permissions: [
      {
        action: 'view',
        description: 'Acceder au tableau de bord et voir les statistiques',
        key: PERMISSIONS.DASHBOARD.VIEW,
        label: 'Voir le tableau de bord',
        module: "Vue d'ensemble",
        risk: 'default',
      },
    ],
    poleKey: 'dashboard',
    tone: 'dashboard',
  },
  {
    description: 'Gestion des utilisateurs, des acces et de la securite.',
    icon: 'Users',
    key: 'users',
    label: 'Utilisateurs & permissions',
    permissions: [
      {
        action: 'view',
        description:
          'Consulter la liste, le resume et les informations de base',
        key: PERMISSIONS.USERS.VIEW,
        label: 'Voir les utilisateurs',
        module: 'Lecture',
        risk: 'default',
      },
      {
        action: 'create',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: 'Creer de nouveaux comptes utilisateur standards',
        key: PERMISSIONS.USERS.CREATE,
        label: 'Creer des utilisateurs',
        module: 'Creation',
        risk: 'sensitive',
      },
      {
        action: 'update',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: 'Modifier le prenom et le nom des comptes',
        key: PERMISSIONS.USERS.UPDATE_PROFILE,
        label: 'Modifier le profil',
        module: 'Profil',
        risk: 'sensitive',
      },
      {
        action: 'update',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: "Modifier l'email utilise pour la connexion",
        key: PERMISSIONS.USERS.UPDATE_LOGIN,
        label: 'Modifier le login',
        module: 'Profil',
        risk: 'critical',
      },
      {
        action: 'manage',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: 'Activer ou desactiver les comptes utilisateur',
        key: PERMISSIONS.USERS.MANAGE_STATUS,
        label: 'Gerer le statut',
        module: 'Securite',
        risk: 'critical',
      },
      {
        action: 'view',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: 'Voir le role et les permissions detaillees',
        key: PERMISSIONS.USERS.VIEW_ACCESS,
        label: 'Voir les acces',
        module: 'Acces',
        risk: 'sensitive',
      },
      {
        action: 'manage',
        dependencies: [PERMISSIONS.USERS.VIEW_ACCESS],
        description: 'Modifier les roles fonctionnels des comptes',
        key: PERMISSIONS.USERS.MANAGE_ROLES,
        label: 'Gerer les roles',
        module: 'Acces',
        risk: 'critical',
      },
      {
        action: 'manage',
        dependencies: [PERMISSIONS.USERS.VIEW_ACCESS],
        description: 'Modifier les permissions accordees aux comptes',
        key: PERMISSIONS.USERS.EDIT_PERMISSIONS,
        label: 'Gerer les permissions',
        module: 'Acces',
        risk: 'critical',
      },
      {
        action: 'reset',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: 'Generer un mot de passe temporaire',
        key: PERMISSIONS.USERS.RESET_PASSWORD,
        label: 'Reinitialiser les mots de passe',
        module: 'Securite',
        risk: 'critical',
      },
      {
        action: 'view',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: 'Consulter les sessions actives des comptes',
        key: PERMISSIONS.USERS.VIEW_SESSIONS,
        label: 'Voir les sessions',
        module: 'Sessions',
        risk: 'sensitive',
      },
      {
        action: 'revoke',
        dependencies: [PERMISSIONS.USERS.VIEW_SESSIONS],
        description: 'Revoquer une session ou toutes les sessions actives',
        key: PERMISSIONS.USERS.REVOKE_SESSIONS,
        label: 'Revoquer les sessions',
        module: 'Sessions',
        risk: 'critical',
      },
      {
        action: 'view',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: "Consulter l'activite liee aux comptes utilisateur",
        key: PERMISSIONS.USERS.VIEW_ACTIVITY,
        label: "Voir l'activite",
        module: 'Activite',
        risk: 'sensitive',
      },
      {
        action: 'delete',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: 'Supprimer ou desactiver durablement un compte',
        key: PERMISSIONS.USERS.DELETE,
        label: 'Supprimer des utilisateurs',
        module: 'Cycle de vie',
        risk: 'critical',
      },
      {
        action: 'restore',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: 'Restaurer un compte supprime si la fonction est activee',
        key: PERMISSIONS.USERS.RESTORE,
        label: 'Restaurer des utilisateurs',
        module: 'Cycle de vie',
        risk: 'critical',
      },
      {
        action: 'export',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: 'Exporter la liste et les informations administratives',
        key: PERMISSIONS.USERS.EXPORT,
        label: 'Exporter les utilisateurs',
        module: 'Exports',
        risk: 'critical',
      },
    ],
    poleKey: 'system',
    tone: 'system',
  },
  {
    description: 'Vue globale financiere.',
    icon: 'Wallet',
    key: 'treasury',
    label: 'Tableau de bord financier',
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
        description: 'Modifier les donnees et operations financieres',
        key: PERMISSIONS.TREASURY.EDIT,
        label: 'Modifier la tresorerie',
        module: 'Finance',
        risk: 'critical',
      },
      {
        action: 'export',
        dependencies: [PERMISSIONS.TREASURY.VIEW],
        description: 'Exporter les donnees et documents financiers',
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
    poleKey: 'treasury',
    tone: 'treasury',
  },
];

const ACCESS_PERMISSION_KEYS = PERMISSION_CATEGORIES.flatMap((category) =>
  category.permissions.map((permission) => permission.key),
);

const ACCOUNT_PERMISSION_KEYS = ACCOUNT_PERMISSION_CATEGORIES.flatMap(
  (category) => category.permissions.map((permission) => permission.key),
);

const ALL_PERMISSION_KEYS = [
  ...ACCESS_PERMISSION_KEYS,
  ...ACCOUNT_PERMISSION_KEYS,
];

const ALL_PERMISSION_KEYS_SET = new Set<string>(ALL_PERMISSION_KEYS);
const PERMISSION_ITEM_MAP = new Map<string, PermissionItem>(
  [
    ...PERMISSION_CATEGORIES.flatMap((category) => category.permissions),
    ...ACCOUNT_PERMISSION_CATEGORIES.flatMap(
      (category) => category.permissions,
    ),
  ].map((permission) => [permission.key, permission]),
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
    ...Object.values(PERMISSIONS.ACCOUNT),
    PERMISSIONS.DASHBOARD.VIEW,
    ...Object.values(PERMISSIONS.TREASURY),
    ...Object.values(PERMISSIONS.USERS),
  ],
  USER: [...Object.values(PERMISSIONS.ACCOUNT), PERMISSIONS.DASHBOARD.VIEW],
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
    ALL_PERMISSION_KEYS.map(
      (permissionKey) =>
        [permissionKey, rolePermissions.includes(permissionKey)] as const,
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

export const getAccessPermissionKeys = (): string[] => {
  return [...ACCESS_PERMISSION_KEYS];
};

export const getAccountPermissionKeys = (): string[] => {
  return [...ACCOUNT_PERMISSION_KEYS];
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

export const arePermissionOverridesEqual = (
  first?: PermissionsData | null,
  second?: PermissionsData | null,
): boolean => {
  const firstEntries = new Map(Object.entries(first ?? {}));
  const secondEntries = new Map(Object.entries(second ?? {}));

  if (firstEntries.size !== secondEntries.size) return false;

  for (const [permissionKey, firstValue] of firstEntries) {
    if (!secondEntries.has(permissionKey)) return false;
    if (secondEntries.get(permissionKey) !== firstValue) return false;
  }

  return true;
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
