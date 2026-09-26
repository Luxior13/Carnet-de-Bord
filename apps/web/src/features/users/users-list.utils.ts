import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import type { UserType } from '$types/auth.types';
import { isUserIdentityMasked } from '$utils/user-display.utils';

type ListViewer = Pick<UserType, 'id' | 'isProtected' | 'permissions' | 'role'>;

export const canSearchUserContact = (viewer: ListViewer): boolean =>
  viewer.isProtected ||
  hasPermission(
    viewer.role,
    PERMISSIONS.USERS.VIEW_CONTACT,
    viewer.permissions,
  ) ||
  hasPermission(
    viewer.role,
    PERMISSIONS.USERS.UPDATE_CONTACT,
    viewer.permissions,
  );

// Drop the previous response before rendering a different visibility scope.
// Routine session refreshes with unchanged rights should keep the list mounted.
export const getUsersListVisibilityKey = (viewer: ListViewer): string =>
  JSON.stringify([
    viewer.id,
    viewer.isProtected,
    canSearchUserContact(viewer),
    hasPermission(
      viewer.role,
      PERMISSIONS.USERS.VIEW_SECURITY,
      viewer.permissions,
    ),
  ]);

export const formatUserLastLogin = (
  user: Pick<UserType, 'identityDetailsVisible'> & {
    lastLoginAt: Date | string | null;
  },
  now = new Date(),
): string => {
  if (isUserIdentityMasked(user)) return 'Masquée';
  if (!user.lastLoginAt) return 'Jamais';

  const then = new Date(user.lastLoginAt);
  if (Number.isNaN(then.getTime())) return 'Indisponible';

  const elapsed = now.getTime() - then.getTime();
  if (elapsed < 60_000) return "À l'instant";
  if (elapsed < 3_600_000) return `Il y a ${Math.floor(elapsed / 60_000)} min`;
  if (elapsed < 86_400_000)
    return `Il y a ${Math.floor(elapsed / 3_600_000)} h`;
  if (elapsed < 30 * 86_400_000 && now.getFullYear() === then.getFullYear()) {
    return `Il y a ${Math.floor(elapsed / 86_400_000)} j`;
  }

  return then.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};
