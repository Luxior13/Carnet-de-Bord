import {
  hasPermission,
  PERMISSIONS,
  type PermissionsData,
} from '$constants/permissions.constants';
import type { UserType } from '$types/auth.types';

export const SITE_CONFIG = {
  description: 'Gestion des acces et du tableau de bord',
  logo: '/assets/logo.svg',
  name: 'Carnet Pro',
  subtitle: 'Tableau de bord',
  tag: 'CP',
};

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
    id: 'main',
    items: [
      {
        href: '/',
        icon: 'LayoutDashboard',
        label: 'Tableau de bord',
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

// Role labels in French
export const ROLE_LABELS = {
  ADMIN: 'Administrateur',
  USER: 'Utilisateur',
} as const;

export const DEFAULT_ROLE_LABEL = 'Utilisateur';
export const PROTECTED_ROLE_LABEL = 'Superadmin';

export const getRoleLabel = (role: string): string => {
  return ROLE_LABELS[role as keyof typeof ROLE_LABELS] || DEFAULT_ROLE_LABEL;
};

export const getAccessLabel = (
  user: Pick<UserType, 'isProtected' | 'role'>,
): string => {
  return user.isProtected ? PROTECTED_ROLE_LABEL : getRoleLabel(user.role);
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
