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
  isHistoricalAuditPermissionKey,
  isKnownPermissionKey,
  isPermissionAlwaysEnabled,
  isPermissionGrantable,
  LEGACY_PERMISSION_ALIASES,
  normalizePermissionOverrides,
  PERMISSION_CATEGORIES,
  PERMISSION_POLES,
  PERMISSIONS,
  preserveRetiringPermissionOverrides,
  requiresMfaForAccess,
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
    expect(hasPermission('USER', PERMISSIONS.NOTIFICATIONS.VIEW)).toBe(true);

    expect(hasPermission('ADMIN', PERMISSIONS.USERS.CREATE)).toBe(true);
    expect(hasPermission('ADMIN', PERMISSIONS.USERS.EXPORT_ACTIVITY)).toBe(
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
    expect(hasPermission('ADMIN', PERMISSIONS.AUDIT.VIEW)).toBe(true);
    expect(hasPermission('ADMIN', PERMISSIONS.AUDIT.VIEW_FIELD_HISTORY)).toBe(
      true,
    );
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
    expect(hasPermission('USER', PERMISSIONS.USERS.EXPORT_ACTIVITY)).toBe(
      false,
    );
    expect(hasPermission('USER', PERMISSIONS.AUDIT.VIEW)).toBe(false);
    expect(hasPermission('USER', PERMISSIONS.PERSONS.VIEW)).toBe(false);
  });

  it('lets grantable overrides change access when dependencies are effective', () => {
    const customPermissions = {
      [PERMISSIONS.USERS.CREATE]: false,
      [PERMISSIONS.USERS.EXPORT_ACTIVITY]: true,
      [PERMISSIONS.USERS.VIEW]: true,
      [PERMISSIONS.USERS.VIEW_ACTIVITY]: true,
    };

    expect(
      hasPermission('ADMIN', PERMISSIONS.USERS.CREATE, customPermissions),
    ).toBe(false);
    expect(
      hasPermission('USER', PERMISSIONS.USERS.VIEW, customPermissions),
    ).toBe(true);
    expect(
      hasPermission(
        'USER',
        PERMISSIONS.USERS.EXPORT_ACTIVITY,
        customPermissions,
      ),
    ).toBe(true);
    expect(
      hasPermission('ADMIN', PERMISSIONS.USERS.EXPORT_ACTIVITY, {
        [PERMISSIONS.USERS.EXPORT_ACTIVITY]: false,
      }),
    ).toBe(false);
  });

  it('keeps dashboard and personal notifications enabled as baseline access', () => {
    const deniedBaseline = {
      [PERMISSIONS.DASHBOARD.VIEW]: false,
      [PERMISSIONS.NOTIFICATIONS.VIEW]: false,
    };

    expect(
      hasPermission('USER', PERMISSIONS.DASHBOARD.VIEW, deniedBaseline),
    ).toBe(true);
    expect(
      hasPermission('USER', PERMISSIONS.NOTIFICATIONS.VIEW, deniedBaseline),
    ).toBe(true);
    expect(normalizePermissionOverrides(deniedBaseline)).toBeNull();
    expect(isPermissionAlwaysEnabled(PERMISSIONS.DASHBOARD.VIEW)).toBe(true);
    expect(isPermissionAlwaysEnabled(PERMISSIONS.NOTIFICATIONS.VIEW)).toBe(
      true,
    );
  });

  it('keeps role-bound capabilities outside per-user overrides', () => {
    const attemptedGrant = {
      [PERMISSIONS.NOTIFICATIONS.SEND]: true,
      [PERMISSIONS.SETTINGS.UPDATE]: true,
      [PERMISSIONS.SETTINGS.VIEW]: true,
    };

    expect(normalizePermissionOverrides(attemptedGrant)).toBeNull();
    expect(isPermissionGrantable(PERMISSIONS.NOTIFICATIONS.SEND)).toBe(false);
    expect(isPermissionGrantable(PERMISSIONS.SETTINGS.VIEW)).toBe(false);
    expect(isPermissionGrantable(PERMISSIONS.SETTINGS.UPDATE)).toBe(false);
    expect(
      hasPermission('USER', PERMISSIONS.NOTIFICATIONS.SEND, attemptedGrant),
    ).toBe(false);
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

    for (const permissionKey of Object.values(PERMISSIONS.ACCOUNT)) {
      expect(userRoleBasePermissionsMap.get(permissionKey)).toBe(true);
    }
    expect(userRoleBasePermissions[PERMISSIONS.DASHBOARD.VIEW]).toBe(true);
    expect(userRoleBasePermissions[PERMISSIONS.NOTIFICATIONS.VIEW]).toBe(true);
    expect(userRoleBasePermissions[PERMISSIONS.USERS.VIEW]).toBe(false);
    expect(userRoleBasePermissions[PERMISSIONS.AUDIT.VIEW]).toBe(false);
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

  it('keeps contextual history independent and export dependent', () => {
    expect(
      hasPermission('USER', PERMISSIONS.AUDIT.VIEW_FIELD_HISTORY, {
        [PERMISSIONS.AUDIT.VIEW_FIELD_HISTORY]: true,
      }),
    ).toBe(true);
    expect(
      hasPermission('USER', PERMISSIONS.AUDIT.EXPORT, {
        [PERMISSIONS.AUDIT.EXPORT]: true,
        [PERMISSIONS.AUDIT.VIEW]: false,
      }),
    ).toBe(false);
    expect(
      requiresMfaForAccess('USER', {
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
    expect(
      getPermissionItem(PERMISSIONS.AUDIT.VIEW_FIELD_HISTORY)?.dependencies,
    ).toBeUndefined();
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

describe('requiresMfaForAccess', () => {
  it('requires MFA for administrators with critical access', () => {
    expect(requiresMfaForAccess('ADMIN')).toBe(true);
  });

  it('does not require MFA for a standard user by default', () => {
    expect(requiresMfaForAccess('USER')).toBe(false);
  });

  it('requires MFA when a critical delegated permission is effective', () => {
    expect(
      requiresMfaForAccess('USER', {
        [PERMISSIONS.USERS.UPDATE_LOGIN]: true,
        [PERMISSIONS.USERS.VIEW]: true,
      }),
    ).toBe(true);
  });

  it('ignores a critical override whose dependency is disabled', () => {
    expect(
      requiresMfaForAccess('USER', {
        [PERMISSIONS.USERS.UPDATE_LOGIN]: true,
        [PERMISSIONS.USERS.VIEW]: false,
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
    for (const permissionKey of [
      PERMISSIONS.AUDIT.VIEW,
      PERMISSIONS.PERSONS.DELETE,
    ]) {
      expect(getPermissionItem(permissionKey)).toMatchObject({
        requiresTargetMfa: true,
        risk: 'critical',
      });
      expect(getPermissionItem(permissionKey)?.stepUpOnUse).toBeUndefined();
    }
    expect(getPermissionItem(PERMISSIONS.AUDIT.EXPORT)?.stepUpOnUse).toBe(true);
  });

  it('contains only the canonical effective permission families', () => {
    expect(getAllPermissionKeys()).toEqual([
      'dashboard:view',
      'notifications:view',
      'notifications:send',
      'settings:view',
      'settings:update',
      'persons:view',
      'persons:create',
      'persons:update',
      'persons:delete',
      'partners:view',
      'partners:manage',
      'partners:delete',
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
      'users:view_sessions',
      'users:revoke_sessions',
      'users:view_activity',
      'users:export_activity',
      'users:delete_account',
      'audit:view',
      'audit:view_field_history',
      'audit:export',
      'account:view_profile',
      'account:update_profile',
      'account:update_contact',
      'account:view_security',
      'account:change_password',
      'account:manage_mfa',
      'account:manage_sessions',
      'account:view_activity',
    ]);
  });

  it('shows every live administrative page without widening delegation', () => {
    expect(PERMISSION_CATEGORIES.map((category) => category.key)).toEqual([
      'persons',
      'partners',
      'users',
      'system-settings',
      'system-activity',
    ]);
    expect(
      DELEGABLE_PERMISSION_CATEGORIES.map((category) => category.key),
    ).toEqual(['persons', 'partners', 'users', 'system-activity']);
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
      '/vie-interne/repertoire',
      '/vie-interne/repertoire/nouveau',
      '/vie-interne/repertoire/[id]',
    ]);
    expect(
      personsCategory?.permissions.find(
        (permission) => permission.key === PERMISSIONS.PERSONS.CREATE,
      )?.route,
    ).toBe('/vie-interne/repertoire/nouveau');

    const partnersCategory = PERMISSION_CATEGORIES.find(
      (category) => category.key === 'partners',
    );
    expect(partnersCategory).toMatchObject({
      accessPermissionKey: PERMISSIONS.PARTNERS.VIEW,
      assignment: 'delegable',
      poleKey: 'legal',
      routes: [
        '/bureau-juridique/partenaires',
        '/bureau-juridique/partenaires/nouveau',
        '/bureau-juridique/partenaires/[id]',
      ],
    });

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
      { key: 'internal', label: 'Vie interne' },
      { key: 'legal', label: 'Bureau & juridique' },
      { key: 'system', label: 'Système' },
    ]);
    expect(PERMISSION_CATEGORIES.map((category) => category.label)).toEqual([
      'Répertoire',
      'Sponsors & partenaires',
      'Utilisateurs',
      'Paramètres système',
      "Journal d'activité",
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

  it('keeps roadmap names unique and disjoint from every legacy alias', () => {
    expect(new Set(roadmapPermissionKeys).size).toBe(
      roadmapPermissionKeys.length,
    );
    expect(
      roadmapPermissionKeys.filter((permissionKey) =>
        Object.hasOwn(LEGACY_PERMISSION_ALIASES, permissionKey),
      ),
    ).toEqual([]);

    for (const canonicalKeys of Object.values(LEGACY_PERMISSION_ALIASES)) {
      expect(canonicalKeys.length).toBeGreaterThan(0);
      expect(canonicalKeys.every(isKnownPermissionKey)).toBe(true);
    }
  });

  it('keeps historical lifecycle keys unknown for authorization', () => {
    expect(
      getUnknownPermissionKeys({
        'audit:view_sensitive': true,
        'members:update': false,
        'members:view': true,
        'system:audit': true,
        'system:audit_sensitive': true,
        'users:archive': true,
        'users:delete': false,
        'users:ghost': false,
      }),
    ).toEqual([
      'audit:view_sensitive',
      'members:update',
      'members:view',
      'system:audit_sensitive',
      'users:archive',
      'users:delete',
      'users:ghost',
    ]);
  });

  it('identifies baseline and role-bound keys as non-assignable inputs', () => {
    expect(
      getNonAssignablePermissionKeys({
        [PERMISSIONS.DASHBOARD.VIEW]: false,
        [PERMISSIONS.SETTINGS.UPDATE]: true,
        'system:settings': true,
        [PERMISSIONS.USERS.VIEW]: true,
        'users:archive': false,
        'users:delete': false,
      }),
    ).toEqual([
      PERMISSIONS.DASHBOARD.VIEW,
      PERMISSIONS.SETTINGS.UPDATE,
      'system:settings',
    ]);
  });

  it('normalizes legacy aliases to canonical keys', () => {
    expect(
      normalizePermissionOverrides({
        'system:audit': true,
        'system:settings': true,
        'users:export': true,
      }),
    ).toEqual({
      [PERMISSIONS.AUDIT.VIEW]: true,
      [PERMISSIONS.USERS.EXPORT_ACTIVITY]: true,
    });
    expect(
      normalizePermissionOverrides({
        'users:update_access': true,
      }),
    ).toEqual({
      [PERMISSIONS.USERS.DELEGATE_ACCESS]: true,
      [PERMISSIONS.USERS.GRANT_ACCESS]: true,
      [PERMISSIONS.USERS.REVOKE_ACCESS]: true,
    });
    expect(
      normalizePermissionOverrides({
        'users:edit_permissions': true,
        [PERMISSIONS.USERS.DELEGATE_ACCESS]: false,
      }),
    ).toEqual({
      [PERMISSIONS.USERS.DELEGATE_ACCESS]: false,
      [PERMISSIONS.USERS.GRANT_ACCESS]: true,
      [PERMISSIONS.USERS.REVOKE_ACCESS]: true,
    });
    expect(
      normalizePermissionOverrides(
        Object.fromEntries([
          ['users:update_access', false],
          ['users:edit_permissions', true],
        ]),
      ),
    ).toEqual({
      [PERMISSIONS.USERS.DELEGATE_ACCESS]: false,
      [PERMISSIONS.USERS.GRANT_ACCESS]: false,
      [PERMISSIONS.USERS.REVOKE_ACCESS]: false,
    });
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

  it('preserves only rollout keys for legacy instances without authorizing them', () => {
    expect(
      preserveRetiringPermissionOverrides(
        {
          'audit:view_sensitive': true,
          'members:view': false,
          'system:audit_sensitive': true,
          'users:archive': true,
          'users:ghost': true,
        },
        { [PERMISSIONS.PERSONS.VIEW]: true },
      ),
    ).toEqual({
      'audit:view_sensitive': true,
      'members:view': false,
      'system:audit_sensitive': true,
      [PERMISSIONS.PERSONS.VIEW]: true,
    });
    expect(
      hasPermission('USER', 'audit:view_sensitive', {
        'audit:view_sensitive': true,
      }),
    ).toBe(false);
    expect(preserveRetiringPermissionOverrides(null, null)).toBeNull();
  });

  it('uses explicit historical labels without making old keys active', () => {
    for (const permissionKey of [
      'audit:view_sensitive',
      'members:update',
      'members:view',
      'system:audit_sensitive',
    ]) {
      expect(isHistoricalAuditPermissionKey(permissionKey)).toBe(true);
      expect(isKnownPermissionKey(permissionKey)).toBe(false);
      expect(isPermissionGrantable(permissionKey)).toBe(false);
    }
    expect(
      normalizePermissionOverrides({
        'audit:view_sensitive': true,
        'members:update': true,
        'members:view': true,
        'system:audit_sensitive': true,
      }),
    ).toBeNull();
    expect(getPermissionDisplayLabel('users:archive')).toBe(
      'Archiver un utilisateur (historique)',
    );
    expect(getPermissionDisplayLabel('users:delete')).toBe(
      'Archiver un utilisateur (historique)',
    );
    expect(isHistoricalAuditPermissionKey('users:archive')).toBe(true);
    expect(isHistoricalAuditPermissionKey('users:delete')).toBe(true);
    expect(isKnownPermissionKey('users:archive')).toBe(false);
    expect(isKnownPermissionKey('users:delete')).toBe(false);
    expect(getPermissionDisplayLabel('system:audit')).toBe(
      getPermissionItem(PERMISSIONS.AUDIT.VIEW)?.label,
    );
    expect(getPermissionDisplayLabel('users:update_access')).toBe(
      'Modifier les autorisations administratives (historique)',
    );
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
        [PERMISSIONS.ACCOUNT.VIEW_ACTIVITY]: false,
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
      PERMISSIONS.ACCOUNT.VIEW_ACTIVITY,
    ]);
  });

  it('defines neutral role presets without roadmap permissions', () => {
    expect(ROLE_PERMISSIONS.ADMIN).toEqual([
      ...Object.values(PERMISSIONS.ACCOUNT),
      PERMISSIONS.DASHBOARD.VIEW,
      PERMISSIONS.NOTIFICATIONS.VIEW,
      PERMISSIONS.NOTIFICATIONS.SEND,
      PERMISSIONS.SETTINGS.VIEW,
      PERMISSIONS.SETTINGS.UPDATE,
      ...getAccessPermissionKeys(),
    ]);
    expect(ROLE_PERMISSIONS.USER).toEqual([
      ...Object.values(PERMISSIONS.ACCOUNT),
      PERMISSIONS.DASHBOARD.VIEW,
      PERMISSIONS.NOTIFICATIONS.VIEW,
    ]);
    expect(ROLE_PERMISSIONS.ADMIN).not.toEqual(
      expect.arrayContaining(roadmapPermissionKeys),
    );
  });
});
