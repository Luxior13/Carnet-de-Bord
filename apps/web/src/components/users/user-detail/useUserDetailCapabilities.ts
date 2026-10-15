import { UserRole } from '@repo/shared';
import { useCallback, useMemo } from 'react';

import {
  decideUserAccessMutation,
  getUserAccessMutationCapabilities,
} from '$components/users/user-detail/user-access-editor-policy';
import { USER_DETAIL_SECTIONS } from '$components/users/user-detail/UserDetailNavigation';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import type { UserType } from '$types/auth.types';
import { isUserIdentityMasked } from '$utils/user-display.utils';

export function useUserDetailCapabilities(
  currentUser: UserType | null | undefined,
  user: UserType | null | undefined,
  userId: string,
) {
  const isProtectedActor = currentUser?.isProtected === true;
  const canViewUsers = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.VIEW,
        currentUser.permissions,
      )
    : false;
  const canUpdateUsers = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.UPDATE_PROFILE,
        currentUser.permissions,
      )
    : false;
  const canUpdateUserContact = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.UPDATE_CONTACT,
        currentUser.permissions,
      )
    : false;
  const canUpdateUserLogin = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.UPDATE_LOGIN,
        currentUser.permissions,
      )
    : false;
  const canViewUserContact = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.VIEW_CONTACT,
        currentUser.permissions,
      ) ||
      canUpdateUserContact
    : false;
  const canManageUserStatus = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.UPDATE_STATUS,
        currentUser.permissions,
      )
    : false;
  const canManageUserRoles = isProtectedActor;
  const canViewUserAccess = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.VIEW_ACCESS,
        currentUser.permissions,
      )
    : false;
  const accessCaps = getUserAccessMutationCapabilities(
    currentUser ?? null,
    isProtectedActor,
  );
  const canViewUserAccountPolicy = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.VIEW_ACCOUNT_POLICY,
        currentUser.permissions,
      )
    : false;
  const canManageUserAccountPolicy = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.UPDATE_ACCOUNT_POLICY,
        currentUser.permissions,
      )
    : false;
  const canViewUserSessions = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.VIEW_SESSIONS,
        currentUser.permissions,
      )
    : false;
  const canViewUserSecurity = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.VIEW_SECURITY,
        currentUser.permissions,
      )
    : false;
  const canRevokeUserSessions = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.REVOKE_SESSIONS,
        currentUser.permissions,
      )
    : false;
  const canViewUserActivity = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.VIEW_ACTIVITY,
        currentUser.permissions,
      )
    : false;
  const canExportUsers = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.EXPORT_ACTIVITY,
        currentUser.permissions,
      )
    : false;
  const canResetPasswords = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.RESET_PASSWORD,
        currentUser.permissions,
      )
    : false;
  const canDeleteAccounts = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.DELETE_ACCOUNT,
        currentUser.permissions,
      )
    : false;

  const isSelf = currentUser?.id === user?.id;
  const isTargetIdentityMasked = !!user && isUserIdentityMasked(user);
  const isTargetAdminAccessRestricted =
    !!user && user.role === UserRole.ADMIN && !isProtectedActor;
  const canEditTargetProfile =
    !!user &&
    !isSelf &&
    canUpdateUsers &&
    !user.isProtected &&
    !isTargetAdminAccessRestricted;
  const canEditTargetLogin =
    !!user &&
    !isSelf &&
    canUpdateUserLogin &&
    !user.isProtected &&
    !isTargetAdminAccessRestricted;
  const canEditTargetContact =
    !!user &&
    !isSelf &&
    canUpdateUserContact &&
    !user.isProtected &&
    !isTargetAdminAccessRestricted;
  const canViewTargetContact = isSelf || canViewUserContact;
  const canViewTargetAccess =
    !!user &&
    !isTargetIdentityMasked &&
    (canViewUserAccess ||
      accessCaps.canGrant ||
      accessCaps.canRevoke ||
      accessCaps.canDelegate ||
      canManageUserRoles);
  const canViewTargetPersonalAccount =
    !!user &&
    !isTargetIdentityMasked &&
    (canViewUserAccountPolicy || canManageUserAccountPolicy);
  const canMutateTargetAccess =
    !!user && !isSelf && !user.isProtected && !isTargetAdminAccessRestricted;
  const canGrantTargetAccessPermissions =
    canMutateTargetAccess && accessCaps.canGrant;
  const canRevokeTargetAccessPermissions =
    canMutateTargetAccess && accessCaps.canRevoke;
  const canDelegateTargetAccessPermissions =
    canMutateTargetAccess && accessCaps.canDelegate;
  const canManageTargetAccessPermissions =
    canGrantTargetAccessPermissions ||
    canRevokeTargetAccessPermissions ||
    canDelegateTargetAccessPermissions;
  const canManageTargetAccountPolicy =
    !!user &&
    canManageUserAccountPolicy &&
    !isSelf &&
    !user.isProtected &&
    !isTargetAdminAccessRestricted;
  const canResetTargetPassword =
    !!user &&
    canResetPasswords &&
    !isSelf &&
    !user.isProtected &&
    !isTargetAdminAccessRestricted;
  const canResetTargetMfa =
    !!user &&
    isProtectedActor &&
    !isSelf &&
    !user.isProtected &&
    user.mfaEnabledAt !== null;
  const canViewTargetSessions =
    !!user &&
    canViewUserSessions &&
    !isSelf &&
    !user.isProtected &&
    !isTargetAdminAccessRestricted;
  const canRevokeTargetSessions =
    !!user &&
    canRevokeUserSessions &&
    !isSelf &&
    !user.isProtected &&
    !isTargetAdminAccessRestricted;
  const canRequestDeleteTargetUser =
    !!user &&
    canDeleteAccounts &&
    !user.isProtected &&
    !isSelf &&
    !isTargetAdminAccessRestricted;
  const canEditTargetRole =
    !!user && isProtectedActor && canManageUserRoles && !user.isProtected;
  const canEditTargetStatus =
    !!user &&
    canManageUserStatus &&
    !user.isProtected &&
    !isTargetAdminAccessRestricted;
  const canViewTargetActivity =
    !!user && !isTargetIdentityMasked && (isSelf || canViewUserActivity);
  const decideAccessPermissionMutation = useCallback(
    (permissionKey: string, enabled: boolean) =>
      decideUserAccessMutation(
        {
          actor: currentUser ?? null,
          canDelegate: canDelegateTargetAccessPermissions,
          canGrant: canGrantTargetAccessPermissions,
          canMutate: canMutateTargetAccess,
          canRevoke: canRevokeTargetAccessPermissions,
          isProtectedActor,
          target: user ?? null,
        },
        permissionKey,
        enabled,
      ),
    [
      canDelegateTargetAccessPermissions,
      canGrantTargetAccessPermissions,
      canMutateTargetAccess,
      canRevokeTargetAccessPermissions,
      currentUser,
      isProtectedActor,
      user,
    ],
  );
  const loginReadOnlyHint = isSelf
    ? "Votre propre identifiant ne se modifie pas depuis l'administration."
    : user?.isProtected
      ? "L'identifiant du compte racine est protégé."
      : isTargetAdminAccessRestricted
        ? "Seul le compte racine peut modifier l'identifiant d'un administrateur."
        : !canUpdateUserLogin
          ? 'La permission Modifier les identifiants de connexion est requise.'
          : 'Cet identifiant est en lecture seule depuis cette fiche.';
  const canFetchUserAudit =
    !isTargetIdentityMasked &&
    (currentUser?.id === userId || canViewUserActivity);
  const canViewTargetSecurity =
    !!user &&
    !isTargetIdentityMasked &&
    (canViewUserSecurity ||
      canResetTargetMfa ||
      canResetTargetPassword ||
      canViewTargetSessions ||
      canRevokeTargetSessions ||
      canEditTargetStatus ||
      canRequestDeleteTargetUser);
  const visibleUserDetailSections = useMemo(
    () =>
      USER_DETAIL_SECTIONS.filter((section) => {
        if (section.id === 'access') {
          return canViewTargetAccess || canViewTargetPersonalAccount;
        }
        if (section.id === 'security') return canViewTargetSecurity;
        if (section.id === 'history') return canViewTargetActivity;

        return true;
      }),
    [
      canViewTargetAccess,
      canViewTargetActivity,
      canViewTargetPersonalAccount,
      canViewTargetSecurity,
    ],
  );

  return {
    accessCaps,
    canDeleteAccounts,
    canDelegateTargetAccessPermissions,
    canEditTargetContact,
    canEditTargetLogin,
    canEditTargetProfile,
    canEditTargetRole,
    canEditTargetStatus,
    canExportUsers,
    canFetchUserAudit,
    canGrantTargetAccessPermissions,
    canManageTargetAccessPermissions,
    canManageTargetAccountPolicy,
    canMutateTargetAccess,
    canRequestDeleteTargetUser,
    canResetTargetMfa,
    canResetTargetPassword,
    canRevokeTargetAccessPermissions,
    canRevokeTargetSessions,
    canUpdateUserContact,
    canUpdateUserLogin,
    canUpdateUsers,
    canViewTargetAccess,
    canViewTargetActivity,
    canViewTargetContact,
    canViewTargetPersonalAccount,
    canViewTargetSecurity,
    canViewTargetSessions,
    canViewUsers,
    decideAccessPermissionMutation,
    isProtectedActor,
    isSelf,
    isTargetAdminAccessRestricted,
    isTargetIdentityMasked,
    loginReadOnlyHint,
    visibleUserDetailSections,
  };
}
