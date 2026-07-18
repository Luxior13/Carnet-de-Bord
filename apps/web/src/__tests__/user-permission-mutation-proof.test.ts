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

  it('requires the password mode for ordinary grants and revocations', () => {
    expect(
      classify({
        effectivelyGrantedPermissionKeys: [PERMISSIONS.USERS.VIEW],
        requestedChangedPermissionKeys: [PERMISSIONS.USERS.VIEW],
      }),
    ).toBe('password');
    expect(
      classify({
        effectivelyRevokedPermissionKeys: [PERMISSIONS.USERS.ARCHIVE],
        requestedChangedPermissionKeys: [PERMISSIONS.USERS.ARCHIVE],
      }),
    ).toBe('password');
  });

  it('requires MFA for every role or delegation-authority change', () => {
    expect(classify({ roleChanged: true })).toBe('mfa');

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
      ).toBe('mfa');
      expect(
        classify({
          effectivelyRevokedPermissionKeys: [permissionKey],
          requestedChangedPermissionKeys: [permissionKey],
        }),
      ).toBe('mfa');
    }
  });

  it('requires MFA for an effective critical elevation, including dependencies', () => {
    expect(
      classify({
        effectivelyGrantedPermissionKeys: [PERMISSIONS.USERS.ARCHIVE],
        requestedChangedPermissionKeys: [PERMISSIONS.USERS.VIEW_SECURITY],
      }),
    ).toBe('mfa');
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
    ).toBe('password');
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
    ).toBe('mfa');
  });
});
