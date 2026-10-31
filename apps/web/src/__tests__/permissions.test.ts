import { describe, expect, it } from 'vitest';

import {
  ACCOUNT_PERMISSION_CATEGORIES,
  arePermissionOverridesEqual,
  buildPermissionOverrides,
  DELEGABLE_PERMISSION_CATEGORIES,
  enforcePermissionDependencies,
  getAccessPermissionKeys,
  getAllPermissionKeys,
  getEffectivePermissions,
  getNonAssignablePermissionKeys,
  getPermissionDisplayLabel,
  getPermissionItem,
  getRoleBasePermissions,
  getUnknownPermissionKeys,
  hasPermission,
  isKnownPermissionKey,
  isPermissionAlwaysEnabled,
  isPermissionGrantable,
  normalizePermissionOverrides,
  omitAccessPermissionOverrides,
  PERMISSION_CATEGORIES,
  PERMISSION_POLES,
  PERMISSIONS,
  ROADMAP_PERMISSIONS,
  ROLE_PERMISSIONS,
} from '../shared/constants/permissions.constants';

const roadmapPermissionKeys = Object.values(ROADMAP_PERMISSIONS).flatMap(
  (family) => Object.values(family),
);

describe('hasPermission', () => {
  it('uses the canonical role presets when no override is stored', () => {
    expect(hasPermission('USER', PERMISSIONS.ACCOUNT.VIEW_PROFILE)).toBe(true);
    expect(hasPermission('USER', PERMISSIONS.ACCOUNT.UPDATE_PROFILE)).toBe(
      true,
    );
    expect(hasPermission('USER', PERMISSIONS.ACCOUNT.UPDATE_CONTACT)).toBe(
      true,
    );
    expect(hasPermission('USER', PERMISSIONS.ACCOUNT.CHANGE_PASSWORD)).toBe(
      true,
    );
    expect(hasPermission('USER', PERMISSIONS.ACCOUNT.MANAGE_MFA)).toBe(true);
    expect(hasPermission('USER', PERMISSIONS.DASHBOARD.VIEW)).toBe(true);

    expect(hasPermission('ADMIN', PERMISSIONS.USERS.CREATE)).toBe(true);
    expect(hasPermission('ADMIN', PERMISSIONS.USERS.REVOKE_SESSIONS)).toBe(
      true,
    );
    expect(hasPermission('ADMIN', PERMISSIONS.USERS.UPDATE_LOGIN)).toBe(true);
    expect(
      hasPermission('ADMIN', PERMISSIONS.USERS.UPDATE_ACCOUNT_POLICY),
    ).toBe(true);
    expect(hasPermission('ADMIN', PERMISSIONS.USERS.GRANT_ACCESS)).toBe(true);
    expect(hasPermission('ADMIN', PERMISSIONS.USERS.REVOKE_ACCESS)).toBe(true);
    expect(hasPermission('ADMIN', PERMISSIONS.USERS.DELEGATE_ACCESS)).toBe(
      true,
    );
    // The activity journal is live since 30 October 2026.
    expect(hasPermission('ADMIN', PERMISSIONS.AUDIT.VIEW)).toBe(true);
    expect(hasPermission('ADMIN', ROADMAP_PERMISSIONS.BACKUPS.VIEW)).toBe(
      false,
    );
    // Field history left the catalogue on 27 October 2026.
    expect(hasPermission('ADMIN', 'audit:view_field_history')).toBe(false);
    expect(hasPermission('ADMIN', PERMISSIONS.PERSONS.VIEW)).toBe(true);
    expect(hasPermission('ADMIN', PERMISSIONS.PERSONS.CREATE)).toBe(true);
    expect(hasPermission('ADMIN', PERMISSIONS.PERSONS.UPDATE)).toBe(true);
    expect(hasPermission('ADMIN', PERMISSIONS.PERSONS.DELETE)).toBe(true);

    expect(hasPermission('USER', PERMISSIONS.USERS.CREATE)).toBe(false);
    expect(hasPermission('USER', PERMISSIONS.USERS.GRANT_ACCESS)).toBe(false);
    expect(hasPermission('USER', PERMISSIONS.USERS.REVOKE_ACCESS)).toBe(false);
    expect(hasPermission('USER', PERMISSIONS.USERS.DELEGATE_ACCESS)).toBe(
      false,
    );
    expect(hasPermission('USER', PERMISSIONS.USERS.REVOKE_SESSIONS)).toBe(
      false,
    );
    expect(hasPermission('USER', PERMISSIONS.AUDIT.VIEW)).toBe(false);
    expect(hasPermission('USER', PERMISSIONS.PERSONS.VIEW)).toBe(false);
  });

  it('lets grantable overrides change access when dependencies are effective', () => {
    const customPermissions = {
      [PERMISSIONS.USERS.CREATE]: false,
      [PERMISSIONS.USERS.REVOKE_SESSIONS]: true,
      [PERMISSIONS.USERS.VIEW]: true,
      [PERMISSIONS.USERS.VIEW_SESSIONS]: true,
      [PERMISSIONS.USERS.VIEW_SECURITY]: true,
    };

    expect(
      hasPermission('USER', PERMISSIONS.USERS.CREATE, customPermissions),
    ).toBe(false);
    expect(
      hasPermission('USER', PERMISSIONS.USERS.VIEW, customPermissions),
    ).toBe(true);
    expect(
      hasPermission(
        'USER',
        PERMISSIONS.USERS.REVOKE_SESSIONS,
        customPermissions,
      ),
    ).toBe(true);
  });

  it('keeps every administrative access for an ADMIN despite access overrides', () => {
    const deniedAccess = {
      [PERMISSIONS.USERS.REVOKE_SESSIONS]: false,
      [PERMISSIONS.USERS.VIEW]: false,
    };

    expect(
      hasPermission('ADMIN', PERMISSIONS.USERS.REVOKE_SESSIONS, deniedAccess),
    ).toBe(true);
    expect(hasPermission('ADMIN', PERMISSIONS.USERS.VIEW, deniedAccess)).toBe(
      true,
    );
    expect(hasPermission('USER', PERMISSIONS.USERS.VIEW, deniedAccess)).toBe(
      false,
    );
    expect(enforcePermissionDependencies('ADMIN', deniedAccess)).toBeNull();
    expect(
      omitAccessPermissionOverrides({
        ...deniedAccess,
        [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false,
      }),
    ).toEqual({ [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false });
  });

  it('keeps dashboard enabled as baseline access', () => {
    const deniedBaseline = {
      [PERMISSIONS.DASHBOARD.VIEW]: false,
    };

    expect(
      hasPermission('USER', PERMISSIONS.DASHBOARD.VIEW, deniedBaseline),
    ).toBe(true);
    expect(normalizePermissionOverrides(deniedBaseline)).toBeNull();
    expect(isPermissionAlwaysEnabled(PERMISSIONS.DASHBOARD.VIEW)).toBe(true);
  });

  it('keeps role-bound capabilities outside per-user overrides', () => {
    const attemptedGrant = {
      [PERMISSIONS.SETTINGS.UPDATE]: true,
      [PERMISSIONS.SETTINGS.VIEW]: true,
    };

    expect(normalizePermissionOverrides(attemptedGrant)).toBeNull();
    expect(isPermissionGrantable(PERMISSIONS.SETTINGS.VIEW)).toBe(false);
    expect(isPermissionGrantable(PERMISSIONS.SETTINGS.UPDATE)).toBe(false);
    expect(
      hasPermission('USER', PERMISSIONS.SETTINGS.VIEW, attemptedGrant),
    ).toBe(false);
    expect(
      hasPermission('USER', PERMISSIONS.SETTINGS.UPDATE, attemptedGrant),
    ).toBe(false);
    expect(
      hasPermission('ADMIN', PERMISSIONS.SETTINGS.UPDATE, {
        [PERMISSIONS.SETTINGS.UPDATE]: false,
      }),
    ).toBe(true);
    expect(
      hasPermission('ADMIN', PERMISSIONS.SETTINGS.VIEW, {
        [PERMISSIONS.SETTINGS.VIEW]: false,
      }),
    ).toBe(true);
    expect(getPermissionItem(PERMISSIONS.SETTINGS.VIEW)).toMatchObject({
      route: '/systeme/parametres',
      surface: 'page',
    });
    expect(getPermissionItem(PERMISSIONS.SETTINGS.UPDATE)).toMatchObject({
      dependencies: [PERMISSIONS.SETTINGS.VIEW],
      requiresTargetMfa: true,
      route: '/systeme/parametres',
      surface: 'page',
    });
    expect(
      getPermissionItem(PERMISSIONS.SETTINGS.UPDATE)?.stepUpOnUse,
    ).toBeUndefined();
  });

  it('never grants unknown or roadmap-only capability names', () => {
    expect(hasPermission('ADMIN', 'users:ghost', { 'users:ghost': true })).toBe(
      false,
    );
    expect(
      hasPermission('ADMIN', ROADMAP_PERMISSIONS.TASKS.VIEW, {
        [ROADMAP_PERMISSIONS.TASKS.VIEW]: true,
      }),
    ).toBe(false);
  });

  it('exposes role base states only for canonical effective permissions', () => {
    const userRoleBasePermissions = getRoleBasePermissions('USER');
    const userRoleBasePermissionsMap = new Map(
      Object.entries(userRoleBasePermissions),
    );

    for (const permissionKey of Object.values(PERMISSIONS.ACCOUNT).filter(
      isKnownPermissionKey,
    )) {
      expect(userRoleBasePermissionsMap.get(permissionKey)).toBe(true);
    }
    expect(userRoleBasePermissions[PERMISSIONS.DASHBOARD.VIEW]).toBe(true);
    expect(userRoleBasePermissions[PERMISSIONS.USERS.VIEW]).toBe(false);
    expect(userRoleBasePermissions[PERMISSIONS.AUDIT.VIEW]).toBe(false);
    expect(userRoleBasePermissions).not.toHaveProperty(
      ROADMAP_PERMISSIONS.BACKUPS.VIEW,
    );
    expect(userRoleBasePermissions).not.toHaveProperty(
      ROADMAP_PERMISSIONS.INTERNAL.VIEW,
    );
  });

  it('builds compact overrides instead of storing role defaults', () => {
    expect(
      buildPermissionOverrides('USER', [
        ...ROLE_PERMISSIONS.USER,
        PERMISSIONS.USERS.VIEW,
      ]),
    ).toEqual({ [PERMISSIONS.USERS.VIEW]: true });
    expect(buildPermissionOverrides('USER', ROLE_PERMISSIONS.USER)).toBeNull();
  });

  it('stores an explicit deny for a leaf permission granted by role', () => {
    const adminWithoutCreate = ROLE_PERMISSIONS.ADMIN.filter(
      (permissionKey) => permissionKey !== PERMISSIONS.USERS.CREATE,
    );

    expect(buildPermissionOverrides('ADMIN', adminWithoutCreate)).toEqual({
      [PERMISSIONS.USERS.CREATE]: false,
    });
  });

  it('distinguishes an explicit deny override from a missing override', () => {
    expect(
      arePermissionOverridesEqual({ [PERMISSIONS.USERS.VIEW]: false }, null),
    ).toBe(false);
    expect(arePermissionOverridesEqual(null, {})).toBe(true);
  });

  it('requires linked user read permissions before secondary actions', () => {
    expect(
      hasPermission('USER', PERMISSIONS.USERS.UPDATE_PROFILE, {
        [PERMISSIONS.USERS.UPDATE_PROFILE]: true,
        [PERMISSIONS.USERS.VIEW]: false,
      }),
    ).toBe(false);
    expect(
      hasPermission('USER', PERMISSIONS.USERS.UPDATE_PROFILE, {
        [PERMISSIONS.USERS.UPDATE_PROFILE]: true,
        [PERMISSIONS.USERS.VIEW]: true,
      }),
    ).toBe(true);
    expect(
      hasPermission('USER', PERMISSIONS.USERS.UPDATE_CONTACT, {
        [PERMISSIONS.USERS.UPDATE_CONTACT]: true,
        [PERMISSIONS.USERS.VIEW]: true,
        [PERMISSIONS.USERS.VIEW_CONTACT]: false,
      }),
    ).toBe(false);
    expect(
      hasPermission('USER', PERMISSIONS.USERS.UPDATE_CONTACT, {
        [PERMISSIONS.USERS.UPDATE_CONTACT]: true,
        [PERMISSIONS.USERS.VIEW]: true,
        [PERMISSIONS.USERS.VIEW_CONTACT]: true,
      }),
    ).toBe(true);
    expect(
      hasPermission('USER', PERMISSIONS.USERS.UPDATE_ACCOUNT_POLICY, {
        [PERMISSIONS.USERS.UPDATE_ACCOUNT_POLICY]: true,
        [PERMISSIONS.USERS.VIEW]: true,
        [PERMISSIONS.USERS.VIEW_ACCOUNT_POLICY]: false,
      }),
    ).toBe(false);
    expect(
      hasPermission('USER', PERMISSIONS.USERS.UPDATE_ACCOUNT_POLICY, {
        [PERMISSIONS.USERS.UPDATE_ACCOUNT_POLICY]: true,
        [PERMISSIONS.USERS.VIEW]: true,
        [PERMISSIONS.USERS.VIEW_ACCOUNT_POLICY]: true,
      }),
    ).toBe(true);
  });

  it('ignores the retired field history key, even stored as granted', () => {
    expect(
      hasPermission('USER', 'audit:view_field_history', {
        'audit:view_field_history': true,
        [PERMISSIONS.PERSONS.VIEW]: true,
      }),
    ).toBe(false);
    expect(
      hasPermission('USER', ROADMAP_PERMISSIONS.BACKUPS.VIEW, {
        [ROADMAP_PERMISSIONS.BACKUPS.VIEW]: true,
      }),
    ).toBe(false);
    // A granted journal access is effective, like any live page.
    expect(
      hasPermission('USER', PERMISSIONS.AUDIT.VIEW, {
        [PERMISSIONS.AUDIT.VIEW]: true,
      }),
    ).toBe(true);
  });

  it('enforces the persons read dependency without coupling contextual audit', () => {
    expect(
      hasPermission('USER', PERMISSIONS.PERSONS.UPDATE, {
        [PERMISSIONS.PERSONS.UPDATE]: true,
      }),
    ).toBe(false);
    expect(
      hasPermission('USER', PERMISSIONS.PERSONS.UPDATE, {
        [PERMISSIONS.PERSONS.UPDATE]: true,
        [PERMISSIONS.PERSONS.VIEW]: true,
      }),
    ).toBe(true);
  });

  it('keeps essential personal account actions enabled despite deny overrides', () => {
    expect(
      hasPermission('USER', PERMISSIONS.ACCOUNT.VIEW_PROFILE, {
        [PERMISSIONS.ACCOUNT.VIEW_PROFILE]: false,
      }),
    ).toBe(true);
    expect(
      hasPermission('USER', PERMISSIONS.ACCOUNT.CHANGE_PASSWORD, {
        [PERMISSIONS.ACCOUNT.CHANGE_PASSWORD]: false,
        [PERMISSIONS.ACCOUNT.VIEW_SECURITY]: false,
      }),
    ).toBe(true);
    expect(
      hasPermission('USER', PERMISSIONS.ACCOUNT.MANAGE_SESSIONS, {
        [PERMISSIONS.ACCOUNT.MANAGE_SESSIONS]: false,
      }),
    ).toBe(true);
    expect(
      hasPermission('USER', PERMISSIONS.ACCOUNT.UPDATE_CONTACT, {
        [PERMISSIONS.ACCOUNT.UPDATE_CONTACT]: false,
      }),
    ).toBe(true);
  });

  it('keeps personal profile updates configurable', () => {
    expect(
      hasPermission('USER', PERMISSIONS.ACCOUNT.UPDATE_PROFILE, {
        [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false,
      }),
    ).toBe(false);
  });
});

describe('enforcePermissionDependencies', () => {
  it('removes an orphan grant instead of leaving it dormant', () => {
    expect(
      enforcePermissionDependencies('USER', {
        [PERMISSIONS.USERS.DELEGATE_ACCESS]: true,
      }),
    ).toBeNull();
  });

  it('keeps a grant when its complete dependency chain is explicit', () => {
    expect(
      enforcePermissionDependencies('USER', {
        [PERMISSIONS.USERS.GRANT_ACCESS]: true,
        [PERMISSIONS.USERS.VIEW]: true,
        [PERMISSIONS.USERS.VIEW_ACCESS]: true,
      }),
    ).toEqual({
      [PERMISSIONS.USERS.GRANT_ACCESS]: true,
      [PERMISSIONS.USERS.VIEW]: true,
      [PERMISSIONS.USERS.VIEW_ACCESS]: true,
    });
  });

  it('keeps delegation only with grant, revoke and view dependencies', () => {
    const completeDelegation = {
      [PERMISSIONS.USERS.DELEGATE_ACCESS]: true,
      [PERMISSIONS.USERS.GRANT_ACCESS]: true,
      [PERMISSIONS.USERS.REVOKE_ACCESS]: true,
      [PERMISSIONS.USERS.VIEW]: true,
      [PERMISSIONS.USERS.VIEW_ACCESS]: true,
    };

    expect(enforcePermissionDependencies('USER', completeDelegation)).toEqual(
      completeDelegation,
    );
  });
});

describe('permission catalogue', () => {
  it('defines an acyclic dependency graph with known keys', () => {
    const permissionKeys = getAllPermissionKeys();
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (permissionKey: string): void => {
      expect(visiting.has(permissionKey), `cycle at ${permissionKey}`).toBe(
        false,
      );
      if (visited.has(permissionKey)) return;

      visiting.add(permissionKey);
      const permission = getPermissionItem(permissionKey);

      expect(permission).toBeDefined();
      for (const dependencyKey of permission?.dependencies ?? []) {
        expect(isKnownPermissionKey(dependencyKey)).toBe(true);
        visit(dependencyKey);
      }

      visiting.delete(permissionKey);
      visited.add(permissionKey);
    };

    for (const permissionKey of permissionKeys) visit(permissionKey);
  });

  it('derives target MFA requirements from every critical non-self right', () => {
    for (const permissionKey of getAllPermissionKeys()) {
      const permission = getPermissionItem(permissionKey);

      expect(permission?.requiresTargetMfa).toBe(
        permission?.surface !== 'self' && permission?.risk === 'critical',
      );
    }
  });

  it('keeps delegated account-policy changes free of step-up friction', () => {
    expect(
      getPermissionItem(PERMISSIONS.USERS.UPDATE_ACCOUNT_POLICY)?.stepUpOnUse,
    ).toBeUndefined();
  });

  it('marks access authorities as critical without blanket step-up friction', () => {
    for (const permissionKey of [
      PERMISSIONS.USERS.GRANT_ACCESS,
      PERMISSIONS.USERS.REVOKE_ACCESS,
      PERMISSIONS.USERS.DELEGATE_ACCESS,
    ]) {
      expect(getPermissionItem(permissionKey)).toMatchObject({
        requiresTargetMfa: true,
        risk: 'critical',
      });
      expect(getPermissionItem(permissionKey)?.stepUpOnUse).toBeUndefined();
    }
  });

  it('keeps critical journal and person deletion free of per-use step-up', () => {
    for (const permissionKey of [PERMISSIONS.PERSONS.DELETE]) {
      expect(getPermissionItem(permissionKey)).toMatchObject({
        requiresTargetMfa: true,
        risk: 'critical',
      });
      expect(getPermissionItem(permissionKey)?.stepUpOnUse).toBeUndefined();
    }
  });

  it('contains only the canonical effective permission families', () => {
    expect(getAllPermissionKeys()).toEqual([
      'dashboard:view',
      'settings:view',
      'settings:update',
      'persons:view',
      'persons:create',
      'persons:update',
      'persons:view_contact',
      'persons:update_contact',
      'persons:delete',
      'users:view',
      'users:create',
      'users:view_contact',
      'users:update_profile',
      'users:update_contact',
      'users:update_login',
      'users:view_security',
      'users:update_status',
      'users:view_access',
      'users:grant_access',
      'users:revoke_access',
      'users:delegate_access',
      'users:view_account_policy',
      'users:update_account_policy',
      'users:reset_password',
      'users:reset_mfa',
      'users:view_sessions',
      'users:revoke_sessions',
      'users:delete_account',
      'audit:view',
      'account:view_profile',
      'account:update_profile',
      'account:update_contact',
      'account:view_security',
      'account:change_password',
      'account:manage_mfa',
      'account:manage_sessions',
    ]);
  });

  it('shows every live administrative page without widening delegation', () => {
    expect(PERMISSION_CATEGORIES.map((category) => category.key)).toEqual([
      'persons',
      'users',
      'system-activity',
      'system-settings',
    ]);
    expect(
      DELEGABLE_PERMISSION_CATEGORIES.map((category) => category.key),
    ).toEqual(['persons', 'users', 'system-activity']);
    expect(getAccessPermissionKeys()).toEqual(
      DELEGABLE_PERMISSION_CATEGORIES.flatMap((category) =>
        category.permissions.map((permission) => permission.key),
      ),
    );
    expect(
      DELEGABLE_PERMISSION_CATEGORIES.flatMap(
        (category) => category.permissions,
      ).every(
        (permission) => permission.grantable && permission.surface === 'page',
      ),
    ).toBe(true);

    const personsCategory = PERMISSION_CATEGORIES.find(
      (category) => category.key === 'persons',
    );
    expect(personsCategory?.routes).toEqual([
      '/membres/repertoire',
      '/membres/repertoire/nouveau',
      '/membres/repertoire/[id]',
    ]);
    expect(
      personsCategory?.permissions.find(
        (permission) => permission.key === PERMISSIONS.PERSONS.CREATE,
      )?.route,
    ).toBe('/membres/repertoire/nouveau');

    expect(getAccessPermissionKeys()).not.toEqual(
      expect.arrayContaining([
        PERMISSIONS.SETTINGS.VIEW,
        PERMISSIONS.SETTINGS.UPDATE,
      ]),
    );

    const settingsCategory = PERMISSION_CATEGORIES.find(
      (category) => category.key === 'system-settings',
    );
    expect(settingsCategory).toMatchObject({
      accessPermissionKey: PERMISSIONS.SETTINGS.VIEW,
      assignment: 'role-bound',
      label: 'Paramètres système',
      poleKey: 'system',
      routes: ['/systeme/parametres'],
    });
    expect(
      settingsCategory?.permissions.map((permission) => permission.key),
    ).toEqual([PERMISSIONS.SETTINGS.VIEW, PERMISSIONS.SETTINGS.UPDATE]);
    expect(
      settingsCategory?.permissions.every(
        (permission) => !permission.grantable,
      ),
    ).toBe(true);
  });

  it('uses a coherent user-facing taxonomy and action labels', () => {
    expect(PERMISSION_POLES).toMatchObject([
      { key: 'internal', label: 'Membres' },
      { key: 'activity', label: 'Activité' },
      { key: 'legal', label: 'Relations' },
      { key: 'system', label: 'Système' },
    ]);
    expect(PERMISSION_CATEGORIES.map((category) => category.label)).toEqual([
      'Répertoire',
      'Utilisateurs',
      "Journal d'activité",
      'Paramètres système',
    ]);
    expect(
      getAllPermissionKeys()
        .map((permissionKey) => getPermissionItem(permissionKey))
        .filter((permission) => permission?.action === 'view')
        .every((permission) => permission?.label.startsWith('Consulter ')),
    ).toBe(true);
  });

  it('keeps roadmap capabilities unknown, ineffective and non-grantable', () => {
    for (const permissionKey of roadmapPermissionKeys) {
      expect(isKnownPermissionKey(permissionKey)).toBe(false);
      expect(isPermissionGrantable(permissionKey)).toBe(false);
      expect(hasPermission('ADMIN', permissionKey)).toBe(false);
    }
    expect(getAllPermissionKeys()).not.toEqual(
      expect.arrayContaining(roadmapPermissionKeys),
    );
  });

  it('keeps roadmap names unique', () => {
    expect(new Set(roadmapPermissionKeys).size).toBe(
      roadmapPermissionKeys.length,
    );
  });

  // The compatibility layer for retired names was removed on 24 October 2026
  // (REV-13): an old key is now simply unknown, never translated.
  it('treats every retired or misspelled key as unknown', () => {
    expect(
      getUnknownPermissionKeys({
        'audit:view_sensitive': true,
        'members:view': true,
        'system:settings': true,
        'users:archive': true,
        'users:ghost': false,
        'users:update_access': true,
      }),
    ).toEqual([
      'audit:view_sensitive',
      'members:view',
      'system:settings',
      'users:archive',
      'users:ghost',
      'users:update_access',
    ]);
    expect(
      normalizePermissionOverrides({
        'audit:view_sensitive': true,
        'users:update_access': true,
        [PERMISSIONS.PERSONS.VIEW]: true,
      }),
    ).toEqual({ [PERMISSIONS.PERSONS.VIEW]: true });
    expect(
      hasPermission('USER', PERMISSIONS.USERS.GRANT_ACCESS, {
        [PERMISSIONS.USERS.VIEW]: true,
        [PERMISSIONS.USERS.VIEW_ACCESS]: true,
        'users:update_access': true,
      }),
    ).toBe(false);
  });

  it('identifies baseline and role-bound keys as non-assignable inputs', () => {
    expect(
      getNonAssignablePermissionKeys({
        [PERMISSIONS.DASHBOARD.VIEW]: false,
        [PERMISSIONS.SETTINGS.UPDATE]: true,
        [PERMISSIONS.USERS.VIEW]: true,
        'users:archive': false,
        'users:delete': false,
      }),
    ).toEqual([PERMISSIONS.DASHBOARD.VIEW, PERMISSIONS.SETTINGS.UPDATE]);
  });

  it('never upgrades historical lifecycle grants to irreversible deletion', () => {
    const historicalLifecycleGrants = {
      'users:archive': true,
      'users:delete': true,
    };

    expect(normalizePermissionOverrides(historicalLifecycleGrants)).toBeNull();
    expect(
      hasPermission(
        'USER',
        PERMISSIONS.USERS.DELETE_ACCOUNT,
        historicalLifecycleGrants,
      ),
    ).toBe(false);
    expect(
      normalizePermissionOverrides({
        ...historicalLifecycleGrants,
        [PERMISSIONS.USERS.DELETE_ACCOUNT]: false,
      }),
    ).toEqual({ [PERMISSIONS.USERS.DELETE_ACCOUNT]: false });
  });

  it('labels a live key by its catalogue entry and anything else by its name', () => {
    expect(getPermissionDisplayLabel(PERMISSIONS.USERS.VIEW)).toBe(
      getPermissionItem(PERMISSIONS.USERS.VIEW)?.label,
    );
    expect(getPermissionDisplayLabel('users:archive')).toBe('users:archive');
    expect(getPermissionDisplayLabel(ROADMAP_PERMISSIONS.TASKS.VIEW)).toBe(
      ROADMAP_PERMISSIONS.TASKS.VIEW,
    );
  });

  it('excludes unknown permissions from effective permissions', () => {
    expect(
      getEffectivePermissions('USER', {
        [PERMISSIONS.USERS.VIEW]: true,
        'users:ghost': true,
      }),
    ).not.toHaveProperty('users:ghost');
  });

  it('normalizes non-overridable personal permissions out of storage', () => {
    expect(
      normalizePermissionOverrides({
        [PERMISSIONS.ACCOUNT.CHANGE_PASSWORD]: false,
        [PERMISSIONS.ACCOUNT.MANAGE_MFA]: false,
        [PERMISSIONS.ACCOUNT.UPDATE_CONTACT]: false,
        [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false,
        [PERMISSIONS.ACCOUNT.VIEW_PROFILE]: false,
        [PERMISSIONS.ACCOUNT.VIEW_SECURITY]: false,
      }),
    ).toEqual({ [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false });
    expect(isPermissionAlwaysEnabled(PERMISSIONS.ACCOUNT.CHANGE_PASSWORD)).toBe(
      true,
    );
    expect(isPermissionAlwaysEnabled(PERMISSIONS.ACCOUNT.UPDATE_PROFILE)).toBe(
      false,
    );
  });

  it('keeps personal account policy separate from administrative access', () => {
    expect(
      ACCOUNT_PERMISSION_CATEGORIES.flatMap((category) =>
        category.permissions.map((permission) => permission.key),
      ),
    ).toEqual([
      PERMISSIONS.ACCOUNT.VIEW_PROFILE,
      PERMISSIONS.ACCOUNT.UPDATE_PROFILE,
      PERMISSIONS.ACCOUNT.UPDATE_CONTACT,
      PERMISSIONS.ACCOUNT.VIEW_SECURITY,
      PERMISSIONS.ACCOUNT.CHANGE_PASSWORD,
      PERMISSIONS.ACCOUNT.MANAGE_MFA,
      PERMISSIONS.ACCOUNT.MANAGE_SESSIONS,
    ]);
  });

  it('defines neutral role presets without roadmap permissions', () => {
    expect(ROLE_PERMISSIONS.ADMIN).toEqual([
      ...ACCOUNT_PERMISSION_CATEGORIES.flatMap((category) =>
        category.permissions.map((item) => item.key),
      ),
      PERMISSIONS.DASHBOARD.VIEW,
      PERMISSIONS.SETTINGS.VIEW,
      PERMISSIONS.SETTINGS.UPDATE,
      ...getAccessPermissionKeys(),
    ]);
    expect(ROLE_PERMISSIONS.USER).toEqual([
      ...ACCOUNT_PERMISSION_CATEGORIES.flatMap((category) =>
        category.permissions.map((item) => item.key),
      ),
      PERMISSIONS.DASHBOARD.VIEW,
    ]);
    expect(ROLE_PERMISSIONS.ADMIN).not.toEqual(
      expect.arrayContaining(roadmapPermissionKeys),
    );
  });
});
