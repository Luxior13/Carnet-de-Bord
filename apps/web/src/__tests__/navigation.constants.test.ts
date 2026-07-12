import { describe, expect, it } from 'vitest';

import {
  canOpenNavigationHref,
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

    expect(hrefs).toEqual(['/tableau-de-bord']);
    expect(hrefs).not.toContain('/tableau-de-bord/mes-taches');
    expect(hrefs).not.toContain('/vie-interne/membres');
    expect(hrefs).not.toContain('/bureau-juridique');
    expect(hrefs).not.toContain('/tresorerie/operations');
    expect(hrefs).not.toContain('/administration/utilisateurs');
  });

  it('shows dashboard subpages when their module permissions are present', () => {
    const hrefs = getVisibleHrefs({
      [PERMISSIONS.DOCUMENTS.VIEW]: true,
      [PERMISSIONS.INTERNAL.VIEW]: true,
      [PERMISSIONS.LEGAL.VIEW]: true,
      [PERMISSIONS.MEETINGS.VIEW]: true,
      [PERMISSIONS.NOTIFICATIONS.VIEW]: true,
      [PERMISSIONS.TASKS.VIEW]: true,
    });

    expect(hrefs).toContain('/tableau-de-bord/mes-taches');
    expect(hrefs).toContain('/tableau-de-bord/mes-rappels');
    expect(hrefs).toContain('/tableau-de-bord/prochaines-reunions');
    expect(hrefs).toContain('/tableau-de-bord/documents-a-accepter');
    expect(hrefs).toContain('/tableau-de-bord/alertes-importantes');
  });

  it('filters known notification links with the same navigation permissions', () => {
    const user = buildUser();

    expect(canOpenNavigationHref(user, '/tableau-de-bord/mes-rappels')).toBe(
      false,
    );
    expect(canOpenNavigationHref(user, '/tableau-de-bord')).toBe(true);
    expect(canOpenNavigationHref(user, '/resource/dynamic-id')).toBe(true);
    expect(
      canOpenNavigationHref(
        buildUser({ [PERMISSIONS.NOTIFICATIONS.MANAGE]: true }),
        '/vie-interne/notifications-rappels',
      ),
    ).toBe(false);
  });

  it('shows internal navigation with internal module permissions', () => {
    const hrefs = getVisibleHrefs({
      [PERMISSIONS.INTERNAL.VIEW]: true,
      [PERMISSIONS.MEETINGS.VIEW]: true,
      [PERMISSIONS.MEMBERS.VIEW]: true,
    });

    expect(hrefs).toContain('/vie-interne');
    expect(hrefs).toContain('/vie-interne/membres');
    expect(hrefs).toContain('/vie-interne/calendrier-interne');
    expect(hrefs).not.toContain('/vie-interne/onboarding-depart');
    expect(hrefs).not.toContain('/vie-interne/reunions');
    expect(hrefs).not.toContain('/vie-interne/notifications-rappels');
  });

  it('shows internal management pages with update permissions', () => {
    const hrefs = getVisibleHrefs({
      [PERMISSIONS.INTERNAL.VIEW]: true,
      [PERMISSIONS.MEETINGS.UPDATE]: true,
      [PERMISSIONS.MEETINGS.VIEW]: true,
      [PERMISSIONS.MEMBERS.UPDATE]: true,
      [PERMISSIONS.MEMBERS.VIEW]: true,
      [PERMISSIONS.NOTIFICATIONS.MANAGE]: true,
      [PERMISSIONS.NOTIFICATIONS.VIEW]: true,
    });

    expect(hrefs).toContain('/vie-interne/onboarding-depart');
    expect(hrefs).toContain('/vie-interne/reunions');
    expect(hrefs).toContain('/vie-interne/notifications-rappels');
  });

  it('shows legal navigation with legal module permissions', () => {
    const hrefs = getVisibleHrefs({
      [PERMISSIONS.CONTRACTS.VIEW]: true,
      [PERMISSIONS.DOCUMENTS.APPROVE]: true,
      [PERMISSIONS.DOCUMENTS.VIEW]: true,
      [PERMISSIONS.INCIDENTS.VIEW]: true,
      [PERMISSIONS.LEGAL.VIEW]: true,
    });

    expect(hrefs).toContain('/bureau-juridique');
    expect(hrefs).toContain('/bureau-juridique/sponsors');
    expect(hrefs).toContain('/bureau-juridique/documents');
    expect(hrefs).toContain('/bureau-juridique/contrats');
    expect(hrefs).toContain('/bureau-juridique/acceptation-chartes');
    expect(hrefs).toContain('/bureau-juridique/incidents-sanctions');
  });

  it('shows treasury navigation only to accounts with treasury permissions', () => {
    const hrefs = getVisibleHrefs({
      [PERMISSIONS.TREASURY.VIEW]: true,
    });

    expect(hrefs).toContain('/tresorerie');
    expect(hrefs).toContain('/tresorerie/operations');
    expect(hrefs).not.toContain('/tresorerie/exports-finance');
    expect(hrefs).not.toContain('/tresorerie/validations-finance');
    expect(hrefs).not.toContain('/tresorerie/remboursements');
    expect(hrefs).not.toContain('/tresorerie/journal-financier');
    expect(hrefs).not.toContain('/tresorerie/archives-finance');
  });

  it('shows sensitive treasury actions when their finance permissions are present', () => {
    const hrefs = getVisibleHrefs({
      [PERMISSIONS.TREASURY.ARCHIVES]: true,
      [PERMISSIONS.TREASURY.AUDIT]: true,
      [PERMISSIONS.TREASURY.EXPORT]: true,
      [PERMISSIONS.TREASURY.VALIDATE]: true,
      [PERMISSIONS.TREASURY.VIEW]: true,
    });

    expect(hrefs).toContain('/tresorerie/exports-finance');
    expect(hrefs).toContain('/tresorerie/validations-finance');
    expect(hrefs).toContain('/tresorerie/remboursements');
    expect(hrefs).toContain('/tresorerie/journal-financier');
    expect(hrefs).toContain('/tresorerie/archives-finance');
    expect(hrefs).toContain('/tresorerie/operations');
  });

  it('shows sport navigation with sport permissions', () => {
    const hrefs = getVisibleHrefs({
      [PERMISSIONS.SPORT.VIEW]: true,
    });

    expect(hrefs).toContain('/sport-team-control');
    expect(hrefs).toContain('/sport-team-control/rosters');
    expect(hrefs).not.toContain('/sport-team-control/scrims');
    expect(hrefs).not.toContain('/sport-team-control/tournois-matchs');
  });

  it('shows sport management pages with sport update permission', () => {
    const hrefs = getVisibleHrefs({
      [PERMISSIONS.SPORT.UPDATE]: true,
      [PERMISSIONS.SPORT.VIEW]: true,
    });

    expect(hrefs).toContain('/sport-team-control/scrims');
    expect(hrefs).toContain('/sport-team-control/tournois-matchs');
    expect(hrefs).toContain('/sport-team-control/recrutement-tryouts');
  });

  it('hides the dashboard when the dashboard permission is explicitly revoked', () => {
    const user = buildUser({
      [PERMISSIONS.DASHBOARD.VIEW]: false,
    });
    const hrefs = getVisibleHrefs(user.permissions);

    expect(hrefs).toEqual([]);
    expect(getDesktopSidebarSections(user, '/tableau-de-bord')).toEqual([]);
  });

  it('shows users navigation to accounts with users view permission', () => {
    const hrefs = getVisibleHrefs({
      [PERMISSIONS.USERS.VIEW]: true,
    });

    expect(hrefs).toContain('/tableau-de-bord');
    expect(hrefs).not.toContain('/systeme');
    expect(hrefs).toContain('/administration/utilisateurs');
  });

  it('shows system navigation to accounts with system permissions', () => {
    const hrefs = getVisibleHrefs({
      [PERMISSIONS.SYSTEM.AUDIT]: true,
      [PERMISSIONS.SYSTEM.SETTINGS]: true,
      [PERMISSIONS.SYSTEM.VIEW]: true,
    });

    expect(hrefs).toContain('/systeme');
    expect(hrefs).toContain('/systeme/journal-activite');
    expect(hrefs).toContain('/systeme/parametres');
    expect(hrefs).not.toContain('/administration/utilisateurs');
  });

  it('hides dependent system pages without system view permission', () => {
    const hrefs = getVisibleHrefs({
      [PERMISSIONS.SYSTEM.AUDIT]: true,
      [PERMISSIONS.SYSTEM.SETTINGS]: true,
    });

    expect(hrefs).not.toContain('/systeme');
    expect(hrefs).not.toContain('/systeme/journal-activite');
    expect(hrefs).not.toContain('/systeme/parametres');
  });

  it('hides dependent pole pages without their base pole permission', () => {
    const hrefs = getVisibleHrefs({
      [PERMISSIONS.DOCUMENTS.VIEW]: true,
      [PERMISSIONS.MEMBERS.VIEW]: true,
      [PERMISSIONS.SPORT.UPDATE]: true,
    });

    expect(hrefs).not.toContain('/vie-interne/membres');
    expect(hrefs).not.toContain('/bureau-juridique/documents');
    expect(hrefs).not.toContain('/sport-team-control/scrims');
  });

  it('shows the active space in the desktop sidebar', () => {
    const user = buildUser({
      [PERMISSIONS.INTERNAL.VIEW]: true,
      [PERMISSIONS.MEMBERS.VIEW]: true,
    });

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
