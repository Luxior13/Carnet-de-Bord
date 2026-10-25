import 'server-only';

import { Prisma } from '@prisma/client';

import { FEATURES } from '$constants/feature-registry.constants';
import {
  arePermissionOverridesEqual,
  getAccountPermissionKeys,
  normalizePermissionOverrides,
} from '$constants/permissions.constants';
import {
  getChangedPermissionKeys,
  type UserUpdateInput,
} from '$features/users/user-update.schema';
import {
  type AuditLogInput,
  createAuditLogWithHeaders,
} from '$server/audit-log';
import { prisma } from '$server/prisma';
import {
  assertUserActionProof,
  authorizeUserAction,
  type UserActionAuthority,
  type UserActionProof,
} from '$server/user-action-authorization';

import { USER_DETAIL_SELECT } from './user-detail.service';

export class LoginNameReservationConflictError extends Error {
  constructor() {
    super('Login name is permanently reserved by another user');
    this.name = 'LoginNameReservationConflictError';
  }
}

const USERS_PAGE_AUDIT_LOCATION = FEATURES.users.audit;
const ACCOUNT_PERMISSION_KEY_SET = new Set(getAccountPermissionKeys());
export type UserForUpdate = Prisma.UserGetPayload<{
  select: typeof USER_DETAIL_SELECT;
}>;

type UserUpdateMutation = {
  afterValues: Record<string, unknown>;
  beforeValues: Record<string, unknown>;
  changedKeys: string[];
  changedPermissionKeys: string[];
  hasAuthorizationChange: boolean;
  shouldInvalidateSessions: boolean;
  updateData: Record<string, unknown>;
};

export const prepareUserUpdate = (
  existingUser: UserForUpdate,
  input: UserUpdateInput,
): UserUpdateMutation => {
  const {
    contactEmail,
    firstName,
    isActive,
    lastName,
    loginName,
    permissions,
    role,
  } = input;
  const existingPermissionOverrides = normalizePermissionOverrides(
    existingUser.permissions as Record<string, boolean> | null,
  );
  // Build update data and track changes
  const updateData: Record<string, unknown> = {};
  const beforeValues: Record<string, unknown> = {};
  const afterValues: Record<string, unknown> = {};

  if (loginName && loginName !== existingUser.loginName) {
    beforeValues.loginName = existingUser.loginName;
    afterValues.loginName = loginName;
    updateData.loginName = loginName;
  }
  if (contactEmail !== undefined) {
    const newContactEmail = contactEmail ?? null;
    if (newContactEmail !== existingUser.contactEmail) {
      beforeValues.contactEmail = existingUser.contactEmail;
      afterValues.contactEmail = newContactEmail;
      updateData.contactEmail = newContactEmail;
      // An administrator can record a contact address, but only a future
      // proof-of-control flow may mark it as verified.
      updateData.contactEmailVerifiedAt = null;
    }
  }
  if (firstName) {
    const newFirstName = firstName.trim();
    if (newFirstName !== existingUser.firstName) {
      beforeValues.firstName = existingUser.firstName;
      afterValues.firstName = newFirstName;
      updateData.firstName = newFirstName;
    }
  }
  if (lastName !== undefined) {
    const newLastName = lastName.trim();
    if (newLastName !== existingUser.lastName) {
      beforeValues.lastName = existingUser.lastName;
      afterValues.lastName = newLastName;
      updateData.lastName = newLastName;
    }
  }
  if (role && role !== existingUser.role) {
    beforeValues.role = existingUser.role;
    afterValues.role = role;
    updateData.role = role;
  }
  if (typeof isActive === 'boolean' && isActive !== existingUser.isActive) {
    beforeValues.isActive = existingUser.isActive;
    afterValues.isActive = isActive;
    updateData.isActive = isActive;
  }
  if (permissions !== undefined) {
    // Only track if actually changed
    if (
      !arePermissionOverridesEqual(permissions, existingPermissionOverrides)
    ) {
      beforeValues.permissions = existingPermissionOverrides;
      afterValues.permissions = permissions;
      updateData.permissions = permissions ?? Prisma.DbNull;
    }
  }
  const changedKeys = Object.keys(afterValues);
  const hasAuthorizationChange =
    changedKeys.includes('permissions') || changedKeys.includes('role');
  const changedPermissionKeys = changedKeys.includes('permissions')
    ? getChangedPermissionKeys(
        beforeValues.permissions,
        afterValues.permissions,
      )
    : [];
  // Role and permissions are read again on every request and every guarded
  // mutation, and the login name only serves to sign in: those changes apply
  // without signing the user out (owner decisions of 25 October 2026). Only a
  // deactivation closes the sessions.
  const shouldInvalidateSessions =
    changedKeys.includes('isActive') && isActive === false;

  if (shouldInvalidateSessions) {
    updateData.securityVersion = { increment: 1 };
  }

  return {
    afterValues,
    beforeValues,
    changedKeys,
    changedPermissionKeys,
    hasAuthorizationChange,
    shouldInvalidateSessions,
    updateData,
  };
};

export const updateUserWithAudit = async ({
  actorId,
  authority,
  effectivelyGrantedPermissionKeys,
  effectivelyRevokedPermissionKeys,
  existingUser,
  expectedUpdatedAt,
  mutation,
  requiredProof,
}: {
  actorId: string;
  authority: UserActionAuthority;
  effectivelyGrantedPermissionKeys: string[];
  effectivelyRevokedPermissionKeys: string[];
  existingUser: UserForUpdate;
  expectedUpdatedAt: Date;
  mutation: ReturnType<typeof prepareUserUpdate>;
  requiredProof: UserActionProof;
}): Promise<UserForUpdate> => {
  const {
    afterValues,
    beforeValues,
    changedKeys,
    changedPermissionKeys,
    hasAuthorizationChange,
    shouldInvalidateSessions,
    updateData,
  } = mutation;
  const id = existingUser.id;
  const isActive = updateData.isActive;
  // Build target name for audit log
  const targetName =
    existingUser.firstName && existingUser.lastName
      ? `${existingUser.firstName} ${existingUser.lastName}`
      : existingUser.loginName;
  const hasOnlyAccountPermissionChanges =
    changedKeys.length === 1 &&
    changedPermissionKeys.length > 0 &&
    changedPermissionKeys.every((permissionKey) =>
      ACCOUNT_PERMISSION_KEY_SET.has(permissionKey),
    );
  const permissionAuditTab = hasOnlyAccountPermissionChanges
    ? { tabKey: 'account', tabLabel: 'Autonomie du compte' }
    : { tabKey: 'access', tabLabel: 'Autorisations' };

  const updatedLoginName =
    typeof updateData.loginName === 'string'
      ? updateData.loginName
      : existingUser.loginName;
  const auditEntries: AuditLogInput[] = [];

  if (changedKeys.includes('isActive') && isActive === false) {
    auditEntries.push({
      action: 'USER_DEACTIVATE',
      category: 'USER',
      description: `Utilisateur désactivé: ${updatedLoginName}`,
      metadata: {
        after: afterValues,
        before: beforeValues,
        ...USERS_PAGE_AUDIT_LOCATION,
        tabKey: 'security',
        tabLabel: 'Sécurité',
        targetName,
      },
      targetUserId: id,
      userId: actorId,
    });
  } else if (changedKeys.includes('isActive') && isActive === true) {
    auditEntries.push({
      action: 'USER_ACTIVATE',
      category: 'USER',
      description: `Utilisateur réactivé: ${updatedLoginName}`,
      metadata: {
        after: afterValues,
        before: beforeValues,
        ...USERS_PAGE_AUDIT_LOCATION,
        tabKey: 'security',
        tabLabel: 'Sécurité',
        targetName,
      },
      targetUserId: id,
      userId: actorId,
    });
  }

  if (hasAuthorizationChange) {
    auditEntries.push({
      action: 'PERMISSION_UPDATE',
      category: 'PERMISSION',
      description: `Autorisations modifiées : ${updatedLoginName}`,
      metadata: {
        after: afterValues,
        before: beforeValues,
        changes: changedKeys,
        effectivelyGrantedPermissionKeys,
        effectivelyRevokedPermissionKeys,
        ...USERS_PAGE_AUDIT_LOCATION,
        ...permissionAuditTab,
        targetName,
      },
      targetUserId: id,
      userId: actorId,
    });
  }

  if (auditEntries.length === 0) {
    auditEntries.push({
      action: 'USER_UPDATE',
      category: 'USER',
      description: `Utilisateur modifié: ${updatedLoginName}`,
      metadata: {
        after: afterValues,
        before: beforeValues,
        changes: changedKeys,
        ...USERS_PAGE_AUDIT_LOCATION,
        tabKey: 'profile',
        tabLabel: 'Profil',
        targetName,
      },
      targetUserId: id,
      userId: actorId,
    });
  }

  return prisma.$transaction(async (transaction) => {
    const authorized = await authorizeUserAction(
      transaction,
      authority,
      null,
      id,
    );
    assertUserActionProof(authorized, requiredProof);
    if (changedKeys.includes('loginName')) {
      const reservation = await transaction.loginNameReservation.findUnique({
        where: { loginName: updatedLoginName },
      });

      if (reservation && reservation.userId !== id) {
        throw new LoginNameReservationConflictError();
      }

      // Returning to one of this user's former names is allowed. A brand-new
      // name is reserved before the User update, and the whole reservation
      // rolls back if optimistic concurrency or auditing later fails.
      if (!reservation) {
        await transaction.loginNameReservation.create({
          data: { loginName: updatedLoginName, userId: id },
        });
      }
    }

    const nextUser = await transaction.user.update({
      data: updateData,
      select: USER_DETAIL_SELECT,
      where: {
        id,
        securityVersion: existingUser.securityVersion,
        updatedAt: expectedUpdatedAt,
      },
    });

    if (shouldInvalidateSessions) {
      await transaction.session.deleteMany({ where: { userId: id } });
    }

    for (const auditEntry of auditEntries) {
      await createAuditLogWithHeaders(auditEntry, {
        client: transaction,
        required: true,
      });
    }

    return nextUser;
  });
};
