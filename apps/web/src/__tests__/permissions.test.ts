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
    expect(hasPermission('USER', PERMISSIONS.DASHBOARD.VIEW)).toBe(true);
    expect(hasPermission('USER', PERMISSIONS.USERS.CREATE)).toBe(false);
    expect(hasPermission('USER', PERMISSIONS.USERS.VIEW)).toBe(false);
  });

  it('lets custom permissions override role permissions', () => {
    const customPermissions = {
      [PERMISSIONS.DASHBOARD.VIEW]: false,
      [PERMISSIONS.USERS.VIEW]: true,
      [PERMISSIONS.USERS.CREATE]: false,
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

  it('requires personal account dependencies before granting sensitive account actions', () => {
    expect(
      hasPermission('USER', PERMISSIONS.ACCOUNT.UPDATE_PROFILE, {
        [PERMISSIONS.ACCOUNT.VIEW_PROFILE]: false,
      }),
    ).toBe(false);
    expect(
      hasPermission('USER', PERMISSIONS.ACCOUNT.CHANGE_PASSWORD, {
        [PERMISSIONS.ACCOUNT.VIEW_SECURITY]: false,
      }),
    ).toBe(false);
  });
});

describe('permission catalogue', () => {
  it('contains dashboard, user and treasury permissions', () => {
    expect(getAllPermissionKeys()).toEqual([
      'dashboard:view',
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

  it('defines neutral role presets', () => {
    expect(ROLE_PERMISSIONS.ADMIN).toEqual([
      ...Object.values(PERMISSIONS.ACCOUNT),
      PERMISSIONS.DASHBOARD.VIEW,
      PERMISSIONS.TREASURY.EDIT,
      PERMISSIONS.TREASURY.EXPORT,
      PERMISSIONS.TREASURY.VALIDATE,
      PERMISSIONS.TREASURY.VIEW,
      PERMISSIONS.USERS.CREATE,
      PERMISSIONS.USERS.DELETE,
      PERMISSIONS.USERS.EDIT_PERMISSIONS,
      PERMISSIONS.USERS.EXPORT,
      PERMISSIONS.USERS.MANAGE_ROLES,
      PERMISSIONS.USERS.MANAGE_STATUS,
      PERMISSIONS.USERS.RESET_PASSWORD,
      PERMISSIONS.USERS.RESTORE,
      PERMISSIONS.USERS.REVOKE_SESSIONS,
      PERMISSIONS.USERS.UPDATE_LOGIN,
      PERMISSIONS.USERS.UPDATE_PROFILE,
      PERMISSIONS.USERS.VIEW,
      PERMISSIONS.USERS.VIEW_ACCESS,
      PERMISSIONS.USERS.VIEW_ACTIVITY,
      PERMISSIONS.USERS.VIEW_SESSIONS,
    ]);
    expect(ROLE_PERMISSIONS.USER).toEqual([
      ...Object.values(PERMISSIONS.ACCOUNT),
      PERMISSIONS.DASHBOARD.VIEW,
    ]);
  });
});
