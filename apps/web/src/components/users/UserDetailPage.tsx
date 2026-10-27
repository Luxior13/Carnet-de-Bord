'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, {
  type FC,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { EntityHeader } from '$components/layout/EntityHeader';
import { AccessDeniedState } from '$components/layout/PageState';
import { UnsavedNavigationDialog } from '$components/layout/UnsavedNavigationDialog';
import { useAdminStepUpController } from '$components/users/user-detail/useAdminStepUpController';
import {
  ACCESS_PERMISSION_KEYS,
  buildUserDetailSectionHref,
  normalizePermissionPageKey,
  resetPermissionOverridesForKeys,
} from '$components/users/user-detail/user-detail-page.helpers';
import { buildUserDetailSaves } from '$components/users/user-detail/user-detail-saves';
import { focusSecuritySessionsHeading } from '$components/users/user-detail/user-security-focus';
import { UserAuthorizationsSection } from '$components/users/user-detail/UserAuthorizationsSection';
import {
  UserLoginChangeDialog,
  UserPasswordResetDialog,
} from '$components/users/user-detail/UserDetailDialogs';
import {
  UserDetailNotices,
  UserDetailPageSkeleton,
  UserDetailUnavailable,
} from '$components/users/user-detail/UserDetailFrame';
import {
  AdminMfaResetDialog,
  AdminStepUpDialog,
  UserAccessTab,
  UserAccountTab,
  UserProfileTab,
  UserSecurityTab,
} from '$components/users/user-detail/UserDetailLazySections';
import {
  getUserDetailSectionLabel,
  normalizeUserDetailSection,
  type UserDetailSectionId,
} from '$components/users/user-detail/UserDetailNavigation';
import {
  UserMutationFeedback,
  useUserMutationFeedback,
} from '$components/users/user-detail/UserMutationFeedback';
import {
  hasPasswordResetFeedback,
  UserPasswordResetFeedback,
} from '$components/users/user-detail/UserPasswordResetFeedback';
import type { ProfileForm } from '$components/users/user-detail/UserProfileTab';
import {
  UserSecurityActionDialogs,
  useUserSecurityActions,
} from '$components/users/user-detail/UserSecurityActions';
import { useUserDetailCapabilities } from '$components/users/user-detail/useUserDetailCapabilities';
import { useUserDetailChanges } from '$components/users/user-detail/useUserDetailChanges';
import { useUserDetailDraft } from '$components/users/user-detail/useUserDetailDraft';
import { useUserDetailLoader } from '$components/users/user-detail/useUserDetailLoader';
import { useUserDetailSessions } from '$components/users/user-detail/useUserDetailSessions';
import { useUserPasswordReset } from '$components/users/user-detail/useUserPasswordReset';
import { UserAvatar } from '$components/users/UserAvatar';
import {
  formatUserIdentityLine,
  UserIdentityStatus,
} from '$components/users/UserIdentityStatus';
import { FEATURES } from '$constants/feature-registry.constants';
import { PAGE_PATHS, userDetailPath } from '$constants/routes.constants';
import { useUser } from '$context/UserContext';
import { UserAccessBadge } from '$features/users/user-badges';
import { getUserDetailScope } from '$features/users/user-detail-scope';
import { useUnsavedNavigationGuard } from '$hooks/useUnsavedNavigationGuard';
import type { UserType } from '$types/auth.types';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { getSafeCollectionReturnHref } from '$utils/navigation.utils';
import {
  getUserDisplayName,
  getUserLoginDisplay,
} from '$utils/user-display.utils';

type UserDetailPageProps = {
  initialScope?: string;
  initialUser?: UserType;
  userId: string;
};

export const UserDetailPage: FC<UserDetailPageProps> = (props) => {
  const { userData } = useUser();
  const scope = getUserDetailScope(userData);
  const initialIdentity = useRef(`${props.userId}:${scope}`);
  const snapshotRetired = useRef(false);
  const identity = `${props.userId}:${scope}`;
  if (initialIdentity.current !== identity) snapshotRetired.current = true;

  return (
    <UserDetailPageContent
      {...props}
      key={identity}
      initialUser={
        !snapshotRetired.current && props.initialScope === scope
          ? props.initialUser
          : undefined
      }
    />
  );
};

const UserDetailPageContent: FC<UserDetailPageProps> = ({
  initialUser,
  userId,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnHref = getSafeCollectionReturnHref(
    searchParams.get('returnTo'),
    PAGE_PATHS.users,
  );
  const currentQueryString = searchParams.toString();
  const requestedSection = normalizeUserDetailSection(
    searchParams.get('section'),
  );
  const permissionPageKey = normalizePermissionPageKey(
    searchParams.get('permissionPage'),
  );
  const {
    applyUserUpdate,
    isLoading: isCurrentUserLoading,
    userData: currentUser,
  } = useUser();
  const {
    clearUserState,
    editForm,
    permissions,
    restoreSavedDraft,
    restoreSavedSection,
    setEditForm,
    setPermissions,
    syncUserState,
    user,
  } = useUserDetailDraft(initialUser);
  const mutation = useUserMutationFeedback();
  const { clear: clearMutationFeedback, inFlight: mutationInFlight } = mutation;
  const [activeSection, setActiveSection] =
    useState<UserDetailSectionId>(requestedSection);
  const [showLoginChangeConfirm, setShowLoginChangeConfirm] = useState(false);
  const mountedRef = useRef(true);
  const mutationAbortControllerRef = useRef(new AbortController());

  const [isSaving, setIsSaving] = useState(false);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showResetMfa, setShowResetMfa] = useState(false);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const adminStepUp = useAdminStepUpController();
  const {
    cancelPendingStepUpAction,
    pendingStepUpAction,
    requestPasswordReauthenticationForResponse,
    requestStepUpForResponse,
  } = adminStepUp;

  const {
    canEditTargetContact,
    canEditTargetLogin,
    canEditTargetProfile,
    canEditTargetRole,
    canEditTargetStatus,
    canGrantTargetAccessPermissions,
    canManageTargetAccessPermissions,
    canManageTargetAccountPolicy,
    canRequestDeleteTargetUser,
    canResetTargetMfa,
    canResetTargetPassword,
    canRevokeTargetSessions,
    canViewTargetAccess,
    canViewTargetContact,
    canViewTargetPersonalAccount,
    canViewTargetSecurity,
    canViewTargetSessions,
    canViewUsers,
    decideAccessPermissionMutation,
    isSelf,
    isTargetIdentityMasked,
    loginReadOnlyHint,
    visibleUserDetailSections,
  } = useUserDetailCapabilities(currentUser, user);
  const {
    fetchSecuritySessions,
    hasLoadedSecuritySessions,
    isLoadingSecuritySessions,
    securitySessions,
    securitySessionsError,
    securitySessionsNotice,
    setSecuritySessions,
    setSecuritySessionsError,
    setSecuritySessionsNotice,
  } = useUserDetailSessions({
    canViewTargetSessions,
    userId,
  });
  const passwordReset = useUserPasswordReset({
    beginMutation: mutation.start,
    canReset: canResetTargetPassword,
    finishMutation: mutation.finish,
    onClose: () => setShowResetConfirm(false),
    onSuccess: () => {
      void fetchUser({ background: true });
      void fetchSecuritySessions();
    },
    requestStepUp: requestStepUpForResponse,
    userId,
  });
  const securityActions = useUserSecurityActions({
    canRequestDelete: canRequestDeleteTargetUser,
    canRevokeSessions: canRevokeTargetSessions,
    confirmPassword: requestPasswordReauthenticationForResponse,
    confirmStepUp: requestStepUpForResponse,
    isMounted: () => mountedRef.current,
    lifetime: mutationAbortControllerRef,
    mutation,
    onDeleted: () => router.push(returnHref),
    refreshSessions: () => void fetchSecuritySessions(),
    refreshUser: () => void fetchUser({ background: true }),
    sessions: {
      setError: setSecuritySessionsError,
      setNotice: setSecuritySessionsNotice,
      setSessions: setSecuritySessions,
    },
    user,
    userId,
  });
  const {
    clearDeletionUncertainty,
    reset: resetSecurityActions,
    sessionsStepUpFocusRef,
  } = securityActions;
  const { clearPassword } = passwordReset;
  const isResetting = passwordReset.isResetting;
  const {
    accessMutationAnalysis,
    canSaveAccess,
    canSaveAccount,
    canSaveSecurity,
    hasAccessChanges,
    hasAccessPermissionChanges,
    hasAccountChanges,
    hasProfileChanges,
    hasProfileContactChanges,
    hasProfileErrors,
    hasProfileLoginChanges,
    hasSecurityChanges,
    hasUnsavedChanges,
    profileErrors,
    railDirtySections,
  } = useUserDetailChanges({
    capabilities: {
      canEditTargetContact,
      canEditTargetLogin,
      canEditTargetProfile,
      canEditTargetRole,
      canEditTargetStatus,
      canManageTargetAccessPermissions,
      canManageTargetAccountPolicy,
      decideAccessPermissionMutation,
      isSelf,
    },
    editForm,
    mutation,
    permissions,
    user,
  });
  const activeRailSection: UserDetailSectionId =
    activeSection === 'account' ? 'access' : activeSection;
  const resolveRailSection = useCallback(
    (sectionId: UserDetailSectionId): UserDetailSectionId =>
      sectionId === 'access' &&
      !canViewTargetAccess &&
      canViewTargetPersonalAccount
        ? 'account'
        : sectionId,
    [canViewTargetAccess, canViewTargetPersonalAccount],
  );

  const discardUserSnapshot = useCallback((): void => {
    mutationAbortControllerRef.current.abort();
    clearUserState();
    clearPassword();
    clearMutationFeedback();
    cancelPendingStepUpAction();
    setSecuritySessions([]);
    setSecuritySessionsNotice(null);
    setShowResetConfirm(false);
    setShowResetMfa(false);
    setShowLoginChangeConfirm(false);
    resetSecurityActions();
    mutationInFlight.current = false;
    setIsSaving(false);
    setIsSavingPermissions(false);
  }, [
    cancelPendingStepUpAction,
    clearMutationFeedback,
    clearPassword,
    clearUserState,
    mutationInFlight,
    resetSecurityActions,
    setSecuritySessions,
    setSecuritySessionsNotice,
  ]);

  const handleUserLoaded = useCallback(
    (loadedUser: UserType): void => {
      clearDeletionUncertainty();
      syncUserState(loadedUser);
    },
    [clearDeletionUncertainty, syncUserState],
  );
  const { errorMessage, errorStatus, fetchUser, isLoading } =
    useUserDetailLoader({
      canViewUsers,
      initialUser,
      lifetime: mutationAbortControllerRef,
      mountedRef,
      onLoaded: handleUserLoaded,
      onUnavailable: discardUserSnapshot,
      userId,
    });

  useEffect(() => {
    if (user && activeSection === 'security' && !hasLoadedSecuritySessions) {
      void fetchSecuritySessions();
    }
  }, [activeSection, fetchSecuritySessions, hasLoadedSecuritySessions, user]);

  const isMutationPending =
    isSaving || isSavingPermissions || isResetting || securityActions.isPending;
  const navigation = useUnsavedNavigationGuard(
    hasUnsavedChanges ||
      passwordReset.hasUnacknowledgedPassword ||
      isMutationPending,
    () => {
      restoreSavedDraft();
      mutation.clear();
      passwordReset.clearPassword();
    },
  );
  const { requestNavigation } = navigation;
  useEffect(() => {
    setActiveSection(requestedSection);
  }, [requestedSection]);
  useEffect(() => {
    if (activeSection !== 'security') clearPassword();
  }, [activeSection, clearPassword]);
  const handleSectionChange = useCallback(
    (sectionId: UserDetailSectionId): void => {
      if (sectionId === activeSection) return;
      const href = buildUserDetailSectionHref(
        pathname,
        currentQueryString,
        sectionId,
      );
      requestNavigation(href, () =>
        window.history.replaceState(null, '', href),
      );
    },
    [activeSection, currentQueryString, pathname, requestNavigation],
  );

  const handlePermissionPageChange = useCallback(
    (pageKey: string): void => {
      const nextPermissionPageKey = normalizePermissionPageKey(pageKey);
      const nextParams = new URLSearchParams(currentQueryString);

      nextParams.set('section', 'access');
      nextParams.set('permissionPage', nextPermissionPageKey);

      window.history.replaceState(
        null,
        '',
        `${pathname}?${nextParams.toString()}`,
      );
    },
    [currentQueryString, pathname],
  );

  const {
    handleSaveAccess,
    handleSaveAccount,
    handleSaveProfile,
    handleSaveSecurity,
  } = buildUserDetailSaves({
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
    context: {
      isMounted: () => mountedRef.current,
      lifetime: mutationAbortControllerRef,
      mutation,
      syncUserState,
      userId,
    },
    currentUser,
    editForm,
    permissions,
    refreshSessions: () => void fetchSecuritySessions(),
    requestPasswordReauthenticationForResponse,
    requestStepUpForResponse,
    setIsSaving,
    setIsSavingPermissions,
    setShowLoginChangeConfirm,
    user,
  });

  const handleResetPassword = async (): Promise<void> => {
    if (mutation.inFlight.current || mutation.isRefreshing) return;
    await passwordReset.reset();
  };

  const handleResetMfaComplete = (updatedUser: UserType): void => {
    syncUserState(updatedUser);
    setShowResetMfa(false);
    void fetchSecuritySessions();
    toast.success('Double authentification réinitialisée');
  };

  const renderAuthorizationContent = (
    requestedView: 'access' | 'account',
  ): React.ReactNode =>
    user ? (
      <UserAuthorizationsSection
        accessContent={
          <UserAccessTab
            user={user}
            role={editForm.role}
            setRole={(role) => {
              setEditForm((currentForm) => ({ ...currentForm, role }));
              // Mirrors the server: a role change restarts administrative
              // access from the new role, and returning restores the saved one.
              setPermissions((currentPermissions) =>
                resetPermissionOverridesForKeys(
                  currentPermissions,
                  role === user.role ? user.permissions : null,
                  ACCESS_PERMISSION_KEYS,
                ),
              );
            }}
            permissions={permissions}
            setPermissions={setPermissions}
            canChangePermission={decideAccessPermissionMutation}
            canEditRole={canEditTargetRole}
            canGrantPermissions={canGrantTargetAccessPermissions}
            canManagePermissions={canManageTargetAccessPermissions}
            mutationSummary={accessMutationAnalysis?.summary ?? null}
            saveDisabledReason={accessMutationAnalysis?.decision.reason}
            isSaving={isSavingPermissions || mutation.isRefreshing}
            isRefreshing={mutation.isRefreshing}
            permissionPageKey={permissionPageKey}
            permissionPageRequested={searchParams.has('permissionPage')}
            onPermissionPageChange={handlePermissionPageChange}
            onSave={handleSaveAccess}
            onCancel={() => restoreSavedSection('access')}
            hasChanges={hasAccessChanges}
            canSave={canSaveAccess}
          />
        }
        accountContent={
          <UserAccountTab
            user={user}
            role={editForm.role}
            permissions={permissions}
            setPermissions={setPermissions}
            canManagePermissions={canManageTargetAccountPolicy}
            isSaving={isSavingPermissions || mutation.isRefreshing}
            isRefreshing={mutation.isRefreshing}
            onSave={handleSaveAccount}
            onCancel={() => restoreSavedSection('account')}
            hasChanges={hasAccountChanges}
            canSave={canSaveAccount}
          />
        }
        canViewAccess={canViewTargetAccess}
        canViewPersonalAccount={canViewTargetPersonalAccount}
        hasAccessChanges={hasAccessChanges}
        hasAccountChanges={hasAccountChanges}
        onSelectView={handleSectionChange}
        requestedView={requestedView}
      />
    ) : null;

  const renderContent = (): React.ReactNode => {
    if (!user) return null;

    switch (activeSection) {
      case 'profile':
        return (
          <UserProfileTab
            form={{
              contactEmail: editForm.contactEmail,
              firstName: editForm.firstName,
              lastName: editForm.lastName,
              loginName: editForm.loginName,
            }}
            setForm={(form: ProfileForm) =>
              setEditForm((currentForm) => ({ ...currentForm, ...form }))
            }
            canEdit={canEditTargetProfile}
            canEditContact={canEditTargetContact}
            canEditLogin={canEditTargetLogin}
            loginReadOnlyHint={loginReadOnlyHint}
            savedLoginName={user.loginName ?? ''}
            canViewContact={canViewTargetContact}
            isSelf={isSelf}
            isSaving={isMutationPending || mutation.isRefreshing}
            isRefreshing={mutation.isRefreshing}
            canSave={!mutation.feedback?.conflict}
            onSave={handleSaveProfile}
            onCancel={() => restoreSavedSection('profile')}
            hasChanges={hasProfileChanges}
            errors={profileErrors}
          />
        );
      case 'access':
        return renderAuthorizationContent('access');
      case 'account':
        return renderAuthorizationContent('account');
      case 'security':
        if (!canViewTargetSecurity) {
          return (
            <AccessDeniedState description="Vous n'avez pas la permission de consulter la sécurité de cet utilisateur." />
          );
        }

        return (
          <>
            <UserSecurityTab
              passwordResetFeedback={
                hasPasswordResetFeedback(passwordReset) ? (
                  <UserPasswordResetFeedback
                    controller={passwordReset}
                    onCheck={async () => {
                      const loaded = await fetchUser({ background: true });
                      if (loaded) await fetchSecuritySessions();

                      return Boolean(loaded);
                    }}
                    onRequestReset={() => setShowResetConfirm(true)}
                  />
                ) : undefined
              }
              user={user}
              isActive={editForm.isActive}
              setIsActive={(isActive) => setEditForm({ ...editForm, isActive })}
              canEditStatus={canEditTargetStatus}
              canResetMfa={canResetTargetMfa}
              canResetPassword={
                canResetTargetPassword &&
                !passwordReset.password &&
                (!passwordReset.outcomeUnknown || passwordReset.verified)
              }
              canRevokeSessions={canRevokeTargetSessions}
              canViewSessions={canViewTargetSessions}
              isSaving={isMutationPending || mutation.isRefreshing}
              isRefreshing={mutation.isRefreshing}
              isLoadingSessions={
                isLoadingSecuritySessions ||
                (canViewTargetSessions && !hasLoadedSecuritySessions)
              }
              isRevokingSessionId={securityActions.revokingSessionId}
              isRevokingSessions={securityActions.isRevokingSessions}
              onSaveStatus={handleSaveSecurity}
              onResetMfa={() => setShowResetMfa(true)}
              onResetPassword={() => setShowResetConfirm(true)}
              onRevokeSession={securityActions.revokeSession}
              onRevokeSessions={() =>
                securityActions.setShowRevokeSessionsConfirm(true)
              }
              onRetrySessions={fetchSecuritySessions}
              currentUserId={currentUser?.id}
              canSaveStatus={canSaveSecurity && !mutation.feedback?.conflict}
              hasStatusChanges={hasSecurityChanges}
              onCancelStatus={() => restoreSavedSection('security')}
              canRequestDeleteUser={canRequestDeleteTargetUser}
              deletionBlocked={securityActions.deletionUnconfirmed}
              onDeleteUser={() => securityActions.setShowDeleteConfirm(true)}
              sessions={securitySessions}
              sessionsError={securitySessionsError}
              sessionsNotice={securitySessionsNotice}
            />
          </>
        );
      default:
        return null;
    }
  };

  if (isCurrentUserLoading && !currentUser) {
    return <UserDetailPageSkeleton returnHref={returnHref} />;
  }

  if (isLoading && canViewUsers) {
    return <UserDetailPageSkeleton returnHref={returnHref} />;
  }

  if (!canViewUsers || errorMessage || !user) {
    return (
      <UserDetailUnavailable
        errorMessage={errorMessage}
        errorStatus={canViewUsers ? errorStatus : 403}
        onRetry={() => void fetchUser()}
        returnHref={returnHref}
      />
    );
  }

  return (
    <AuthenticatedLayout
      breadcrumbs={[
        {
          label: FEATURES.users.audit.poleLabel,
        },
        { href: returnHref, label: FEATURES.users.label },
        {
          href: userDetailPath(user.id),
          label: getUserDisplayName(user),
        },
      ]}
    >
      <PageShell className="py-0">
        <PageCanvas contentClassName="relative space-y-3">
          <div className="min-w-0 space-y-4">
            <EntityHeader
              compact
              title={getUserDisplayName(user)}
              description={formatUserIdentityLine(
                user,
                getUserLoginDisplay(user),
              )}
              icon={
                <UserAvatar user={user} className="rounded-tile size-full" />
              }
              meta={<UserIdentityStatus user={user} />}
              actions={<UserAccessBadge user={user} />}
              condensedAside={<UserAccessBadge user={user} />}
              navigation={{
                activeSection: activeRailSection,
                ariaLabel: 'Navigation de la fiche utilisateur',
                dirtySections: railDirtySections,
                getSectionHref: (sectionId) =>
                  buildUserDetailSectionHref(
                    pathname,
                    currentQueryString,
                    resolveRailSection(sectionId),
                  ),
                onSectionChange: (_section, href) =>
                  window.history.replaceState(null, '', href),
                sections: visibleUserDetailSections,
              }}
            />
            <div className="space-y-4">
              <UserDetailNotices
                isSelf={isSelf}
                isTargetIdentityMasked={isTargetIdentityMasked}
              />
              <p aria-live="polite" className="sr-only">
                Section {getUserDetailSectionLabel(activeSection)} affichée
              </p>
              <UserMutationFeedback
                controller={mutation}
                onRefresh={async () =>
                  Boolean(await fetchUser({ background: true }))
                }
                section={activeSection}
              />
              <div className="min-w-0">{renderContent()}</div>
            </div>
          </div>
        </PageCanvas>
      </PageShell>
      <UnsavedNavigationDialog
        open={navigation.pendingNavigationHref !== null}
        onCancel={navigation.cancelPendingNavigation}
        onConfirm={navigation.confirmPendingNavigation}
        onCloseAutoFocus={navigation.restoreFocus}
        confirmDisabled={isMutationPending}
        title={
          isMutationPending
            ? 'Opération en cours'
            : passwordReset.hasUnacknowledgedPassword
              ? 'Quitter avant la remise du mot de passe ?'
              : undefined
        }
        confirmLabel={
          passwordReset.hasUnacknowledgedPassword
            ? 'Quitter et masquer le mot de passe'
            : undefined
        }
        description={
          isMutationPending
            ? 'Attendez la réponse avant de quitter cette fiche.'
            : passwordReset.hasUnacknowledgedPassword
              ? 'Ce mot de passe ne pourra plus être affiché après votre départ. Conservez-le pour le transmettre. Les éventuelles modifications non enregistrées seront également perdues.'
              : 'Les modifications non enregistrées seront perdues. Vous pouvez rester pour les enregistrer ou les annuler.'
        }
      />
      <UserLoginChangeDialog
        open={showLoginChangeConfirm}
        onOpenChange={setShowLoginChangeConfirm}
        loginName={editForm.loginName.trim().toLowerCase()}
        onConfirm={() => {
          void handleSaveProfile(true);
        }}
      />
      <AdminMfaResetDialog
        actorLoginName={currentUser?.loginName ?? ''}
        onCheck={() => fetchUser({ background: true })}
        onCancel={() => setShowResetMfa(false)}
        onComplete={handleResetMfaComplete}
        open={showResetMfa}
        targetLabel={
          user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName} (${user.loginName})`
            : user.loginName
        }
        targetUserId={user.id}
      />
      <AdminStepUpDialog
        actorLoginName={currentUser?.loginName ?? ''}
        description={pendingStepUpAction?.description ?? ''}
        onCancel={adminStepUp.cancelPendingStepUpAction}
        onComplete={adminStepUp.handleStepUpComplete}
        onCloseAutoFocus={(event) => {
          if (!sessionsStepUpFocusRef.current) return;
          sessionsStepUpFocusRef.current = false;
          event.preventDefault();
          if (mountedRef.current) focusSecuritySessionsHeading();
        }}
        open={pendingStepUpAction !== null}
        proofKind={pendingStepUpAction?.proofKind ?? 'full'}
        title={pendingStepUpAction?.title ?? 'Confirmer votre identité'}
      />
      <UserPasswordResetDialog
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
        isResetting={isResetting}
        onConfirm={handleResetPassword}
      />
      <UserSecurityActionDialogs actions={securityActions} user={user} />
    </AuthenticatedLayout>
  );
};
