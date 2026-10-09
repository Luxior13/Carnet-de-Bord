import { describe, expect, it } from 'vitest';

import {
  canAccessNavigationItem,
  canOpenNavigationHref,
  getActiveNavigationSpace,
  getDesktopSidebarSections,
  getNavigationAvailability,
  getNavigationItemByHref,
  getNavigationPageBySlug,
  getVisibleNavigationSpaces,
  getVisibleNavSections,
  NAV_SECTIONS,
  type NavigationAvailabilityFilter,
  type NavItem,
} from '$constants/app.constants';
import { FEATURES } from '$constants/feature-registry.constants';
import {
  PERMISSIONS,
  ROADMAP_PERMISSIONS,
} from '$constants/permissions.constants';
import { ROADMAP_ITEMS } from '$features/roadmap/roadmap.constants';

type TestUser = {
  isProtected: boolean;
  permissions: Record<string, boolean>;
  role: 'ADMIN' | 'USER';
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

function buildAdmin(): TestUser {
  return {
    isProtected: false,
    permissions: {},
    role: 'ADMIN',
  };
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

function getRoadmapHrefs(): string[] {
  return ROADMAP_ITEMS.flatMap((item) => item.legacyHrefs ?? []);
}

describe('navigation availability', () => {
  it('shows the live baseline destinations without individual grants', () => {
    const hrefs = getVisibleHrefs({
      [PERMISSIONS.DASHBOARD.VIEW]: false,
    });

    expect(hrefs).toEqual(['/', '/systeme/feuille-de-route']);
    expect(hrefs).not.toContain('/tableau-de-bord/mes-taches');
    expect(hrefs).not.toContain('/vie-interne');
  });

  it('publishes the complete roadmap without dormant permission grants', () => {
    const hrefs = getRoadmapHrefs();

    expect(hrefs).toContain('/tableau-de-bord/mes-taches');
    expect(hrefs).toContain('/vie-interne/reunions');
    expect(hrefs).toContain('/vie-interne/calendrier-interne');
    expect(hrefs).not.toContain('/membres/repertoire');
    expect(hrefs).toContain('/bureau-juridique/documents');
    expect(hrefs).toContain('/bureau-juridique/partenaires');
    expect(hrefs).toContain('/tresorerie/operations');
    expect(hrefs).toContain('/sport-team-control');
    expect(hrefs).not.toContain('/systeme/parametres');
  });

  it('keeps planned capabilities ineffective and outside the operational menu', () => {
    const tasks: NavItem = {
      href: '/tableau-de-bord/mes-taches',
      icon: 'ClipboardList',
      label: 'Mes tâches',
      requiredPermissions: [ROADMAP_PERMISSIONS.TASKS.VIEW],
    };
    expect(getNavigationItemByHref(tasks.href)).toBeNull();
    expect(getNavigationAvailability(tasks)).toBe('planned');
    expect(
      canAccessNavigationItem(
        buildUser({ [ROADMAP_PERMISSIONS.TASKS.VIEW]: true }),
        tasks,
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
    expect(canOpenNavigationHref(user, '/mon-compte?section=security')).toBe(
      true,
    );
    expect(
      canOpenNavigationHref(user, '/systeme/parametres?section=retention'),
    ).toBe(false);
    expect(
      canOpenNavigationHref(
        buildAdmin(),
        '/systeme/parametres?section=retention',
      ),
    ).toBe(true);
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

    expect(hrefs).toContain('/systeme/utilisateurs');
    expect(hrefs).not.toContain('/systeme');
    expect(hrefs).not.toContain('/systeme/parametres');
    expect(hrefs).not.toContain('/systeme/journal-activite');
  });

  it('publishes the canonical persons page in the internal space', () => {
    const user = buildUser({ [PERMISSIONS.PERSONS.VIEW]: true });
    const hrefs = getVisibleHrefs(user.permissions);

    expect(hrefs).toContain('/membres/repertoire');
    expect(hrefs).not.toContain('/vie-interne/membres');
    expect(hrefs).not.toContain('/bureau-juridique/personnes-contacts');
    expect(
      getActiveNavigationSpace('/membres/repertoire', [
        ...getVisibleNavigationSpaces(user),
      ]).id,
    ).toBe('internal');
  });

  it('shows system settings live for administrators and removes them from the roadmap', () => {
    const liveHrefs = getVisibleHrefs({ [PERMISSIONS.AUDIT.VIEW]: true });
    const adminHrefs = getVisibleNavigationSpaces(buildAdmin()).flatMap(
      (space) =>
        space.sections.flatMap((section) => flattenHrefs(section.items)),
    );
    const roadmapHrefs = getRoadmapHrefs();

    expect(liveHrefs).toContain('/systeme/journal-activite');
    expect(liveHrefs).not.toContain('/systeme');
    expect(liveHrefs).not.toContain('/systeme/utilisateurs');
    expect(liveHrefs).not.toContain('/systeme/parametres');
    expect(adminHrefs).toContain('/systeme/parametres');
    expect(roadmapHrefs).not.toContain('/systeme/parametres');
    expect(roadmapHrefs).not.toContain('/systeme/journal-activite');
  });

  it('keeps the desktop sidebar live on a direct planned route', () => {
    const sidebarHrefs = getDesktopSidebarSections(
      buildUser(),
      '/vie-interne/reunions',
    ).flatMap((section) => flattenHrefs(section.items));

    expect(sidebarHrefs).toEqual(['/']);
    expect(sidebarHrefs).not.toContain('/vie-interne/reunions');
  });

  it('detects active live spaces for dashboard and administration routes', () => {
    const user = buildUser({ [PERMISSIONS.USERS.VIEW]: true });
    const spaces = getVisibleNavigationSpaces(user);

    expect(getActiveNavigationSpace('/', spaces).id).toBe('dashboard');
    expect(getActiveNavigationSpace('/systeme/utilisateurs', spaces).id).toBe(
      'system',
    );
    const personSpaces = getVisibleNavigationSpaces(
      buildUser({ [PERMISSIONS.PERSONS.VIEW]: true }),
    );
    expect(
      getActiveNavigationSpace('/membres/repertoire', personSpaces).id,
    ).toBe('internal');
    // The system pole has no hub page anymore: its remaining destinations must
    // still resolve to the system space for the sidebar highlight.
    expect(
      getActiveNavigationSpace(
        '/systeme/parametres',
        getVisibleNavigationSpaces(buildAdmin()),
      ).id,
    ).toBe('system');
  });

  it('hides a live feature whose operational readiness is unavailable', () => {
    const user = buildUser({ [PERMISSIONS.PERSONS.VIEW]: true });
    const operationalFeatures = new Set(
      Object.values(FEATURES)
        .filter((feature) => feature.id !== FEATURES.persons.id)
        .map((feature) => feature.id),
    );
    const hrefs = getVisibleNavigationSpaces(
      user,
      'live',
      operationalFeatures,
    ).flatMap((space) =>
      space.sections.flatMap((section) => flattenHrefs(section.items)),
    );

    expect(hrefs).not.toContain('/membres/repertoire');
    expect(hrefs).toContain('/');
  });

  it('does not resolve unimplemented dashboard routes as operational pages', () => {
    expect(getNavigationPageBySlug('dashboard', ['mes-taches'])).toBeNull();
    expect(getNavigationPageBySlug('dashboard', [])).toBeNull();
  });

  it('returns only planned destinations from the roadmap helper', () => {
    const hrefs = getRoadmapHrefs();

    expect(hrefs).toContain('/vie-interne/reunions');
    expect(hrefs).not.toContain('/membres/repertoire');
    expect(hrefs).not.toContain('/');
    expect(hrefs).not.toContain('/mon-compte');
    expect(hrefs).not.toContain('/systeme/utilisateurs');
  });

  it('shows only live destinations to protected users by default', () => {
    const liveHrefs = getVisibleHrefs({}, true);
    const allHrefs = getVisibleHrefs({}, true, 'all');
    const rawHrefs = NAV_SECTIONS.flatMap((section) =>
      flattenHrefs(section.items),
    );

    expect(liveHrefs).toEqual([
      '/',
      '/membres/repertoire',
      '/systeme/utilisateurs',
      '/systeme/journal-activite',
      '/systeme/parametres',
      '/systeme/feuille-de-route',
    ]);
    expect(allHrefs).toEqual(rawHrefs);
  });
});
