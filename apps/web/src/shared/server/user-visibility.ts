import {
  PROTECTED_USER_MASKED_LOGIN_NAME,
  PROTECTED_USER_PUBLIC_FIRST_NAME,
  PROTECTED_USER_PUBLIC_LAST_NAME,
} from '$constants/protected-user.constants';
import type { UserType } from '$types/auth.types';

type UserVisibilityActor = Pick<UserType, 'id'>;

export const isProtectedUserIdentityMasked = (
  user: Pick<UserType, 'id' | 'isProtected'>,
  actor: UserVisibilityActor,
): boolean => user.isProtected && user.id !== actor.id;

/**
 * Applies the final, actor-aware visibility boundary for the protected account.
 * This must run server-side after all regular permission projections.
 */
export const protectUserIdentityForActor = (
  user: UserType,
  actor: UserVisibilityActor,
): UserType => {
  if (!isProtectedUserIdentityMasked(user, actor)) {
    return { ...user, identityDetailsVisible: true };
  }

  return {
    ...user,
    contactEmail: null,
    contactEmailVerifiedAt: null,
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
