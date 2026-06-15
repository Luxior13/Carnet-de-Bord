import { describe, expect, it } from 'vitest';

import {
  getDesktopSidebarSections,
  getHeaderNavItems,
  getVisibleNavSections,
  NAV_SECTIONS,
} from '$constants/app.constants';
import { PERMISSIONS } from '$constants/permissions.constants';

function buildUser(
  permissions: Record<string, boolean> = {},
  isProtected = false,
) {
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
    (section) => section.items.map((item) => item.href),
  );
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

  it('keeps the desktop header empty and the dashboard in the desktop sidebar', () => {
    const user = buildUser();

    const headerHrefs = getHeaderNavItems(user).map((item) => item.href);
    const sidebarHrefs = getDesktopSidebarSections(user).flatMap((section) =>
      section.items.map((item) => item.href),
    );

    expect(headerHrefs).toEqual([]);
    expect(sidebarHrefs).toEqual(['/']);
  });

  it('shows the full navigation to protected users', () => {
    const hrefs = getVisibleHrefs({}, true);
    const allTopLevelHrefs = NAV_SECTIONS.flatMap((section) =>
      section.items.map((item) => item.href),
    );

    expect(hrefs).toEqual(allTopLevelHrefs);
  });
});
