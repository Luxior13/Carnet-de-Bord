import { FEATURES } from '$constants/feature-registry.constants';
import {
  DEFAULT_ROLE_LABEL,
  getAccessLabel as getPermissionAccessLabel,
  getRoleLabel as getPermissionRoleLabel,
  hasPermission,
  isKnownPermissionKey,
  PERMISSIONS,
  type PermissionsData,
  PROTECTED_ROLE_LABEL,
  ROADMAP_PERMISSIONS,
  ROLE_LABELS,
} from '$constants/permissions.constants';
import type { UserType } from '$types/auth.types';
import type {
  NavigationAvailability,
  NavigationAvailabilityFilter,
  NavigationSpace,
  NavItem,
  NavSection,
} from '$types/navigation.types';
import { getSafeInternalPathname } from '$utils/internal-href.utils';
export const SITE_CONFIG = {
  description: "Gestion privée d'équipe esport",
  logo: '/assets/noc.png',
  name: 'Team Control',
  subtitle: 'Gestion privée',
  tag: 'TC',
};

export { DEFAULT_ROLE_LABEL, PROTECTED_ROLE_LABEL, ROLE_LABELS };
export type {
  NavigationAvailability,
  NavigationAvailabilityFilter,
  NavigationSpace,
  NavItem,
  NavSection,
} from '$types/navigation.types';

const dashboardAccess = [PERMISSIONS.DASHBOARD.VIEW] as const;
const documentsAccess = [ROADMAP_PERMISSIONS.DOCUMENTS.VIEW] as const;
const documentsApprovalAccess = [
  ROADMAP_PERMISSIONS.DOCUMENTS.APPROVE,
] as const;
const contractsAccess = [ROADMAP_PERMISSIONS.CONTRACTS.VIEW] as const;
const incidentsAccess = [ROADMAP_PERMISSIONS.INCIDENTS.VIEW] as const;
const internalAccess = [ROADMAP_PERMISSIONS.INTERNAL.VIEW] as const;
const legalAccess = [ROADMAP_PERMISSIONS.LEGAL.VIEW] as const;
const meetingsAccess = [ROADMAP_PERMISSIONS.MEETINGS.VIEW] as const;
const meetingsUpdateAccess = [ROADMAP_PERMISSIONS.MEETINGS.UPDATE] as const;
const membersAccess = [ROADMAP_PERMISSIONS.MEMBERS.VIEW] as const;
const membersUpdateAccess = [ROADMAP_PERMISSIONS.MEMBERS.UPDATE] as const;
const notificationsAccess = [PERMISSIONS.NOTIFICATIONS.VIEW] as const;
const notificationsManageAccess = [
  ROADMAP_PERMISSIONS.NOTIFICATIONS.MANAGE,
] as const;
const sportAccess = [ROADMAP_PERMISSIONS.SPORT.VIEW] as const;
const sportUpdateAccess = [ROADMAP_PERMISSIONS.SPORT.UPDATE] as const;
const tasksAccess = [ROADMAP_PERMISSIONS.TASKS.VIEW] as const;
const treasuryAccess = [ROADMAP_PERMISSIONS.TREASURY.VIEW] as const;
const treasuryArchiveAccess = [ROADMAP_PERMISSIONS.TREASURY.ARCHIVES] as const;
const treasuryAuditAccess = [ROADMAP_PERMISSIONS.TREASURY.AUDIT] as const;
const treasuryExportAccess = [ROADMAP_PERMISSIONS.TREASURY.EXPORT] as const;
const treasuryValidationAccess = [
  ROADMAP_PERMISSIONS.TREASURY.VALIDATE,
] as const;
const systemArchiveAccess = [ROADMAP_PERMISSIONS.SYSTEM.ARCHIVES] as const;
const systemAuditAccess = [PERMISSIONS.AUDIT.VIEW] as const;
const systemAutomationAccess = [ROADMAP_PERMISSIONS.SYSTEM.AUTOMATION] as const;
const systemExportAccess = [ROADMAP_PERMISSIONS.BACKUPS.VIEW] as const;
const systemSettingsAccess = [PERMISSIONS.SETTINGS.VIEW] as const;
const systemValidationAccess = [ROADMAP_PERMISSIONS.SYSTEM.VALIDATE] as const;
const usersAccess = [PERMISSIONS.USERS.VIEW] as const;
const systemHubAccess = [
  PERMISSIONS.USERS.VIEW,
  PERMISSIONS.AUDIT.VIEW,
  PERMISSIONS.SETTINGS.VIEW,
] as const;
type NavigationUser = Pick<
  UserType,
  'isProtected' | 'permissions' | 'role'
> | null;

export const NAV_SPACES: NavigationSpace[] = [
  {
    description: 'Vue globale, alertes et raccourcis selon les droits.',
    href: '/',
    icon: 'LayoutDashboard',
    id: 'dashboard',
    label: 'Tableau de bord',
    matchHrefs: ['/tableau-de-bord', '/mes-notifications', '/recherche'],
    routeBaseHref: '/tableau-de-bord',
    sections: [
      {
        id: 'dashboard-overview',
        items: [
          {
            availability: 'live',
            description: 'Vue globale du site privé selon les permissions.',
            featureId: FEATURES.dashboard.id,
            href: '/',
            icon: 'LayoutDashboard',
            label: "Vue d'ensemble",
            requiredPermissions: dashboardAccess,
          },
          {
            availability: 'live',
            description: 'Fonctionnalités prévues et état de leur préparation.',
            featureId: FEATURES.roadmap.id,
            href: '/feuille-de-route',
            icon: 'ClipboardList',
            label: 'Feuille de route',
          },
          {
            description: 'Actions personnelles à suivre.',
            href: '/tableau-de-bord/mes-taches',
            icon: 'ClipboardList',
            label: 'Mes tâches',
            requiredPermissions: tasksAccess,
          },
          {
            availability: 'live',
            description: 'Historique personnel des notifications internes.',
            featureId: FEATURES.notifications.id,
            href: '/mes-notifications',
            icon: 'Bell',
            label: 'Mes notifications',
            requiredPermissions: notificationsAccess,
          },
          {
            description: 'Réunions proches et éléments à préparer.',
            href: '/tableau-de-bord/prochaines-reunions',
            icon: 'CalendarClock',
            label: 'Prochaines réunions',
            requiredPermissions: meetingsAccess,
          },
          {
            description: 'Chartes et documents à lire ou accepter.',
            href: '/tableau-de-bord/documents-a-accepter',
            icon: 'FileCheck2',
            label: 'Documents à accepter',
            requiredPermissions: documentsAccess,
          },
          {
            description: 'Points importants à traiter rapidement.',
            href: '/tableau-de-bord/alertes-importantes',
            icon: 'ShieldCheck',
            label: 'Alertes importantes',
            requiredPermissions: notificationsAccess,
          },
          {
            availability: 'live',
            description:
              'Recherche complète dans les destinations disponibles et autorisées.',
            featureId: FEATURES.search.id,
            href: '/recherche',
            icon: 'Search',
            label: 'Recherche avancée',
            // Search only indexes destinations already authorized for the user.
          },
        ],
        label: 'Pilotage',
        position: 'top',
      },
    ],
    summary: 'Vue globale et alertes',
    tone: 'dashboard',
  },
  {
    description: 'Vie quotidienne de la structure et suivi humain.',
    href: '/vie-interne',
    icon: 'Users',
    id: 'internal',
    label: 'Vie interne',
    sections: [
      {
        id: 'internal-main',
        items: [
          {
            description: 'Accueil du pôle vie interne.',
            href: '/vie-interne',
            icon: 'Home',
            label: "Vue d'ensemble",
            requiredPermissions: internalAccess,
          },
          {
            description: 'Informations importantes réservées à la structure.',
            href: '/vie-interne/actualite-interne',
            icon: 'Newspaper',
            label: 'Actualité interne',
            requiredPermissions: internalAccess,
          },
          {
            children: [
              {
                description:
                  'Fiches internes, contacts, notes et liens utiles.',
                href: '/vie-interne/membres',
                icon: 'Users',
                label: 'Membres',
                requiredPermissions: membersAccess,
              },
              {
                description: 'Adhésions, statuts et cotisations liées.',
                href: '/vie-interne/adherents',
                icon: 'UserCheck',
                label: 'Adhérents',
                requiredPermissions: membersAccess,
              },
              {
                description: 'Arrivées, départs et checklists internes.',
                href: '/vie-interne/onboarding-depart',
                icon: 'UserPlus',
                label: 'Onboarding et départ',
                requiredPermissions: membersUpdateAccess,
              },
            ],
            description: 'Personnes, adhérents et parcours interne.',
            href: '/vie-interne/membres-adherents',
            icon: 'Users',
            label: 'Membres & adhérents',
            requiredPermissions: membersAccess,
          },
          {
            children: [
              {
                description: 'Organisation et compte rendu des réunions.',
                href: '/vie-interne/reunions',
                icon: 'ClipboardList',
                label: 'Gestion des réunions',
                requiredPermissions: meetingsUpdateAccess,
              },
              {
                description: 'Échéances et événements internes.',
                href: '/vie-interne/calendrier-interne',
                icon: 'CalendarClock',
                label: 'Calendrier interne',
                requiredPermissions: meetingsAccess,
              },
              {
                description: 'Retours après réunions, matchs, scrims ou tests.',
                href: '/vie-interne/debriefs',
                icon: 'FileText',
                label: 'Débriefs',
                requiredPermissions: meetingsAccess,
              },
            ],
            description: 'Temps forts, réunions et retours internes.',
            href: '/vie-interne/reunions-suivi',
            icon: 'CalendarClock',
            label: 'Réunions & suivi',
            requiredPermissions: meetingsAccess,
          },
          {
            description: 'Candidatures, tests et décisions de recrutement.',
            href: '/vie-interne/recrutement-tryouts',
            icon: 'UserPlus',
            label: 'Recrutement & tryouts',
            requiredPermissions: membersUpdateAccess,
          },
          {
            description: 'Rappels transversaux et notifications internes.',
            href: '/vie-interne/notifications-rappels',
            icon: 'Bell',
            label: 'Notifications et rappels',
            requiredPermissions: notificationsManageAccess,
          },
        ],
        label: 'Quotidien',
        position: 'top',
      },
    ],
    summary: 'Membres, réunions, rappels',
    tone: 'internal',
  },
  {
    description: 'Documents, contrats et sujets confidentiels non financiers.',
    href: '/bureau-juridique',
    icon: 'BriefcaseBusiness',
    id: 'legal',
    label: 'Bureau & juridique',
    sections: [
      {
        id: 'legal-main',
        items: [
          {
            description: 'Accueil du pôle bureau et juridique.',
            href: '/bureau-juridique',
            icon: 'Home',
            label: "Vue d'ensemble",
            requiredPermissions: legalAccess,
          },
          {
            description: 'Sponsors, contacts, livrables et partenaires.',
            href: '/bureau-juridique/sponsors',
            icon: 'Handshake',
            label: 'Sponsors & partenaires',
            requiredPermissions: legalAccess,
          },
          {
            description:
              'Répertoire central des personnes internes, externes, anciens contacts et profils sensibles.',
            href: '/bureau-juridique/personnes-contacts',
            icon: 'Users',
            label: 'Personnes & contacts',
            requiredPermissions: legalAccess,
          },
          {
            children: [
              {
                description: 'Chartes, règlements et documents officiels.',
                href: '/bureau-juridique/documents-officiels',
                icon: 'FileText',
                label: 'Documents officiels',
                requiredPermissions: documentsAccess,
              },
              {
                description: 'Contrats sponsors, membres ou administratifs.',
                href: '/bureau-juridique/contrats',
                icon: 'FileCheck2',
                label: 'Contrats',
                requiredPermissions: contractsAccess,
              },
              {
                description: 'Suivi des lectures et acceptations.',
                href: '/bureau-juridique/acceptation-chartes',
                icon: 'CheckCircle2',
                label: 'Acceptation des chartes',
                requiredPermissions: documentsApprovalAccess,
              },
            ],
            description: 'Coffre documentaire, chartes et contrats.',
            href: '/bureau-juridique/documents',
            icon: 'FileText',
            label: 'Documents & chartes',
            requiredPermissions: documentsAccess,
          },
          {
            description: 'Incidents, avertissements et décisions sensibles.',
            href: '/bureau-juridique/incidents-sanctions',
            icon: 'ShieldCheck',
            label: 'Incidents et sanctions',
            requiredPermissions: incidentsAccess,
          },
          {
            description: 'Matériel, licences, maillots et accès confiés.',
            href: '/bureau-juridique/inventaire-acces',
            icon: 'Archive',
            label: 'Inventaire et accès',
            requiredPermissions: legalAccess,
          },
          {
            description: 'Décisions structurelles importantes du bureau.',
            href: '/bureau-juridique/decisions-bureau',
            icon: 'ClipboardList',
            label: 'Décisions du bureau',
            requiredPermissions: legalAccess,
          },
        ],
        label: 'Confidentiel',
        position: 'top',
      },
    ],
    summary: 'Contacts, contrats, sanctions',
    tone: 'legal',
  },
  {
    badge: 'Restreint',
    description: 'Finance isolée avec permissions strictes.',
    href: '/tresorerie',
    icon: 'Wallet',
    id: 'treasury',
    label: 'Trésorerie',
    sections: [
      {
        id: 'treasury-overview',
        items: [
          {
            description: 'Vue globale financière.',
            href: '/tresorerie',
            icon: 'Wallet',
            label: 'Tableau de bord financier',
            requiredPermissions: treasuryAccess,
          },
          {
            description: 'Comptes, caisses ou supports financiers.',
            href: '/tresorerie/comptes',
            icon: 'CircleDollarSign',
            label: 'Comptes',
            requiredPermissions: treasuryAccess,
          },
          {
            description: 'Prévisions et enveloppes budgétaires.',
            href: '/tresorerie/budget',
            icon: 'ClipboardList',
            label: 'Budget',
            requiredPermissions: treasuryAccess,
          },
          {
            description: 'Bilans mensuels, saisonniers ou annuels.',
            href: '/tresorerie/bilans',
            icon: 'FileText',
            label: 'Bilans',
            requiredPermissions: treasuryAccess,
          },
        ],
        label: 'Pilotage',
        position: 'top',
      },
      {
        id: 'treasury-operations',
        items: [
          {
            description: 'Liste centrale des mouvements financiers.',
            href: '/tresorerie/operations',
            icon: 'ClipboardList',
            label: 'Opérations',
            requiredPermissions: treasuryAccess,
          },
          {
            description: 'Argent entrant dans la structure.',
            href: '/tresorerie/recettes',
            icon: 'CircleDollarSign',
            label: 'Recettes',
            requiredPermissions: treasuryAccess,
          },
          {
            description: 'Dépenses et sorties de trésorerie.',
            href: '/tresorerie/depenses',
            icon: 'Wallet',
            label: 'Dépenses',
            requiredPermissions: treasuryAccess,
          },
          {
            description: 'Cotisations et paiements adhérents.',
            href: '/tresorerie/cotisations-adherents',
            icon: 'UserCheck',
            label: 'Cotisations adhérents',
            requiredPermissions: treasuryAccess,
          },
          {
            description: 'Paiements, factures et montants sponsors.',
            href: '/tresorerie/sponsoring-financier',
            icon: 'Handshake',
            label: 'Sponsoring financier',
            requiredPermissions: treasuryAccess,
          },
          {
            description: 'Factures, devis et justificatifs.',
            href: '/tresorerie/factures-justificatifs',
            icon: 'FileCheck2',
            label: 'Factures / justificatifs',
            requiredPermissions: treasuryAccess,
          },
          {
            description: 'Remboursements membres ou staff.',
            href: '/tresorerie/remboursements',
            icon: 'CircleDollarSign',
            label: 'Remboursements',
            requiredPermissions: treasuryValidationAccess,
          },
        ],
        label: 'Opérations',
        position: 'top',
      },
      {
        id: 'treasury-control',
        items: [
          {
            description: 'Exports financiers et comptables.',
            href: '/tresorerie/exports-finance',
            icon: 'FileText',
            label: 'Exports finance',
            requiredPermissions: treasuryExportAccess,
          },
          {
            description: 'Actions financières à approuver.',
            href: '/tresorerie/validations-finance',
            icon: 'CheckCircle2',
            label: 'Validations finance',
            requiredPermissions: treasuryValidationAccess,
          },
          {
            description: 'Historique des actions financières.',
            href: '/tresorerie/journal-financier',
            icon: 'History',
            label: 'Journal financier',
            requiredPermissions: treasuryAuditAccess,
          },
          {
            description: 'Anciennes périodes et données financières.',
            href: '/tresorerie/archives-finance',
            icon: 'Archive',
            label: 'Archives finance',
            requiredPermissions: treasuryArchiveAccess,
          },
        ],
        label: 'Contrôle',
        position: 'top',
      },
    ],
    summary: 'Finance et paiements',
    tone: 'treasury',
  },
  {
    description: 'Administration, sécurité et configuration globale.',
    href: FEATURES.systemHome.href,
    icon: FEATURES.systemHome.icon,
    id: 'system',
    label: FEATURES.systemHome.audit.poleLabel,
    matchHrefs: ['/administration'],
    sections: [
      {
        id: 'system-admin',
        items: [
          {
            availability: 'live',
            description: FEATURES.systemHome.description,
            featureId: FEATURES.systemHome.id,
            href: FEATURES.systemHome.href,
            icon: FEATURES.systemHome.icon,
            label: FEATURES.systemHome.label,
            permissionMode: FEATURES.systemHome.permissionMode,
            requiredPermissions: systemHubAccess,
          },
          {
            availability: 'live',
            description: FEATURES.users.description,
            featureId: FEATURES.users.id,
            href: FEATURES.users.href,
            hubActionLabel: 'Accéder aux utilisateurs',
            icon: FEATURES.users.icon,
            label: FEATURES.users.label,
            requiredPermissions: usersAccess,
          },
          {
            availability: 'live',
            description: FEATURES.systemSettings.description,
            featureId: FEATURES.systemSettings.id,
            href: FEATURES.systemSettings.href,
            hubActionLabel: 'Configurer le système',
            icon: FEATURES.systemSettings.icon,
            label: FEATURES.systemSettings.label,
            requiredPermissions: systemSettingsAccess,
          },
          {
            description: 'Actions sensibles à approuver.',
            href: '/systeme/validations',
            icon: 'CheckCircle2',
            label: 'Validations globales',
            requiredPermissions: systemValidationAccess,
          },
          {
            description: 'Exports globaux et sauvegardes.',
            href: '/systeme/exports-sauvegardes',
            icon: 'FileText',
            label: 'Exports / sauvegardes',
            requiredPermissions: systemExportAccess,
          },
          {
            description: 'Archives transversales du site privé.',
            href: '/systeme/archives',
            icon: 'Archive',
            label: 'Archives globales',
            requiredPermissions: systemArchiveAccess,
          },
          {
            availability: 'live',
            description: FEATURES.systemActivity.description,
            featureId: FEATURES.systemActivity.id,
            href: FEATURES.systemActivity.href,
            hubActionLabel: 'Consulter le journal',
            icon: FEATURES.systemActivity.icon,
            label: FEATURES.systemActivity.label,
            requiredPermissions: systemAuditAccess,
          },
          {
            children: [
              {
                description: 'Modèles de chartes, contrats et documents.',
                href: '/systeme/modeles-documents',
                icon: 'FileText',
                label: 'Modèles de documents',
                requiredPermissions: systemSettingsAccess,
              },
              {
                description: 'Modèles de messages, rappels et notifications.',
                href: '/systeme/modeles-notifications',
                icon: 'Bell',
                label: 'Modèles de notifications',
                requiredPermissions: systemSettingsAccess,
              },
              {
                description: 'Actions automatiques futures.',
                href: '/systeme/automatisations',
                icon: 'ClipboardList',
                label: 'Automatisations',
                requiredPermissions: systemAutomationAccess,
              },
            ],
            description: 'Modèles et automatisations transversales.',
            href: '/systeme/modeles',
            icon: 'FileText',
            label: 'Modèles & automatisations',
            requiredPermissions: systemSettingsAccess,
          },
        ],
        label: 'Administration',
        position: 'top',
      },
    ],
    summary: 'Permissions et paramètres',
    tone: 'system',
  },
  {
    badge: 'Plus tard',
    description: 'Liaison future avec le site public esport.',
    href: '/sport-team-control',
    icon: 'Activity',
    id: 'sport',
    label: 'Sport / Team Control',
    sections: [
      {
        id: 'sport-main',
        items: [
          {
            description: 'Vue future liée au site public esport.',
            href: '/sport-team-control',
            icon: 'Activity',
            label: "Vue d'ensemble",
            requiredPermissions: sportAccess,
            status: 'Plus tard',
          },
          {
            description: 'Jeux déjà gérés côté public.',
            href: '/sport-team-control/jeux',
            icon: 'Activity',
            label: 'Jeux',
            requiredPermissions: sportAccess,
            status: 'Lecture publique plus tard',
          },
          {
            description: 'Rosters déjà gérés côté public.',
            href: '/sport-team-control/rosters',
            icon: 'Users',
            label: 'Rosters',
            requiredPermissions: sportAccess,
            status: 'Lecture publique plus tard',
          },
          {
            description: 'Profils esport déjà gérés côté public.',
            href: '/sport-team-control/membres-esport',
            icon: 'Users',
            label: 'Membres esport',
            requiredPermissions: sportAccess,
            status: 'Lecture publique plus tard',
          },
          {
            description: 'Scrims déjà gérés côté public.',
            href: '/sport-team-control/scrims',
            icon: 'CalendarClock',
            label: 'Scrims',
            requiredPermissions: sportUpdateAccess,
            status: 'Lecture publique plus tard',
          },
          {
            description: 'Matchs et tournois déjà gérés côté public.',
            href: '/sport-team-control/tournois-matchs',
            icon: 'CalendarClock',
            label: 'Tournois / matchs',
            requiredPermissions: sportUpdateAccess,
            status: 'Lecture publique plus tard',
          },
          {
            description: 'Calendrier esport lié au public plus tard.',
            href: '/sport-team-control/calendrier-esport',
            icon: 'CalendarClock',
            label: 'Calendrier esport',
            requiredPermissions: sportAccess,
            status: 'Lecture publique plus tard',
          },
          {
            description: 'Tryouts sportifs liés aux données internes.',
            href: '/sport-team-control/recrutement-tryouts',
            icon: 'UserPlus',
            label: 'Recrutement & tryouts',
            requiredPermissions: sportUpdateAccess,
            status: 'À relier',
          },
          {
            description: 'Débriefs sportifs liés aux matchs ou scrims.',
            href: '/sport-team-control/debriefs',
            icon: 'FileText',
            label: 'Débriefs',
            requiredPermissions: sportAccess,
            status: 'À relier',
          },
          {
            description: 'Suivi performance à confirmer plus tard.',
            href: '/sport-team-control/performance',
            icon: 'Activity',
            label: 'Performance',
            requiredPermissions: sportAccess,
            status: 'Plus tard',
          },
        ],
        label: 'Lecture liée',
        position: 'top',
      },
    ],
    summary: 'Liaison site public',
    tone: 'sport',
  },
];

export const NAV_SECTIONS: NavSection[] = NAV_SPACES.flatMap(
  (space) => space.sections,
);

export const getRoleLabel = getPermissionRoleLabel;

export function getNavigationAvailability(
  item: NavItem,
): NavigationAvailability {
  return item.availability ?? 'planned';
}

export const getAccessLabel = (
  user: Pick<UserType, 'isProtected' | 'role'>,
): string => {
  return getPermissionAccessLabel(user);
};

export function canAccessNavigationItem(
  user: NavigationUser,
  item: NavItem,
): boolean {
  if (!user) return false;
  if (!item.requiredPermissions?.length) return true;
  if (user.isProtected) {
    // A protected account must not hide a typo on a live navigation item.
    return (
      getNavigationAvailability(item) === 'planned' ||
      item.requiredPermissions.every(isKnownPermissionKey)
    );
  }

  const permissionChecks = item.requiredPermissions.map((permissionKey) =>
    hasPermission(
      user.role,
      permissionKey,
      user.permissions as PermissionsData | null,
    ),
  );

  return item.permissionMode === 'any'
    ? permissionChecks.some(Boolean)
    : permissionChecks.every(Boolean);
}

export function canShowNavigationItem(
  user: NavigationUser,
  item: NavItem,
): boolean {
  return (
    canAccessNavigationItem(user, item) ||
    (item.children?.some((child) => canShowNavigationItem(user, child)) ??
      false)
  );
}

function filterNavItems(
  items: readonly NavItem[],
  user: NavigationUser,
  availability: NavigationAvailabilityFilter,
): NavItem[] {
  return items
    .map((item) => {
      const visibleChildren = item.children
        ? filterNavItems(item.children, user, availability)
        : undefined;

      return {
        ...item,
        ...(visibleChildren ? { children: visibleChildren } : {}),
      };
    })
    .filter((item) => {
      const hasVisibleChildren = (item.children?.length ?? 0) > 0;
      const hasExpectedAvailability =
        availability === 'all' ||
        getNavigationAvailability(item) === availability;

      return (
        hasVisibleChildren ||
        (hasExpectedAvailability && canAccessNavigationItem(user, item))
      );
    });
}

function filterNavSections(
  sections: readonly NavSection[],
  user: NavigationUser,
  availability: NavigationAvailabilityFilter,
): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: filterNavItems(section.items, user, availability),
    }))
    .filter((section) => section.items.length > 0);
}

function isPathInSpace(pathname: string, space: NavigationSpace): boolean {
  const matchHrefs = [space.href, ...(space.matchHrefs ?? [])];

  return matchHrefs.some(
    (href) => pathname === href || pathname.startsWith(`${href}/`),
  );
}

export function filterNavigationSpace(
  space: NavigationSpace,
  user: NavigationUser,
  availability: NavigationAvailabilityFilter = 'live',
): NavigationSpace {
  return {
    ...space,
    sections: filterNavSections(space.sections, user, availability),
  };
}

export function flattenNavItems(items: readonly NavItem[]): NavItem[] {
  return items.flatMap((item) => [
    item,
    ...flattenNavItems(item.children ?? []),
  ]);
}

export function getNavigationSpaceItems(space: NavigationSpace): NavItem[] {
  return flattenNavItems(space.sections.flatMap((section) => section.items));
}

export function getLiveNavigationSpaceTools(
  spaceId: string,
  user: NavigationUser,
): NavItem[] {
  const space = NAV_SPACES.find((item) => item.id === spaceId);

  if (!space) return [];

  return getNavigationSpaceItems(
    filterNavigationSpace(space, user, 'live'),
  ).filter(
    (item) =>
      item.href !== space.href &&
      getNavigationAvailability(item) === 'live' &&
      canAccessNavigationItem(user, item),
  );
}

export function getNavigationItemByHref(href: string): NavItem | null {
  for (const space of NAV_SPACES) {
    const item = getNavigationSpaceItems(space).find(
      (navigationItem) => navigationItem.href === href,
    );

    if (item) return item;
  }

  return null;
}

export function canOpenNavigationHref(
  user: NavigationUser,
  href: string,
): boolean {
  const pathname = getSafeInternalPathname(href);
  if (!pathname) return false;
  const item = getNavigationItemByHref(pathname);
  if (!item) return true;

  return getVisibleNavigationSpaces(user).some((space) =>
    getNavigationSpaceItems(space).some((nav) => nav.href === pathname),
  );
}

export function getVisibleNavigationSpaces(
  user: NavigationUser,
  availability: NavigationAvailabilityFilter = 'live',
): NavigationSpace[] {
  return NAV_SPACES.map((space) =>
    filterNavigationSpace(space, user, availability),
  ).filter((space) => space.sections.length > 0);
}

export function getPlannedNavigationSpaces(
  user: NavigationUser,
): NavigationSpace[] {
  if (!user) return [];

  // Roadmap cards are a non-interactive product catalogue, not an
  // authorization surface. Showing them must never require dormant grants.
  return getVisibleNavigationSpaces({ ...user, isProtected: true }, 'planned');
}

export function getDefaultNavigationSpace(): NavigationSpace {
  const fallbackSpace = NAV_SPACES.find((space) => space.id === 'dashboard');

  if (!fallbackSpace) {
    throw new Error('Navigation space dashboard is missing');
  }

  return fallbackSpace;
}

export function getActiveNavigationSpace(
  pathname: string,
  spaces: readonly NavigationSpace[] = NAV_SPACES,
): NavigationSpace {
  const activeSpace = spaces.find((space) => isPathInSpace(pathname, space));

  return activeSpace ?? spaces[0] ?? getDefaultNavigationSpace();
}

export function getNavigationPageBySlug(
  spaceId: string,
  slug: readonly string[] = [],
): { item: NavItem; space: NavigationSpace } | null {
  const space = NAV_SPACES.find((item) => item.id === spaceId);

  if (!space) return null;

  const routeBaseHref = space.routeBaseHref ?? space.href;
  const targetHref =
    slug.length > 0 ? `${routeBaseHref}/${slug.join('/')}` : routeBaseHref;
  const item =
    getNavigationSpaceItems(space).find(
      (navigationItem) => navigationItem.href === targetHref,
    ) ?? null;

  return item ? { item, space } : null;
}

export function getVisibleNavSections(
  user: NavigationUser,
  availability: NavigationAvailabilityFilter = 'live',
): NavSection[] {
  return filterNavSections(NAV_SECTIONS, user, availability);
}

export function getDesktopSidebarSections(
  user: NavigationUser,
  pathname = '/tableau-de-bord',
): NavSection[] {
  const visibleSpaces = getVisibleNavigationSpaces(user);

  // Never reveal the unfiltered dashboard when every space is denied.
  if (visibleSpaces.length === 0) return [];

  const activeSpace = getActiveNavigationSpace(pathname, visibleSpaces);

  return activeSpace.sections;
}
