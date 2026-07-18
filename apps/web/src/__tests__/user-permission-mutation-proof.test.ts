import { describe, expect, it, vi } from 'vitest';

import { PERMISSIONS } from '$constants/permissions.constants';
import {
  type AdminPermissionProofLevel,
  classifyUserPermissionMutationProof,
} from '$server/user-permission-mutation-authorization';

vi.mock('server-only', () => ({}));
vi.mock('$server/api-auth', () => ({
  requirePermission: vi.fn(),
}));

const classify = (
  overrides: Partial<
    Parameters<typeof classifyUserPermissionMutationProof>[0]
  > = {},
): AdminPermissionProofLevel =>
  classifyUserPermissionMutationProof({
    effectivelyGrantedPermissionKeys: [],
    effectivelyRevokedPermissionKeys: [],
    requestedChangedPermissionKeys: [],
    roleChanged: false,
    targetRole: 'USER',
    ...overrides,
  });

describe('user permission mutation proof classification', () => {
  it('does not add friction to personal account autonomy', () => {
    expect(
      classify({
        effectivelyGrantedPermissionKeys: [PERMISSIONS.ACCOUNT.UPDATE_PROFILE],
        requestedChangedPermissionKeys: [PERMISSIONS.ACCOUNT.UPDATE_PROFILE],
      }),
    ).toBe('none');
  });

  it('keeps ordinary access grants and revocations frictionless', () => {
    expect(
      classify({
        effectivelyGrantedPermissionKeys: [PERMISSIONS.USERS.VIEW],
        requestedChangedPermissionKeys: [PERMISSIONS.USERS.VIEW],
      }),
    ).toBe('none');
    expect(
      classify({
        effectivelyRevokedPermissionKeys: [PERMISSIONS.USERS.VIEW_CONTACT],
        requestedChangedPermissionKeys: [PERMISSIONS.USERS.VIEW_CONTACT],
      }),
    ).toBe('none');
  });

  it('requires only the password mode for every role or authority change', () => {
    expect(classify({ roleChanged: true })).toBe('password');

    for (const permissionKey of [
      PERMISSIONS.USERS.GRANT_ACCESS,
      PERMISSIONS.USERS.REVOKE_ACCESS,
      PERMISSIONS.USERS.DELEGATE_ACCESS,
    ]) {
      expect(
        classify({
          effectivelyGrantedPermissionKeys: [permissionKey],
          requestedChangedPermissionKeys: [permissionKey],
        }),
      ).toBe('password');
      expect(
        classify({
          effectivelyRevokedPermissionKeys: [permissionKey],
          requestedChangedPermissionKeys: [permissionKey],
        }),
      ).toBe('password');
    }
  });

  it('requires only the password mode for effective critical grants and revocations', () => {
    expect(
      classify({
        effectivelyGrantedPermissionKeys: [PERMISSIONS.USERS.ARCHIVE],
        requestedChangedPermissionKeys: [PERMISSIONS.USERS.VIEW_SECURITY],
      }),
    ).toBe('password');
    expect(
      classify({
        effectivelyRevokedPermissionKeys: [PERMISSIONS.USERS.ARCHIVE],
        requestedChangedPermissionKeys: [PERMISSIONS.USERS.VIEW_SECURITY],
      }),
    ).toBe('password');
  });

  it('requires the password mode for every access-policy change on an administrator', () => {
    expect(
      classify({
        effectivelyGrantedPermissionKeys: [PERMISSIONS.USERS.VIEW_CONTACT],
        requestedChangedPermissionKeys: [PERMISSIONS.USERS.VIEW_CONTACT],
        targetRole: 'ADMIN',
      }),
    ).toBe('password');
  });

  it('keeps the strongest level for mixed batches', () => {
    expect(
      classify({
        effectivelyGrantedPermissionKeys: [
          PERMISSIONS.ACCOUNT.UPDATE_PROFILE,
          PERMISSIONS.USERS.VIEW,
        ],
        requestedChangedPermissionKeys: [
          PERMISSIONS.ACCOUNT.UPDATE_PROFILE,
          PERMISSIONS.USERS.VIEW,
        ],
      }),
    ).toBe('none');
    expect(
      classify({
        effectivelyGrantedPermissionKeys: [
          PERMISSIONS.USERS.VIEW,
          PERMISSIONS.USERS.ARCHIVE,
        ],
        requestedChangedPermissionKeys: [
          PERMISSIONS.USERS.VIEW,
          PERMISSIONS.USERS.ARCHIVE,
        ],
      }),
    ).toBe('password');
  });
});
