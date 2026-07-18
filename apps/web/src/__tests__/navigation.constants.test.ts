import { describe, expect, it } from 'vitest';

import {
  canAccessNavigationItem,
  canOpenNavigationHref,
  getActiveNavigationSpace,
  getDesktopSidebarSections,
  getLiveNavigationSpaceTools,
  getNavigationAvailability,
  getNavigationItemByHref,
  getNavigationPageBySlug,
  getPlannedNavigationSpaces,
  getVisibleNavigationSpaces,
  getVisibleNavSections,
  NAV_SECTIONS,
  type NavigationAvailabilityFilter,
  type NavItem,
} from '$constants/app.constants';
import {
  PERMISSIONS,
  ROADMAP_PERMISSIONS,
} from '$constants/permissions.constants';

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

function flattenHrefs(items: readonly NavItem[]): string[] {
  return items.flatMap((item) => [
    item.href,
    ...flattenHrefs(item.children ?? []),
  ]);
}

function getVisibleHrefs(
  permissions: Record<string, boolean> = {},
  isProtected = false,
  availability: NavigationAvailabilityFilter = 'live',
): string[] {
  return getVisibleNavSections(
    buildUser(permissions, isProtected),
    availability,
  ).flatMap((section) => flattenHrefs(section.items));
}

function getRoadmapHrefs(permissions: Record<string, boolean> = {}): string[] {
  return getPlannedNavigationSpaces(buildUser(permissions)).flatMap((space) =>
    space.sections.flatMap((section) => flattenHrefs(section.items)),
  );
}

describe('navigation availability', () => {
  it('shows the live baseline destinations without individual grants', () => {
    const hrefs = getVisibleHrefs({
      [PERMISSIONS.DASHBOARD.VIEW]: false,
      [PERMISSIONS.NOTIFICATIONS.VIEW]: false,
    });

    expect(hrefs).toEqual([
      '/',
      '/feuille-de-route',
      '/mes-notifications',
      '/recherche',
    ]);
    expect(hrefs).not.toContain('/tableau-de-bord/mes-taches');
    expect(hrefs).not.toContain('/vie-interne');
  });

  it('publishes the complete roadmap without dormant permission grants', () => {
    const hrefs = getRoadmapHrefs();

    expect(hrefs).toContain('/tableau-de-bord/mes-taches');
    expect(hrefs).toContain('/vie-interne');
    expect(hrefs).toContain('/vie-interne/membres');
    expect(hrefs).toContain('/vie-interne/calendrier-interne');
    expect(hrefs).toContain('/bureau-juridique');
    expect(hrefs).toContain('/tresorerie/operations');
    expect(hrefs).toContain('/sport-team-control');
    expect(hrefs).toContain('/systeme/parametres');
  });

  it('keeps roadmap capability names on planned navigation items', () => {
    const tasks = getNavigationItemByHref('/tableau-de-bord/mes-taches');

    expect(tasks?.requiredPermissions).toEqual([
      ROADMAP_PERMISSIONS.TASKS.VIEW,
    ]);
    expect(tasks && getNavigationAvailability(tasks)).toBe('planned');
    expect(
      canAccessNavigationItem(
        buildUser({ [ROADMAP_PERMISSIONS.TASKS.VIEW]: true }),
        tasks as NavItem,
      ),
    ).toBe(false);
  });

  it('does not let the protected bypass hide a typo on a live item', () => {
    const mistypedLiveItem: NavItem = {
      availability: 'live',
      href: '/test-live',
      icon: 'Settings',
      label: 'Test live',
      requiredPermissions: ['users:veiw'],
    };
    const plannedItem: NavItem = {
      href: '/test-planned',
      icon: 'Settings',
      label: 'Test planned',
      requiredPermissions: [ROADMAP_PERMISSIONS.TASKS.VIEW],
    };

    expect(canAccessNavigationItem(buildUser({}, true), mistypedLiveItem)).toBe(
      false,
    );
    expect(canAccessNavigationItem(buildUser({}, true), plannedItem)).toBe(
      true,
    );
  });

  it('blocks planned destinations while allowing live and dynamic routes', () => {
    const user = buildUser();

    expect(canOpenNavigationHref(user, '/')).toBe(true);
    expect(canOpenNavigationHref(user, '/mon-compte')).toBe(true);
    expect(canOpenNavigationHref(user, '/mes-notifications')).toBe(true);
    expect(canOpenNavigationHref(user, '/tableau-de-bord/mes-taches')).toBe(
      false,
    );
    expect(canOpenNavigationHref(user, '/resource/dynamic-id')).toBe(true);
    expect(canOpenNavigationHref(user, '/\\evil.example/path')).toBe(false);
    expect(canOpenNavigationHref(user, 'https://evil.example/path')).toBe(
      false,
    );
  });

  it('groups live user administration under the system space', () => {
    const hrefs = getVisibleHrefs({ [PERMISSIONS.USERS.VIEW]: true });

    expect(hrefs).toContain('/systeme');
    expect(hrefs).toContain('/administration/utilisateurs');
    expect(hrefs).not.toContain('/systeme/parametres');
    expect(hrefs).not.toContain('/systeme/journal-activite');
  });

  it('opens the system hub for either live administrative family', () => {
    const systemHub = getNavigationItemByHref('/systeme');

    expect(systemHub).not.toBeNull();
    if (!systemHub) return;

    expect(
      canAccessNavigationItem(
        buildUser({ [PERMISSIONS.USERS.VIEW]: true }),
        systemHub,
      ),
    ).toBe(true);
    expect(
      canAccessNavigationItem(
        buildUser({ [PERMISSIONS.AUDIT.VIEW]: true }),
        systemHub,
      ),
    ).toBe(true);
    expect(canAccessNavigationItem(buildUser(), systemHub)).toBe(false);
  });

  it('shows the live journal while settings stay roadmap-only in navigation', () => {
    const liveHrefs = getVisibleHrefs({ [PERMISSIONS.AUDIT.VIEW]: true });
    const roadmapHrefs = getRoadmapHrefs({
      [PERMISSIONS.SETTINGS.VIEW]: true,
    });

    expect(liveHrefs).toContain('/systeme');
    expect(liveHrefs).toContain('/systeme/journal-activite');
    expect(liveHrefs).not.toContain('/administration/utilisateurs');
    expect(liveHrefs).not.toContain('/systeme/parametres');
    expect(roadmapHrefs).toContain('/systeme/parametres');
    expect(roadmapHrefs).not.toContain('/systeme/journal-activite');
  });

  it('derives system hub tools from authorized live entries', () => {
    const userTools = getLiveNavigationSpaceTools(
      'system',
      buildUser({ [PERMISSIONS.USERS.VIEW]: true }),
    );
    const auditTools = getLiveNavigationSpaceTools(
      'system',
      buildUser({ [PERMISSIONS.AUDIT.VIEW]: true }),
    );
    const allTools = getLiveNavigationSpaceTools(
      'system',
      buildUser({
        [PERMISSIONS.AUDIT.VIEW]: true,
        [PERMISSIONS.USERS.VIEW]: true,
      }),
    );

    expect(userTools.map((item) => item.href)).toEqual([
      '/administration/utilisateurs',
    ]);
    expect(auditTools.map((item) => item.href)).toEqual([
      '/systeme/journal-activite',
    ]);
    expect(allTools.map((item) => item.href)).toEqual([
      '/administration/utilisateurs',
      '/systeme/journal-activite',
    ]);
    expect(getLiveNavigationSpaceTools('system', buildUser())).toEqual([]);
    expect(
      getLiveNavigationSpaceTools('system', buildUser({}, true)).map(
        (item) => item.href,
      ),
    ).toEqual(['/administration/utilisateurs', '/systeme/journal-activite']);
  });

  it('keeps the desktop sidebar live on a direct planned route', () => {
    const sidebarHrefs = getDesktopSidebarSections(
      buildUser(),
      '/vie-interne/membres',
    ).flatMap((section) => flattenHrefs(section.items));

    expect(sidebarHrefs).toEqual([
      '/',
      '/feuille-de-route',
      '/mes-notifications',
      '/recherche',
    ]);
    expect(sidebarHrefs).not.toContain('/vie-interne/membres');
  });

  it('detects active live spaces for dashboard and administration routes', () => {
    const user = buildUser({ [PERMISSIONS.USERS.VIEW]: true });
    const spaces = getVisibleNavigationSpaces(user);

    expect(getActiveNavigationSpace('/', spaces).id).toBe('dashboard');
    expect(
      getActiveNavigationSpace('/administration/utilisateurs', spaces).id,
    ).toBe('system');
  });

  it('resolves historical dashboard routes against their route base', () => {
    expect(
      getNavigationPageBySlug('dashboard', ['mes-taches'])?.item.href,
    ).toBe('/tableau-de-bord/mes-taches');
    expect(getNavigationPageBySlug('dashboard', [])).toBeNull();
  });

  it('returns only planned destinations from the roadmap helper', () => {
    const hrefs = getRoadmapHrefs();

    expect(hrefs).toContain('/vie-interne');
    expect(hrefs).toContain('/vie-interne/membres');
    expect(hrefs).not.toContain('/');
    expect(hrefs).not.toContain('/mon-compte');
    expect(hrefs).not.toContain('/administration/utilisateurs');
  });

  it('shows only live destinations to protected users by default', () => {
    const liveHrefs = getVisibleHrefs({}, true);
    const allHrefs = getVisibleHrefs({}, true, 'all');
    const rawHrefs = NAV_SECTIONS.flatMap((section) =>
      flattenHrefs(section.items),
    );

    expect(liveHrefs).toEqual([
      '/',
      '/feuille-de-route',
      '/mes-notifications',
      '/recherche',
      '/systeme',
      '/administration/utilisateurs',
      '/systeme/journal-activite',
    ]);
    expect(allHrefs).toEqual(rawHrefs);
  });
});
