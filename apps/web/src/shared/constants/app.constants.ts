import type { NavigationIconName } from '$constants/navigation-icon.constants';
import type { NavigationSpaceTone } from '$constants/navigation-theme.constants';
import {
  DEFAULT_ROLE_LABEL,
  getAccessLabel as getPermissionAccessLabel,
  getRoleLabel as getPermissionRoleLabel,
  hasPermission,
  PERMISSIONS,
  type PermissionsData,
  PROTECTED_ROLE_LABEL,
  ROLE_LABELS,
} from '$constants/permissions.constants';
import type { UserType } from '$types/auth.types';

export const SITE_CONFIG = {
  description: "Gestion privée d'équipe esport",
  logo: '/assets/logo.svg',
  name: 'Team Control',
  subtitle: 'Gestion privée',
  tag: 'TC',
};

export { DEFAULT_ROLE_LABEL, PROTECTED_ROLE_LABEL, ROLE_LABELS };

// Navigation items for sidebar
export type NavItem = {
  children?: NavItem[];
  description?: string;
  href: string;
  icon: NavigationIconName;
  label: string;
  requiredPermissions?: readonly string[];
  status?: string;
  subTabs?: readonly string[];
};

export type NavSection = {
  id: string;
  items: NavItem[];
  label: string;
  position?: 'top' | 'bottom';
};

export type NavigationSpace = {
  badge?: string;
  description: string;
  href: string;
  icon: NavigationIconName;
  id: string;
  label: string;
  matchHrefs?: readonly string[];
  sections: NavSection[];
  summary: string;
  tone: NavigationSpaceTone;
};

const dashboardAccess = [PERMISSIONS.DASHBOARD.VIEW] as const;
const documentsAccess = [PERMISSIONS.DOCUMENTS.VIEW] as const;
const documentsApprovalAccess = [PERMISSIONS.DOCUMENTS.APPROVE] as const;
const contractsAccess = [PERMISSIONS.CONTRACTS.VIEW] as const;
const incidentsAccess = [PERMISSIONS.INCIDENTS.VIEW] as const;
const internalAccess = [PERMISSIONS.INTERNAL.VIEW] as const;
const legalAccess = [PERMISSIONS.LEGAL.VIEW] as const;
const meetingsAccess = [PERMISSIONS.MEETINGS.VIEW] as const;
const meetingsUpdateAccess = [PERMISSIONS.MEETINGS.UPDATE] as const;
const membersAccess = [PERMISSIONS.MEMBERS.VIEW] as const;
const membersUpdateAccess = [PERMISSIONS.MEMBERS.UPDATE] as const;
const notificationsAccess = [PERMISSIONS.NOTIFICATIONS.VIEW] as const;
const notificationsManageAccess = [PERMISSIONS.NOTIFICATIONS.MANAGE] as const;
const sportAccess = [PERMISSIONS.SPORT.VIEW] as const;
const sportUpdateAccess = [PERMISSIONS.SPORT.UPDATE] as const;
const tasksAccess = [PERMISSIONS.TASKS.VIEW] as const;
const treasuryAccess = [PERMISSIONS.TREASURY.VIEW] as const;
const treasuryArchiveAccess = [PERMISSIONS.TREASURY.ARCHIVES] as const;
const treasuryAuditAccess = [PERMISSIONS.TREASURY.AUDIT] as const;
const treasuryExportAccess = [PERMISSIONS.TREASURY.EXPORT] as const;
const treasuryValidationAccess = [PERMISSIONS.TREASURY.VALIDATE] as const;
const systemAccess = [PERMISSIONS.SYSTEM.VIEW] as const;
const systemArchiveAccess = [PERMISSIONS.SYSTEM.ARCHIVES] as const;
const systemAuditAccess = [PERMISSIONS.SYSTEM.AUDIT] as const;
const systemAutomationAccess = [PERMISSIONS.SYSTEM.AUTOMATION] as const;
const systemExportAccess = [PERMISSIONS.SYSTEM.EXPORTS] as const;
const systemSettingsAccess = [PERMISSIONS.SYSTEM.SETTINGS] as const;
const systemValidationAccess = [PERMISSIONS.SYSTEM.VALIDATE] as const;
const usersAccess = [PERMISSIONS.USERS.VIEW] as const;
type NavigationUser = Pick<
  UserType,
  'isProtected' | 'permissions' | 'role'
> | null;

export const NAV_SPACES: NavigationSpace[] = [
  {
    description: 'Vue globale, alertes et raccourcis selon les droits.',
    href: '/tableau-de-bord',
    icon: 'LayoutDashboard',
    id: 'dashboard',
    label: 'Tableau de bord',
    matchHrefs: ['/recherche'],
    sections: [
      {
        id: 'dashboard-overview',
        items: [
          {
            description: 'Vue globale du site prive selon les permissions.',
            href: '/tableau-de-bord',
            icon: 'LayoutDashboard',
            label: "Vue d'ensemble",
            requiredPermissions: dashboardAccess,
          },
          {
            description: 'Actions personnelles a suivre.',
            href: '/tableau-de-bord/mes-taches',
            icon: 'ClipboardList',
            label: 'Mes taches',
            requiredPermissions: tasksAccess,
          },
          {
            description: 'Rappels personnels et structurels.',
            href: '/tableau-de-bord/mes-rappels',
            icon: 'Bell',
            label: 'Mes rappels',
            requiredPermissions: notificationsAccess,
          },
          {
            description: 'Reunions proches et elements a preparer.',
            href: '/tableau-de-bord/prochaines-reunions',
            icon: 'CalendarClock',
            label: 'Prochaines reunions',
            requiredPermissions: meetingsAccess,
          },
          {
            description: 'Chartes et documents a lire ou accepter.',
            href: '/tableau-de-bord/documents-a-accepter',
            icon: 'FileCheck2',
            label: 'Documents a accepter',
            requiredPermissions: documentsAccess,
          },
          {
            description: 'Points importants a traiter rapidement.',
            href: '/tableau-de-bord/alertes-importantes',
            icon: 'ShieldCheck',
            label: 'Alertes importantes',
            requiredPermissions: notificationsAccess,
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
            description: 'Accueil du pole vie interne.',
            href: '/vie-interne',
            icon: 'Home',
            label: "Vue d'ensemble",
            requiredPermissions: internalAccess,
          },
          {
            description: 'Informations importantes reservees a la structure.',
            href: '/vie-interne/actualite-interne',
            icon: 'Newspaper',
            label: 'Actualite interne',
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
                description: 'Adhesions, statuts et cotisations liees.',
                href: '/vie-interne/adherents',
                icon: 'UserCheck',
                label: 'Adherents',
                requiredPermissions: membersAccess,
              },
              {
                description: 'Arrivees, departs et checklists internes.',
                href: '/vie-interne/onboarding-depart',
                icon: 'UserPlus',
                label: 'Onboarding et depart',
                requiredPermissions: membersUpdateAccess,
              },
            ],
            description: 'Personnes, adherents et parcours interne.',
            href: '/vie-interne/membres-adherents',
            icon: 'Users',
            label: 'Membres & adherents',
            requiredPermissions: membersAccess,
          },
          {
            children: [
              {
                description: 'Organisation et compte rendu des reunions.',
                href: '/vie-interne/reunions',
                icon: 'ClipboardList',
                label: 'Gestion des reunions',
                requiredPermissions: meetingsUpdateAccess,
              },
              {
                description: 'Echeances et evenements internes.',
                href: '/vie-interne/calendrier-interne',
                icon: 'CalendarClock',
                label: 'Calendrier interne',
                requiredPermissions: meetingsAccess,
              },
              {
                description: 'Retours apres reunions, matchs, scrims ou tests.',
                href: '/vie-interne/debriefs',
                icon: 'FileText',
                label: 'Debriefs',
                requiredPermissions: meetingsAccess,
              },
            ],
            description: 'Temps forts, reunions et retours internes.',
            href: '/vie-interne/reunions-suivi',
            icon: 'CalendarClock',
            label: 'Reunions & suivi',
            requiredPermissions: meetingsAccess,
          },
          {
            description: 'Candidatures, tests et decisions de recrutement.',
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
    summary: 'Membres, reunions, rappels',
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
            description: 'Accueil du pole bureau et juridique.',
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
              'Repertoire central des personnes internes, externes, anciens contacts et profils sensibles.',
            href: '/bureau-juridique/personnes-contacts',
            icon: 'Users',
            label: 'Personnes & contacts',
            requiredPermissions: legalAccess,
          },
          {
            children: [
              {
                description: 'Chartes, reglements et documents officiels.',
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
            description: 'Incidents, avertissements et decisions sensibles.',
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
            description: 'Decisions structurelles importantes du bureau.',
            href: '/bureau-juridique/decisions-bureau',
            icon: 'ClipboardList',
            label: 'Decisions du bureau',
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
            label: 'Operations',
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
            description: 'Cotisations et paiements adherents.',
            href: '/tresorerie/cotisations-adherents',
            icon: 'UserCheck',
            label: 'Cotisations adherents',
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
    href: '/systeme',
    icon: 'Settings',
    id: 'system',
    label: 'Système',
    matchHrefs: ['/administration'],
    sections: [
      {
        id: 'system-admin',
        items: [
          {
            description: 'Accueil du pôle système.',
            href: '/systeme',
            icon: 'Settings',
            label: "Vue d'ensemble",
            requiredPermissions: systemAccess,
          },
          {
            description: 'Comptes, rôles et permissions existants.',
            href: '/administration/utilisateurs',
            icon: 'Users',
            label: 'Utilisateurs & permissions',
            requiredPermissions: usersAccess,
          },
          {
            description: 'Configuration des jeux, statuts, catégories et tags.',
            href: '/systeme/parametres',
            icon: 'Settings',
            label: 'Paramètres',
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
            description: 'Historique admin et actions sensibles.',
            href: '/systeme/journal-activite',
            icon: 'History',
            label: "Journal d'activité",
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
            description: 'Vue future liee au site public esport.',
            href: '/sport-team-control',
            icon: 'Activity',
            label: "Vue d'ensemble",
            requiredPermissions: sportAccess,
            status: 'Plus tard',
          },
          {
            description: 'Jeux deja geres cote public.',
            href: '/sport-team-control/jeux',
            icon: 'Activity',
            label: 'Jeux',
            requiredPermissions: sportAccess,
            status: 'Lecture publique plus tard',
          },
          {
            description: 'Rosters deja geres cote public.',
            href: '/sport-team-control/rosters',
            icon: 'Users',
            label: 'Rosters',
            requiredPermissions: sportAccess,
            status: 'Lecture publique plus tard',
          },
          {
            description: 'Profils esport deja geres cote public.',
            href: '/sport-team-control/membres-esport',
            icon: 'Users',
            label: 'Membres esport',
            requiredPermissions: sportAccess,
            status: 'Lecture publique plus tard',
          },
          {
            description: 'Scrims deja geres cote public.',
            href: '/sport-team-control/scrims',
            icon: 'CalendarClock',
            label: 'Scrims',
            requiredPermissions: sportUpdateAccess,
            status: 'Lecture publique plus tard',
          },
          {
            description: 'Matchs et tournois deja geres cote public.',
            href: '/sport-team-control/tournois-matchs',
            icon: 'CalendarClock',
            label: 'Tournois / matchs',
            requiredPermissions: sportUpdateAccess,
            status: 'Lecture publique plus tard',
          },
          {
            description: 'Calendrier esport lie au public plus tard.',
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
            status: 'A relier',
          },
          {
            description: 'Debriefs sportifs lies aux matchs ou scrims.',
            href: '/sport-team-control/debriefs',
            icon: 'FileText',
            label: 'Debriefs',
            requiredPermissions: sportAccess,
            status: 'A relier',
          },
          {
            description: 'Suivi performance a confirmer plus tard.',
            href: '/sport-team-control/performance',
            icon: 'Activity',
            label: 'Performance',
            requiredPermissions: sportAccess,
            status: 'Plus tard',
          },
        ],
        label: 'Lecture liee',
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
  if (user.isProtected) return true;
  if (!item.requiredPermissions?.length) return true;

  return item.requiredPermissions.some((permissionKey) =>
    hasPermission(
      user.role,
      permissionKey,
      user.permissions as PermissionsData | null,
    ),
  );
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
): NavItem[] {
  return items
    .map((item) => {
      const visibleChildren = item.children
        ? filterNavItems(item.children, user)
        : undefined;

      return {
        ...item,
        ...(visibleChildren ? { children: visibleChildren } : {}),
      };
    })
    .filter((item) => {
      const hasVisibleChildren = (item.children?.length ?? 0) > 0;

      return hasVisibleChildren || canAccessNavigationItem(user, item);
    });
}

function filterNavSections(
  sections: readonly NavSection[],
  user: NavigationUser,
): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: filterNavItems(section.items, user),
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
): NavigationSpace {
  return {
    ...space,
    sections: filterNavSections(space.sections, user),
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

export function getVisibleNavigationSpaces(
  user: NavigationUser,
): NavigationSpace[] {
  return NAV_SPACES.map((space) => filterNavigationSpace(space, user)).filter(
    (space) => space.sections.length > 0,
  );
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

  const targetHref =
    slug.length > 0 ? `${space.href}/${slug.join('/')}` : space.href;
  const item =
    getNavigationSpaceItems(space).find(
      (navigationItem) => navigationItem.href === targetHref,
    ) ?? null;

  return item ? { item, space } : null;
}

export function getVisibleNavSections(user: NavigationUser): NavSection[] {
  return filterNavSections(NAV_SECTIONS, user);
}

export function getDesktopSidebarSections(
  user: NavigationUser,
  pathname = '/tableau-de-bord',
): NavSection[] {
  const visibleSpaces = getVisibleNavigationSpaces(user);
  const activeSpace = getActiveNavigationSpace(pathname, visibleSpaces);

  return activeSpace.sections;
}
