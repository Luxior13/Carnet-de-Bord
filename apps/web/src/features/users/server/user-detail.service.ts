import 'server-only';

import {
  getAccessPermissionKeys,
  getAccountPermissionKeys,
  hasPermission,
  normalizePermissionOverrides,
  PERMISSIONS,
} from '$constants/permissions.constants';
import { mapUserToUserType } from '$server/auth';
import { prisma } from '$server/prisma';
import { protectUserIdentityForActor } from '$server/user-visibility';
import type { UserType } from '$types/auth.types';

const ACCESS_PERMISSION_KEY_SET = new Set(getAccessPermissionKeys());
const ACCOUNT_PERMISSION_KEY_SET = new Set(getAccountPermissionKeys());

const getPermissionOverridesForActor = (
  permissions: Record<string, boolean> | null,
  actor: UserType,
): Record<string, boolean> | null => {
  const normalizedPermissions = normalizePermissionOverrides(permissions);
  if (actor.isProtected) return normalizedPermissions;

  const visiblePermissionKeys = new Set<string>();
  if (
    hasPermission(actor.role, PERMISSIONS.USERS.VIEW_ACCESS, actor.permissions)
  ) {
    for (const permissionKey of ACCESS_PERMISSION_KEY_SET) {
      visiblePermissionKeys.add(permissionKey);
    }
  }
  if (
    hasPermission(
      actor.role,
      PERMISSIONS.USERS.VIEW_ACCOUNT_POLICY,
      actor.permissions,
    )
  ) {
    for (const permissionKey of ACCOUNT_PERMISSION_KEY_SET) {
      visiblePermissionKeys.add(permissionKey);
    }
  }
  if (visiblePermissionKeys.size === 0) return null;

  return normalizePermissionOverrides(
    Object.fromEntries(
      Object.entries(normalizedPermissions ?? {}).filter(([permissionKey]) =>
        visiblePermissionKeys.has(permissionKey),
      ),
    ),
  );
};

type UserWithCriticalAccessReadiness = Parameters<
  typeof mapUserToUserType
>[0] & {
  totpCredential?: { userId: string } | null;
};

export const mapUserForActor = (
  user: UserWithCriticalAccessReadiness,
  actor: UserType,
): UserType => {
  const clientUser = mapUserToUserType(user);
  const canViewContact =
    actor.id === clientUser.id ||
    actor.isProtected ||
    hasPermission(
      actor.role,
      PERMISSIONS.USERS.VIEW_CONTACT,
      actor.permissions,
    ) ||
    hasPermission(
      actor.role,
      PERMISSIONS.USERS.UPDATE_CONTACT,
      actor.permissions,
    );
  const canViewSecurity =
    actor.id === clientUser.id ||
    actor.isProtected ||
    hasPermission(
      actor.role,
      PERMISSIONS.USERS.VIEW_SECURITY,
      actor.permissions,
    );

  return protectUserIdentityForActor(
    {
      ...clientUser,
      criticalAccessReady:
        clientUser.mfaEnabledAt !== null && Boolean(user.totpCredential),
      ...(canViewContact
        ? {}
        : { contactEmail: null, contactEmailVerifiedAt: null }),
      ...(canViewSecurity
        ? { securityDetailsVisible: true }
        : {
            failedLoginAttempts: 0,
            lockedUntil: null,
            mfaEnabledAt: null,
            mustChangePassword: false,
            passwordChangedAt: null,
            securityDetailsVisible: false,
          }),
      permissions: getPermissionOverridesForActor(
        clientUser.permissions,
        actor,
      ),
    },
    actor,
  );
};

export const getUserForActor = async (
  userId: string,
  actor: UserType,
): Promise<UserType | null> => {
  const user = await prisma.user.findUnique({
    include: { totpCredential: { select: { userId: true } } },
    where: { deletedAt: null, id: userId },
  });

  return user ? mapUserForActor(user, actor) : null;
};
