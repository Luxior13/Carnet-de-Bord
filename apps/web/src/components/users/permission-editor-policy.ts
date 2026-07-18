import { type UserRole } from '@repo/shared';

import {
  getDependentPermissionKeys,
  getEffectivePermissions,
  getPermissionItem,
  isPermissionGrantable,
  PERMISSIONS,
  type PermissionsData,
} from '$constants/permissions.constants';

export type PermissionChoiceState = 'allow' | 'deny';

export type PermissionMutationDecision = {
  allowed: boolean;
  reason?: string;
};

export type PermissionMutationPolicy = (
  permissionKey: string,
  enabled: boolean,
) => PermissionMutationDecision;

export type PermissionMutationSummary = {
  delegationChangeCount: number;
  delegationPermissionKeys: string[];
  grantedCount: number;
  grantedPermissionKeys: string[];
  revokedCount: number;
  revokedPermissionKeys: string[];
};

export type PermissionMutationBatchAnalysis = {
  decision: PermissionMutationDecision;
  summary: PermissionMutationSummary;
};

type PermissionMutationBatchInput = {
  accessPermissionKeys: ReadonlySet<string>;
  currentEffectivePermissions: ReadonlyMap<string, boolean>;
  currentPermissionsMap: ReadonlyMap<string, boolean>;
  disabled: boolean;
  nextPermissions: PermissionsData | null;
  policy?: PermissionMutationPolicy;
  role: UserRole;
};

const ACCESS_DELEGATION_PERMISSION_KEYS = new Set<string>([
  PERMISSIONS.USERS.DELEGATE_ACCESS,
  PERMISSIONS.USERS.GRANT_ACCESS,
  PERMISSIONS.USERS.REVOKE_ACCESS,
]);

const toPermissionsData = (
  permissionsMap: Map<string, boolean>,
): PermissionsData | null =>
  permissionsMap.size === 0
    ? null
    : (Object.fromEntries(permissionsMap) as PermissionsData);

export const buildPermissionOverrideChange = ({
  permissionKey,
  permissionsMap,
  roleBasePermissionsMap,
  state,
}: {
  permissionKey: string;
  permissionsMap: ReadonlyMap<string, boolean>;
  roleBasePermissionsMap: ReadonlyMap<string, boolean>;
  state: PermissionChoiceState;
}): PermissionsData | null => {
  const nextPermissionsMap = new Map(permissionsMap);
  const setOverride = (key: string, enabled: boolean): void => {
    if (!isPermissionGrantable(key)) return;

    if ((roleBasePermissionsMap.get(key) ?? false) === enabled) {
      nextPermissionsMap.delete(key);
    } else {
      nextPermissionsMap.set(key, enabled);
    }
  };
  const visitedPermissionKeys = new Set<string>();
  const allowWithDependencies = (key: string): void => {
    if (visitedPermissionKeys.has(key)) return;
    visitedPermissionKeys.add(key);

    for (const dependency of getPermissionItem(key)?.dependencies ?? []) {
      allowWithDependencies(dependency);
    }

    setOverride(key, true);
  };
  const denyWithDependents = (key: string): void => {
    if (visitedPermissionKeys.has(key)) return;
    visitedPermissionKeys.add(key);
    setOverride(key, false);

    for (const dependent of getDependentPermissionKeys(key)) {
      denyWithDependents(dependent);
    }
  };

  if (!isPermissionGrantable(permissionKey)) {
    return toPermissionsData(nextPermissionsMap);
  }

  if (state === 'allow') allowWithDependencies(permissionKey);
  else denyWithDependents(permissionKey);

  return toPermissionsData(nextPermissionsMap);
};

export const buildResetPermissionOverrides = (
  permissionsMap: ReadonlyMap<string, boolean>,
  permissionKeys: Iterable<string>,
): PermissionsData | null => {
  const nextPermissionsMap = new Map(permissionsMap);

  for (const permissionKey of permissionKeys) {
    nextPermissionsMap.delete(permissionKey);
  }

  return toPermissionsData(nextPermissionsMap);
};

export const analyzePermissionMutationBatch = ({
  accessPermissionKeys,
  currentEffectivePermissions,
  currentPermissionsMap,
  disabled,
  nextPermissions,
  policy,
  role,
}: PermissionMutationBatchInput): PermissionMutationBatchAnalysis => {
  const nextPermissionsMap = new Map(Object.entries(nextPermissions ?? {}));
  const nextEffectivePermissions = new Map(
    Object.entries(getEffectivePermissions(role, nextPermissions)),
  );
  const mutations: Array<{ enabled: boolean; permissionKey: string }> = [];

  for (const permissionKey of accessPermissionKeys) {
    const isCurrentlyEnabled =
      currentEffectivePermissions.get(permissionKey) ?? false;
    const willBeEnabled = nextEffectivePermissions.get(permissionKey) ?? false;
    const directChoiceChanged =
      currentPermissionsMap.get(permissionKey) !==
      nextPermissionsMap.get(permissionKey);

    if (!directChoiceChanged && isCurrentlyEnabled === willBeEnabled) continue;

    mutations.push({ enabled: willBeEnabled, permissionKey });
  }

  const delegationPermissionKeys = mutations.flatMap(({ permissionKey }) =>
    ACCESS_DELEGATION_PERMISSION_KEYS.has(permissionKey) ? [permissionKey] : [],
  );
  const grantedPermissionKeys = mutations.flatMap(
    ({ enabled, permissionKey }) =>
      enabled && !ACCESS_DELEGATION_PERMISSION_KEYS.has(permissionKey)
        ? [permissionKey]
        : [],
  );
  const revokedPermissionKeys = mutations.flatMap(
    ({ enabled, permissionKey }) =>
      !enabled && !ACCESS_DELEGATION_PERMISSION_KEYS.has(permissionKey)
        ? [permissionKey]
        : [],
  );
  const summary: PermissionMutationSummary = {
    delegationChangeCount: delegationPermissionKeys.length,
    delegationPermissionKeys,
    grantedCount: grantedPermissionKeys.length,
    grantedPermissionKeys,
    revokedCount: revokedPermissionKeys.length,
    revokedPermissionKeys,
  };

  if (disabled) {
    return {
      decision: {
        allowed: false,
        reason: 'Ces autorisations sont disponibles en lecture seule.',
      },
      summary,
    };
  }

  if (!policy) return { decision: { allowed: true }, summary };

  for (const mutation of mutations) {
    const decision = policy(mutation.permissionKey, mutation.enabled);
    if (!decision.allowed) return { decision, summary };
  }

  return { decision: { allowed: true }, summary };
};

export const evaluatePermissionMutationBatch = (
  input: PermissionMutationBatchInput,
): PermissionMutationDecision => analyzePermissionMutationBatch(input).decision;
