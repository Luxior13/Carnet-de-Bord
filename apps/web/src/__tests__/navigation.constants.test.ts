import { describe, expect, it } from 'vitest';

import {
  getActiveNavigationSpace,
  getDesktopSidebarSections,
  getVisibleNavigationSpaces,
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

    expect(hrefs).toContain('/tableau-de-bord');
    expect(hrefs).toContain('/vie-interne/membres');
    expect(hrefs).not.toContain('/tresorerie/operations');
    expect(hrefs).not.toContain('/administration/utilisateurs');
  });

  it('shows treasury navigation only to accounts with treasury permissions', () => {
    const hrefs = getVisibleHrefs({
      [PERMISSIONS.TREASURY.VIEW]: true,
    });

    expect(hrefs).toContain('/tresorerie');
    expect(hrefs).toContain('/tresorerie/operations');
    expect(hrefs).not.toContain('/tresorerie/exports-finance');
    expect(hrefs).not.toContain('/tresorerie/validations-finance');
  });

  it('shows sensitive treasury actions to matching finance permissions', () => {
    const hrefs = getVisibleHrefs({
      [PERMISSIONS.TREASURY.EXPORT]: true,
      [PERMISSIONS.TREASURY.VALIDATE]: true,
    });

    expect(hrefs).toContain('/tresorerie/exports-finance');
    expect(hrefs).toContain('/tresorerie/validations-finance');
    expect(hrefs).not.toContain('/tresorerie/operations');
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

    expect(hrefs).toContain('/tableau-de-bord');
    expect(hrefs).toContain('/systeme');
    expect(hrefs).toContain('/administration/utilisateurs');
  });

  it('shows the active space in the desktop sidebar', () => {
    const user = buildUser();

    const sidebarHrefs = getDesktopSidebarSections(
      user,
      '/vie-interne/membres',
    ).flatMap((section) => flattenHrefs(section.items));

    expect(sidebarHrefs).toContain('/vie-interne');
    expect(sidebarHrefs).toContain('/vie-interne/membres');
    expect(sidebarHrefs).not.toContain('/tresorerie/operations');
  });

  it('detects the active navigation space from the current path', () => {
    const user = buildUser({
      [PERMISSIONS.TREASURY.VIEW]: true,
      [PERMISSIONS.USERS.VIEW]: true,
    });
    const spaces = getVisibleNavigationSpaces(user);

    expect(getActiveNavigationSpace('/tresorerie/operations', spaces).id).toBe(
      'treasury',
    );
    expect(
      getActiveNavigationSpace('/administration/utilisateurs', spaces).id,
    ).toBe('system');
  });

  it('shows the full navigation to protected users', () => {
    const hrefs = getVisibleHrefs({}, true);
    const allHrefs = NAV_SECTIONS.flatMap((section) =>
      flattenHrefs(section.items),
    );

    expect(hrefs).toEqual(allHrefs);
  });
});
