import { FEATURES } from '$constants/feature-registry.constants';
import {
  DEFAULT_ROLE_LABEL,
  getAccessLabel as getPermissionAccessLabel,
  getRoleLabel as getPermissionRoleLabel,
  hasPermission,
  isKnownPermissionKey,
  type PermissionsData,
  PROTECTED_ROLE_LABEL,
  ROLE_LABELS,
} from '$constants/permissions.constants';
import { RESERVED_PLANNED_HREFS } from '$constants/reserved-planned-hrefs.constants';
import { PAGE_PATHS } from '$constants/routes.constants';
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
  description: 'Espace de gestion de Noctambule.',
  logo: '/assets/noc.png',
  name: 'Noctambule',
  subtitle: 'Espace de gestion',
  tag: 'NC',
};

export { DEFAULT_ROLE_LABEL, PROTECTED_ROLE_LABEL, ROLE_LABELS };
export type {
  NavigationAvailability,
  NavigationAvailabilityFilter,
  NavigationSpace,
  NavItem,
  NavSection,
} from '$types/navigation.types';

type NavigationUser = Pick<
  UserType,
  'isProtected' | 'permissions' | 'role'
> | null;

const featureNavigation = (
  feature: (typeof FEATURES)[keyof typeof FEATURES],
): NavItem => ({
  availability: 'live',
  description: feature.description,
  featureId: feature.id,
  href: feature.href,
  icon: feature.icon,
  label: feature.label,
  permissionMode: feature.permissionMode,
  requiredPermissions: feature.requiredPermissions,
});

export const NAV_SPACES: NavigationSpace[] = [
  {
    description: "Ce qui m'attend et ce que je dois traiter.",
    href: '/',
    icon: 'LayoutDashboard',
    id: 'dashboard',
    label: 'Aujourd’hui',
    matchHrefs: ['/tableau-de-bord'],
    routeBaseHref: '/tableau-de-bord',
    sections: [
      {
        id: 'today',
        items: [featureNavigation(FEATURES.dashboard)],
        label: 'Pilotage',
        position: 'top',
      },
    ],
    summary: 'Ce qui m’attend',
    tone: 'dashboard',
  },
  {
    description: 'Identités, adhésions, recrutement et parcours des membres.',
    href: PAGE_PATHS.persons,
    icon: 'Users',
    id: 'internal',
    label: 'Membres',
    matchHrefs: ['/membres'],
    sections: [
      {
        id: 'people',
        items: [featureNavigation(FEATURES.persons)],
        label: 'Identité',
        position: 'top',
      },
    ],
    summary: 'Le suivi des membres',
    tone: 'internal',
  },
  {
    description: 'Comptes, sécurité, configuration et données.',
    href: '/systeme',
    icon: 'Settings',
    id: 'system',
    label: 'Système',
    matchHrefs: ['/administration', '/systeme', PAGE_PATHS.roadmap],
    routeBaseHref: '/systeme',
    sections: [
      {
        id: 'system',
        items: [
          featureNavigation(FEATURES.users),
          featureNavigation(FEATURES.systemSettings),
          featureNavigation(FEATURES.roadmap),
        ],
        label: 'Administration',
        position: 'top',
      },
    ],
    summary: 'Comptes, sécurité, configuration',
    tone: 'system',
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
  operationalFeatureIds?: ReadonlySet<string>,
): NavItem[] {
  return items
    .map((item) => {
      const visibleChildren = item.children
        ? filterNavItems(
            item.children,
            user,
            availability,
            operationalFeatureIds,
          )
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
      const isOperational =
        !item.featureId ||
        !operationalFeatureIds ||
        operationalFeatureIds.has(item.featureId);

      return (
        hasVisibleChildren ||
        (hasExpectedAvailability &&
          isOperational &&
          canAccessNavigationItem(user, item))
      );
    });
}

function filterNavSections(
  sections: readonly NavSection[],
  user: NavigationUser,
  availability: NavigationAvailabilityFilter,
  operationalFeatureIds?: ReadonlySet<string>,
): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: filterNavItems(
        section.items,
        user,
        availability,
        operationalFeatureIds,
      ),
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
  operationalFeatureIds?: ReadonlySet<string>,
): NavigationSpace {
  const sections = filterNavSections(
    space.sections,
    user,
    availability,
    operationalFeatureIds,
  );
  const visibleItems = flattenNavItems(
    sections.flatMap((section) => section.items),
  );
  const href = visibleItems.some((item) => item.href === space.href)
    ? space.href
    : (visibleItems[0]?.href ?? space.href);

  return {
    ...space,
    href,
    sections,
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
  if (!item) return !RESERVED_PLANNED_HREFS.has(pathname);

  return getVisibleNavigationSpaces(user).some((space) =>
    getNavigationSpaceItems(space).some((nav) => nav.href === pathname),
  );
}

export function getVisibleNavigationSpaces(
  user: NavigationUser,
  availability: NavigationAvailabilityFilter = 'live',
  operationalFeatureIds?: ReadonlySet<string>,
): NavigationSpace[] {
  return NAV_SPACES.map((space) =>
    filterNavigationSpace(space, user, availability, operationalFeatureIds),
  ).filter((space) => space.sections.length > 0);
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
  operationalFeatureIds?: ReadonlySet<string>,
): NavSection[] {
  const visibleSpaces = getVisibleNavigationSpaces(
    user,
    'live',
    operationalFeatureIds,
  );

  // Never reveal the unfiltered dashboard when every space is denied.
  if (visibleSpaces.length === 0) return [];

  const activeSpace = getActiveNavigationSpace(pathname, visibleSpaces);

  return activeSpace.sections;
}
