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
  desktopSurface?: 'header' | 'sidebar';
  href: string;
  icon: string;
  label: string;
  requiredPermissions?: readonly string[];
};

export type NavSection = {
  id: string;
  items: NavItem[];
  label: string;
  position?: 'top' | 'bottom';
};

// Navigation structure
export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'dashboard',
    items: [
      {
        href: '/',
        icon: 'Home',
        label: 'Accueil',
        requiredPermissions: [PERMISSIONS.DASHBOARD.VIEW],
      },
    ],
    label: '',
    position: 'top',
  },
  {
    id: 'administration',
    items: [
      {
        children: [
          {
            href: '/administration/utilisateurs',
            icon: 'Users',
            label: 'Utilisateurs',
            requiredPermissions: [PERMISSIONS.USERS.VIEW],
          },
        ],
        href: '/administration',
        icon: 'Settings',
        label: 'Administration',
        requiredPermissions: [PERMISSIONS.USERS.VIEW],
      },
    ],
    label: 'Gestion',
    position: 'top',
  },
];

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

export function getVisibleNavSections(
  user: Pick<UserType, 'isProtected' | 'permissions' | 'role'> | null,
): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: filterNavItems(section.items, user),
  })).filter((section) => section.items.length > 0);
}

export function getDesktopSidebarSections(
  user: Pick<UserType, 'isProtected' | 'permissions' | 'role'> | null,
): NavSection[] {
  return getVisibleNavSections(user)
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
