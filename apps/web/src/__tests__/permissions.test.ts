import { describe, expect, it } from 'vitest';

import {
  getAllPermissionKeys,
  hasPermission,
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
});

describe('permission catalogue', () => {
  it('contains only dashboard and user permissions', () => {
    expect(getAllPermissionKeys()).toEqual([
      'dashboard:view',
      'users:view',
      'users:create',
      'users:update',
      'users:delete',
      'users:reset_password',
      'users:edit_permissions',
    ]);
  });

  it('defines neutral role presets', () => {
    expect(ROLE_PERMISSIONS.ADMIN).toEqual([
      PERMISSIONS.DASHBOARD.VIEW,
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
