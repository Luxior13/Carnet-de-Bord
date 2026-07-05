import { describe, expect, it } from 'vitest';

import {
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

    expect(userRoleBasePermissions[PERMISSIONS.DASHBOARD.VIEW]).toBe(true);
    expect(userRoleBasePermissions[PERMISSIONS.USERS.VIEW]).toBe(false);
  });

  it('builds compact overrides instead of storing default values', () => {
    expect(
      buildPermissionOverrides('USER', [
        PERMISSIONS.DASHBOARD.VIEW,
        PERMISSIONS.USERS.VIEW,
      ]),
    ).toEqual({
      [PERMISSIONS.USERS.VIEW]: true,
    });
    expect(
      buildPermissionOverrides('USER', [PERMISSIONS.DASHBOARD.VIEW]),
    ).toBeNull();
  });

  it('requires linked view permissions before granting secondary actions', () => {
    expect(
      hasPermission('USER', PERMISSIONS.USERS.UPDATE, {
        [PERMISSIONS.USERS.UPDATE]: true,
        [PERMISSIONS.USERS.VIEW]: false,
      }),
    ).toBe(false);
    expect(
      hasPermission('USER', PERMISSIONS.USERS.UPDATE, {
        [PERMISSIONS.USERS.UPDATE]: true,
        [PERMISSIONS.USERS.VIEW]: true,
      }),
    ).toBe(true);
  });
});

describe('permission catalogue', () => {
  it('contains dashboard, user and treasury permissions', () => {
    expect(getAllPermissionKeys()).toEqual([
      'dashboard:view',
      'users:view',
      'users:create',
      'users:update',
      'users:delete',
      'users:reset_password',
      'users:edit_permissions',
      'treasury:view',
      'treasury:edit',
      'treasury:export',
      'treasury:validate',
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
      PERMISSIONS.DASHBOARD.VIEW,
      PERMISSIONS.TREASURY.EDIT,
      PERMISSIONS.TREASURY.EXPORT,
      PERMISSIONS.TREASURY.VALIDATE,
      PERMISSIONS.TREASURY.VIEW,
      PERMISSIONS.USERS.CREATE,
      PERMISSIONS.USERS.DELETE,
      PERMISSIONS.USERS.EDIT_PERMISSIONS,
      PERMISSIONS.USERS.RESET_PASSWORD,
      PERMISSIONS.USERS.UPDATE,
      PERMISSIONS.USERS.VIEW,
    ]);
    expect(ROLE_PERMISSIONS.USER).toEqual([PERMISSIONS.DASHBOARD.VIEW]);
  });
});
