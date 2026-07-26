import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import type { UserType } from '$types/auth.types';

type InternalNewsPermissionUser = Pick<
  UserType,
  'isProtected' | 'permissions' | 'role'
> | null;

export type InternalNewsCapabilities = {
  canManage: boolean;
  canView: boolean;
  canViewPartners: boolean;
};

export const getInternalNewsCapabilities = (
  user: InternalNewsPermissionUser,
): InternalNewsCapabilities => {
  const permitted = (permission: string): boolean =>
    Boolean(
      user &&
      (user.isProtected ||
        hasPermission(user.role, permission, user.permissions)),
    );

  return {
    canManage: permitted(PERMISSIONS.INTERNAL_NEWS.MANAGE),
    canView: permitted(PERMISSIONS.INTERNAL_NEWS.VIEW),
    canViewPartners: permitted(PERMISSIONS.PARTNERS.VIEW),
  };
};
