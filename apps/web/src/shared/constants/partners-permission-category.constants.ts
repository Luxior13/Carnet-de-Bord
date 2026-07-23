import type {
  PermissionCategory,
  PermissionItem,
} from './permissions.constants';

type PartnerPermissionKeys = Readonly<{
  DELETE: string;
  MANAGE: string;
  VIEW: string;
}>;

const permission = (
  value: Omit<PermissionItem, 'requiresTargetMfa' | 'status'>,
): PermissionItem => ({
  ...value,
  requiresTargetMfa: value.risk === 'critical',
  status: 'active',
});

export const createPartnersPermissionCategory = (
  keys: PartnerPermissionKeys,
): PermissionCategory => ({
  accessPermissionKey: keys.VIEW,
  assignment: 'delegable',
  description: 'Organisations, contacts et suivi des sponsors et partenaires.',
  icon: 'Handshake',
  key: 'partners',
  label: 'Sponsors & partenaires',
  permissions: [
    permission({
      action: 'view',
      description:
        'Consulter les organisations, leurs informations et leur suivi',
      grantable: true,
      key: keys.VIEW,
      label: 'Consulter les partenaires',
      module: 'Répertoire des partenaires',
      risk: 'sensitive',
      route: '/bureau-juridique/partenaires',
      surface: 'page',
    }),
    permission({
      action: 'manage',
      dependencies: [keys.VIEW],
      description:
        'Créer et modifier les organisations, contacts, périodes et suivis',
      grantable: true,
      key: keys.MANAGE,
      label: 'Gérer les partenaires',
      module: 'Gestion des partenaires',
      risk: 'sensitive',
      route: '/bureau-juridique/partenaires',
      surface: 'page',
    }),
    permission({
      action: 'delete',
      dependencies: [keys.VIEW],
      description:
        "Supprimer uniquement une fiche créée par erreur et dépourvue d'historique métier",
      grantable: true,
      key: keys.DELETE,
      label: 'Supprimer une fiche partenaire vide',
      module: 'Cycle de vie',
      risk: 'critical',
      route: '/bureau-juridique/partenaires/[id]',
      surface: 'page',
    }),
  ],
  poleKey: 'legal',
  routes: [
    '/bureau-juridique/partenaires',
    '/bureau-juridique/partenaires/nouveau',
    '/bureau-juridique/partenaires/[id]',
  ],
  surface: 'page',
  tone: 'legal',
});
