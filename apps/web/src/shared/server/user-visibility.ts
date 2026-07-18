import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import {
  PROTECTED_USER_MASKED_LOGIN_NAME,
  PROTECTED_USER_PUBLIC_FIRST_NAME,
  PROTECTED_USER_PUBLIC_LAST_NAME,
} from '$constants/protected-user.constants';
import type { UserType } from '$types/auth.types';

type ProtectedIdentityActor = Pick<UserType, 'id'>;
type UserVisibilityActor = Pick<
  UserType,
  'id' | 'isProtected' | 'permissions' | 'role'
>;

export const isProtectedUserIdentityMasked = (
  user: Pick<UserType, 'id' | 'isProtected'>,
  actor: ProtectedIdentityActor,
): boolean => user.isProtected && user.id !== actor.id;

/**
 * Applies the final, actor-aware visibility boundary for the protected account.
 * This must run server-side after all regular permission projections.
 */
export const protectUserIdentityForActor = (
  user: UserType,
  actor: UserVisibilityActor,
): UserType => {
  const canViewCriticalAccessReadiness =
    actor.isProtected ||
    hasPermission(
      actor.role,
      PERMISSIONS.USERS.GRANT_ACCESS,
      actor.permissions,
    );

  if (!isProtectedUserIdentityMasked(user, actor)) {
    return {
      ...user,
      criticalAccessReady: canViewCriticalAccessReadiness
        ? user.criticalAccessReady
        : undefined,
      identityDetailsVisible: true,
    };
  }

  return {
    ...user,
    contactEmail: null,
    contactEmailVerifiedAt: null,
    criticalAccessReady: undefined,
    failedLoginAttempts: 0,
    firstName: PROTECTED_USER_PUBLIC_FIRST_NAME,
    identityDetailsVisible: false,
    lastLoginAt: null,
    lastName: PROTECTED_USER_PUBLIC_LAST_NAME,
    lockedUntil: null,
    loginName: PROTECTED_USER_MASKED_LOGIN_NAME,
    mfaEnabledAt: null,
    mustChangePassword: false,
    passwordChangedAt: null,
    permissions: null,
    securityDetailsVisible: false,
    updatedAt: undefined,
  };
};
