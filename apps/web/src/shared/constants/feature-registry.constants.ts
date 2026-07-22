import { PERMISSIONS } from '$constants/permissions.constants';

export type FeatureAuditLocation = Readonly<{
  pageKey: string;
  pageLabel: string;
  poleKey: string;
  poleLabel: string;
}>;

export type FeatureDefinition = Readonly<{
  audit: FeatureAuditLocation;
  availability: 'live' | 'planned';
  description: string;
  href: string;
  icon: string;
  id: string;
  label: string;
  permissionMode: 'all' | 'any';
  requiredPermissions: readonly string[];
}>;

const defineFeature = <const TFeature extends FeatureDefinition>(
  feature: TFeature,
): TFeature => feature;

export const FEATURES = {
  dashboard: defineFeature({
    audit: {
      pageKey: 'dashboard',
      pageLabel: "Vue d'ensemble",
      poleKey: 'dashboard',
      poleLabel: 'Tableau de bord',
    },
    availability: 'live',
    description: 'Vue globale du site privé selon les permissions.',
    href: '/',
    icon: 'LayoutDashboard',
    id: 'dashboard',
    label: "Vue d'ensemble",
    permissionMode: 'all',
    requiredPermissions: [PERMISSIONS.DASHBOARD.VIEW],
  }),
  notifications: defineFeature({
    audit: {
      pageKey: 'notifications',
      pageLabel: 'Mes notifications',
      poleKey: 'dashboard',
      poleLabel: 'Tableau de bord',
    },
    availability: 'live',
    description: 'Boîte personnelle de notifications internes.',
    href: '/mes-notifications',
    icon: 'Bell',
    id: 'notifications',
    label: 'Mes notifications',
    permissionMode: 'all',
    requiredPermissions: [PERMISSIONS.NOTIFICATIONS.VIEW],
  }),
  persons: defineFeature({
    audit: {
      pageKey: 'persons',
      pageLabel: 'Répertoire',
      poleKey: 'internal',
      poleLabel: 'Vie interne',
    },
    availability: 'live',
    description: 'Répertoire central des identités, statuts et coordonnées.',
    href: '/vie-interne/repertoire',
    icon: 'Users',
    id: 'persons',
    label: 'Répertoire',
    permissionMode: 'all',
    requiredPermissions: [PERMISSIONS.PERSONS.VIEW],
  }),
  roadmap: defineFeature({
    audit: {
      pageKey: 'roadmap',
      pageLabel: 'Feuille de route',
      poleKey: 'dashboard',
      poleLabel: 'Tableau de bord',
    },
    availability: 'live',
    description: 'Fonctionnalités prévues et état de leur préparation.',
    href: '/feuille-de-route',
    icon: 'ClipboardList',
    id: 'roadmap',
    label: 'Feuille de route',
    permissionMode: 'all',
    requiredPermissions: [],
  }),
  search: defineFeature({
    audit: {
      pageKey: 'search',
      pageLabel: 'Recherche avancée',
      poleKey: 'dashboard',
      poleLabel: 'Tableau de bord',
    },
    availability: 'live',
    description: 'Recherche complète dans les destinations autorisées.',
    href: '/recherche',
    icon: 'Search',
    id: 'search',
    label: 'Recherche avancée',
    permissionMode: 'all',
    requiredPermissions: [],
  }),
  systemActivity: defineFeature({
    audit: {
      pageKey: 'system-activity',
      pageLabel: "Journal d'activité",
      poleKey: 'system',
      poleLabel: 'Système',
    },
    availability: 'live',
    description: 'Historique admin et actions sensibles.',
    href: '/systeme/journal-activite',
    icon: 'History',
    id: 'system-activity',
    label: "Journal d'activité",
    permissionMode: 'all',
    requiredPermissions: [PERMISSIONS.AUDIT.VIEW],
  }),
  systemHome: defineFeature({
    audit: {
      pageKey: 'system',
      pageLabel: "Vue d'ensemble",
      poleKey: 'system',
      poleLabel: 'Système',
    },
    availability: 'live',
    description: 'Accueil du pôle système.',
    href: '/systeme',
    icon: 'Settings',
    id: 'system-home',
    label: "Vue d'ensemble",
    permissionMode: 'any',
    requiredPermissions: [
      PERMISSIONS.USERS.VIEW,
      PERMISSIONS.AUDIT.VIEW,
      PERMISSIONS.SETTINGS.VIEW,
    ],
  }),
  systemSettings: defineFeature({
    audit: {
      pageKey: 'system-settings',
      pageLabel: 'Paramètres système',
      poleKey: 'system',
      poleLabel: 'Système',
    },
    availability: 'live',
    description:
      "Configuration globale de l'interface et de la conservation des données.",
    href: '/systeme/parametres',
    icon: 'Settings',
    id: 'system-settings',
    label: 'Paramètres système',
    permissionMode: 'all',
    requiredPermissions: [PERMISSIONS.SETTINGS.VIEW],
  }),
  users: defineFeature({
    audit: {
      pageKey: 'users',
      pageLabel: 'Utilisateurs',
      poleKey: 'system',
      poleLabel: 'Système',
    },
    availability: 'live',
    description: 'Comptes, rôles et autorisations administratives.',
    href: '/administration/utilisateurs',
    icon: 'Users',
    id: 'users',
    label: 'Utilisateurs',
    permissionMode: 'all',
    requiredPermissions: [PERMISSIONS.USERS.VIEW],
  }),
} as const;

export type FeatureKey = keyof typeof FEATURES;
export type FeatureId = (typeof FEATURES)[FeatureKey]['id'];

export const FEATURE_LIST = Object.values(FEATURES);

export const getFeatureByHref = (href: string): FeatureDefinition | null =>
  FEATURE_LIST.find((feature) => feature.href === href) ?? null;

export const getFeatureById = (id: string): FeatureDefinition | null =>
  FEATURE_LIST.find((feature) => feature.id === id) ?? null;
