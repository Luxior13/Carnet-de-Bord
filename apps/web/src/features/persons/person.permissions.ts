import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import type { UserType } from '$types/auth.types';

type PersonPermissionUser = Pick<
  UserType,
  'isProtected' | 'permissions' | 'role'
> | null;

export type PersonCapabilities = Readonly<{
  canCreate: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  canUpdateContact: boolean;
  canView: boolean;
  canViewContact: boolean;
}>;

export const getPersonCapabilities = (
  user: PersonPermissionUser,
): PersonCapabilities => {
  const permitted = (permission: string): boolean =>
    Boolean(
      user &&
      (user.isProtected ||
        hasPermission(user.role, permission, user.permissions)),
    );
  const canView = permitted(PERMISSIONS.PERSONS.VIEW);

  return {
    canCreate: permitted(PERMISSIONS.PERSONS.CREATE),
    canDelete: permitted(PERMISSIONS.PERSONS.DELETE),
    canUpdate: permitted(PERMISSIONS.PERSONS.UPDATE),
    canUpdateContact: permitted(PERMISSIONS.PERSONS.UPDATE_CONTACT),
    canView,
    canViewContact: permitted(PERMISSIONS.PERSONS.VIEW_CONTACT),
  };
};
