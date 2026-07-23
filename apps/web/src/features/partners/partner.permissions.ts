import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import type { UserType } from '$types/auth.types';

type PartnerPermissionUser = Pick<
  UserType,
  'isProtected' | 'permissions' | 'role'
> | null;

export const getPartnerCapabilities = (user: PartnerPermissionUser) => {
  const permitted = (permission: string): boolean =>
    Boolean(
      user &&
      (user.isProtected ||
        hasPermission(user.role, permission, user.permissions)),
    );
  const canView = permitted(PERMISSIONS.PARTNERS.VIEW);

  return {
    canDelete: permitted(PERMISSIONS.PARTNERS.DELETE),
    canManage: permitted(PERMISSIONS.PARTNERS.MANAGE),
    canView,
    canViewContacts: canView && permitted(PERMISSIONS.PERSONS.VIEW),
    canViewFieldHistory:
      canView && permitted(PERMISSIONS.AUDIT.VIEW_FIELD_HISTORY),
  };
};
