import { describe, expect, it } from 'vitest';

import {
  getDesktopSidebarSections,
  getHeaderNavItems,
  getVisibleNavSections,
  NAV_SECTIONS,
  type NavItem,
} from '$constants/app.constants';
import { PERMISSIONS } from '$constants/permissions.constants';

type TestUser = {
  isProtected: boolean;
  permissions: Record<string, boolean>;
  role: 'USER';
};

function buildUser(
  permissions: Record<string, boolean> = {},
  isProtected = false,
): TestUser {
  return {
    isProtected,
    permissions,
    role: 'USER',
  } as const;
}

function getVisibleHrefs(
  permissions: Record<string, boolean> = {},
  isProtected = false,
): string[] {
  return getVisibleNavSections(buildUser(permissions, isProtected)).flatMap(
    (section) => flattenHrefs(section.items),
  );
}

function flattenHrefs(items: readonly NavItem[]): string[] {
  return items.flatMap((item) => [
    item.href,
    ...flattenHrefs(item.children ?? []),
  ]);
}

describe('navigation visibility', () => {
  it('shows default user navigation to authenticated users', () => {
    const hrefs = getVisibleHrefs();

    expect(hrefs).toEqual(['/']);
  });

  it('hides the dashboard when the dashboard permission is explicitly revoked', () => {
    const hrefs = getVisibleHrefs({
      [PERMISSIONS.DASHBOARD.VIEW]: false,
    });

    expect(hrefs).toEqual([]);
  });

  it('shows users navigation to accounts with users view permission', () => {
    const hrefs = getVisibleHrefs({
      [PERMISSIONS.USERS.VIEW]: true,
    });

    expect(hrefs).toEqual([
      '/',
      '/administration',
      '/administration/utilisateurs',
    ]);
  });

  it('keeps the desktop header empty and pages in the desktop sidebar', () => {
    const user = buildUser();

    const headerHrefs = getHeaderNavItems(user).map((item) => item.href);
    const sidebarHrefs = getDesktopSidebarSections(user).flatMap((section) =>
      flattenHrefs(section.items),
    );

    expect(headerHrefs).toEqual([]);
    expect(sidebarHrefs).toEqual(['/']);
  });

  it('shows the full navigation to protected users', () => {
    const hrefs = getVisibleHrefs({}, true);
    const allHrefs = NAV_SECTIONS.flatMap((section) =>
      flattenHrefs(section.items),
    );

    expect(hrefs).toEqual(allHrefs);
  });
});
