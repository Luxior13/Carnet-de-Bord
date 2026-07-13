import { describe, expect, it } from 'vitest';

import {
  arePermissionOverridesEqual,
  buildPermissionOverrides,
  getAllPermissionKeys,
  getEffectivePermissions,
  getRoleBasePermissions,
  getUnknownPermissionKeys,
  hasPermission,
  isKnownPermissionKey,
  isPermissionAlwaysEnabled,
  normalizePermissionOverrides,
  PERMISSIONS,
  ROLE_PERMISSIONS,
} from '../shared/constants/permissions.constants';

describe('hasPermission', () => {
  it('uses role permissions when no custom permissions are set', () => {
    expect(hasPermission('USER', PERMISSIONS.ACCOUNT.VIEW_PROFILE)).toBe(true);
    expect(hasPermission('USER', PERMISSIONS.ACCOUNT.UPDATE_PROFILE)).toBe(
      true,
    );
    expect(hasPermission('USER', PERMISSIONS.ACCOUNT.CHANGE_PASSWORD)).toBe(
      true,
    );
    expect(hasPermission('ADMIN', PERMISSIONS.USERS.CREATE)).toBe(true);
    expect(hasPermission('ADMIN', PERMISSIONS.USERS.EXPORT)).toBe(true);
    expect(hasPermission('USER', PERMISSIONS.DASHBOARD.VIEW)).toBe(true);
    expect(hasPermission('USER', PERMISSIONS.USERS.CREATE)).toBe(false);
    expect(hasPermission('USER', PERMISSIONS.USERS.EXPORT)).toBe(false);
    expect(hasPermission('USER', PERMISSIONS.USERS.VIEW)).toBe(false);
  });

  it('lets custom permissions override role permissions', () => {
    const customPermissions = {
      [PERMISSIONS.DASHBOARD.VIEW]: false,
      [PERMISSIONS.USERS.VIEW]: true,
      [PERMISSIONS.USERS.CREATE]: false,
      [PERMISSIONS.USERS.EXPORT]: true,
    };

    expect(
      hasPermission('USER', PERMISSIONS.DASHBOARD.VIEW, customPermissions),
    ).toBe(false);
    expect(
      hasPermission('ADMIN', PERMISSIONS.USERS.CREATE, customPermissions),
    ).toBe(false);
    expect(
      hasPermission('USER', PERMISSIONS.USERS.VIEW, customPermissions),
    ).toBe(true);
    expect(
      hasPermission('USER', PERMISSIONS.USERS.EXPORT, customPermissions),
    ).toBe(true);
    expect(
      hasPermission('ADMIN', PERMISSIONS.USERS.EXPORT, {
        [PERMISSIONS.USERS.EXPORT]: false,
      }),
    ).toBe(false);
  });

  it('never grants unknown permissions', () => {
    expect(hasPermission('ADMIN', 'users:ghost', { 'users:ghost': true })).toBe(
      false,
    );
  });

  it('exposes role base permissions for default access states', () => {
    const userRoleBasePermissions = getRoleBasePermissions('USER');
    const userRoleBasePermissionsMap = new Map(
      Object.entries(userRoleBasePermissions),
    );

    for (const permissionKey of Object.values(PERMISSIONS.ACCOUNT)) {
      expect(userRoleBasePermissionsMap.get(permissionKey)).toBe(true);
    }
    expect(userRoleBasePermissionsMap.get(PERMISSIONS.DASHBOARD.VIEW)).toBe(
      true,
    );
    expect(userRoleBasePermissionsMap.get(PERMISSIONS.USERS.VIEW)).toBe(false);
    expect(userRoleBasePermissionsMap.get(PERMISSIONS.SYSTEM.VIEW)).toBe(false);
    expect(userRoleBasePermissionsMap.get(PERMISSIONS.INTERNAL.VIEW)).toBe(
      false,
    );
    expect(userRoleBasePermissionsMap.get(PERMISSIONS.LEGAL.VIEW)).toBe(false);
    expect(userRoleBasePermissionsMap.get(PERMISSIONS.SPORT.VIEW)).toBe(false);
    expect(
      userRoleBasePermissionsMap.get(PERMISSIONS.DASHBOARD.MANAGE_WIDGETS),
    ).toBe(false);
  });

  it('builds compact overrides instead of storing default values', () => {
    expect(
      buildPermissionOverrides('USER', [
        ...Object.values(PERMISSIONS.ACCOUNT),
        PERMISSIONS.DASHBOARD.VIEW,
        PERMISSIONS.USERS.VIEW,
      ]),
    ).toEqual({
      [PERMISSIONS.USERS.VIEW]: true,
    });
    expect(
      buildPermissionOverrides('USER', [
        ...Object.values(PERMISSIONS.ACCOUNT),
        PERMISSIONS.DASHBOARD.VIEW,
      ]),
    ).toBeNull();
  });

  it('stores an explicit deny override when blocking a page granted by role', () => {
    const adminWithoutUsersPage = ROLE_PERMISSIONS.ADMIN.filter(
      (permission) => permission !== PERMISSIONS.USERS.VIEW,
    );

    expect(buildPermissionOverrides('ADMIN', adminWithoutUsersPage)).toEqual({
      [PERMISSIONS.USERS.VIEW]: false,
    });
  });

  it('never stores deny overrides for essential personal account actions', () => {
    expect(
      buildPermissionOverrides('USER', [
        PERMISSIONS.ACCOUNT.UPDATE_PROFILE,
        PERMISSIONS.ACCOUNT.VIEW_ACTIVITY,
        PERMISSIONS.DASHBOARD.VIEW,
      ]),
    ).toBeNull();
  });

  it('does not create a saveable override when the role already blocks a page', () => {
    expect(
      buildPermissionOverrides('USER', [
        ...Object.values(PERMISSIONS.ACCOUNT),
        PERMISSIONS.DASHBOARD.VIEW,
      ]),
    ).toBeNull();
  });

  it('distinguishes an explicit deny override from a missing override', () => {
    expect(
      arePermissionOverridesEqual({ [PERMISSIONS.USERS.VIEW]: false }, null),
    ).toBe(false);
    expect(arePermissionOverridesEqual(null, {})).toBe(true);
  });

  it('requires linked view permissions before granting secondary actions', () => {
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
  });

  it('requires system view before granting system secondary actions', () => {
    expect(
      hasPermission('USER', PERMISSIONS.SYSTEM.AUDIT, {
        [PERMISSIONS.SYSTEM.AUDIT]: true,
        [PERMISSIONS.SYSTEM.VIEW]: false,
      }),
    ).toBe(false);
    expect(
      hasPermission('USER', PERMISSIONS.SYSTEM.AUDIT, {
        [PERMISSIONS.SYSTEM.AUDIT]: true,
        [PERMISSIONS.SYSTEM.VIEW]: true,
      }),
    ).toBe(true);
  });

  it('requires pole view permissions before granting module actions', () => {
    expect(
      hasPermission('USER', PERMISSIONS.MEMBERS.VIEW, {
        [PERMISSIONS.MEMBERS.VIEW]: true,
        [PERMISSIONS.INTERNAL.VIEW]: false,
      }),
    ).toBe(false);
    expect(
      hasPermission('USER', PERMISSIONS.MEMBERS.VIEW, {
        [PERMISSIONS.INTERNAL.VIEW]: true,
        [PERMISSIONS.MEMBERS.VIEW]: true,
      }),
    ).toBe(true);
    expect(
      hasPermission('USER', PERMISSIONS.DOCUMENTS.APPROVE, {
        [PERMISSIONS.DOCUMENTS.APPROVE]: true,
        [PERMISSIONS.DOCUMENTS.VIEW]: true,
        [PERMISSIONS.LEGAL.VIEW]: false,
      }),
    ).toBe(false);
    expect(
      hasPermission('USER', PERMISSIONS.TREASURY.AUDIT, {
        [PERMISSIONS.TREASURY.AUDIT]: true,
        [PERMISSIONS.TREASURY.VIEW]: false,
      }),
    ).toBe(false);
  });

  it('keeps essential personal account actions enabled despite deny overrides', () => {
    expect(
      hasPermission('USER', PERMISSIONS.ACCOUNT.VIEW_PROFILE, {
        [PERMISSIONS.ACCOUNT.VIEW_PROFILE]: false,
      }),
    ).toBe(true);
    expect(
      hasPermission('USER', PERMISSIONS.ACCOUNT.VIEW_SECURITY, {
        [PERMISSIONS.ACCOUNT.VIEW_SECURITY]: false,
      }),
    ).toBe(true);
    expect(
      hasPermission('USER', PERMISSIONS.ACCOUNT.CHANGE_PASSWORD, {
        [PERMISSIONS.ACCOUNT.CHANGE_PASSWORD]: false,
        [PERMISSIONS.ACCOUNT.VIEW_SECURITY]: false,
      }),
    ).toBe(true);
  });

  it('keeps optional personal account actions configurable', () => {
    expect(
      hasPermission('USER', PERMISSIONS.ACCOUNT.UPDATE_PROFILE, {
        [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false,
      }),
    ).toBe(false);
    expect(
      hasPermission('USER', PERMISSIONS.ACCOUNT.VIEW_ACTIVITY, {
        [PERMISSIONS.ACCOUNT.VIEW_ACTIVITY]: false,
      }),
    ).toBe(false);
  });
});

describe('permission catalogue', () => {
  it('contains the long-term access permission families', () => {
    expect(getAllPermissionKeys()).toEqual([
      'dashboard:view',
      'dashboard:manage_widgets',
      'tasks:view',
      'tasks:create',
      'tasks:update',
      'tasks:assign',
      'tasks:delete',
      'notifications:view',
      'notifications:manage',
      'notifications:send',
      'internal:view',
      'members:view',
      'members:update',
      'meetings:view',
      'meetings:update',
      'legal:view',
      'documents:view',
      'documents:create',
      'documents:update',
      'documents:approve',
      'documents:archive',
      'contracts:view',
      'contracts:update',
      'incidents:view',
      'incidents:update',
      'system:view',
      'system:audit',
      'system:settings',
      'system:validate',
      'system:exports',
      'system:archives',
      'system:automation',
      'users:view',
      'users:create',
      'users:update_profile',
      'users:update_login',
      'users:manage_status',
      'users:view_access',
      'users:manage_roles',
      'users:edit_permissions',
      'users:reset_password',
      'users:view_sessions',
      'users:revoke_sessions',
      'users:view_activity',
      'users:delete',
      'users:restore',
      'users:export',
      'treasury:view',
      'treasury:edit',
      'treasury:export',
      'treasury:validate',
      'treasury:audit',
      'treasury:archives',
      'sport:view',
      'sport:update',
      'sport:public_sync',
      'account:view_profile',
      'account:update_profile',
      'account:view_security',
      'account:change_password',
      'account:view_activity',
    ]);
  });

  it('detects unknown permission keys', () => {
    expect(isKnownPermissionKey(PERMISSIONS.USERS.VIEW)).toBe(true);
    expect(isKnownPermissionKey('users:ghost')).toBe(false);
    expect(
      getUnknownPermissionKeys({
        [PERMISSIONS.USERS.VIEW]: true,
        'users:ghost': false,
      }),
    ).toEqual(['users:ghost']);
  });

  it('excludes unknown permissions from effective permissions', () => {
    expect(
      getEffectivePermissions('USER', {
        [PERMISSIONS.USERS.VIEW]: true,
        'users:ghost': true,
      }),
    ).not.toHaveProperty('users:ghost');
  });

  it('normalizes non-overridable personal permissions out of stored overrides', () => {
    expect(
      normalizePermissionOverrides({
        [PERMISSIONS.ACCOUNT.CHANGE_PASSWORD]: false,
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

  it('reports essential permissions as effective while preserving optional denies', () => {
    const effectivePermissions = getEffectivePermissions('USER', {
      [PERMISSIONS.ACCOUNT.CHANGE_PASSWORD]: false,
      [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false,
      [PERMISSIONS.ACCOUNT.VIEW_ACTIVITY]: false,
      [PERMISSIONS.ACCOUNT.VIEW_PROFILE]: false,
      [PERMISSIONS.ACCOUNT.VIEW_SECURITY]: false,
    });

    expect(effectivePermissions[PERMISSIONS.ACCOUNT.VIEW_PROFILE]).toBe(true);
    expect(effectivePermissions[PERMISSIONS.ACCOUNT.VIEW_SECURITY]).toBe(true);
    expect(effectivePermissions[PERMISSIONS.ACCOUNT.CHANGE_PASSWORD]).toBe(
      true,
    );
    expect(effectivePermissions[PERMISSIONS.ACCOUNT.UPDATE_PROFILE]).toBe(
      false,
    );
    expect(effectivePermissions[PERMISSIONS.ACCOUNT.VIEW_ACTIVITY]).toBe(false);
  });

  it('defines neutral role presets', () => {
    expect(ROLE_PERMISSIONS.ADMIN).toEqual([
      ...Object.values(PERMISSIONS.ACCOUNT),
      ...Object.values(PERMISSIONS.DASHBOARD),
      ...Object.values(PERMISSIONS.TASKS),
      ...Object.values(PERMISSIONS.NOTIFICATIONS),
      ...Object.values(PERMISSIONS.INTERNAL),
      ...Object.values(PERMISSIONS.MEMBERS),
      ...Object.values(PERMISSIONS.MEETINGS),
      ...Object.values(PERMISSIONS.LEGAL),
      ...Object.values(PERMISSIONS.DOCUMENTS),
      ...Object.values(PERMISSIONS.CONTRACTS),
      ...Object.values(PERMISSIONS.INCIDENTS),
      ...Object.values(PERMISSIONS.SYSTEM),
      ...Object.values(PERMISSIONS.TREASURY),
      ...Object.values(PERMISSIONS.USERS),
      ...Object.values(PERMISSIONS.SPORT),
    ]);
    expect(ROLE_PERMISSIONS.USER).toEqual([
      ...Object.values(PERMISSIONS.ACCOUNT),
      PERMISSIONS.DASHBOARD.VIEW,
    ]);
  });
});
