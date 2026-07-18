import { type UserRole } from '@repo/database';

import {
  analyzePermissionMutationBatch,
  type PermissionMutationBatchAnalysis,
  type PermissionMutationDecision,
  type PermissionMutationPolicy,
} from '$components/users/permission-editor-policy';
import {
  getAccessPermissionKeys,
  getEffectivePermissions,
  getPermissionItem,
  hasPermission,
  PERMISSIONS,
  type PermissionsData,
} from '$constants/permissions.constants';
import { type UserType } from '$types/auth.types';

const ACCESS_PERMISSION_KEY_SET = new Set(getAccessPermissionKeys());

export type UserAccessMutationCapabilities = {
  canDelegate: boolean;
  canGrant: boolean;
  canRevoke: boolean;
};

export const getUserAccessMutationCapabilities = (
  actor: UserType | null,
  isProtectedActor: boolean,
): UserAccessMutationCapabilities => ({
  canDelegate:
    isProtectedActor ||
    (!!actor &&
      hasPermission(
        actor.role,
        PERMISSIONS.USERS.DELEGATE_ACCESS,
        actor.permissions,
      )),
  canGrant:
    isProtectedActor ||
    (!!actor &&
      hasPermission(
        actor.role,
        PERMISSIONS.USERS.GRANT_ACCESS,
        actor.permissions,
      )),
  canRevoke:
    isProtectedActor ||
    (!!actor &&
      hasPermission(
        actor.role,
        PERMISSIONS.USERS.REVOKE_ACCESS,
        actor.permissions,
      )),
});

export const analyzeUserAccessMutationBatch = ({
  currentPermissions,
  currentRole,
  disabled,
  nextPermissions,
  nextRole,
  policy,
  targetCriticalAccessReady,
}: {
  currentPermissions: PermissionsData | null;
  currentRole: UserRole;
  disabled: boolean;
  nextPermissions: PermissionsData | null;
  nextRole: UserRole;
  policy: PermissionMutationPolicy;
  targetCriticalAccessReady: boolean | undefined;
}): PermissionMutationBatchAnalysis => {
  const analysis = analyzePermissionMutationBatch({
    accessPermissionKeys: ACCESS_PERMISSION_KEY_SET,
    currentEffectivePermissions: new Map(
      Object.entries(getEffectivePermissions(currentRole, currentPermissions)),
    ),
    currentPermissionsMap: new Map(Object.entries(currentPermissions ?? {})),
    disabled,
    nextPermissions,
    policy,
    role: nextRole,
  });

  if (!analysis.decision.allowed) return analysis;
  if (
    currentRole !== 'ADMIN' &&
    nextRole === 'ADMIN' &&
    targetCriticalAccessReady !== true
  ) {
    return {
      ...analysis,
      decision: {
        allowed: false,
        reason:
          'La double authentification complète est requise avant la promotion.',
      },
    };
  }

  return analysis;
};

type UserAccessEditorPolicyContext = {
  actor: UserType | null;
  canDelegate: boolean;
  canGrant: boolean;
  canMutate: boolean;
  canRevoke: boolean;
  isProtectedActor: boolean;
  target: UserType | null;
};

export const decideUserAccessMutation = (
  context: UserAccessEditorPolicyContext,
  permissionKey: string,
  enabled: boolean,
): PermissionMutationDecision => {
  const {
    actor,
    canDelegate,
    canGrant,
    canMutate,
    canRevoke,
    isProtectedActor,
    target,
  } = context;

  if (!target || !actor || !canMutate) {
    return {
      allowed: false,
      reason: 'Les autorisations de ce compte sont en lecture seule.',
    };
  }

  if (permissionKey === PERMISSIONS.USERS.DELEGATE_ACCESS) {
    if (!isProtectedActor) {
      return {
        allowed: false,
        reason:
          'Seul le compte racine peut attribuer ou retirer le droit de délégation.',
      };
    }
  } else if (
    permissionKey === PERMISSIONS.USERS.GRANT_ACCESS ||
    permissionKey === PERMISSIONS.USERS.REVOKE_ACCESS
  ) {
    if (!canDelegate) {
      return {
        allowed: false,
        reason: 'Le droit de déléguer la gestion des autorisations est requis.',
      };
    }
  } else if (enabled && !canGrant) {
    return {
      allowed: false,
      reason: "Le droit d'accorder des autorisations est requis.",
    };
  } else if (!enabled && !canRevoke) {
    return {
      allowed: false,
      reason: 'Le droit de retirer des autorisations est requis.',
    };
  }

  if (
    enabled &&
    !isProtectedActor &&
    !hasPermission(actor.role, permissionKey, actor.permissions)
  ) {
    return {
      allowed: false,
      reason:
        'Vous ne pouvez accorder que des autorisations que vous possédez.',
    };
  }

  if (
    enabled &&
    getPermissionItem(permissionKey)?.requiresTargetMfa === true &&
    target.criticalAccessReady !== true
  ) {
    return {
      allowed: false,
      reason:
        'La double authentification complète de la cible est requise pour cet accès critique.',
    };
  }

  return { allowed: true };
};
