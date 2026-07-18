import { UserRole } from '@repo/database';

import type { NavigationIconName } from '$constants/navigation-icon.constants';
import type { NavigationSpaceTone } from '$constants/navigation-theme.constants';

/**
 * Canonical, effective permissions.
 *
 * A key only belongs here when the protected page or API is operational.
 * Planned modules stay in the roadmap and receive permissions when their
 * server-side policy, UI and tests are delivered together.
 */
export const PERMISSIONS = {
  ACCOUNT: {
    CHANGE_PASSWORD: 'account:change_password',
    MANAGE_MFA: 'account:manage_mfa',
    MANAGE_SESSIONS: 'account:manage_sessions',
    UPDATE_CONTACT: 'account:update_contact',
    UPDATE_PROFILE: 'account:update_profile',
    VIEW_ACTIVITY: 'account:view_activity',
    VIEW_PROFILE: 'account:view_profile',
    VIEW_SECURITY: 'account:view_security',
  },
  AUDIT: {
    EXPORT: 'audit:export',
    VIEW: 'audit:view',
    VIEW_SENSITIVE: 'audit:view_sensitive',
  },
  DASHBOARD: {
    VIEW: 'dashboard:view',
  },
  NOTIFICATIONS: {
    SEND: 'notifications:send',
    VIEW: 'notifications:view',
  },
  SETTINGS: {
    UPDATE: 'settings:update',
    VIEW: 'settings:view',
  },
  USERS: {
    ARCHIVE: 'users:archive',
    CREATE: 'users:create',
    DELEGATE_ACCESS: 'users:delegate_access',
    EXPORT_ACTIVITY: 'users:export_activity',
    GRANT_ACCESS: 'users:grant_access',
    RESET_PASSWORD: 'users:reset_password',
    REVOKE_ACCESS: 'users:revoke_access',
    REVOKE_SESSIONS: 'users:revoke_sessions',
    UPDATE_ACCOUNT_POLICY: 'users:update_account_policy',
    UPDATE_CONTACT: 'users:update_contact',
    UPDATE_LOGIN: 'users:update_login',
    UPDATE_PROFILE: 'users:update_profile',
    UPDATE_STATUS: 'users:update_status',
    VIEW: 'users:view',
    VIEW_ACCESS: 'users:view_access',
    VIEW_ACCOUNT_POLICY: 'users:view_account_policy',
    VIEW_ACTIVITY: 'users:view_activity',
    VIEW_CONTACT: 'users:view_contact',
    VIEW_SECURITY: 'users:view_security',
    VIEW_SESSIONS: 'users:view_sessions',
  },
} as const;

/**
 * Roadmap-only capability names. They are deliberately not known by
 * `hasPermission`, not assignable and absent from every role preset.
 */
export const ROADMAP_PERMISSIONS = {
  BACKUPS: {
    VIEW: 'backups:view',
  },
  CONTRACTS: {
    UPDATE: 'contracts:update',
    VIEW: 'contracts:view',
  },
  DASHBOARD: {
    MANAGE_WIDGETS: 'dashboard:manage_widgets',
  },
  DOCUMENTS: {
    APPROVE: 'documents:approve',
    ARCHIVE: 'documents:archive',
    CREATE: 'documents:create',
    UPDATE: 'documents:update',
    VIEW: 'documents:view',
  },
  INCIDENTS: {
    UPDATE: 'incidents:update',
    VIEW: 'incidents:view',
  },
  INTERNAL: {
    VIEW: 'internal:view',
  },
  LEGAL: {
    VIEW: 'legal:view',
  },
  MEETINGS: {
    UPDATE: 'meetings:update',
    VIEW: 'meetings:view',
  },
  MEMBERS: {
    UPDATE: 'members:update',
    VIEW: 'members:view',
  },
  NOTIFICATIONS: {
    MANAGE: 'notifications:manage',
  },
  SPORT: {
    PUBLIC_SYNC: 'sport:public_sync',
    UPDATE: 'sport:update',
    VIEW: 'sport:view',
  },
  SYSTEM: {
    ARCHIVES: 'system:archives',
    AUTOMATION: 'system:automation',
    VALIDATE: 'system:validate',
  },
  TASKS: {
    ASSIGN: 'tasks:assign',
    CREATE: 'tasks:create',
    DELETE: 'tasks:delete',
    UPDATE: 'tasks:update',
    VIEW: 'tasks:view',
  },
  TREASURY: {
    ARCHIVES: 'treasury:archives',
    AUDIT: 'treasury:audit',
    EDIT: 'treasury:edit',
    EXPORT: 'treasury:export',
    VALIDATE: 'treasury:validate',
    VIEW: 'treasury:view',
  },
} as const;

export type PermissionStatus = 'active' | 'deprecated' | 'reserved';
export type PermissionSurface = 'api' | 'page' | 'self';
export type PermissionRisk = 'critical' | 'default' | 'sensitive';

export type PermissionAction =
  | 'approve'
  | 'archive'
  | 'assign'
  | 'create'
  | 'delegate'
  | 'delete'
  | 'export'
  | 'grant'
  | 'manage'
  | 'reset'
  | 'restore'
  | 'revoke'
  | 'send'
  | 'sync'
  | 'update'
  | 'validate'
  | 'view';

export type PermissionItem = {
  action: PermissionAction;
  alwaysEnabled?: boolean;
  dependencies?: string[];
  description: string;
  grantable: boolean;
  key: string;
  label: string;
  module: string;
  requiresTargetMfa: boolean;
  risk: PermissionRisk;
  route: string;
  status: PermissionStatus;
  stepUpOnUse?: boolean;
  surface: PermissionSurface;
};

export type PermissionPole = {
  icon: NavigationIconName;
  key: string;
  label: string;
  tone: NavigationSpaceTone;
};

export const PERMISSION_POLES = [
  {
    icon: 'Settings',
    key: 'system',
    label: 'Système',
    tone: 'system',
  },
] as const satisfies readonly PermissionPole[];

export type PermissionPoleKey = (typeof PERMISSION_POLES)[number]['key'];

export type PermissionCategory = {
  accessPermissionKey: string;
  description: string;
  icon: NavigationIconName;
  key: string;
  label: string;
  permissions: PermissionItem[];
  poleKey: PermissionPoleKey;
  routes: string[];
  surface: PermissionSurface;
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

const activePermission = (
  permission: Omit<PermissionItem, 'requiresTargetMfa' | 'status'> &
    Partial<Pick<PermissionItem, 'requiresTargetMfa'>>,
): PermissionItem => ({
  ...permission,
  requiresTargetMfa:
    permission.requiresTargetMfa ??
    (permission.surface !== 'self' && permission.risk === 'critical'),
  status: 'active',
});

const BASELINE_PERMISSION_ITEMS: PermissionItem[] = [
  activePermission({
    action: 'view',
    alwaysEnabled: true,
    description:
      "Accéder à la page d'accueil privée et à ses données déjà autorisées",
    grantable: false,
    key: PERMISSIONS.DASHBOARD.VIEW,
    label: 'Consulter le tableau de bord',
    module: 'Socle',
    risk: 'default',
    route: '/',
    surface: 'page',
  }),
  activePermission({
    action: 'view',
    alwaysEnabled: true,
    description:
      'Consulter et classer uniquement les notifications de son propre compte',
    grantable: false,
    key: PERMISSIONS.NOTIFICATIONS.VIEW,
    label: 'Consulter ses notifications personnelles',
    module: 'Socle',
    risk: 'default',
    route: '/mes-notifications',
    surface: 'page',
  }),
];

/**
 * Operational APIs without a live administration screen. Their access is
 * role-bound until the corresponding UI becomes live, so they never appear
 * in the per-user grant editor and cannot be overridden through it.
 */
const ROLE_BOUND_API_PERMISSION_ITEMS: PermissionItem[] = [
  activePermission({
    action: 'send',
    description:
      "Envoyer une notification interne via l'API sécurisée (interface à venir)",
    grantable: false,
    key: PERMISSIONS.NOTIFICATIONS.SEND,
    label: 'Envoyer des notifications internes',
    module: 'Notifications',
    risk: 'critical',
    route: 'POST /api/notifications',
    stepUpOnUse: true,
    surface: 'api',
  }),
  activePermission({
    action: 'view',
    description:
      "Consulter les paramètres globaux via l'API (interface à venir)",
    grantable: false,
    key: PERMISSIONS.SETTINGS.VIEW,
    label: 'Consulter les paramètres système',
    module: 'Paramètres',
    risk: 'sensitive',
    route: 'GET /api/systeme/parametres',
    surface: 'api',
  }),
  activePermission({
    action: 'update',
    dependencies: [PERMISSIONS.SETTINGS.VIEW],
    description:
      "Modifier les paramètres globaux via l'API sécurisée (interface à venir)",
    grantable: false,
    key: PERMISSIONS.SETTINGS.UPDATE,
    label: 'Modifier les paramètres système',
    module: 'Paramètres',
    risk: 'critical',
    route: 'PUT /api/systeme/parametres/[key]',
    stepUpOnUse: true,
    surface: 'api',
  }),
];

export const ACCOUNT_PERMISSION_CATEGORIES: AccountPermissionCategory[] = [
  {
    description: 'Identité visible et modifiable depuis Mon compte.',
    icon: 'UserCheck',
    key: 'account-profile',
    label: 'Profil personnel',
    permissions: [
      activePermission({
        action: 'view',
        alwaysEnabled: true,
        description: 'Consulter son profil depuis la page Mon compte',
        grantable: false,
        key: PERMISSIONS.ACCOUNT.VIEW_PROFILE,
        label: 'Consulter son profil personnel',
        module: 'Profil',
        risk: 'default',
        route: '/mon-compte',
        surface: 'self',
      }),
      activePermission({
        action: 'update',
        dependencies: [PERMISSIONS.ACCOUNT.VIEW_PROFILE],
        description: 'Modifier son prénom et son nom depuis Mon compte',
        grantable: true,
        key: PERMISSIONS.ACCOUNT.UPDATE_PROFILE,
        label: 'Modifier son prénom et son nom',
        module: 'Profil',
        risk: 'default',
        route: '/mon-compte',
        surface: 'self',
      }),
      activePermission({
        action: 'update',
        alwaysEnabled: true,
        dependencies: [PERMISSIONS.ACCOUNT.VIEW_PROFILE],
        description:
          'Modifier sa propre adresse de contact après confirmation du mot de passe',
        grantable: false,
        key: PERMISSIONS.ACCOUNT.UPDATE_CONTACT,
        label: 'Modifier son adresse de contact',
        module: 'Contact',
        risk: 'sensitive',
        route: '/mon-compte',
        surface: 'self',
      }),
    ],
    tone: 'internal',
  },
  {
    description: 'Mot de passe et sécurité du compte connecté.',
    icon: 'ShieldCheck',
    key: 'account-security',
    label: 'Sécurité personnelle',
    permissions: [
      activePermission({
        action: 'view',
        alwaysEnabled: true,
        description: 'Consulter les informations de sécurité de son compte',
        grantable: false,
        key: PERMISSIONS.ACCOUNT.VIEW_SECURITY,
        label: 'Consulter la sécurité de son compte',
        module: 'Sécurité',
        risk: 'default',
        route: '/mon-compte',
        surface: 'self',
      }),
      activePermission({
        action: 'update',
        alwaysEnabled: true,
        dependencies: [PERMISSIONS.ACCOUNT.VIEW_SECURITY],
        description: 'Changer son mot de passe depuis Mon compte',
        grantable: false,
        key: PERMISSIONS.ACCOUNT.CHANGE_PASSWORD,
        label: 'Changer son mot de passe',
        module: 'Mot de passe',
        risk: 'sensitive',
        route: '/mon-compte',
        surface: 'self',
      }),
      activePermission({
        action: 'manage',
        alwaysEnabled: true,
        dependencies: [PERMISSIONS.ACCOUNT.VIEW_SECURITY],
        description:
          "Configurer son application d'authentification et ses codes de récupération",
        grantable: false,
        key: PERMISSIONS.ACCOUNT.MANAGE_MFA,
        label: 'Gérer sa double authentification',
        module: 'Double authentification',
        risk: 'sensitive',
        route: '/mon-compte',
        surface: 'self',
      }),
      activePermission({
        action: 'manage',
        alwaysEnabled: true,
        dependencies: [PERMISSIONS.ACCOUNT.VIEW_SECURITY],
        description:
          'Consulter les appareils connectés et révoquer ses autres sessions',
        grantable: false,
        key: PERMISSIONS.ACCOUNT.MANAGE_SESSIONS,
        label: 'Gérer ses sessions actives',
        module: 'Sessions',
        risk: 'sensitive',
        route: '/mon-compte',
        surface: 'self',
      }),
    ],
    tone: 'internal',
  },
  {
    description: 'Historique visible depuis son propre compte.',
    icon: 'History',
    key: 'account-activity',
    label: 'Activité personnelle',
    permissions: [
      activePermission({
        action: 'view',
        alwaysEnabled: true,
        description:
          'Consulter le journal de sécurité et les actions liées à son propre compte',
        grantable: false,
        key: PERMISSIONS.ACCOUNT.VIEW_ACTIVITY,
        label: "Consulter son journal d'activité",
        module: 'Activité',
        risk: 'default',
        route: '/mon-compte',
        surface: 'self',
      }),
    ],
    tone: 'internal',
  },
];

/** Only live administrative capabilities with individual overrides render here. */
export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    accessPermissionKey: PERMISSIONS.USERS.VIEW,
    description:
      'Annuaire, création, fiches, autorisations, sécurité et cycle de vie des comptes.',
    icon: 'Users',
    key: 'users',
    label: 'Utilisateurs',
    permissions: [
      activePermission({
        action: 'view',
        description:
          'Consulter la liste, le résumé et les informations de base des comptes',
        grantable: true,
        key: PERMISSIONS.USERS.VIEW,
        label: 'Consulter les utilisateurs',
        module: 'Annuaire',
        risk: 'default',
        route: '/administration/utilisateurs',
        surface: 'page',
      }),
      activePermission({
        action: 'create',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description:
          'Créer un compte utilisateur standard avec un mot de passe temporaire',
        grantable: true,
        key: PERMISSIONS.USERS.CREATE,
        label: 'Créer des utilisateurs standards',
        module: 'Création de comptes',
        risk: 'sensitive',
        route: '/administration/utilisateurs/nouveau',
        surface: 'page',
      }),
      activePermission({
        action: 'view',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: 'Consulter les adresses de contact des utilisateurs',
        grantable: true,
        key: PERMISSIONS.USERS.VIEW_CONTACT,
        label: 'Consulter les adresses de contact',
        module: 'Profil et contact',
        risk: 'sensitive',
        route: '/administration/utilisateurs/[id]?section=profile',
        surface: 'page',
      }),
      activePermission({
        action: 'update',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: 'Modifier le prénom et le nom des comptes standards',
        grantable: true,
        key: PERMISSIONS.USERS.UPDATE_PROFILE,
        label: 'Modifier le profil',
        module: 'Profil et contact',
        risk: 'sensitive',
        route: '/administration/utilisateurs/[id]?section=profile',
        surface: 'page',
      }),
      activePermission({
        action: 'update',
        dependencies: [PERMISSIONS.USERS.VIEW, PERMISSIONS.USERS.VIEW_CONTACT],
        description:
          "Modifier l'adresse de contact sans la considérer comme vérifiée",
        grantable: true,
        key: PERMISSIONS.USERS.UPDATE_CONTACT,
        label: "Modifier l'adresse de contact",
        module: 'Profil et contact',
        risk: 'sensitive',
        route: '/administration/utilisateurs/[id]?section=profile',
        surface: 'page',
      }),
      activePermission({
        action: 'update',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description:
          "Modifier l'identifiant de connexion d'un compte standard et fermer ses sessions",
        grantable: true,
        key: PERMISSIONS.USERS.UPDATE_LOGIN,
        label: "Modifier l'identifiant de connexion",
        module: 'Connexion',
        risk: 'critical',
        route: '/administration/utilisateurs/[id]?section=profile',
        stepUpOnUse: true,
        surface: 'page',
      }),
      activePermission({
        action: 'view',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description:
          'Consulter le verrouillage, le mot de passe et la double authentification',
        grantable: true,
        key: PERMISSIONS.USERS.VIEW_SECURITY,
        label: 'Consulter la sécurité des comptes',
        module: 'Sécurité',
        risk: 'sensitive',
        route: '/administration/utilisateurs/[id]?section=security',
        surface: 'page',
      }),
      activePermission({
        action: 'update',
        dependencies: [PERMISSIONS.USERS.VIEW, PERMISSIONS.USERS.VIEW_SECURITY],
        description: 'Activer ou désactiver un compte utilisateur standard',
        grantable: true,
        key: PERMISSIONS.USERS.UPDATE_STATUS,
        label: 'Activer ou désactiver un compte',
        module: 'Sécurité',
        risk: 'critical',
        route: '/administration/utilisateurs/[id]?section=security',
        stepUpOnUse: true,
        surface: 'page',
      }),
      activePermission({
        action: 'view',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: 'Consulter les autorisations administratives détaillées',
        grantable: true,
        key: PERMISSIONS.USERS.VIEW_ACCESS,
        label: 'Consulter les autorisations administratives',
        module: 'Autorisations',
        risk: 'sensitive',
        route: '/administration/utilisateurs/[id]?section=access',
        surface: 'page',
      }),
      activePermission({
        action: 'grant',
        dependencies: [PERMISSIONS.USERS.VIEW_ACCESS],
        description:
          "Accorder à un compte standard uniquement des autorisations administratives que l'acteur possède lui-même",
        grantable: true,
        key: PERMISSIONS.USERS.GRANT_ACCESS,
        label: 'Accorder des autorisations administratives',
        module: 'Autorisations',
        risk: 'critical',
        route: '/administration/utilisateurs/[id]?section=access',
        stepUpOnUse: true,
        surface: 'page',
      }),
      activePermission({
        action: 'revoke',
        dependencies: [PERMISSIONS.USERS.VIEW_ACCESS],
        description:
          'Retirer des autorisations administratives à un compte standard, sans modifier son rôle',
        grantable: true,
        key: PERMISSIONS.USERS.REVOKE_ACCESS,
        label: 'Retirer des autorisations administratives',
        module: 'Autorisations',
        risk: 'critical',
        route: '/administration/utilisateurs/[id]?section=access',
        stepUpOnUse: true,
        surface: 'page',
      }),
      activePermission({
        action: 'delegate',
        dependencies: [
          PERMISSIONS.USERS.GRANT_ACCESS,
          PERMISSIONS.USERS.REVOKE_ACCESS,
        ],
        description:
          "Donner ou retirer à un compte standard le droit d'accorder et de retirer des autorisations ; seul le compte racine peut modifier le droit de délégation lui-même",
        grantable: true,
        key: PERMISSIONS.USERS.DELEGATE_ACCESS,
        label: 'Déléguer la gestion des autorisations',
        module: 'Délégation',
        risk: 'critical',
        route: '/administration/utilisateurs/[id]?section=access',
        stepUpOnUse: true,
        surface: 'page',
      }),
      activePermission({
        action: 'view',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description:
          "Consulter les actions qu'un utilisateur peut effectuer sur son propre compte",
        grantable: true,
        key: PERMISSIONS.USERS.VIEW_ACCOUNT_POLICY,
        label: "Consulter l'autonomie du compte",
        module: 'Compte personnel',
        risk: 'sensitive',
        route: '/administration/utilisateurs/[id]?section=account',
        surface: 'page',
      }),
      activePermission({
        action: 'update',
        dependencies: [PERMISSIONS.USERS.VIEW_ACCOUNT_POLICY],
        description:
          "Définir les actions optionnelles qu'un utilisateur peut effectuer sur son propre compte",
        grantable: true,
        key: PERMISSIONS.USERS.UPDATE_ACCOUNT_POLICY,
        label: "Modifier l'autonomie du compte",
        module: 'Compte personnel',
        risk: 'sensitive',
        route: '/administration/utilisateurs/[id]?section=account',
        surface: 'page',
      }),
      activePermission({
        action: 'reset',
        dependencies: [PERMISSIONS.USERS.VIEW_SECURITY],
        description: 'Générer un mot de passe temporaire à usage unique',
        grantable: true,
        key: PERMISSIONS.USERS.RESET_PASSWORD,
        label: 'Réinitialiser le mot de passe',
        module: 'Sécurité',
        risk: 'critical',
        route: '/administration/utilisateurs/[id]?section=security',
        stepUpOnUse: true,
        surface: 'page',
      }),
      activePermission({
        action: 'view',
        dependencies: [PERMISSIONS.USERS.VIEW_SECURITY],
        description: 'Consulter les sessions actives des comptes standards',
        grantable: true,
        key: PERMISSIONS.USERS.VIEW_SESSIONS,
        label: 'Consulter les sessions actives',
        module: 'Sessions',
        risk: 'sensitive',
        route: '/administration/utilisateurs/[id]?section=security',
        surface: 'page',
      }),
      activePermission({
        action: 'revoke',
        dependencies: [PERMISSIONS.USERS.VIEW_SESSIONS],
        description: 'Révoquer une session ou toutes les sessions actives',
        grantable: true,
        key: PERMISSIONS.USERS.REVOKE_SESSIONS,
        label: 'Révoquer les sessions',
        module: 'Sessions',
        risk: 'critical',
        route: '/administration/utilisateurs/[id]?section=security',
        stepUpOnUse: true,
        surface: 'page',
      }),
      activePermission({
        action: 'view',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: "Consulter l'activité liée à un compte utilisateur",
        grantable: true,
        key: PERMISSIONS.USERS.VIEW_ACTIVITY,
        label: "Consulter l'activité d'un utilisateur",
        module: 'Activité',
        risk: 'sensitive',
        route: '/administration/utilisateurs/[id]?section=history',
        surface: 'page',
      }),
      activePermission({
        action: 'export',
        dependencies: [PERMISSIONS.USERS.VIEW_ACTIVITY],
        description: "Exporter en CSV le journal d'activité d'un utilisateur",
        grantable: true,
        key: PERMISSIONS.USERS.EXPORT_ACTIVITY,
        label: "Exporter l'activité d'un utilisateur",
        module: 'Activité',
        risk: 'critical',
        route: '/administration/utilisateurs/[id]?section=history',
        stepUpOnUse: true,
        surface: 'page',
      }),
      activePermission({
        action: 'archive',
        dependencies: [PERMISSIONS.USERS.VIEW_SECURITY],
        description:
          'Archiver un compte standard par suppression logique réversible en base',
        grantable: true,
        key: PERMISSIONS.USERS.ARCHIVE,
        label: 'Archiver un utilisateur',
        module: 'Cycle de vie',
        risk: 'critical',
        route: '/administration/utilisateurs/[id]?section=security',
        stepUpOnUse: true,
        surface: 'page',
      }),
    ],
    poleKey: 'system',
    routes: [
      '/administration/utilisateurs',
      '/administration/utilisateurs/nouveau',
      '/administration/utilisateurs/[id]',
    ],
    surface: 'page',
    tone: 'system',
  },
  {
    accessPermissionKey: PERMISSIONS.AUDIT.VIEW,
    description:
      "Consultation, détails sensibles et export du journal d'activité global.",
    icon: 'History',
    key: 'system-activity',
    label: "Journal d'activité",
    permissions: [
      activePermission({
        action: 'view',
        description: "Consulter le journal d'activité global du système",
        grantable: true,
        key: PERMISSIONS.AUDIT.VIEW,
        label: "Consulter le journal d'activité global",
        module: 'Consultation',
        risk: 'sensitive',
        route: '/systeme/journal-activite',
        surface: 'page',
      }),
      activePermission({
        action: 'view',
        dependencies: [PERMISSIONS.AUDIT.VIEW],
        description:
          'Consulter les adresses IP, identifiants et métadonnées techniques sensibles',
        grantable: true,
        key: PERMISSIONS.AUDIT.VIEW_SENSITIVE,
        label: 'Consulter les détails sensibles du journal',
        module: 'Données sensibles',
        risk: 'critical',
        route: '/systeme/journal-activite',
        surface: 'page',
      }),
      activePermission({
        action: 'export',
        dependencies: [PERMISSIONS.AUDIT.VIEW],
        description: 'Exporter le journal global en CSV ou JSON',
        grantable: true,
        key: PERMISSIONS.AUDIT.EXPORT,
        label: "Exporter le journal d'activité global",
        module: 'Export',
        risk: 'critical',
        route: '/systeme/journal-activite',
        stepUpOnUse: true,
        surface: 'page',
      }),
    ],
    poleKey: 'system',
    routes: ['/systeme/journal-activite'],
    surface: 'page',
    tone: 'system',
  },
];

const ACCESS_PERMISSION_ITEMS = PERMISSION_CATEGORIES.flatMap(
  (category) => category.permissions,
);
const ACCOUNT_PERMISSION_ITEMS = ACCOUNT_PERMISSION_CATEGORIES.flatMap(
  (category) => category.permissions,
);
const ALL_PERMISSION_ITEMS = [
  ...BASELINE_PERMISSION_ITEMS,
  ...ROLE_BOUND_API_PERMISSION_ITEMS,
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
const TARGET_MFA_PERMISSION_KEYS = ALL_PERMISSION_ITEMS.filter(
  (permission) => permission.requiresTargetMfa,
).map((permission) => permission.key);

/** One-release compatibility layer: legacy keys are read, canonical keys are written. */
export const LEGACY_PERMISSION_ALIASES: Readonly<
  Record<string, readonly string[]>
> = {
  'system:audit': [PERMISSIONS.AUDIT.VIEW],
  'system:audit_sensitive': [PERMISSIONS.AUDIT.VIEW_SENSITIVE],
  'system:exports': [PERMISSIONS.AUDIT.EXPORT],
  'system:settings': [PERMISSIONS.SETTINGS.VIEW, PERMISSIONS.SETTINGS.UPDATE],
  'users:delete': [PERMISSIONS.USERS.ARCHIVE],
  'users:edit_permissions': [
    PERMISSIONS.USERS.GRANT_ACCESS,
    PERMISSIONS.USERS.REVOKE_ACCESS,
    PERMISSIONS.USERS.DELEGATE_ACCESS,
  ],
  'users:export': [PERMISSIONS.USERS.EXPORT_ACTIVITY],
  'users:manage_account_policy': [PERMISSIONS.USERS.UPDATE_ACCOUNT_POLICY],
  'users:manage_status': [PERMISSIONS.USERS.UPDATE_STATUS],
  'users:update_access': [
    PERMISSIONS.USERS.GRANT_ACCESS,
    PERMISSIONS.USERS.REVOKE_ACCESS,
    PERMISSIONS.USERS.DELEGATE_ACCESS,
  ],
};

const LEGACY_PERMISSION_DISPLAY_LABEL_MAP = new Map<string, string>([
  [
    'users:edit_permissions',
    'Modifier les autorisations administratives (historique)',
  ],
  [
    'users:update_access',
    'Modifier les autorisations administratives (historique)',
  ],
]);

const LEGACY_PERMISSION_ALIAS_MAP = new Map<string, readonly string[]>(
  Object.entries(LEGACY_PERMISSION_ALIASES),
);

const LEGACY_PERMISSION_KEYS_SET = new Set(
  Object.keys(LEGACY_PERMISSION_ALIASES),
);

export const isKnownPermissionKey = (permissionKey: string): boolean =>
  ALL_PERMISSION_KEYS_SET.has(permissionKey);

export const isPermissionAlwaysEnabled = (permissionKey: string): boolean =>
  ALWAYS_ENABLED_PERMISSION_KEYS.has(permissionKey);

export const isPermissionGrantable = (permissionKey: string): boolean =>
  GRANTABLE_PERMISSION_KEYS.has(permissionKey);

/** Resolves a canonical key or a one-release legacy alias to active keys. */
export const resolvePermissionKey = (
  permissionKey: string,
): readonly string[] =>
  isKnownPermissionKey(permissionKey)
    ? [permissionKey]
    : (LEGACY_PERMISSION_ALIAS_MAP.get(permissionKey) ?? []);

const ROADMAP_PERMISSION_KEYS = Object.values(ROADMAP_PERMISSIONS).flatMap(
  (family) => Object.values(family),
);
const HISTORICAL_ONLY_PERMISSION_KEYS = [
  'system:view',
  'users:manage_roles',
  'users:restore',
] as const;
const HISTORICAL_AUDIT_PERMISSION_KEYS_SET = new Set<string>([
  ...ALL_PERMISSION_KEYS,
  ...ROADMAP_PERMISSION_KEYS,
  ...LEGACY_PERMISSION_KEYS_SET,
  ...HISTORICAL_ONLY_PERMISSION_KEYS,
]);

/**
 * Audit-only allowlist for immutable events produced by older catalogues.
 * It must never be used to make an authorization decision.
 */
export const isHistoricalAuditPermissionKey = (
  permissionKey: string,
): boolean => HISTORICAL_AUDIT_PERMISSION_KEYS_SET.has(permissionKey);

const getCanonicalPermissionEntries = (
  permissions?: PermissionsData | null,
): Array<[string, boolean]> => {
  const entries = Object.entries(permissions ?? {}).filter(
    (entry): entry is [string, boolean] => typeof entry[1] === 'boolean',
  );
  const explicitCanonicalKeys = new Set(
    entries
      .filter(([permissionKey]) => isKnownPermissionKey(permissionKey))
      .map(([permissionKey]) => permissionKey),
  );
  const canonicalPermissions = new Map<string, boolean>();
  const permissionEntryMap = new Map(entries);

  // Alias catalogue order defines deterministic precedence when several old
  // names coexist. `users:update_access`, the most recent former canonical
  // key, therefore wins over the older `users:edit_permissions` alias.
  for (const [
    legacyPermissionKey,
    canonicalKeys,
  ] of LEGACY_PERMISSION_ALIAS_MAP) {
    const enabled = permissionEntryMap.get(legacyPermissionKey);
    if (enabled === undefined) continue;

    for (const canonicalKey of canonicalKeys) {
      if (!explicitCanonicalKeys.has(canonicalKey)) {
        canonicalPermissions.set(canonicalKey, enabled);
      }
    }
  }

  for (const [permissionKey, enabled] of entries) {
    if (isKnownPermissionKey(permissionKey)) {
      canonicalPermissions.set(permissionKey, enabled);
    }
  }

  return [...canonicalPermissions.entries()];
};

export const normalizePermissionOverrides = (
  permissions?: PermissionsData | null,
): PermissionsData | null => {
  const normalizedPermissions = Object.fromEntries(
    getCanonicalPermissionEntries(permissions).filter(([permissionKey]) =>
      isPermissionGrantable(permissionKey),
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
    (permissionKey) =>
      !isKnownPermissionKey(permissionKey) &&
      !LEGACY_PERMISSION_KEYS_SET.has(permissionKey),
  );
};

/** Recognized keys that cannot be persisted as individual overrides. */
export const getNonAssignablePermissionKeys = (
  permissions?: PermissionsData | null,
): string[] => {
  return Object.keys(permissions ?? {}).filter((permissionKey) => {
    const canonicalKeys = resolvePermissionKey(permissionKey);

    return (
      canonicalKeys.length > 0 &&
      canonicalKeys.some((canonicalKey) => !isPermissionGrantable(canonicalKey))
    );
  });
};

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: [
    ...Object.values(PERMISSIONS.ACCOUNT),
    PERMISSIONS.DASHBOARD.VIEW,
    PERMISSIONS.NOTIFICATIONS.VIEW,
    PERMISSIONS.NOTIFICATIONS.SEND,
    PERMISSIONS.SETTINGS.VIEW,
    PERMISSIONS.SETTINGS.UPDATE,
    ...ACCESS_PERMISSION_KEYS.filter(
      (permissionKey) => permissionKey !== PERMISSIONS.AUDIT.VIEW_SENSITIVE,
    ),
  ],
  USER: [
    ...Object.values(PERMISSIONS.ACCOUNT),
    PERMISSIONS.DASHBOARD.VIEW,
    PERMISSIONS.NOTIFICATIONS.VIEW,
  ],
};

const ROLE_PERMISSIONS_MAP = new Map<UserRole, string[]>(
  Object.entries(ROLE_PERMISSIONS) as [UserRole, string[]][],
);

export const hasPermission = (
  role: UserRole,
  permissionKey: string,
  customPermissions?: PermissionsData | null,
): boolean => {
  if (!isKnownPermissionKey(permissionKey)) return false;

  const customPermissionsMap = new Map(
    Object.entries(normalizePermissionOverrides(customPermissions) ?? {}),
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

export const requiresMfaForAccess = (
  role: UserRole,
  customPermissions?: PermissionsData | null,
): boolean =>
  TARGET_MFA_PERMISSION_KEYS.some((permissionKey) =>
    hasPermission(role, permissionKey, customPermissions),
  );

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

export const getPermissionDisplayLabel = (permissionKey: string): string => {
  const legacyLabel = LEGACY_PERMISSION_DISPLAY_LABEL_MAP.get(permissionKey);
  if (legacyLabel) return legacyLabel;

  const canonicalPermissionKey = resolvePermissionKey(permissionKey)[0];

  return (
    (canonicalPermissionKey
      ? getPermissionItem(canonicalPermissionKey)?.label
      : undefined) ?? permissionKey
  );
};

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
 * an orphan grant on a denied dependency is discarded.
 */
export const enforcePermissionDependencies = (
  role: UserRole,
  permissions?: PermissionsData | null,
  permissionScopeKeys?: readonly string[],
): PermissionsData | null => {
  const normalizedPermissions = normalizePermissionOverrides(permissions);
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

export const countCategoryPermissions = (
  categoryKey: string,
  effectivePermissions: Record<string, boolean>,
): { enabled: number; total: number } => {
  const category = PERMISSION_CATEGORIES.find(
    (item) => item.key === categoryKey,
  );
  if (!category) return { enabled: 0, total: 0 };

  const total = category.permissions.length;
  const enabled = category.permissions.filter(
    (permission) => effectivePermissions[permission.key],
  ).length;

  return { enabled, total };
};

export const DEFAULT_ROLE_LABEL = 'Utilisateur';
export const PROTECTED_ROLE_LABEL = 'Superadmin';

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrateur',
  USER: 'Utilisateur',
};

export const getRoleLabel = (role: UserRole | string): string =>
  ROLE_LABELS[role as UserRole] || DEFAULT_ROLE_LABEL;

export const getAccessLabel = (user: {
  isProtected?: boolean;
  role: UserRole | string;
}): string =>
  user.isProtected ? PROTECTED_ROLE_LABEL : getRoleLabel(user.role);

type RoleBadgeVariant = 'outline' | 'secondary';

export const DEFAULT_ROLE_COLOR: RoleBadgeVariant = 'secondary';

export const ROLE_COLORS: Record<UserRole, RoleBadgeVariant> = {
  ADMIN: 'outline',
  USER: 'secondary',
};

export const getRoleColor = (role: UserRole | string): RoleBadgeVariant =>
  ROLE_COLORS[role as UserRole] || DEFAULT_ROLE_COLOR;
