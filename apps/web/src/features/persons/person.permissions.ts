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
  canView: boolean;
  canViewAudit: boolean;
  canViewHistory: boolean;
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
    canView,
    canViewAudit: permitted(PERMISSIONS.AUDIT.VIEW),
    canViewHistory: canView && permitted(PERMISSIONS.AUDIT.VIEW_FIELD_HISTORY),
  };
};
