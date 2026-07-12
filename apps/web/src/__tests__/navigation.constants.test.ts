import { describe, expect, it } from 'vitest';

import {
  canAccessNavigationItem,
  canOpenNavigationHref,
  getActiveNavigationSpace,
  getDesktopSidebarSections,
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

describe('navigation availability', () => {
  it('shows only operational destinations in the default navigation', () => {
    const hrefs = getVisibleHrefs();

    expect(hrefs).toEqual(['/', '/mon-compte', '/feuille-de-route']);
    expect(hrefs).not.toContain('/tableau-de-bord/mes-taches');
    expect(hrefs).not.toContain('/vie-interne');
    expect(hrefs).not.toContain('/recherche');
  });

  it('keeps permitted planned destinations out of the main navigation', () => {
    const permissions = {
      [PERMISSIONS.INTERNAL.VIEW]: true,
      [PERMISSIONS.MEETINGS.VIEW]: true,
      [PERMISSIONS.MEMBERS.VIEW]: true,
      [PERMISSIONS.TASKS.VIEW]: true,
    };
    const liveHrefs = getVisibleHrefs(permissions);
    const plannedHrefs = getVisibleHrefs(permissions, false, 'planned');

    expect(liveHrefs).not.toContain('/tableau-de-bord/mes-taches');
    expect(liveHrefs).not.toContain('/vie-interne/membres');
    expect(plannedHrefs).toContain('/tableau-de-bord/mes-taches');
    expect(plannedHrefs).toContain('/vie-interne');
    expect(plannedHrefs).toContain('/vie-interne/membres');
    expect(plannedHrefs).toContain('/vie-interne/calendrier-interne');
  });

  it('treats unpromoted destinations as planned by default', () => {
    const dashboard = getNavigationItemByHref('/');
    const tasks = getNavigationItemByHref('/tableau-de-bord/mes-taches');

    expect(dashboard && getNavigationAvailability(dashboard)).toBe('live');
    expect(tasks && getNavigationAvailability(tasks)).toBe('planned');
  });

  it('opens only live known destinations from shell affordances', () => {
    const user = buildUser({
      [PERMISSIONS.NOTIFICATIONS.VIEW]: true,
    });

    expect(canOpenNavigationHref(user, '/')).toBe(true);
    expect(canOpenNavigationHref(user, '/mon-compte')).toBe(true);
    expect(canOpenNavigationHref(user, '/tableau-de-bord/mes-rappels')).toBe(
      false,
    );
    expect(canOpenNavigationHref(user, '/resource/dynamic-id')).toBe(true);
  });

  it('groups live user administration under the system space', () => {
    const hrefs = getVisibleHrefs({
      [PERMISSIONS.USERS.VIEW]: true,
    });

    expect(hrefs).toContain('/systeme');
    expect(hrefs).toContain('/administration/utilisateurs');
    expect(hrefs).not.toContain('/systeme/parametres');
    expect(hrefs).not.toContain('/systeme/journal-activite');
  });

  it('opens the system hub when at least one live tool is authorized', () => {
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
        buildUser({
          [PERMISSIONS.SYSTEM.AUDIT]: true,
          [PERMISSIONS.SYSTEM.VIEW]: true,
        }),
        systemHub,
      ),
    ).toBe(true);
    expect(canAccessNavigationItem(buildUser(), systemHub)).toBe(false);
  });

  it('shows the live journal while keeping other system tools planned', () => {
    const permissions = {
      [PERMISSIONS.SYSTEM.AUDIT]: true,
      [PERMISSIONS.SYSTEM.SETTINGS]: true,
      [PERMISSIONS.SYSTEM.VIEW]: true,
    };
    const liveHrefs = getVisibleHrefs(permissions);
    const plannedHrefs = getVisibleHrefs(permissions, false, 'planned');

    expect(liveHrefs).toContain('/systeme');
    expect(liveHrefs).toContain('/systeme/journal-activite');
    expect(liveHrefs).not.toContain('/administration/utilisateurs');
    expect(liveHrefs).not.toContain('/systeme/parametres');
    expect(plannedHrefs).toContain('/systeme/parametres');
    expect(plannedHrefs).not.toContain('/systeme/journal-activite');
  });

  it('keeps finance, legal and sport destinations on the roadmap', () => {
    const permissions = {
      [PERMISSIONS.LEGAL.VIEW]: true,
      [PERMISSIONS.SPORT.UPDATE]: true,
      [PERMISSIONS.SPORT.VIEW]: true,
      [PERMISSIONS.TREASURY.VIEW]: true,
    };
    const liveHrefs = getVisibleHrefs(permissions);
    const plannedHrefs = getVisibleHrefs(permissions, false, 'planned');

    expect(liveHrefs).not.toContain('/bureau-juridique');
    expect(liveHrefs).not.toContain('/tresorerie/operations');
    expect(liveHrefs).not.toContain('/sport-team-control');
    expect(plannedHrefs).toContain('/bureau-juridique');
    expect(plannedHrefs).toContain('/tresorerie/operations');
    expect(plannedHrefs).toContain('/sport-team-control');
    expect(plannedHrefs).toContain('/sport-team-control/scrims');
  });

  it('keeps the desktop sidebar live on a direct planned route', () => {
    const user = buildUser({
      [PERMISSIONS.INTERNAL.VIEW]: true,
      [PERMISSIONS.MEMBERS.VIEW]: true,
    });
    const sidebarHrefs = getDesktopSidebarSections(
      user,
      '/vie-interne/membres',
    ).flatMap((section) => flattenHrefs(section.items));

    expect(sidebarHrefs).toEqual(['/', '/mon-compte', '/feuille-de-route']);
    expect(sidebarHrefs).not.toContain('/vie-interne/membres');
  });

  it('detects active live spaces for dashboard and administration routes', () => {
    const user = buildUser({
      [PERMISSIONS.USERS.VIEW]: true,
    });
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

  it('returns only permission-filtered planned spaces for the roadmap', () => {
    const spaces = getPlannedNavigationSpaces(
      buildUser({
        [PERMISSIONS.INTERNAL.VIEW]: true,
        [PERMISSIONS.MEMBERS.VIEW]: true,
      }),
    );
    const hrefs = spaces.flatMap((space) =>
      space.sections.flatMap((section) => flattenHrefs(section.items)),
    );

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
      '/mon-compte',
      '/feuille-de-route',
      '/systeme',
      '/administration/utilisateurs',
      '/systeme/journal-activite',
    ]);
    expect(allHrefs).toEqual(rawHrefs);
  });
});
