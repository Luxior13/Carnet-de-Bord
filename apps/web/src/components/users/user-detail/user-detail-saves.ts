import type { UserRole } from '@repo/shared';
import { toast } from 'sonner';

import type { PermissionsData } from '$constants/permissions.constants';
import type { UserType } from '$types/auth.types';

import type { UserDetailForm } from './user-detail-draft';
import {
  ACCESS_PERMISSION_KEYS,
  ACCOUNT_PERMISSION_KEYS,
  selectPermissionOverridesForKeys,
} from './user-detail-page.helpers';
import {
  runUserDetailPatch,
  type UserDetailPatchContext,
} from './user-detail-patch';
import type { UserDetailCapabilities } from './useUserDetailCapabilities';
import type { UserDetailChanges } from './useUserDetailChanges';

type ConfirmForResponse = (
  data: unknown,
  action: {
    description: string;
    execute: () => Promise<void> | void;
    title: string;
  },
) => boolean;

export type UserDetailSaves = {
  handleSaveAccess: () => Promise<void>;
  handleSaveAccount: () => Promise<void>;
  handleSaveProfile: (isLoginChangeConfirmed?: boolean) => Promise<void>;
  handleSaveSecurity: () => Promise<void>;
};

/**
 * The four saves of a user record (profile, administrative access, personal
 * account, account state): local guards, then the shared PATCH lifecycle with
 * the confirmation the server may require. Built on each render, like the
 * handlers it replaces, so every save reads the current draft.
 */
export const buildUserDetailSaves = ({
  applyUserUpdate,
  capabilities: {
    canEditTargetContact,
    canEditTargetLogin,
    canEditTargetProfile,
    canEditTargetRole,
    canEditTargetStatus,
    canManageTargetAccessPermissions,
    canManageTargetAccountPolicy,
    isSelf,
  },
  changes: {
    accessMutationAnalysis,
    hasAccessChanges,
    hasAccessPermissionChanges,
    hasAccountChanges,
    hasProfileChanges,
    hasProfileContactChanges,
    hasProfileErrors,
    hasProfileLoginChanges,
    hasSecurityChanges,
  },
  context,
  currentUser,
  editForm,
  permissions,
  refreshSessions,
  requestPasswordReauthenticationForResponse,
  requestStepUpForResponse,
  setIsSaving,
  setIsSavingPermissions,
  setShowLoginChangeConfirm,
  user,
}: {
  applyUserUpdate: (user: UserType) => void;
  capabilities: Pick<
    UserDetailCapabilities,
    | 'canEditTargetContact'
    | 'canEditTargetLogin'
    | 'canEditTargetProfile'
    | 'canEditTargetRole'
    | 'canEditTargetStatus'
    | 'canManageTargetAccessPermissions'
    | 'canManageTargetAccountPolicy'
    | 'isSelf'
  >;
  changes: Pick<
    UserDetailChanges,
    | 'accessMutationAnalysis'
    | 'hasAccessChanges'
    | 'hasAccessPermissionChanges'
    | 'hasAccountChanges'
    | 'hasProfileChanges'
    | 'hasProfileContactChanges'
    | 'hasProfileErrors'
    | 'hasProfileLoginChanges'
    | 'hasSecurityChanges'
  >;
  context: UserDetailPatchContext;
  currentUser: UserType | null | undefined;
  editForm: UserDetailForm;
  permissions: PermissionsData | null;
  refreshSessions: () => void;
  requestPasswordReauthenticationForResponse: ConfirmForResponse;
  requestStepUpForResponse: ConfirmForResponse;
  setIsSaving: (pending: boolean) => void;
  setIsSavingPermissions: (pending: boolean) => void;
  setShowLoginChangeConfirm: (open: boolean) => void;
  user: UserType | null;
}): UserDetailSaves => {
  const { isMounted, mutation } = context;

  const handleSaveProfile = async (
    isLoginChangeConfirmed = false,
  ): Promise<void> => {
    if (!isMounted()) return;
    if (!canEditTargetProfile && !canEditTargetContact && !canEditTargetLogin) {
      toast.error('Permission insuffisante pour modifier cet utilisateur');

      return;
    }

    if (hasProfileErrors) {
      mutation.report(
        'profile',
        'Corrigez les champs signalés avant d’enregistrer.',
        400,
      );

      return;
    }

    if (!hasProfileChanges) {
      toast.info('Aucune modification à enregistrer');

      return;
    }

    if (hasProfileLoginChanges && !isLoginChangeConfirmed) {
      setShowLoginChangeConfirm(true);

      return;
    }

    if (!user?.updatedAt) {
      mutation.report(
        'profile',
        'Version de la fiche indisponible. Actualisez avant d’enregistrer.',
      );

      return;
    }

    await runUserDetailPatch(context, {
      body: {
        expectedUpdatedAt: new Date(user.updatedAt).toISOString(),
        ...(hasProfileContactChanges
          ? { contactEmail: editForm.contactEmail.trim().toLowerCase() || null }
          : {}),
        ...(hasProfileLoginChanges
          ? { loginName: editForm.loginName.trim().toLowerCase() }
          : {}),
        ...(canEditTargetProfile
          ? {
              firstName: editForm.firstName.trim(),
              lastName: editForm.lastName.trim(),
            }
          : {}),
      },
      confirm: {
        action: {
          description:
            "La modification de l'identifiant de connexion ferme toutes les sessions de l’utilisateur.",
          execute: () => handleSaveProfile(true),
          title: "Confirmer la modification de l'identifiant",
        },
        request: requestStepUpForResponse,
      },
      onSuccess: (saved) => {
        if (currentUser && saved.id === currentUser.id) {
          // Preserve hidden administrative overrides while syncing self-profile fields.
          applyUserUpdate({
            ...currentUser,
            firstName: saved.firstName,
            lastName: saved.lastName,
            updatedAt: saved.updatedAt ?? currentUser.updatedAt,
          });
        }
        toast.success('Utilisateur mis à jour');
      },
      setPending: setIsSaving,
      submitted: { form: editForm, permissions, section: 'profile' },
    });
  };

  const handleSaveAccess = async (): Promise<void> => {
    if (!isMounted()) return;
    if (!canEditTargetRole && !canManageTargetAccessPermissions) {
      toast.error("Vous n'êtes pas autorisé à modifier ces autorisations");

      return;
    }

    if (!hasAccessChanges) {
      toast.info('Aucune modification à enregistrer');

      return;
    }

    if (!accessMutationAnalysis?.decision.allowed) {
      toast.error(
        accessMutationAnalysis?.decision.reason ?? 'Lot non autorisé',
      );

      return;
    }

    if (!user?.updatedAt) {
      toast.error('Version de la fiche indisponible. Rechargez la page.');

      return;
    }

    const payload: {
      expectedUpdatedAt: string;
      permissions?: PermissionsData | null;
      permissionScope?: 'access';
      role?: UserRole;
    } = { expectedUpdatedAt: new Date(user.updatedAt).toISOString() };
    if (canEditTargetRole) payload.role = editForm.role;
    if (canManageTargetAccessPermissions && hasAccessPermissionChanges) {
      payload.permissionScope = 'access';
      payload.permissions = selectPermissionOverridesForKeys(
        permissions,
        ACCESS_PERMISSION_KEYS,
      );
    }

    await runUserDetailPatch(context, {
      body: payload,
      confirm: {
        action: {
          description:
            'Ce changement peut modifier le rôle ou les autorisations sensibles de l’utilisateur et fermer ses sessions.',
          execute: handleSaveAccess,
          title: 'Confirmer la modification des autorisations',
        },
        request: requestPasswordReauthenticationForResponse,
      },
      onSuccess: (_saved, signal) => {
        toast.success('Autorisations mises à jour');
        requestAnimationFrame(() => {
          if (!isMounted() || signal.aborted) return;
          const panel = document.getElementById('user-access-panel');
          const control = panel?.querySelector<HTMLElement>(
            '#user-role:not(:disabled), button[aria-pressed]:not(:disabled):not([aria-hidden="true"])',
          );
          const target = control ?? panel?.querySelector<HTMLElement>('h3');
          if (target && !control) target.tabIndex = -1;
          target?.focus();
        });
      },
      setPending: setIsSavingPermissions,
      submitted: { form: editForm, permissions, section: 'access' },
    });
  };

  const handleSaveAccount = async (): Promise<void> => {
    if (!isMounted()) return;
    if (!canManageTargetAccountPolicy) {
      toast.error(
        "Permission insuffisante pour modifier l'autonomie du compte",
      );

      return;
    }

    if (!hasAccountChanges) {
      toast.info('Aucune modification à enregistrer');

      return;
    }

    if (!user?.updatedAt) {
      toast.error('Version de la fiche indisponible. Rechargez la page.');

      return;
    }

    await runUserDetailPatch(context, {
      body: {
        expectedUpdatedAt: new Date(user.updatedAt).toISOString(),
        permissions: selectPermissionOverridesForKeys(
          permissions,
          ACCOUNT_PERMISSION_KEYS,
        ),
        permissionScope: 'account',
      },
      confirm: {
        action: {
          description:
            'Cette modification change les actions que l’utilisateur peut effectuer sur son propre compte.',
          execute: handleSaveAccount,
          title: 'Confirmer la politique du compte',
        },
        request: requestStepUpForResponse,
      },
      onSuccess: () => toast.success('Autonomie du compte mise à jour'),
      setPending: setIsSavingPermissions,
      submitted: { form: editForm, permissions, section: 'account' },
    });
  };

  const handleSaveSecurity = async (): Promise<void> => {
    if (!isMounted()) return;
    if (!canEditTargetStatus || isSelf) {
      toast.error('Permission insuffisante pour modifier cet état');

      return;
    }

    if (!hasSecurityChanges) {
      toast.info('Aucune modification à enregistrer');

      return;
    }

    if (!user?.updatedAt) {
      mutation.report(
        'security',
        'Version de la fiche indisponible. Actualisez avant d’enregistrer.',
      );

      return;
    }

    await runUserDetailPatch(context, {
      body: {
        expectedUpdatedAt: new Date(user.updatedAt).toISOString(),
        isActive: editForm.isActive,
      },
      confirm: {
        action: {
          description:
            "Ce changement peut désactiver le compte et fermer l'accès de l’utilisateur.",
          execute: handleSaveSecurity,
          title: "Confirmer le changement d'état",
        },
        request: requestStepUpForResponse,
      },
      onSuccess: () => {
        refreshSessions();
        toast.success(
          editForm.isActive ? 'Compte réactivé' : 'Compte désactivé',
        );
      },
      setPending: setIsSaving,
      submitted: { form: editForm, permissions, section: 'security' },
    });
  };

  return {
    handleSaveAccess,
    handleSaveAccount,
    handleSaveProfile,
    handleSaveSecurity,
  };
};
