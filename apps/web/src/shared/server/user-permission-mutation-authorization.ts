import { type UserRole } from '@repo/database';

import {
  getAccessPermissionKeys,
  getAccountPermissionKeys,
  getAllPermissionKeys,
  getPermissionItem,
  hasPermission,
  PERMISSIONS,
  type PermissionsData,
} from '$constants/permissions.constants';
import { assertPermission } from '$server/api-auth';
import { serviceErrors } from '$server/service-error';
import type { UserType } from '$types/auth.types';

type PermissionScope = 'access' | 'account';

type PermissionMutationAuthorization = {
  effectivelyGrantedPermissionKeys: string[];
  effectivelyRevokedPermissionKeys: string[];
  requiredProofLevel: AdminPermissionProofLevel;
};

export type AdminPermissionProofLevel = 'none' | 'password';

const ACCOUNT_PERMISSION_KEY_SET = new Set(getAccountPermissionKeys());
const ACCESS_PERMISSION_KEY_SET = new Set(getAccessPermissionKeys());
const ACCESS_DELEGATION_PERMISSION_KEY_SET = new Set<string>([
  PERMISSIONS.USERS.GRANT_ACCESS,
  PERMISSIONS.USERS.REVOKE_ACCESS,
]);
const ACCESS_AUTHORITY_PERMISSION_KEY_SET = new Set<string>([
  PERMISSIONS.USERS.DELEGATE_ACCESS,
  PERMISSIONS.USERS.GRANT_ACCESS,
  PERMISSIONS.USERS.REVOKE_ACCESS,
]);

const hasAccessMutationPermission = (actor: UserType): boolean =>
  actor.isProtected ||
  hasPermission(
    actor.role,
    PERMISSIONS.USERS.GRANT_ACCESS,
    actor.permissions,
  ) ||
  hasPermission(actor.role, PERMISSIONS.USERS.REVOKE_ACCESS, actor.permissions);

const assertAccessMutationPermission = (actor: UserType): void => {
  if (!hasAccessMutationPermission(actor))
    assertPermission(actor, PERMISSIONS.USERS.GRANT_ACCESS);
};

export const classifyUserPermissionMutationProof = ({
  effectivelyGrantedPermissionKeys,
  effectivelyRevokedPermissionKeys,
  requestedChangedPermissionKeys,
  roleChanged,
  targetRole,
}: {
  effectivelyGrantedPermissionKeys: readonly string[];
  effectivelyRevokedPermissionKeys: readonly string[];
  requestedChangedPermissionKeys: readonly string[];
  roleChanged: boolean;
  targetRole: UserRole;
}): AdminPermissionProofLevel => {
  if (roleChanged) return 'password';

  const effectivelyChangedAccessPermissionKeys = [
    ...effectivelyGrantedPermissionKeys,
    ...effectivelyRevokedPermissionKeys,
  ].filter((permissionKey) => ACCESS_PERMISSION_KEY_SET.has(permissionKey));
  const changedAccessPermissionKeys = new Set(
    [
      ...requestedChangedPermissionKeys,
      ...effectivelyChangedAccessPermissionKeys,
    ].filter((permissionKey) => ACCESS_PERMISSION_KEY_SET.has(permissionKey)),
  );

  if (changedAccessPermissionKeys.size === 0) return 'none';

  // Only the protected root can mutate an ADMIN. Keep every access-policy
  // change on that tier behind a recent password confirmation.
  if (targetRole === 'ADMIN') return 'password';

  if (
    [...changedAccessPermissionKeys].some((permissionKey) =>
      ACCESS_AUTHORITY_PERMISSION_KEY_SET.has(permissionKey),
    )
  ) {
    return 'password';
  }

  if (
    effectivelyChangedAccessPermissionKeys.some(
      (permissionKey) => getPermissionItem(permissionKey)?.risk === 'critical',
    )
  ) {
    return 'password';
  }

  return 'none';
};

/**
 * Coarse authorization before loading the target. Precise grant/revoke checks
 * require the target's current effective permissions and run afterwards.
 * Throws the refusal.
 */
export const preauthorizeUserPermissionMutation = (
  actor: UserType,
  permissionScope?: PermissionScope,
): void => {
  if (permissionScope === 'account') {
    assertPermission(actor, PERMISSIONS.USERS.UPDATE_ACCOUNT_POLICY);

    return;
  }
  if (permissionScope === 'access') {
    assertAccessMutationPermission(actor);

    return;
  }
  if (
    !hasAccessMutationPermission(actor) &&
    !hasPermission(
      actor.role,
      PERMISSIONS.USERS.UPDATE_ACCOUNT_POLICY,
      actor.permissions,
    )
  ) {
    assertPermission(actor, PERMISSIONS.USERS.GRANT_ACCESS);
  }
};

type AuthorizeUserPermissionMutationInput = {
  actor: UserType;
  existingPermissions: PermissionsData | null;
  existingRole: UserRole;
  isPermissionsUpdate: boolean;
  isRoleUpdate: boolean;
  permissionScope?: PermissionScope;
  requestedChangedPermissionKeys: readonly string[];
  resultingPermissions: PermissionsData | null;
  resultingRole: UserRole;
};

/**
 * Classifies permission changes by their effective result, including changes
 * induced by dependencies, then enforces grant/revoke/delegation boundaries.
 * Throws the refusal.
 */
export const authorizeUserPermissionMutation = ({
  actor,
  existingPermissions,
  existingRole,
  isPermissionsUpdate,
  isRoleUpdate,
  permissionScope,
  requestedChangedPermissionKeys,
  resultingPermissions,
  resultingRole,
}: AuthorizeUserPermissionMutationInput): PermissionMutationAuthorization => {
  const effectivelyGrantedPermissionKeys =
    isPermissionsUpdate || isRoleUpdate
      ? getAllPermissionKeys().filter(
          (permissionKey) =>
            !hasPermission(existingRole, permissionKey, existingPermissions) &&
            hasPermission(resultingRole, permissionKey, resultingPermissions),
        )
      : [];
  const effectivelyRevokedPermissionKeys =
    isPermissionsUpdate || isRoleUpdate
      ? getAllPermissionKeys().filter(
          (permissionKey) =>
            hasPermission(existingRole, permissionKey, existingPermissions) &&
            !hasPermission(resultingRole, permissionKey, resultingPermissions),
        )
      : [];
  const effectivelyGrantedAccessPermissionKeys =
    effectivelyGrantedPermissionKeys.filter((permissionKey) =>
      ACCESS_PERMISSION_KEY_SET.has(permissionKey),
    );
  const effectivelyRevokedAccessPermissionKeys =
    effectivelyRevokedPermissionKeys.filter((permissionKey) =>
      ACCESS_PERMISSION_KEY_SET.has(permissionKey),
    );
  const effectivelyChangedAccessPermissionKeys = new Set([
    ...effectivelyGrantedAccessPermissionKeys,
    ...effectivelyRevokedAccessPermissionKeys,
  ]);
  const changesDelegableAccessAuthority = [
    ...effectivelyChangedAccessPermissionKeys,
  ].some((permissionKey) =>
    ACCESS_DELEGATION_PERMISSION_KEY_SET.has(permissionKey),
  );
  const changesDelegationAuthority = effectivelyChangedAccessPermissionKeys.has(
    PERMISSIONS.USERS.DELEGATE_ACCESS,
  );
  const hasRequestedAccessOverrideChanges = requestedChangedPermissionKeys.some(
    (permissionKey) => ACCESS_PERMISSION_KEY_SET.has(permissionKey),
  );
  const hasRequestedAccountOverrideChanges =
    requestedChangedPermissionKeys.some((permissionKey) =>
      ACCOUNT_PERMISSION_KEY_SET.has(permissionKey),
    );

  if (isPermissionsUpdate && changesDelegationAuthority && !actor.isProtected) {
    throw serviceErrors.forbidden(
      'Seul le superadmin peut déléguer la gestion des autorisations',
    );
  }
  if (isPermissionsUpdate && changesDelegableAccessAuthority)
    assertPermission(actor, PERMISSIONS.USERS.DELEGATE_ACCESS);
  if (isPermissionsUpdate && effectivelyGrantedAccessPermissionKeys.length > 0)
    assertPermission(actor, PERMISSIONS.USERS.GRANT_ACCESS);
  if (isPermissionsUpdate && effectivelyRevokedAccessPermissionKeys.length > 0)
    assertPermission(actor, PERMISSIONS.USERS.REVOKE_ACCESS);

  const needsFallbackAccessMutationPermission =
    isPermissionsUpdate &&
    effectivelyChangedAccessPermissionKeys.size === 0 &&
    (permissionScope === 'access' || hasRequestedAccessOverrideChanges);

  if (needsFallbackAccessMutationPermission)
    assertAccessMutationPermission(actor);

  if (isPermissionsUpdate && permissionScope === undefined) {
    if (
      hasRequestedAccountOverrideChanges ||
      requestedChangedPermissionKeys.length === 0
    ) {
      assertPermission(actor, PERMISSIONS.USERS.UPDATE_ACCOUNT_POLICY);
    }

    // An unscoped no-op has no boundary signal, so both the personal account
    // policy and at least one access mutation capability are required.
    if (requestedChangedPermissionKeys.length === 0)
      assertAccessMutationPermission(actor);
  }

  return {
    effectivelyGrantedPermissionKeys,
    effectivelyRevokedPermissionKeys,
    requiredProofLevel: classifyUserPermissionMutationProof({
      effectivelyGrantedPermissionKeys,
      effectivelyRevokedPermissionKeys,
      requestedChangedPermissionKeys,
      roleChanged: isRoleUpdate && existingRole !== resultingRole,
      targetRole: existingRole,
    }),
  };
};
