import type { NavigationIconName } from '$constants/navigation-icon.constants';
import type { NavigationSpaceTone } from '$constants/navigation-theme.constants';
import { createPersonsPermissionCategory } from '$constants/persons-permission-category.constants';
import { PAGE_PATHS } from '$constants/routes.constants';

// Permission catalogue: keys, poles, items and editor categories. The rules
// that evaluate them live in permissions.constants.ts, which re-exports this
// module so importers keep a single entry point.

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
    VIEW_PROFILE: 'account:view_profile',
    VIEW_SECURITY: 'account:view_security',
  },
  AUDIT: {
    VIEW_FIELD_HISTORY: 'audit:view_field_history',
  },
  DASHBOARD: {
    VIEW: 'dashboard:view',
  },
  PERSONS: {
    CREATE: 'persons:create',
    DELETE: 'persons:delete',
    UPDATE: 'persons:update',
    UPDATE_CONTACT: 'persons:update_contact',
    VIEW: 'persons:view',
    VIEW_CONTACT: 'persons:view_contact',
  },
  SETTINGS: {
    UPDATE: 'settings:update',
    VIEW: 'settings:view',
  },
  USERS: {
    CREATE: 'users:create',
    DELEGATE_ACCESS: 'users:delegate_access',
    DELETE_ACCOUNT: 'users:delete_account',
    GRANT_ACCESS: 'users:grant_access',
    RESET_MFA: 'users:reset_mfa',
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
  AUDIT: {
    VIEW: 'audit:view',
  },
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
  INTERNAL_NEWS: {
    MANAGE: 'internal_news:manage',
    VIEW: 'internal_news:view',
  },
  LEGAL: {
    VIEW: 'legal:view',
  },
  MEETINGS: {
    UPDATE: 'meetings:update',
    VIEW: 'meetings:view',
  },
  NOTIFICATIONS: {
    MANAGE: 'notifications:manage',
  },
  PARTNERS: {
    DELETE: 'partners:delete',
    MANAGE: 'partners:manage',
    VIEW: 'partners:view',
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

type PermissionStatus = 'active' | 'deprecated' | 'reserved';
type PermissionSurface = 'api' | 'page' | 'self';
type PermissionRisk = 'critical' | 'default' | 'sensitive';

type PermissionAction =
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
    icon: 'Users',
    key: 'internal',
    label: 'Membres',
    tone: 'internal',
  },
  {
    icon: 'Activity',
    key: 'activity',
    label: 'Activité',
    tone: 'activity',
  },
  {
    icon: 'Handshake',
    key: 'legal',
    label: 'Relations',
    tone: 'legal',
  },
  {
    icon: 'Settings',
    key: 'system',
    label: 'Système',
    tone: 'system',
  },
] as const satisfies readonly PermissionPole[];

type PermissionPoleKey = (typeof PERMISSION_POLES)[number]['key'];

export type PermissionCategory = {
  accessPermissionKey: string;
  assignment: 'delegable' | 'role-bound';
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

export const BASELINE_PERMISSION_ITEMS: PermissionItem[] = [
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
];

const SETTINGS_PERMISSION_ITEMS: PermissionItem[] = [
  activePermission({
    action: 'view',
    description: "Consulter la configuration globale de l'application",
    grantable: false,
    key: PERMISSIONS.SETTINGS.VIEW,
    label: 'Consulter les paramètres système',
    module: 'Paramètres',
    risk: 'sensitive',
    route: '/systeme/parametres',
    surface: 'page',
  }),
  activePermission({
    action: 'update',
    dependencies: [PERMISSIONS.SETTINGS.VIEW],
    description:
      'Modifier les durées de conservation ; une réduction demande le mot de passe',
    grantable: false,
    key: PERMISSIONS.SETTINGS.UPDATE,
    label: 'Modifier les paramètres système',
    module: 'Paramètres',
    risk: 'critical',
    route: '/systeme/parametres',
    surface: 'page',
  }),
];

/**
 * Operational capabilities intentionally bound to a role. They can be shown
 * for transparency, but can never be overridden through an individual grant.
 */
export const ROLE_BOUND_PERMISSION_ITEMS: PermissionItem[] = [
  ...SETTINGS_PERMISSION_ITEMS,
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
];

/** All live administrative pages shown in the per-user access overview. */
export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  createPersonsPermissionCategory(
    PERMISSIONS.PERSONS,
    PERMISSIONS.AUDIT.VIEW_FIELD_HISTORY,
  ),
  {
    accessPermissionKey: PERMISSIONS.USERS.VIEW,
    assignment: 'delegable',
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
        route: PAGE_PATHS.users,
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
        route: PAGE_PATHS.newUser,
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
        route: `${PAGE_PATHS.users}/[id]?section=profile`,
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
        route: `${PAGE_PATHS.users}/[id]?section=profile`,
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
        route: `${PAGE_PATHS.users}/[id]?section=profile`,
        surface: 'page',
      }),
      activePermission({
        action: 'update',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: "Modifier l'identifiant de connexion d'un compte standard",
        grantable: true,
        key: PERMISSIONS.USERS.UPDATE_LOGIN,
        label: "Modifier l'identifiant de connexion",
        module: 'Connexion',
        risk: 'critical',
        route: `${PAGE_PATHS.users}/[id]?section=profile`,
        stepUpOnUse: true,
        surface: 'page',
      }),
      activePermission({
        action: 'view',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description:
          'Consulter l’état du mot de passe et de la double authentification',
        grantable: true,
        key: PERMISSIONS.USERS.VIEW_SECURITY,
        label: 'Consulter la sécurité des comptes',
        module: 'Sécurité',
        risk: 'sensitive',
        route: `${PAGE_PATHS.users}/[id]?section=security`,
        surface: 'page',
      }),
      activePermission({
        action: 'update',
        dependencies: [PERMISSIONS.USERS.VIEW, PERMISSIONS.USERS.VIEW_SECURITY],
        description: 'Désactiver ou réactiver un compte utilisateur standard',
        grantable: true,
        key: PERMISSIONS.USERS.UPDATE_STATUS,
        label: 'Désactiver ou réactiver un compte',
        module: 'Sécurité',
        risk: 'critical',
        route: `${PAGE_PATHS.users}/[id]?section=security`,
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
        route: `${PAGE_PATHS.users}/[id]?section=access`,
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
        route: `${PAGE_PATHS.users}/[id]?section=access`,
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
        route: `${PAGE_PATHS.users}/[id]?section=access`,
        surface: 'page',
      }),
      activePermission({
        action: 'delegate',
        dependencies: [
          PERMISSIONS.USERS.GRANT_ACCESS,
          PERMISSIONS.USERS.REVOKE_ACCESS,
        ],
        description:
          "Donner ou retirer à un compte standard le droit d'accorder et de retirer des autorisations ; seul le superadmin peut modifier le droit de délégation lui-même",
        grantable: true,
        key: PERMISSIONS.USERS.DELEGATE_ACCESS,
        label: 'Déléguer la gestion des autorisations',
        module: 'Délégation',
        risk: 'critical',
        route: `${PAGE_PATHS.users}/[id]?section=access`,
        surface: 'page',
      }),
      activePermission({
        action: 'view',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description:
          "Consulter les actions qu'un utilisateur peut effectuer sur son propre compte",
        grantable: true,
        key: PERMISSIONS.USERS.VIEW_ACCOUNT_POLICY,
        label: 'Consulter les droits du compte personnel',
        module: 'Compte personnel',
        risk: 'sensitive',
        route: `${PAGE_PATHS.users}/[id]?section=account`,
        surface: 'page',
      }),
      activePermission({
        action: 'update',
        dependencies: [PERMISSIONS.USERS.VIEW_ACCOUNT_POLICY],
        description:
          'Autoriser ou interdire la modification personnelle du prénom et du nom',
        grantable: true,
        key: PERMISSIONS.USERS.UPDATE_ACCOUNT_POLICY,
        label: "Modifier l'autonomie du compte",
        module: 'Compte personnel',
        risk: 'sensitive',
        route: `${PAGE_PATHS.users}/[id]?section=account`,
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
        route: `${PAGE_PATHS.users}/[id]?section=security`,
        stepUpOnUse: true,
        surface: 'page',
      }),
      activePermission({
        action: 'reset',
        dependencies: [PERMISSIONS.USERS.VIEW_SECURITY],
        description:
          "Retirer la double authentification d'un compte qui a perdu son application et ses codes de secours ; il la reconfigure à sa prochaine connexion",
        grantable: true,
        key: PERMISSIONS.USERS.RESET_MFA,
        label: 'Réinitialiser la double authentification',
        module: 'Sécurité',
        risk: 'critical',
        route: `${PAGE_PATHS.users}/[id]?section=security`,
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
        route: `${PAGE_PATHS.users}/[id]?section=security`,
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
        route: `${PAGE_PATHS.users}/[id]?section=security`,
        stepUpOnUse: true,
        surface: 'page',
      }),
      activePermission({
        action: 'delete',
        dependencies: [PERMISSIONS.USERS.VIEW_SECURITY],
        description:
          'Supprimer irréversiblement un compte déjà désactivé, après confirmation récente du mot de passe, et anonymiser son identité',
        grantable: true,
        key: PERMISSIONS.USERS.DELETE_ACCOUNT,
        label: 'Supprimer définitivement un utilisateur',
        module: 'Cycle de vie',
        risk: 'critical',
        route: `${PAGE_PATHS.users}/[id]?section=security`,
        surface: 'page',
      }),
    ],
    poleKey: 'system',
    routes: [PAGE_PATHS.users, PAGE_PATHS.newUser, `${PAGE_PATHS.users}/[id]`],
    surface: 'page',
    tone: 'system',
  },
  {
    accessPermissionKey: PERMISSIONS.SETTINGS.VIEW,
    assignment: 'role-bound',
    description: 'Configuration globale de la conservation des données.',
    icon: 'Settings',
    key: 'system-settings',
    label: 'Paramètres système',
    permissions: SETTINGS_PERMISSION_ITEMS,
    poleKey: 'system',
    routes: ['/systeme/parametres'],
    surface: 'page',
    tone: 'system',
  },
];
