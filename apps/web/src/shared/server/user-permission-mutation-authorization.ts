import { type UserRole } from '@repo/database';
import { NextResponse } from 'next/server';

import {
  getAccessPermissionKeys,
  getAccountPermissionKeys,
  getAllPermissionKeys,
  getPermissionItem,
  hasPermission,
  PERMISSIONS,
  type PermissionsData,
} from '$constants/permissions.constants';
import { requirePermission } from '$server/api-auth';
import { type ApiErrorResponse, ErrorCode } from '$types/api.types';
import type { UserType } from '$types/auth.types';

type PermissionScope = 'access' | 'account';

type AuthorizationFailure = {
  response: NextResponse<ApiErrorResponse>;
  success: false;
};

type AuthorizationSuccess = {
  success: true;
};

type PermissionMutationAuthorizationSuccess = AuthorizationSuccess & {
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

const requireAccessMutationPermission = (
  actor: UserType,
): AuthorizationSuccess | AuthorizationFailure => {
  if (hasAccessMutationPermission(actor)) return { success: true };

  return requirePermission(actor, PERMISSIONS.USERS.GRANT_ACCESS);
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
 */
export const preauthorizeUserPermissionMutation = (
  actor: UserType,
  permissionScope?: PermissionScope,
): AuthorizationSuccess | AuthorizationFailure => {
  if (permissionScope === 'account') {
    return requirePermission(actor, PERMISSIONS.USERS.UPDATE_ACCOUNT_POLICY);
  }

  if (permissionScope === 'access') {
    return requireAccessMutationPermission(actor);
  }

  if (
    hasAccessMutationPermission(actor) ||
    hasPermission(
      actor.role,
      PERMISSIONS.USERS.UPDATE_ACCOUNT_POLICY,
      actor.permissions,
    )
  ) {
    return { success: true };
  }

  return requirePermission(actor, PERMISSIONS.USERS.GRANT_ACCESS);
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
}: AuthorizeUserPermissionMutationInput):
  PermissionMutationAuthorizationSuccess | AuthorizationFailure => {
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
    return {
      response: NextResponse.json<ApiErrorResponse>(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message:
              'Seul le compte racine peut déléguer la gestion des autorisations',
          },
          success: false,
        },
        { status: 403 },
      ),
      success: false,
    };
  }

  if (isPermissionsUpdate && changesDelegableAccessAuthority) {
    const delegationPermissionCheck = requirePermission(
      actor,
      PERMISSIONS.USERS.DELEGATE_ACCESS,
    );
    if (!delegationPermissionCheck.success) return delegationPermissionCheck;
  }

  if (
    isPermissionsUpdate &&
    effectivelyGrantedAccessPermissionKeys.length > 0
  ) {
    const grantPermissionCheck = requirePermission(
      actor,
      PERMISSIONS.USERS.GRANT_ACCESS,
    );
    if (!grantPermissionCheck.success) return grantPermissionCheck;
  }

  if (
    isPermissionsUpdate &&
    effectivelyRevokedAccessPermissionKeys.length > 0
  ) {
    const revokePermissionCheck = requirePermission(
      actor,
      PERMISSIONS.USERS.REVOKE_ACCESS,
    );
    if (!revokePermissionCheck.success) return revokePermissionCheck;
  }

  const needsFallbackAccessMutationPermission =
    isPermissionsUpdate &&
    effectivelyChangedAccessPermissionKeys.size === 0 &&
    (permissionScope === 'access' || hasRequestedAccessOverrideChanges);

  if (needsFallbackAccessMutationPermission) {
    const fallbackPermissionCheck = requireAccessMutationPermission(actor);
    if (!fallbackPermissionCheck.success) return fallbackPermissionCheck;
  }

  if (isPermissionsUpdate && permissionScope === undefined) {
    if (
      hasRequestedAccountOverrideChanges ||
      requestedChangedPermissionKeys.length === 0
    ) {
      const accountPolicyPermissionCheck = requirePermission(
        actor,
        PERMISSIONS.USERS.UPDATE_ACCOUNT_POLICY,
      );
      if (!accountPolicyPermissionCheck.success) {
        return accountPolicyPermissionCheck;
      }
    }

    // An unscoped legacy no-op has no boundary signal, so both the personal
    // account policy and at least one access mutation capability are required.
    if (requestedChangedPermissionKeys.length === 0) {
      const accessMutationPermissionCheck =
        requireAccessMutationPermission(actor);
      if (!accessMutationPermissionCheck.success) {
        return accessMutationPermissionCheck;
      }
    }
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
    success: true,
  };
};
