import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import type { UserType } from '$types/auth.types';

type PartnerPermissionUser = Pick<
  UserType,
  'isProtected' | 'permissions' | 'role'
> | null;

export type PartnerCapabilities = {
  canDelete: boolean;
  canManage: boolean;
  canUpdatePersons: boolean;
  canView: boolean;
  canViewFieldHistory: boolean;
  canViewInterlocutors: boolean;
};

export const getPartnerCapabilities = (
  user: PartnerPermissionUser,
): PartnerCapabilities => {
  const permitted = (permission: string): boolean =>
    Boolean(
      user &&
      (user.isProtected ||
        hasPermission(user.role, permission, user.permissions)),
    );
  const canView = permitted(PERMISSIONS.PARTNERS.VIEW);
  const canViewInterlocutors = canView && permitted(PERMISSIONS.PERSONS.VIEW);

  return {
    canDelete: permitted(PERMISSIONS.PARTNERS.DELETE),
    canManage: permitted(PERMISSIONS.PARTNERS.MANAGE),
    canUpdatePersons:
      canViewInterlocutors && permitted(PERMISSIONS.PERSONS.UPDATE),
    canView,
    canViewFieldHistory:
      canView && permitted(PERMISSIONS.AUDIT.VIEW_FIELD_HISTORY),
    canViewInterlocutors,
  };
};
