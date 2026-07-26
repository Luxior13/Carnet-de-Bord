import type {
  PermissionCategory,
  PermissionItem,
} from './permissions.constants';

export const INTERNAL_NEWS_PERMISSION_KEYS = {
  MANAGE: 'internal_news:manage',
  VIEW: 'internal_news:view',
} as const;

const permission = (
  value: Omit<PermissionItem, 'requiresTargetMfa' | 'status'>,
): PermissionItem => ({
  ...value,
  requiresTargetMfa: value.risk === 'critical',
  status: 'active',
});

export const INTERNAL_NEWS_PERMISSION_ITEMS: PermissionItem[] = [
  permission({
    action: 'view',
    alwaysEnabled: true,
    description:
      'Consulter les annonces internes et les événements métier déjà autorisés',
    grantable: false,
    key: INTERNAL_NEWS_PERMISSION_KEYS.VIEW,
    label: "Consulter l'actualité interne",
    module: 'Actualité interne',
    risk: 'default',
    route: '/vie-interne/actualite-interne',
    surface: 'page',
  }),
  permission({
    action: 'manage',
    dependencies: [INTERNAL_NEWS_PERMISSION_KEYS.VIEW],
    description: 'Publier et épingler les annonces visibles par la structure',
    grantable: false,
    key: INTERNAL_NEWS_PERMISSION_KEYS.MANAGE,
    label: "Publier dans l'actualité interne",
    module: 'Actualité interne',
    risk: 'sensitive',
    route: '/vie-interne/actualite-interne',
    surface: 'page',
  }),
];

export const INTERNAL_NEWS_PERMISSION_CATEGORY: PermissionCategory = {
  accessPermissionKey: INTERNAL_NEWS_PERMISSION_KEYS.VIEW,
  assignment: 'role-bound',
  description:
    'Annonces partagées et événements importants issus des modules autorisés.',
  icon: 'Newspaper',
  key: 'internal-news',
  label: 'Actualité interne',
  permissions: INTERNAL_NEWS_PERMISSION_ITEMS,
  poleKey: 'internal',
  routes: ['/vie-interne/actualite-interne'],
  surface: 'page',
  tone: 'internal',
};
