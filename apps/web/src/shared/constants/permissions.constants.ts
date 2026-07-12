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
  CONTRACTS: {
    UPDATE: 'contracts:update',
    VIEW: 'contracts:view',
  },
  DASHBOARD: {
    MANAGE_WIDGETS: 'dashboard:manage_widgets',
    VIEW: 'dashboard:view',
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
    SEND: 'notifications:send',
    VIEW: 'notifications:view',
  },
  SPORT: {
    PUBLIC_SYNC: 'sport:public_sync',
    UPDATE: 'sport:update',
    VIEW: 'sport:view',
  },
  SYSTEM: {
    ARCHIVES: 'system:archives',
    AUDIT: 'system:audit',
    AUTOMATION: 'system:automation',
    EXPORTS: 'system:exports',
    SETTINGS: 'system:settings',
    VALIDATE: 'system:validate',
    VIEW: 'system:view',
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
    icon: 'Users',
    key: 'internal',
    label: 'Vie interne',
    tone: 'internal',
  },
  {
    icon: 'BriefcaseBusiness',
    key: 'legal',
    label: 'Bureau juridique',
    tone: 'legal',
  },
  {
    icon: 'Wallet',
    key: 'treasury',
    label: 'Trésorerie',
    tone: 'treasury',
  },
  {
    icon: 'Settings',
    key: 'system',
    label: 'Système',
    tone: 'system',
  },
  {
    icon: 'Activity',
    key: 'sport',
    label: 'Sport / Team Control',
    tone: 'sport',
  },
] as const satisfies readonly PermissionPole[];

export type PermissionPoleKey = (typeof PERMISSION_POLES)[number]['key'];

export type PermissionAction =
  | 'approve'
  | 'archive'
  | 'assign'
  | 'create'
  | 'delete'
  | 'export'
  | 'manage'
  | 'reset'
  | 'restore'
  | 'revoke'
  | 'send'
  | 'sync'
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
    description: 'Identité visible et modifiable depuis Mon compte.',
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
        description: 'Modifier son prénom et son nom depuis la page Mon compte',
        key: PERMISSIONS.ACCOUNT.UPDATE_PROFILE,
        label: 'Modifier son profil personnel',
        module: 'Profil',
        risk: 'default',
      },
    ],
    tone: 'internal',
  },
  {
    description: 'Mot de passe et sécurité du compte connecté.',
    icon: 'ShieldCheck',
    key: 'account-security',
    label: 'Sécurité personnelle',
    permissions: [
      {
        action: 'view',
        description: 'Voir les informations de sécurité de son compte',
        key: PERMISSIONS.ACCOUNT.VIEW_SECURITY,
        label: 'Voir sa sécurité',
        module: 'Sécurité',
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
    label: 'Activité personnelle',
    permissions: [
      {
        action: 'view',
        description: 'Consulter les activités liées à son propre compte',
        key: PERMISSIONS.ACCOUNT.VIEW_ACTIVITY,
        label: 'Voir son activité',
        module: 'Activité',
        risk: 'default',
      },
    ],
    tone: 'internal',
  },
];

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    description: 'Vue globale du site privé selon les permissions.',
    icon: 'LayoutDashboard',
    key: 'dashboard',
    label: "Vue d'ensemble",
    permissions: [
      {
        action: 'view',
        description: 'Accéder au tableau de bord et voir les statistiques',
        key: PERMISSIONS.DASHBOARD.VIEW,
        label: 'Voir le tableau de bord',
        module: "Vue d'ensemble",
        risk: 'default',
      },
      {
        action: 'manage',
        dependencies: [PERMISSIONS.DASHBOARD.VIEW],
        description: 'Organiser les widgets et raccourcis du tableau de bord',
        key: PERMISSIONS.DASHBOARD.MANAGE_WIDGETS,
        label: 'Gérer les widgets',
        module: 'Personnalisation',
        risk: 'sensitive',
      },
    ],
    poleKey: 'dashboard',
    tone: 'dashboard',
  },
  {
    description: 'Tâches, rappels et actions personnelles ou assignées.',
    icon: 'ClipboardList',
    key: 'tasks',
    label: 'Tâches et actions',
    permissions: [
      {
        action: 'view',
        dependencies: [PERMISSIONS.DASHBOARD.VIEW],
        description: 'Consulter les tâches visibles depuis le tableau de bord',
        key: PERMISSIONS.TASKS.VIEW,
        label: 'Voir les tâches',
        module: 'Tâches',
        risk: 'default',
      },
      {
        action: 'create',
        dependencies: [PERMISSIONS.TASKS.VIEW],
        description: 'Créer de nouvelles tâches ou actions de suivi',
        key: PERMISSIONS.TASKS.CREATE,
        label: 'Créer des tâches',
        module: 'Tâches',
        risk: 'sensitive',
      },
      {
        action: 'update',
        dependencies: [PERMISSIONS.TASKS.VIEW],
        description: 'Modifier le contenu, le statut ou les échéances',
        key: PERMISSIONS.TASKS.UPDATE,
        label: 'Modifier les tâches',
        module: 'Tâches',
        risk: 'sensitive',
      },
      {
        action: 'assign',
        dependencies: [PERMISSIONS.TASKS.VIEW],
        description: 'Assigner des tâches à un membre ou à une équipe',
        key: PERMISSIONS.TASKS.ASSIGN,
        label: 'Assigner les tâches',
        module: 'Attribution',
        risk: 'sensitive',
      },
      {
        action: 'delete',
        dependencies: [PERMISSIONS.TASKS.VIEW],
        description: 'Supprimer ou fermer durablement une tâche',
        key: PERMISSIONS.TASKS.DELETE,
        label: 'Supprimer les tâches',
        module: 'Cycle de vie',
        risk: 'critical',
      },
    ],
    poleKey: 'dashboard',
    tone: 'dashboard',
  },
  {
    description: 'Notifications, rappels et messages transversaux.',
    icon: 'Bell',
    key: 'notifications',
    label: 'Notifications et rappels',
    permissions: [
      {
        action: 'view',
        dependencies: [PERMISSIONS.DASHBOARD.VIEW],
        description: 'Consulter les notifications et rappels visibles',
        key: PERMISSIONS.NOTIFICATIONS.VIEW,
        label: 'Voir les notifications',
        module: 'Notifications',
        risk: 'default',
      },
      {
        action: 'manage',
        dependencies: [PERMISSIONS.NOTIFICATIONS.VIEW],
        description: 'Configurer les rappels et notifications internes',
        key: PERMISSIONS.NOTIFICATIONS.MANAGE,
        label: 'Gérer les notifications',
        module: 'Configuration',
        risk: 'sensitive',
      },
      {
        action: 'send',
        dependencies: [PERMISSIONS.NOTIFICATIONS.VIEW],
        description: 'Envoyer des messages ou relances à la structure',
        key: PERMISSIONS.NOTIFICATIONS.SEND,
        label: 'Envoyer des notifications',
        module: 'Envoi',
        risk: 'critical',
      },
    ],
    poleKey: 'dashboard',
    tone: 'dashboard',
  },
  {
    description: 'Vie quotidienne de la structure et informations internes.',
    icon: 'Users',
    key: 'internal',
    label: 'Vie interne',
    permissions: [
      {
        action: 'view',
        description: 'Accéder au pôle vie interne et à ses informations',
        key: PERMISSIONS.INTERNAL.VIEW,
        label: 'Voir la vie interne',
        module: 'Navigation',
        risk: 'default',
      },
    ],
    poleKey: 'internal',
    tone: 'internal',
  },
  {
    description: 'Membres, adhérents, onboarding et recrutement interne.',
    icon: 'UserCheck',
    key: 'members',
    label: 'Membres et adhérents',
    permissions: [
      {
        action: 'view',
        dependencies: [PERMISSIONS.INTERNAL.VIEW],
        description: 'Consulter les fiches des membres et des adhérents',
        key: PERMISSIONS.MEMBERS.VIEW,
        label: 'Voir les membres',
        module: 'Membres',
        risk: 'default',
      },
      {
        action: 'update',
        dependencies: [PERMISSIONS.MEMBERS.VIEW],
        description:
          'Modifier les parcours, statuts et informations des membres',
        key: PERMISSIONS.MEMBERS.UPDATE,
        label: 'Modifier les membres',
        module: 'Membres',
        risk: 'sensitive',
      },
    ],
    poleKey: 'internal',
    tone: 'internal',
  },
  {
    description: 'Réunions, calendriers, débriefs et suivi collectif.',
    icon: 'CalendarClock',
    key: 'meetings',
    label: 'Réunions et suivi',
    permissions: [
      {
        action: 'view',
        dependencies: [PERMISSIONS.INTERNAL.VIEW],
        description: 'Consulter les réunions, calendriers et débriefs',
        key: PERMISSIONS.MEETINGS.VIEW,
        label: 'Voir les réunions',
        module: 'Réunions',
        risk: 'default',
      },
      {
        action: 'update',
        dependencies: [PERMISSIONS.MEETINGS.VIEW],
        description: 'Organiser ou modifier les réunions et comptes rendus',
        key: PERMISSIONS.MEETINGS.UPDATE,
        label: 'Modifier les réunions',
        module: 'Réunions',
        risk: 'sensitive',
      },
    ],
    poleKey: 'internal',
    tone: 'internal',
  },
  {
    description: 'Bureau, partenaires, contacts et décisions sensibles.',
    icon: 'BriefcaseBusiness',
    key: 'legal',
    label: 'Bureau juridique',
    permissions: [
      {
        action: 'view',
        description: 'Accéder au pôle bureau et juridique',
        key: PERMISSIONS.LEGAL.VIEW,
        label: 'Voir le bureau juridique',
        module: 'Navigation',
        risk: 'sensitive',
      },
    ],
    poleKey: 'legal',
    tone: 'legal',
  },
  {
    description: 'Documents, chartes, versions et acceptations.',
    icon: 'FileText',
    key: 'documents',
    label: 'Documents et chartes',
    permissions: [
      {
        action: 'view',
        dependencies: [PERMISSIONS.LEGAL.VIEW],
        description: 'Consulter les documents et chartes de la structure',
        key: PERMISSIONS.DOCUMENTS.VIEW,
        label: 'Voir les documents',
        module: 'Documents',
        risk: 'sensitive',
      },
      {
        action: 'create',
        dependencies: [PERMISSIONS.DOCUMENTS.VIEW],
        description: 'Ajouter de nouveaux documents ou chartes',
        key: PERMISSIONS.DOCUMENTS.CREATE,
        label: 'Créer des documents',
        module: 'Documents',
        risk: 'sensitive',
      },
      {
        action: 'update',
        dependencies: [PERMISSIONS.DOCUMENTS.VIEW],
        description: 'Modifier les documents, versions et modèles',
        key: PERMISSIONS.DOCUMENTS.UPDATE,
        label: 'Modifier les documents',
        module: 'Documents',
        risk: 'critical',
      },
      {
        action: 'approve',
        dependencies: [PERMISSIONS.DOCUMENTS.VIEW],
        description: 'Valider ou approuver des documents sensibles',
        key: PERMISSIONS.DOCUMENTS.APPROVE,
        label: 'Approuver les documents',
        module: 'Validations',
        risk: 'critical',
      },
      {
        action: 'archive',
        dependencies: [PERMISSIONS.DOCUMENTS.VIEW],
        description: 'Archiver les documents et anciennes versions',
        key: PERMISSIONS.DOCUMENTS.ARCHIVE,
        label: 'Archiver les documents',
        module: 'Archives',
        risk: 'critical',
      },
    ],
    poleKey: 'legal',
    tone: 'legal',
  },
  {
    description: 'Contrats, sponsors et engagements administratifs.',
    icon: 'FileCheck2',
    key: 'contracts',
    label: 'Contrats',
    permissions: [
      {
        action: 'view',
        dependencies: [PERMISSIONS.LEGAL.VIEW],
        description: 'Consulter les contrats et engagements',
        key: PERMISSIONS.CONTRACTS.VIEW,
        label: 'Voir les contrats',
        module: 'Contrats',
        risk: 'sensitive',
      },
      {
        action: 'update',
        dependencies: [PERMISSIONS.CONTRACTS.VIEW],
        description: 'Modifier les contrats et leur suivi',
        key: PERMISSIONS.CONTRACTS.UPDATE,
        label: 'Modifier les contrats',
        module: 'Contrats',
        risk: 'critical',
      },
    ],
    poleKey: 'legal',
    tone: 'legal',
  },
  {
    description: 'Incidents, sanctions et suivi confidentiel.',
    icon: 'ShieldCheck',
    key: 'incidents',
    label: 'Incidents et sanctions',
    permissions: [
      {
        action: 'view',
        dependencies: [PERMISSIONS.LEGAL.VIEW],
        description: 'Consulter les incidents et sanctions',
        key: PERMISSIONS.INCIDENTS.VIEW,
        label: 'Voir les incidents',
        module: 'Incidents',
        risk: 'critical',
      },
      {
        action: 'update',
        dependencies: [PERMISSIONS.INCIDENTS.VIEW],
        description: 'Modifier le suivi des incidents et sanctions',
        key: PERMISSIONS.INCIDENTS.UPDATE,
        label: 'Modifier les incidents',
        module: 'Incidents',
        risk: 'critical',
      },
    ],
    poleKey: 'legal',
    tone: 'legal',
  },
  {
    description: 'Configuration, journal et opérations système.',
    icon: 'Settings',
    key: 'system',
    label: 'Socle système',
    permissions: [
      {
        action: 'view',
        description: 'Accéder au pôle système et à son tableau de synthèse',
        key: PERMISSIONS.SYSTEM.VIEW,
        label: 'Voir le système',
        module: 'Navigation',
        risk: 'sensitive',
      },
      {
        action: 'view',
        dependencies: [PERMISSIONS.SYSTEM.VIEW],
        description: "Consulter le journal d'activité système",
        key: PERMISSIONS.SYSTEM.AUDIT,
        label: "Voir le journal d'activité",
        module: 'Audit',
        risk: 'sensitive',
      },
      {
        action: 'manage',
        dependencies: [PERMISSIONS.SYSTEM.VIEW],
        description: 'Modifier les paramètres globaux du site privé',
        key: PERMISSIONS.SYSTEM.SETTINGS,
        label: 'Gérer les paramètres',
        module: 'Paramètres',
        risk: 'critical',
      },
      {
        action: 'validate',
        dependencies: [PERMISSIONS.SYSTEM.VIEW],
        description: 'Valider les actions globales sensibles',
        key: PERMISSIONS.SYSTEM.VALIDATE,
        label: 'Valider les actions globales',
        module: 'Validations',
        risk: 'critical',
      },
      {
        action: 'export',
        dependencies: [PERMISSIONS.SYSTEM.VIEW],
        description: 'Exporter les données globales et les sauvegardes',
        key: PERMISSIONS.SYSTEM.EXPORTS,
        label: 'Gérer les exports',
        module: 'Exports',
        risk: 'critical',
      },
      {
        action: 'view',
        dependencies: [PERMISSIONS.SYSTEM.VIEW],
        description: 'Consulter les archives globales du site privé',
        key: PERMISSIONS.SYSTEM.ARCHIVES,
        label: 'Voir les archives',
        module: 'Archives',
        risk: 'sensitive',
      },
      {
        action: 'manage',
        dependencies: [PERMISSIONS.SYSTEM.VIEW],
        description: 'Gérer les automatisations et modèles système',
        key: PERMISSIONS.SYSTEM.AUTOMATION,
        label: 'Gérer les automatisations',
        module: 'Automatisations',
        risk: 'critical',
      },
    ],
    poleKey: 'system',
    tone: 'system',
  },
  {
    description: 'Gestion des utilisateurs, des accès et de la sécurité.',
    icon: 'Users',
    key: 'users',
    label: 'Utilisateurs & permissions',
    permissions: [
      {
        action: 'view',
        description:
          'Consulter la liste, le résumé et les informations de base',
        key: PERMISSIONS.USERS.VIEW,
        label: 'Voir les utilisateurs',
        module: 'Lecture',
        risk: 'default',
      },
      {
        action: 'create',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: 'Créer de nouveaux comptes utilisateurs standards',
        key: PERMISSIONS.USERS.CREATE,
        label: 'Créer des utilisateurs',
        module: 'Création',
        risk: 'sensitive',
      },
      {
        action: 'update',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: 'Modifier le prénom et le nom des comptes',
        key: PERMISSIONS.USERS.UPDATE_PROFILE,
        label: 'Modifier le profil',
        module: 'Profil',
        risk: 'sensitive',
      },
      {
        action: 'update',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: "Modifier l'email utilisé pour la connexion",
        key: PERMISSIONS.USERS.UPDATE_LOGIN,
        label: 'Modifier le login',
        module: 'Profil',
        risk: 'critical',
      },
      {
        action: 'manage',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: 'Activer ou désactiver les comptes utilisateurs',
        key: PERMISSIONS.USERS.MANAGE_STATUS,
        label: 'Gérer le statut',
        module: 'Sécurité',
        risk: 'critical',
      },
      {
        action: 'view',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: 'Voir le rôle et les permissions détaillées',
        key: PERMISSIONS.USERS.VIEW_ACCESS,
        label: 'Voir les accès',
        module: 'Accès',
        risk: 'sensitive',
      },
      {
        action: 'manage',
        dependencies: [PERMISSIONS.USERS.VIEW_ACCESS],
        description: 'Modifier les rôles fonctionnels des comptes',
        key: PERMISSIONS.USERS.MANAGE_ROLES,
        label: 'Gérer les rôles',
        module: 'Accès',
        risk: 'critical',
      },
      {
        action: 'manage',
        dependencies: [PERMISSIONS.USERS.VIEW_ACCESS],
        description: 'Modifier les permissions accordées aux comptes',
        key: PERMISSIONS.USERS.EDIT_PERMISSIONS,
        label: 'Gérer les permissions',
        module: 'Accès',
        risk: 'critical',
      },
      {
        action: 'reset',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: 'Générer un mot de passe temporaire',
        key: PERMISSIONS.USERS.RESET_PASSWORD,
        label: 'Réinitialiser les mots de passe',
        module: 'Sécurité',
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
        description: 'Révoquer une session ou toutes les sessions actives',
        key: PERMISSIONS.USERS.REVOKE_SESSIONS,
        label: 'Révoquer les sessions',
        module: 'Sessions',
        risk: 'critical',
      },
      {
        action: 'view',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: "Consulter l'activité liée aux comptes utilisateurs",
        key: PERMISSIONS.USERS.VIEW_ACTIVITY,
        label: "Voir l'activité",
        module: 'Activité',
        risk: 'sensitive',
      },
      {
        action: 'delete',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: 'Supprimer ou désactiver durablement un compte',
        key: PERMISSIONS.USERS.DELETE,
        label: 'Supprimer des utilisateurs',
        module: 'Cycle de vie',
        risk: 'critical',
      },
      {
        action: 'restore',
        dependencies: [PERMISSIONS.USERS.VIEW],
        description: 'Restaurer un compte supprimé si la fonction est activée',
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
    description: 'Vue globale financière.',
    icon: 'Wallet',
    key: 'treasury',
    label: 'Tableau de bord financier',
    permissions: [
      {
        action: 'view',
        description: 'Consulter les tableaux, opérations et bilans financiers',
        key: PERMISSIONS.TREASURY.VIEW,
        label: 'Voir la trésorerie',
        module: 'Finance',
        risk: 'sensitive',
      },
      {
        action: 'update',
        dependencies: [PERMISSIONS.TREASURY.VIEW],
        description: 'Modifier les données et opérations financières',
        key: PERMISSIONS.TREASURY.EDIT,
        label: 'Modifier la trésorerie',
        module: 'Finance',
        risk: 'critical',
      },
      {
        action: 'export',
        dependencies: [PERMISSIONS.TREASURY.VIEW],
        description: 'Exporter les données et documents financiers',
        key: PERMISSIONS.TREASURY.EXPORT,
        label: 'Exporter la trésorerie',
        module: 'Exports',
        risk: 'sensitive',
      },
      {
        action: 'validate',
        dependencies: [PERMISSIONS.TREASURY.VIEW],
        description: 'Valider les actions financières sensibles',
        key: PERMISSIONS.TREASURY.VALIDATE,
        label: 'Valider la trésorerie',
        module: 'Validations',
        risk: 'critical',
      },
      {
        action: 'view',
        dependencies: [PERMISSIONS.TREASURY.VIEW],
        description: "Consulter l'historique et les traces financières",
        key: PERMISSIONS.TREASURY.AUDIT,
        label: 'Voir le journal financier',
        module: 'Audit',
        risk: 'sensitive',
      },
      {
        action: 'archive',
        dependencies: [PERMISSIONS.TREASURY.VIEW],
        description: 'Consulter les anciennes périodes financières',
        key: PERMISSIONS.TREASURY.ARCHIVES,
        label: 'Voir les archives financières',
        module: 'Archives',
        risk: 'sensitive',
      },
    ],
    poleKey: 'treasury',
    tone: 'treasury',
  },
  {
    description:
      'Lecture et synchronisation future avec le site esport public.',
    icon: 'Activity',
    key: 'sport',
    label: 'Sport / Team Control',
    permissions: [
      {
        action: 'view',
        description: 'Accéder au pôle sport et à ses données synchronisées',
        key: PERMISSIONS.SPORT.VIEW,
        label: 'Voir le sport',
        module: 'Navigation',
        risk: 'default',
      },
      {
        action: 'update',
        dependencies: [PERMISSIONS.SPORT.VIEW],
        description: 'Modifier les données sportives internes',
        key: PERMISSIONS.SPORT.UPDATE,
        label: 'Modifier le sport',
        module: 'Gestion sportive',
        risk: 'sensitive',
      },
      {
        action: 'sync',
        dependencies: [PERMISSIONS.SPORT.VIEW],
        description: 'Synchroniser les données avec le site public esport',
        key: PERMISSIONS.SPORT.PUBLIC_SYNC,
        label: 'Synchroniser le public',
        module: 'Synchronisation',
        risk: 'critical',
      },
    ],
    poleKey: 'sport',
    tone: 'sport',
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
    ...Object.values(PERMISSIONS.DASHBOARD),
    ...Object.values(PERMISSIONS.TASKS),
    ...Object.values(PERMISSIONS.NOTIFICATIONS),
    ...Object.values(PERMISSIONS.INTERNAL),
    ...Object.values(PERMISSIONS.MEMBERS),
    ...Object.values(PERMISSIONS.MEETINGS),
    ...Object.values(PERMISSIONS.LEGAL),
    ...Object.values(PERMISSIONS.DOCUMENTS),
    ...Object.values(PERMISSIONS.CONTRACTS),
    ...Object.values(PERMISSIONS.INCIDENTS),
    ...Object.values(PERMISSIONS.SYSTEM),
    ...Object.values(PERMISSIONS.TREASURY),
    ...Object.values(PERMISSIONS.USERS),
    ...Object.values(PERMISSIONS.SPORT),
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
