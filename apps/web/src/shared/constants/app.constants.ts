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
  desktopSurface?: 'header' | 'sidebar';
  href: string;
  icon: string;
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
  icon: string;
  id: string;
  label: string;
  matchHrefs?: readonly string[];
  sections: NavSection[];
  summary: string;
  tone: NavigationSpaceTone;
};

const dashboardAccess = [PERMISSIONS.DASHBOARD.VIEW] as const;
const treasuryAccess = [PERMISSIONS.TREASURY.VIEW] as const;
const treasuryExportAccess = [PERMISSIONS.TREASURY.EXPORT] as const;
const treasuryValidationAccess = [PERMISSIONS.TREASURY.VALIDATE] as const;
const usersAccess = [PERMISSIONS.USERS.VIEW] as const;

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
            requiredPermissions: dashboardAccess,
          },
          {
            description: 'Rappels personnels et structurels.',
            href: '/tableau-de-bord/mes-rappels',
            icon: 'Bell',
            label: 'Mes rappels',
            requiredPermissions: dashboardAccess,
          },
          {
            description: 'Reunions proches et elements a preparer.',
            href: '/tableau-de-bord/prochaines-reunions',
            icon: 'CalendarClock',
            label: 'Prochaines reunions',
            requiredPermissions: dashboardAccess,
          },
          {
            description: 'Chartes et documents a lire ou accepter.',
            href: '/tableau-de-bord/documents-a-accepter',
            icon: 'FileCheck2',
            label: 'Documents a accepter',
            requiredPermissions: dashboardAccess,
          },
          {
            description: 'Points importants a traiter rapidement.',
            href: '/tableau-de-bord/alertes-importantes',
            icon: 'ShieldCheck',
            label: 'Alertes importantes',
            requiredPermissions: dashboardAccess,
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
            requiredPermissions: dashboardAccess,
          },
          {
            description: 'Informations importantes reservees a la structure.',
            href: '/vie-interne/actualite-interne',
            icon: 'Newspaper',
            label: 'Actualite interne',
            requiredPermissions: dashboardAccess,
          },
          {
            children: [
              {
                description:
                  'Fiches internes, contacts, notes et liens utiles.',
                href: '/vie-interne/membres',
                icon: 'Users',
                label: 'Membres',
                requiredPermissions: dashboardAccess,
              },
              {
                description: 'Adhesions, statuts et cotisations liees.',
                href: '/vie-interne/adherents',
                icon: 'UserCheck',
                label: 'Adherents',
                requiredPermissions: dashboardAccess,
              },
              {
                description: 'Arrivees, departs et checklists internes.',
                href: '/vie-interne/onboarding-depart',
                icon: 'UserPlus',
                label: 'Onboarding et depart',
                requiredPermissions: dashboardAccess,
              },
            ],
            description: 'Personnes, adherents et parcours interne.',
            href: '/vie-interne/membres-adherents',
            icon: 'Users',
            label: 'Membres & adherents',
            requiredPermissions: dashboardAccess,
          },
          {
            children: [
              {
                description: 'Organisation et compte rendu des reunions.',
                href: '/vie-interne/reunions',
                icon: 'ClipboardList',
                label: 'Gestion des reunions',
                requiredPermissions: dashboardAccess,
              },
              {
                description: 'Echeances et evenements internes.',
                href: '/vie-interne/calendrier-interne',
                icon: 'CalendarClock',
                label: 'Calendrier interne',
                requiredPermissions: dashboardAccess,
              },
              {
                description: 'Retours apres reunions, matchs, scrims ou tests.',
                href: '/vie-interne/debriefs',
                icon: 'FileText',
                label: 'Debriefs',
                requiredPermissions: dashboardAccess,
              },
            ],
            description: 'Temps forts, reunions et retours internes.',
            href: '/vie-interne/reunions-suivi',
            icon: 'CalendarClock',
            label: 'Reunions & suivi',
            requiredPermissions: dashboardAccess,
          },
          {
            description: 'Candidatures, tests et decisions de recrutement.',
            href: '/vie-interne/recrutement-tryouts',
            icon: 'UserPlus',
            label: 'Recrutement & tryouts',
            requiredPermissions: dashboardAccess,
          },
          {
            description: 'Rappels transversaux et notifications internes.',
            href: '/vie-interne/notifications-rappels',
            icon: 'Bell',
            label: 'Notifications et rappels',
            requiredPermissions: dashboardAccess,
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
            requiredPermissions: dashboardAccess,
          },
          {
            description: 'Sponsors, contacts, livrables et partenaires.',
            href: '/bureau-juridique/sponsors',
            icon: 'Handshake',
            label: 'Sponsors & partenaires',
            requiredPermissions: dashboardAccess,
          },
          {
            children: [
              {
                description: 'Chartes, reglements et documents officiels.',
                href: '/bureau-juridique/documents-officiels',
                icon: 'FileText',
                label: 'Documents officiels',
                requiredPermissions: dashboardAccess,
              },
              {
                description: 'Contrats sponsors, membres ou administratifs.',
                href: '/bureau-juridique/contrats',
                icon: 'FileCheck2',
                label: 'Contrats',
                requiredPermissions: dashboardAccess,
              },
              {
                description: 'Suivi des lectures et acceptations.',
                href: '/bureau-juridique/acceptation-chartes',
                icon: 'CheckCircle2',
                label: 'Acceptation des chartes',
                requiredPermissions: dashboardAccess,
              },
            ],
            description: 'Coffre documentaire, chartes et contrats.',
            href: '/bureau-juridique/documents',
            icon: 'FileText',
            label: 'Documents & chartes',
            requiredPermissions: dashboardAccess,
          },
          {
            description: 'Incidents, avertissements et decisions sensibles.',
            href: '/bureau-juridique/incidents-sanctions',
            icon: 'ShieldCheck',
            label: 'Incidents et sanctions',
            requiredPermissions: dashboardAccess,
          },
          {
            description: 'Materiel, licences, maillots et acces confies.',
            href: '/bureau-juridique/inventaire-acces',
            icon: 'Archive',
            label: 'Inventaire et acces',
            requiredPermissions: dashboardAccess,
          },
          {
            description: 'Decisions structurelles importantes du bureau.',
            href: '/bureau-juridique/decisions-bureau',
            icon: 'ClipboardList',
            label: 'Decisions du bureau',
            requiredPermissions: dashboardAccess,
          },
        ],
        label: 'Confidentiel',
        position: 'top',
      },
    ],
    summary: 'Documents, contrats, sanctions',
    tone: 'legal',
  },
  {
    badge: 'Restreint',
    description: 'Finance isolee avec permissions strictes.',
    href: '/tresorerie',
    icon: 'Wallet',
    id: 'treasury',
    label: 'Tresorerie',
    sections: [
      {
        id: 'treasury-overview',
        items: [
          {
            description: 'Vue globale financiere.',
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
            description: 'Previsions et enveloppes budgetaires.',
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
            description: 'Depenses et sorties de tresorerie.',
            href: '/tresorerie/depenses',
            icon: 'Wallet',
            label: 'Depenses',
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
            requiredPermissions: treasuryAccess,
          },
        ],
        label: 'Operations',
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
            description: 'Actions financieres a approuver.',
            href: '/tresorerie/validations-finance',
            icon: 'CheckCircle2',
            label: 'Validations finance',
            requiredPermissions: treasuryValidationAccess,
          },
          {
            description: 'Historique des actions financieres.',
            href: '/tresorerie/journal-financier',
            icon: 'History',
            label: 'Journal financier',
            requiredPermissions: treasuryAccess,
          },
          {
            description: 'Anciennes periodes et donnees financieres.',
            href: '/tresorerie/archives-finance',
            icon: 'Archive',
            label: 'Archives finance',
            requiredPermissions: treasuryAccess,
          },
        ],
        label: 'Controle',
        position: 'top',
      },
    ],
    summary: 'Finance et paiements',
    tone: 'treasury',
  },
  {
    description: 'Administration, securite et configuration globale.',
    href: '/systeme',
    icon: 'Settings',
    id: 'system',
    label: 'Systeme',
    matchHrefs: ['/administration'],
    sections: [
      {
        id: 'system-admin',
        items: [
          {
            description: 'Accueil du pole systeme.',
            href: '/systeme',
            icon: 'Settings',
            label: "Vue d'ensemble",
            requiredPermissions: usersAccess,
          },
          {
            description: 'Comptes, roles et permissions existants.',
            href: '/administration/utilisateurs',
            icon: 'Users',
            label: 'Utilisateurs & permissions',
            requiredPermissions: usersAccess,
          },
          {
            description: 'Configuration des jeux, statuts, categories et tags.',
            href: '/systeme/parametres',
            icon: 'Settings',
            label: 'Parametres',
            requiredPermissions: usersAccess,
          },
          {
            description: 'Actions sensibles a approuver.',
            href: '/systeme/validations',
            icon: 'CheckCircle2',
            label: 'Validations globales',
            requiredPermissions: usersAccess,
          },
          {
            description: 'Exports globaux et sauvegardes.',
            href: '/systeme/exports-sauvegardes',
            icon: 'FileText',
            label: 'Exports / sauvegardes',
            requiredPermissions: usersAccess,
          },
          {
            description: 'Archives transversales du site prive.',
            href: '/systeme/archives',
            icon: 'Archive',
            label: 'Archives globales',
            requiredPermissions: usersAccess,
          },
          {
            description: 'Historique admin et actions sensibles.',
            href: '/systeme/journal-activite',
            icon: 'History',
            label: "Journal d'activite",
            requiredPermissions: usersAccess,
          },
          {
            children: [
              {
                description: 'Modeles de chartes, contrats et documents.',
                href: '/systeme/modeles-documents',
                icon: 'FileText',
                label: 'Modeles de documents',
                requiredPermissions: usersAccess,
              },
              {
                description: 'Modeles de messages, rappels et notifications.',
                href: '/systeme/modeles-notifications',
                icon: 'Bell',
                label: 'Modeles de notifications',
                requiredPermissions: usersAccess,
              },
              {
                description: 'Actions automatiques futures.',
                href: '/systeme/automatisations',
                icon: 'ClipboardList',
                label: 'Automatisations',
                requiredPermissions: usersAccess,
              },
            ],
            description: 'Modeles et automatisations transversales.',
            href: '/systeme/modeles',
            icon: 'FileText',
            label: 'Modeles & automatisations',
            requiredPermissions: usersAccess,
          },
        ],
        label: 'Administration',
        position: 'top',
      },
    ],
    summary: 'Permissions et parametres',
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
            requiredPermissions: dashboardAccess,
            status: 'Plus tard',
          },
          {
            description: 'Jeux deja geres cote public.',
            href: '/sport-team-control/jeux',
            icon: 'Activity',
            label: 'Jeux',
            requiredPermissions: dashboardAccess,
            status: 'Lecture publique plus tard',
          },
          {
            description: 'Rosters deja geres cote public.',
            href: '/sport-team-control/rosters',
            icon: 'Users',
            label: 'Rosters',
            requiredPermissions: dashboardAccess,
            status: 'Lecture publique plus tard',
          },
          {
            description: 'Profils esport deja geres cote public.',
            href: '/sport-team-control/membres-esport',
            icon: 'Users',
            label: 'Membres esport',
            requiredPermissions: dashboardAccess,
            status: 'Lecture publique plus tard',
          },
          {
            description: 'Scrims deja geres cote public.',
            href: '/sport-team-control/scrims',
            icon: 'CalendarClock',
            label: 'Scrims',
            requiredPermissions: dashboardAccess,
            status: 'Lecture publique plus tard',
          },
          {
            description: 'Matchs et tournois deja geres cote public.',
            href: '/sport-team-control/tournois-matchs',
            icon: 'CalendarClock',
            label: 'Tournois / matchs',
            requiredPermissions: dashboardAccess,
            status: 'Lecture publique plus tard',
          },
          {
            description: 'Calendrier esport lie au public plus tard.',
            href: '/sport-team-control/calendrier-esport',
            icon: 'CalendarClock',
            label: 'Calendrier esport',
            requiredPermissions: dashboardAccess,
            status: 'Lecture publique plus tard',
          },
          {
            description: 'Tryouts sportifs lies aux donnees internes.',
            href: '/sport-team-control/recrutement-tryouts',
            icon: 'UserPlus',
            label: 'Recrutement & tryouts',
            requiredPermissions: dashboardAccess,
            status: 'A relier',
          },
          {
            description: 'Debriefs sportifs lies aux matchs ou scrims.',
            href: '/sport-team-control/debriefs',
            icon: 'FileText',
            label: 'Debriefs',
            requiredPermissions: dashboardAccess,
            status: 'A relier',
          },
          {
            description: 'Suivi performance a confirmer plus tard.',
            href: '/sport-team-control/performance',
            icon: 'Activity',
            label: 'Performance',
            requiredPermissions: dashboardAccess,
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

function canAccessNavItem(
  user: Pick<UserType, 'isProtected' | 'permissions' | 'role'> | null,
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

function filterNavItems(
  items: readonly NavItem[],
  user: Pick<UserType, 'isProtected' | 'permissions' | 'role'> | null,
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

      return hasVisibleChildren || canAccessNavItem(user, item);
    });
}

function filterNavItemsByDesktopSurface(
  items: readonly NavItem[],
  surface: 'header' | 'sidebar',
): NavItem[] {
  return items
    .map((item) => {
      const visibleChildren = item.children
        ? filterNavItemsByDesktopSurface(item.children, surface)
        : undefined;

      return {
        ...item,
        ...(visibleChildren ? { children: visibleChildren } : {}),
      };
    })
    .filter((item) => {
      const hasVisibleChildren = (item.children?.length ?? 0) > 0;
      const itemSurface = item.desktopSurface ?? 'sidebar';

      return hasVisibleChildren || itemSurface === surface;
    });
}

function filterNavSections(
  sections: readonly NavSection[],
  user: Pick<UserType, 'isProtected' | 'permissions' | 'role'> | null,
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
  user: Pick<UserType, 'isProtected' | 'permissions' | 'role'> | null,
): NavigationSpace[] {
  return NAV_SPACES.map((space) => ({
    ...space,
    sections: filterNavSections(space.sections, user),
  })).filter((space) => space.sections.length > 0);
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

export function getVisibleNavSections(
  user: Pick<UserType, 'isProtected' | 'permissions' | 'role'> | null,
): NavSection[] {
  return filterNavSections(NAV_SECTIONS, user);
}

export function getDesktopSidebarSections(
  user: Pick<UserType, 'isProtected' | 'permissions' | 'role'> | null,
  pathname = '/tableau-de-bord',
): NavSection[] {
  const visibleSpaces = getVisibleNavigationSpaces(user);
  const activeSpace = getActiveNavigationSpace(pathname, visibleSpaces);

  return activeSpace.sections
    .map((section) => ({
      ...section,
      items: filterNavItemsByDesktopSurface(section.items, 'sidebar'),
    }))
    .filter((section) => section.items.length > 0);
}

export function getHeaderNavItems(
  user: Pick<UserType, 'isProtected' | 'permissions' | 'role'> | null,
): NavItem[] {
  return getVisibleNavSections(user).flatMap((section) =>
    filterNavItemsByDesktopSurface(section.items, 'header'),
  );
}
