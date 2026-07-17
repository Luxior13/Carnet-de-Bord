import { PROTECTED_USER_PUBLIC_DISPLAY_NAME } from '$constants/protected-user.constants';
import type { UserType } from '$types/auth.types';

export const isUserIdentityMasked = (
  user: Pick<UserType, 'identityDetailsVisible'>,
): boolean => user.identityDetailsVisible === false;

export const getUserDisplayName = (
  user: Pick<UserType, 'firstName' | 'identityDetailsVisible' | 'lastName'>,
): string =>
  isUserIdentityMasked(user)
    ? PROTECTED_USER_PUBLIC_DISPLAY_NAME
    : `${user.firstName} ${user.lastName}`.trim();

export const getUserLoginDisplay = (
  user: Pick<UserType, 'identityDetailsVisible' | 'loginName'>,
): string =>
  isUserIdentityMasked(user) ? 'Identifiant masqué' : user.loginName;
