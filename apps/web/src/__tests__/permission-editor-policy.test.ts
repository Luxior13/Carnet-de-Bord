import { describe, expect, it, vi } from 'vitest';

import {
  analyzePermissionMutationBatch,
  buildPermissionOverrideChange,
  buildResetPermissionOverrides,
  evaluatePermissionMutationBatch,
} from '$components/users/permission-editor-policy';
import {
  analyzeUserAccessMutationBatch,
  decideUserAccessMutation,
} from '$components/users/user-detail/user-access-editor-policy';
import {
  getAccessPermissionKeys,
  getEffectivePermissions,
  getRoleBasePermissions,
  PERMISSIONS,
  type PermissionsData,
} from '$constants/permissions.constants';
import { type UserType } from '$types/auth.types';

type MutationBatchBase = Omit<
  Parameters<typeof evaluatePermissionMutationBatch>[0],
  'nextPermissions' | 'policy'
>;

const buildContext = (
  role: 'ADMIN' | 'USER',
  permissions: PermissionsData | null,
): MutationBatchBase => ({
  accessPermissionKeys: new Set(getAccessPermissionKeys()),
  currentEffectivePermissions: new Map(
    Object.entries(getEffectivePermissions(role, permissions)),
  ),
  currentPermissionsMap: new Map(Object.entries(permissions ?? {})),
  disabled: false,
  role,
});

const buildPolicyUser = (overrides: Partial<UserType> = {}): UserType =>
  ({
    criticalAccessReady: true,
    id: 'user-1',
    isProtected: false,
    permissions: null,
    role: 'USER',
    ...overrides,
  }) as UserType;

describe('permission editor mutation policy', () => {
  it('builds a complete delegation chain when delegation is allowed', () => {
    const permissionsMap = new Map<string, boolean>();
    const nextPermissions = buildPermissionOverrideChange({
      permissionKey: PERMISSIONS.USERS.DELEGATE_ACCESS,
      permissionsMap,
      roleBasePermissionsMap: new Map(
        Object.entries(getRoleBasePermissions('USER')),
      ),
      state: 'allow',
    });

    expect(nextPermissions).toEqual({
      [PERMISSIONS.USERS.DELEGATE_ACCESS]: true,
      [PERMISSIONS.USERS.GRANT_ACCESS]: true,
      [PERMISSIONS.USERS.REVOKE_ACCESS]: true,
      [PERMISSIONS.USERS.VIEW]: true,
      [PERMISSIONS.USERS.VIEW_ACCESS]: true,
    });
  });

  it('keeps role-bound permissions outside individual editor changes', () => {
    const currentPermissions = new Map<string, boolean>([
      [PERMISSIONS.USERS.VIEW, true],
    ]);
    const roleBasePermissionsMap = new Map(
      Object.entries(getRoleBasePermissions('USER')),
    );

    for (const permissionKey of [
      PERMISSIONS.SETTINGS.VIEW,
      PERMISSIONS.SETTINGS.UPDATE,
    ]) {
      expect(
        buildPermissionOverrideChange({
          permissionKey,
          permissionsMap: currentPermissions,
          roleBasePermissionsMap,
          state: 'allow',
        }),
      ).toEqual({ [PERMISSIONS.USERS.VIEW]: true });
      expect(
        buildPermissionOverrideChange({
          permissionKey,
          permissionsMap: currentPermissions,
          roleBasePermissionsMap,
          state: 'deny',
        }),
      ).toEqual({ [PERMISSIONS.USERS.VIEW]: true });
    }
  });

  it('permits an attribution-only actor to grant but not revoke access', () => {
    const policy = vi.fn((_: string, enabled: boolean) => ({
      allowed: enabled,
      reason: enabled ? undefined : 'Retrait interdit',
    }));
    const grantedPermissions = { [PERMISSIONS.USERS.VIEW]: true };

    expect(
      evaluatePermissionMutationBatch({
        ...buildContext('USER', null),
        nextPermissions: grantedPermissions,
        policy,
      }),
    ).toEqual({ allowed: true });
    expect(
      evaluatePermissionMutationBatch({
        ...buildContext('USER', grantedPermissions),
        nextPermissions: null,
        policy,
      }),
    ).toEqual({ allowed: false, reason: 'Retrait interdit' });
  });

  it('permits a revoke-only actor to remove access but not grant it', () => {
    const policy = vi.fn((_: string, enabled: boolean) => ({
      allowed: !enabled,
      reason: enabled ? 'Attribution interdite' : undefined,
    }));
    const grantedPermissions = { [PERMISSIONS.USERS.VIEW]: true };

    expect(
      evaluatePermissionMutationBatch({
        ...buildContext('USER', grantedPermissions),
        nextPermissions: null,
        policy,
      }),
    ).toEqual({ allowed: true });
    expect(
      evaluatePermissionMutationBatch({
        ...buildContext('USER', null),
        nextPermissions: grantedPermissions,
        policy,
      }),
    ).toEqual({ allowed: false, reason: 'Attribution interdite' });
  });

  it('rejects an entire dependency cascade when one mutation is forbidden', () => {
    const nextPermissions = buildPermissionOverrideChange({
      permissionKey: PERMISSIONS.USERS.DELEGATE_ACCESS,
      permissionsMap: new Map(),
      roleBasePermissionsMap: new Map(
        Object.entries(getRoleBasePermissions('USER')),
      ),
      state: 'allow',
    });

    expect(
      evaluatePermissionMutationBatch({
        ...buildContext('USER', null),
        nextPermissions,
        policy: (permissionKey) => ({
          allowed: permissionKey !== PERMISSIONS.USERS.DELEGATE_ACCESS,
          reason: 'Réservé au super-administrateur',
        }),
      }),
    ).toEqual({
      allowed: false,
      reason: 'Réservé au super-administrateur',
    });
  });

  it('classifies a reset from the role result, including implicit grants', () => {
    const currentPermissions = { [PERMISSIONS.USERS.ARCHIVE]: false };
    const nextPermissions = buildResetPermissionOverrides(
      new Map(Object.entries(currentPermissions)),
      [PERMISSIONS.USERS.ARCHIVE],
    );

    expect(
      evaluatePermissionMutationBatch({
        ...buildContext('ADMIN', currentPermissions),
        nextPermissions,
        policy: (_permissionKey, enabled) => ({
          allowed: !enabled,
          reason: 'Attribution interdite',
        }),
      }),
    ).toEqual({ allowed: false, reason: 'Attribution interdite' });
  });

  it('keeps the final batch atomic and summarizes grants, revocations and delegation separately', () => {
    const currentPermissions = {
      [PERMISSIONS.USERS.ARCHIVE]: true,
      [PERMISSIONS.USERS.VIEW]: true,
    };
    const nextPermissions = {
      [PERMISSIONS.USERS.GRANT_ACCESS]: true,
      [PERMISSIONS.USERS.RESET_PASSWORD]: true,
      [PERMISSIONS.USERS.REVOKE_ACCESS]: true,
      [PERMISSIONS.USERS.VIEW]: true,
      [PERMISSIONS.USERS.VIEW_ACCESS]: true,
      [PERMISSIONS.USERS.VIEW_SECURITY]: true,
    };
    const analysis = analyzePermissionMutationBatch({
      ...buildContext('USER', currentPermissions),
      nextPermissions,
      policy: (_permissionKey, enabled) => ({
        allowed: enabled,
        reason: enabled ? undefined : 'Retrait interdit',
      }),
    });

    expect(analysis.decision).toEqual({
      allowed: false,
      reason: 'Retrait interdit',
    });
    expect(analysis.summary).toMatchObject({
      delegationChangeCount: 2,
      grantedCount: 3,
      revokedCount: 1,
    });
    expect(analysis.summary.revokedPermissionKeys).toContain(
      PERMISSIONS.USERS.ARCHIVE,
    );
  });
});

describe('user access editor policy', () => {
  const target = buildPolicyUser({ id: 'target-1' });

  it('keeps the delegation right itself root-only', () => {
    expect(
      decideUserAccessMutation(
        {
          actor: buildPolicyUser({ id: 'admin-1', role: 'ADMIN' }),
          canDelegate: true,
          canGrant: true,
          canMutate: true,
          canRevoke: true,
          isProtectedActor: false,
          target,
        },
        PERMISSIONS.USERS.DELEGATE_ACCESS,
        true,
      ),
    ).toMatchObject({ allowed: false });
  });

  it('requires delegation to change grant or revoke management rights', () => {
    expect(
      decideUserAccessMutation(
        {
          actor: buildPolicyUser({ role: 'ADMIN' }),
          canDelegate: false,
          canGrant: true,
          canMutate: true,
          canRevoke: true,
          isProtectedActor: false,
          target,
        },
        PERMISSIONS.USERS.GRANT_ACCESS,
        true,
      ),
    ).toMatchObject({ allowed: false });
  });

  it('allows revoking a right the actor does not own but blocks granting it', () => {
    const context = {
      actor: buildPolicyUser(),
      canDelegate: false,
      canGrant: true,
      canMutate: true,
      canRevoke: true,
      isProtectedActor: false,
      target,
    };

    expect(
      decideUserAccessMutation(context, PERMISSIONS.USERS.ARCHIVE, false),
    ).toEqual({ allowed: true });
    expect(
      decideUserAccessMutation(context, PERMISSIONS.USERS.ARCHIVE, true),
    ).toMatchObject({ allowed: false });
  });

  it('blocks only critical grants when the target MFA is incomplete', () => {
    const context = {
      actor: buildPolicyUser({ role: 'ADMIN' }),
      canDelegate: true,
      canGrant: true,
      canMutate: true,
      canRevoke: true,
      isProtectedActor: false,
      target: buildPolicyUser({ criticalAccessReady: false, id: 'target-1' }),
    };

    expect(
      decideUserAccessMutation(context, PERMISSIONS.USERS.UPDATE_LOGIN, true),
    ).toMatchObject({ allowed: false });
    expect(
      decideUserAccessMutation(context, PERMISSIONS.USERS.UPDATE_LOGIN, false),
    ).toEqual({ allowed: true });
  });

  it('fails closed when critical-access readiness is absent', () => {
    expect(
      decideUserAccessMutation(
        {
          actor: buildPolicyUser({ role: 'ADMIN' }),
          canDelegate: true,
          canGrant: true,
          canMutate: true,
          canRevoke: true,
          isProtectedActor: false,
          target: buildPolicyUser({
            criticalAccessReady: undefined,
            id: 'target-1',
          }),
        },
        PERMISSIONS.USERS.UPDATE_LOGIN,
        true,
      ),
    ).toMatchObject({ allowed: false });
  });

  it('blocks promotion without MFA even when it creates no effective access mutation', () => {
    const alreadyEffectiveAdminAccess = Object.fromEntries(
      getAccessPermissionKeys().map((permissionKey) => [permissionKey, true]),
    ) as PermissionsData;
    const analysis = analyzeUserAccessMutationBatch({
      currentPermissions: alreadyEffectiveAdminAccess,
      currentRole: 'USER',
      disabled: false,
      nextPermissions: alreadyEffectiveAdminAccess,
      nextRole: 'ADMIN',
      policy: () => ({ allowed: true }),
      targetCriticalAccessReady: false,
    });

    expect(analysis.summary).toMatchObject({
      delegationChangeCount: 0,
      grantedCount: 0,
      revokedCount: 0,
    });
    expect(analysis.decision).toMatchObject({ allowed: false });
  });
});
