import type {
  PermissionCategory,
  PermissionItem,
} from './permissions.constants';

type PersonPermissionKeys = Readonly<{
  CREATE: string;
  DELETE: string;
  UPDATE: string;
  VIEW: string;
}>;

const permission = (
  value: Omit<PermissionItem, 'requiresTargetMfa' | 'status'>,
): PermissionItem => ({
  ...value,
  requiresTargetMfa: value.risk === 'critical',
  status: 'active',
});

/** Keeps the growing central catalogue composable one live feature at a time. */
export const createPersonsPermissionCategory = (
  keys: PersonPermissionKeys,
): PermissionCategory => ({
  accessPermissionKey: keys.VIEW,
  assignment: 'delegable',
  description:
    'Identités, statuts et coordonnées centralisés dans le répertoire.',
  icon: 'Users',
  key: 'persons',
  label: 'Répertoire',
  permissions: [
    permission({
      action: 'view',
      description:
        'Consulter les fiches, leur identité, leur statut et leurs coordonnées',
      grantable: true,
      key: keys.VIEW,
      label: 'Consulter le répertoire',
      module: 'Répertoire',
      risk: 'sensitive',
      route: '/vie-interne/repertoire',
      surface: 'page',
    }),
    permission({
      action: 'create',
      dependencies: [keys.VIEW],
      description:
        'Créer une fiche avec son identité, son statut et ses coordonnées',
      grantable: true,
      key: keys.CREATE,
      label: 'Ajouter des fiches au répertoire',
      module: 'Gestion des fiches',
      risk: 'sensitive',
      route: '/vie-interne/repertoire/nouveau',
      surface: 'page',
    }),
    permission({
      action: 'update',
      dependencies: [keys.VIEW],
      description:
        "Modifier l'identité, le statut, les coordonnées et les réseaux sociaux",
      grantable: true,
      key: keys.UPDATE,
      label: 'Modifier les fiches du répertoire',
      module: 'Gestion des fiches',
      risk: 'sensitive',
      route: '/vie-interne/repertoire/[id]',
      surface: 'page',
    }),
    permission({
      action: 'delete',
      dependencies: [keys.VIEW],
      description:
        'Supprimer définitivement une fiche et ses données personnelles',
      grantable: true,
      key: keys.DELETE,
      label: 'Supprimer définitivement des fiches',
      module: 'Cycle de vie',
      risk: 'critical',
      route: '/vie-interne/repertoire/[id]',
      surface: 'page',
    }),
  ],
  poleKey: 'internal',
  routes: [
    '/vie-interne/repertoire',
    '/vie-interne/repertoire/nouveau',
    '/vie-interne/repertoire/[id]',
  ],
  surface: 'page',
  tone: 'internal',
});
