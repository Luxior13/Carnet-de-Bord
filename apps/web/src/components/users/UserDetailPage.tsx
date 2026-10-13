'use client';

import { UserRole } from '@repo/shared';
import { AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { PageAsideLayout } from '$components/layout/PageAsideLayout';
import { PageDetailSkeleton } from '$components/layout/PageDetailSkeleton';
import { PageIdentityHero } from '$components/layout/PageIdentityHero';
import { PageSectionNavigation } from '$components/layout/PageSectionNavigation';
import { AccessDeniedState, PageState } from '$components/layout/PageState';
import { UnsavedNavigationDialog } from '$components/layout/UnsavedNavigationDialog';
import { useAdminStepUpController } from '$components/users/user-detail/useAdminStepUpController';
import {
  analyzeUserAccessMutationBatch,
} from '$components/users/user-detail/user-access-editor-policy';
import { useUserDetailCapabilities } from '$components/users/user-detail/useUserDetailCapabilities';
import {
  getProfileFieldErrors,
  userProfileSchema,
} from '$components/users/user-detail/user-detail-draft';
import {
  ACCESS_PERMISSION_KEYS,
  ACCOUNT_PERMISSION_KEYS,
  appendUserAuditFilters,
  buildUserDetailSectionHref,
  getUserAuditFiltersFromParams,
  getUserAuditFiltersKey,
  havePermissionOverridesChangedForKeys,
  normalizePermissionPageKey,
  resetPermissionOverridesForKeys,
  selectPermissionOverridesForKeys,
} from '$components/users/user-detail/user-detail-page.helpers';
import { requestUserDetailMutation } from '$components/users/user-detail/user-detail-request';
import { focusUserSecurityElement } from '$components/users/user-detail/user-security-focus';
import {
  AdminMfaResetDialog,
  AdminStepUpDialog,
  UserAccessTab,
  UserAccountTab,
  UserHistoryTab,
  UserProfileTab,
  UserSecurityTab,
} from '$components/users/user-detail/UserDetailLazySections';
import {
  getUserDetailSectionLabel,
  normalizeUserDetailSection,
  type UserDetailSectionId,
} from '$components/users/user-detail/UserDetailNavigation';
import {
  type UserHistoryFacets,
  type UserHistoryFilters,
} from '$components/users/user-detail/UserHistoryTab';
import {
  UserMutationFeedback,
  useUserMutationFeedback,
} from '$components/users/user-detail/UserMutationFeedback';
import { UserPasswordResetFeedback } from '$components/users/user-detail/UserPasswordResetFeedback';
import type { ProfileForm } from '$components/users/user-detail/UserProfileTab';
import { useUserDetailDraft } from '$components/users/user-detail/useUserDetailDraft';
import { useUserPasswordReset } from '$components/users/user-detail/useUserPasswordReset';
import { UserAvatar } from '$components/users/UserAvatar';
import { UserOverviewCard } from '$components/users/UserOverviewCard';
import { FEATURES } from '$constants/feature-registry.constants';
import {
  type PermissionsData,
} from '$constants/permissions.constants';
import { PAGE_PATHS, userDetailPath } from '$constants/routes.constants';
import { useUser } from '$context/UserContext';
import { UserAccessBadge } from '$features/users/user-badges';
import { getUserDetailScope } from '$features/users/user-detail-scope';
import { useUnsavedNavigationGuard } from '$hooks/useUnsavedNavigationGuard';
import type {
  AuditLogEntry,
  UserSessionInfo,
  UserType,
} from '$types/auth.types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '$ui/alert-dialog';
import { Button } from '$ui/button';
import directoryStyles from '$ui/directory.module.css';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { ApiClientError } from '$utils/api.utils';
import { cn } from '$utils/css.utils';
import { getSafeCollectionReturnHref } from '$utils/navigation.utils';
import { securityRequest } from '$utils/security-request.utils';
import {
  getUserDisplayName,
  getUserLoginDisplay,
} from '$utils/user-display.utils';

type UserDetailPageProps = {
  initialScope?: string;
  initialUser?: UserType;
  userId: string;
};

const focusSecuritySessionsHeading = (): void => {
  const heading = document.getElementById('user-security-sessions-heading');
  focusUserSecurityElement(heading);
};

const DetailSkeleton: FC = () => (
  <PageShell className="py-0">
    <PageCanvas contentClassName="relative space-y-4">
      <PageDetailSkeleton />
    </PageCanvas>
  </PageShell>
);

export const UserDetailPageSkeleton: FC<{ returnHref?: string }> = ({
  returnHref,
}) => {
  const searchParams = useSearchParams();
  const resolvedReturnHref =
    returnHref ??
    getSafeCollectionReturnHref(searchParams.get('returnTo'), PAGE_PATHS.users);

  return (
    <AuthenticatedLayout
      breadcrumbs={[
        { label: FEATURES.users.audit.poleLabel },
        { href: resolvedReturnHref, label: FEATURES.users.label },
        { label: 'Fiche' },
      ]}
    >
      <DetailSkeleton />
    </AuthenticatedLayout>
  );
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
  const requestedAuditFilters = useMemo(
    () =>
      getUserAuditFiltersFromParams(new URLSearchParams(currentQueryString)),
    [currentQueryString],
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
    setEditForm,
    setPermissions,
    syncUserState,
    user,
  } = useUserDetailDraft(initialUser);
  const mutation = useUserMutationFeedback();
  const { clear: clearMutationFeedback, inFlight: mutationInFlight } = mutation;
  const [isLoading, setIsLoading] = useState(!initialUser);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [activeSection, setActiveSection] =
    useState<UserDetailSectionId>(requestedSection);
  const [showLoginChangeConfirm, setShowLoginChangeConfirm] = useState(false);
  const userAbortControllerRef = useRef<AbortController | null>(null);
  const auditAbortControllerRef = useRef<AbortController | null>(null);
  const sessionsAbortControllerRef = useRef<AbortController | null>(null);
  const hasLoadedAuditLogsRef = useRef(false);
  const mountedRef = useRef(true);
  const mutationAbortControllerRef = useRef(new AbortController());

  const [isSaving, setIsSaving] = useState(false);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showResetMfa, setShowResetMfa] = useState(false);
  const [showRevokeSessionsConfirm, setShowRevokeSessionsConfirm] =
    useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletionUnconfirmed, setDeletionUnconfirmed] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditNextCursor, setAuditNextCursor] = useState<string | null>(null);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [isExportingAudit, setIsExportingAudit] = useState(false);
  const [auditFacets, setAuditFacets] = useState<UserHistoryFacets | null>(
    null,
  );
  const [auditFilters, setAuditFilters] = useState<UserHistoryFilters>(() =>
    getUserAuditFiltersFromParams(searchParams),
  );
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [isLoadingMoreAudit, setIsLoadingMoreAudit] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [securitySessions, setSecuritySessions] = useState<UserSessionInfo[]>(
    [],
  );
  const [isLoadingSecuritySessions, setIsLoadingSecuritySessions] =
    useState(false);
  const [hasLoadedSecuritySessions, setHasLoadedSecuritySessions] =
    useState(false);
  const [securitySessionsError, setSecuritySessionsError] = useState<
    string | null
  >(null);
  const [securitySessionsNotice, setSecuritySessionsNotice] = useState<
    string | null
  >(null);
  const sessionsMutationFocusRef = useRef(false);
  const sessionsStepUpFocusRef = useRef(false);
  const [isRevokingSecuritySessions, setIsRevokingSecuritySessions] =
    useState(false);
  const [revokingSecuritySessionId, setRevokingSecuritySessionId] = useState<
    string | null
  >(null);

  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const adminStepUp = useAdminStepUpController();
  const {
    cancelPendingStepUpAction,
    pendingStepUpAction,
    requestPasswordReauthenticationForResponse,
    requestStepUpForResponse,
  } = adminStepUp;

  const {
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
    canRequestDeleteTargetUser,
    canResetTargetMfa,
    canResetTargetPassword,
    canRevokeTargetAccessPermissions,
    canRevokeTargetSessions,
    canViewTargetAccess,
    canViewTargetActivity,
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
  } = useUserDetailCapabilities(currentUser, user, userId);
  const passwordReset = useUserPasswordReset({
    beginMutation: mutation.start,
    canReset: canResetTargetPassword,
    finishMutation: mutation.finish,
    onClose: () => setShowResetConfirm(false),
    onSuccess: () => {
      void fetchUser({ background: true });
      refreshAuditAfterMutation();
      void fetchSecuritySessions();
    },
    requestStepUp: requestStepUpForResponse,
    userId,
  });
  const { clearPassword } = passwordReset;
  const isResetting = passwordReset.isResetting;
  const profileErrors = useMemo(() => {
    const validation = userProfileSchema.safeParse({
      contactEmail: editForm.contactEmail,
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      loginName: editForm.loginName,
    });
    const local = getProfileFieldErrors(
      validation.success ? undefined : validation.error.flatten().fieldErrors,
    );
    const server = mutation.serverValidation;

    return {
      contactEmail: canEditTargetContact
        ? (local.contactEmail ??
          (server?.form.contactEmail === editForm.contactEmail
            ? server.errors.contactEmail
            : null))
        : null,
      firstName: canEditTargetProfile
        ? (local.firstName ??
          (server?.form.firstName === editForm.firstName
            ? server.errors.firstName
            : null))
        : null,
      lastName: canEditTargetProfile
        ? (local.lastName ??
          (server?.form.lastName === editForm.lastName
            ? server.errors.lastName
            : null))
        : null,
      loginName: canEditTargetLogin
        ? (local.loginName ??
          (server?.form.loginName === editForm.loginName
            ? server.errors.loginName
            : null))
        : null,
    };
  }, [
    canEditTargetContact,
    canEditTargetLogin,
    canEditTargetProfile,
    editForm,
    mutation.serverValidation,
  ]);
  const hasProfileErrors =
    (canEditTargetContact && !!profileErrors.contactEmail) ||
    (canEditTargetLogin && !!profileErrors.loginName) ||
    (canEditTargetProfile &&
      (!!profileErrors.firstName || !!profileErrors.lastName));
  const hasProfileIdentityChanges =
    !!user &&
    canEditTargetProfile &&
    (editForm.firstName.trim() !== user.firstName ||
      editForm.lastName.trim() !== user.lastName);
  const hasProfileLoginChanges =
    !!user &&
    canEditTargetLogin &&
    editForm.loginName.trim().toLowerCase() !== user.loginName;
  const hasProfileContactChanges =
    !!user &&
    canEditTargetContact &&
    (editForm.contactEmail.trim().toLowerCase() || null) !== user.contactEmail;
  const hasProfileChanges =
    hasProfileIdentityChanges ||
    hasProfileLoginChanges ||
    hasProfileContactChanges;
  const hasRoleChanges = !!user && editForm.role !== user.role;
  const hasAccessPermissionChanges =
    !!user &&
    havePermissionOverridesChangedForKeys(
      permissions,
      user.permissions,
      ACCESS_PERMISSION_KEYS,
    );
  const hasAccountPermissionChanges =
    !!user &&
    havePermissionOverridesChangedForKeys(
      permissions,
      user.permissions,
      ACCOUNT_PERMISSION_KEYS,
    );
  const hasAccessChanges = hasRoleChanges || hasAccessPermissionChanges;
  const accessMutationAnalysis = user
    ? analyzeUserAccessMutationBatch({
        currentPermissions: user.permissions,
        currentRole: user.role,
        disabled: !canManageTargetAccessPermissions,
        nextPermissions: permissions,
        nextRole: editForm.role,
        policy: decideAccessPermissionMutation,
        targetCriticalAccessReady: user.criticalAccessReady,
      })
    : null;
  const hasAccountChanges = hasAccountPermissionChanges;
  const hasSecurityChanges = !!user && editForm.isActive !== user.isActive;
  const hasUnsavedChanges =
    hasProfileChanges ||
    hasAccessChanges ||
    hasAccountChanges ||
    hasSecurityChanges;
  const canSaveAccess =
    hasAccessChanges &&
    !mutation.feedback?.conflict &&
    (!hasRoleChanges || canEditTargetRole) &&
    accessMutationAnalysis?.decision.allowed === true;
  const canSaveAccount =
    hasAccountPermissionChanges &&
    canManageTargetAccountPolicy &&
    !mutation.feedback?.conflict;
  const canSaveSecurity = canEditTargetStatus && !isSelf && hasSecurityChanges;
  const dirtySections = useMemo<UserDetailSectionId[]>(() => {
    const sections: UserDetailSectionId[] = [];

    if (hasProfileChanges) sections.push('profile');
    if (hasAccessChanges) sections.push('access');
    if (hasAccountChanges) sections.push('account');
    if (hasSecurityChanges) sections.push('security');

    return sections;
  }, [
    hasAccessChanges,
    hasAccountChanges,
    hasProfileChanges,
    hasSecurityChanges,
  ]);
  const activeRailSection: UserDetailSectionId =
    activeSection === 'account' ? 'access' : activeSection;
  const railDirtySections = useMemo<UserDetailSectionId[]>(() => {
    const sections = dirtySections.filter((section) => section !== 'account');

    if (hasAccountChanges && !sections.includes('access')) {
      sections.push('access');
    }

    return sections;
  }, [dirtySections, hasAccountChanges]);
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
    sessionsAbortControllerRef.current?.abort();
    auditAbortControllerRef.current?.abort();
    clearUserState();
    clearPassword();
    clearMutationFeedback();
    cancelPendingStepUpAction();
    setSecuritySessions([]);
    setSecuritySessionsNotice(null);
    setHasLoadedSecuritySessions(false);
    setAuditLogs([]);
    setAuditFacets(null);
    setShowResetConfirm(false);
    setShowResetMfa(false);
    setShowRevokeSessionsConfirm(false);
    setShowDeleteConfirm(false);
    setShowLoginChangeConfirm(false);
    mutationInFlight.current = false;
    setIsSaving(false);
    setIsSavingPermissions(false);
    setIsDeleting(false);
    setIsRevokingSecuritySessions(false);
    setRevokingSecuritySessionId(null);
  }, [
    cancelPendingStepUpAction,
    clearMutationFeedback,
    clearPassword,
    clearUserState,
    mutationInFlight,
  ]);

  const fetchUser = useCallback(
    async (
      options: { background?: boolean } = {},
    ): Promise<UserType | null> => {
      userAbortControllerRef.current?.abort();
      userAbortControllerRef.current = null;

      if (!canViewUsers) {
        setIsLoading(false);

        return null;
      }

      const controller = new AbortController();
      userAbortControllerRef.current = controller;
      const isBackgroundFetch = options.background === true;
      let unavailable = false;
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, 30_000);

      try {
        if (!isBackgroundFetch) {
          setIsLoading(true);
          setErrorMessage(null);
          setErrorStatus(null);
        }

        const response = await fetch(`/api/users/${userId}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (controller.signal.aborted) return null;
        unavailable = [401, 403, 404].includes(response.status);
        if (unavailable) {
          // Refusal bodies may be empty/HTML. Never retain a private snapshot
          // while waiting for a JSON parser that can fail.
          discardUserSnapshot();
          setErrorStatus(response.status);
          setErrorMessage("Impossible de charger l'utilisateur");
        }
        const data = await response.json();

        if (controller.signal.aborted) return null;

        if (response.ok && data.success) {
          const loadedUser = data.data.user as UserType;
          if (loadedUser.id !== userId) throw new Error('Unexpected user');
          if (mutationAbortControllerRef.current.signal.aborted)
            mutationAbortControllerRef.current = new AbortController();
          setErrorStatus(null);
          setErrorMessage(null);
          setDeletionUnconfirmed(false);
          syncUserState(loadedUser);

          return loadedUser;
        } else if (
          !isBackgroundFetch ||
          response.status === 401 ||
          response.status === 403 ||
          response.status === 404
        ) {
          setErrorStatus(response.status);
          setErrorMessage(
            data.error?.message || "Impossible de charger l'utilisateur",
          );
        }
      } catch {
        if (
          (controller.signal.aborted && !timedOut) ||
          userAbortControllerRef.current !== controller
        )
          return null;

        if (!isBackgroundFetch && !unavailable) {
          setErrorStatus(0);
          setErrorMessage("Impossible de charger l'utilisateur");
        }
      } finally {
        clearTimeout(timeout);
        if (userAbortControllerRef.current === controller) {
          userAbortControllerRef.current = null;
          setIsLoading(false);
        }
      }

      return null;
    },
    [canViewUsers, discardUserSnapshot, syncUserState, userId],
  );

  const fetchAuditData = useCallback(async (): Promise<void> => {
    auditAbortControllerRef.current?.abort();
    auditAbortControllerRef.current = null;

    if (!canFetchUserAudit) {
      setAuditLogs([]);
      setAuditNextCursor(null);
      setAuditHasMore(false);
      setAuditFacets(null);
      setAuditError(null);
      setIsLoadingAudit(false);
      setIsLoadingMoreAudit(false);
      hasLoadedAuditLogsRef.current = false;

      return;
    }

    const controller = new AbortController();
    auditAbortControllerRef.current = controller;

    try {
      setIsLoadingAudit(true);
      setIsLoadingMoreAudit(false);
      setAuditError(null);
      const auditParams = new URLSearchParams({
        includeFacets: 'true',
        includeStats: 'false',
      });
      appendUserAuditFilters(auditParams, auditFilters);

      const response = await fetch(
        `/api/users/${userId}/audit?${auditParams.toString()}`,
        {
          signal: controller.signal,
        },
      );
      const data = await response.json();

      if (controller.signal.aborted) return;

      if (response.ok && data.success) {
        const loadedLogs = data.data.logs as AuditLogEntry[];

        setAuditLogs(loadedLogs);
        setAuditNextCursor(data.data.nextCursor ?? null);
        setAuditHasMore(data.data.hasMore === true);
        setAuditFacets(data.data.facets ?? null);
        hasLoadedAuditLogsRef.current = true;
      } else {
        setAuditError(
          data.error?.message || "Impossible de charger l'historique",
        );
      }
    } catch {
      if (controller.signal.aborted) return;

      setAuditError("Impossible de charger l'historique");
    } finally {
      if (auditAbortControllerRef.current !== controller) return;

      auditAbortControllerRef.current = null;
      setIsLoadingAudit(false);
    }
  }, [auditFilters, canFetchUserAudit, userId]);

  const fetchMoreAuditData = useCallback(async (): Promise<void> => {
    if (!canFetchUserAudit || isLoadingMoreAudit) return;
    if (!auditHasMore || !auditNextCursor) return;

    auditAbortControllerRef.current?.abort();

    const controller = new AbortController();
    const auditParams = new URLSearchParams({
      cursor: auditNextCursor,
      includeFacets: 'false',
      includeStats: 'false',
    });
    appendUserAuditFilters(auditParams, auditFilters);
    auditAbortControllerRef.current = controller;

    try {
      setIsLoadingMoreAudit(true);
      setAuditError(null);

      const response = await fetch(
        `/api/users/${userId}/audit?${auditParams.toString()}`,
        { signal: controller.signal },
      );
      const data = await response.json();

      if (controller.signal.aborted) return;
      if (!response.ok || !data.success) {
        setAuditError(
          data.error?.message || "Impossible de charger plus d'historique",
        );

        return;
      }

      const nextLogs = data.data.logs as AuditLogEntry[];

      setAuditLogs((currentLogs) => {
        const knownIds = new Set(currentLogs.map((entry) => entry.id));

        return [
          ...currentLogs,
          ...nextLogs.filter((entry) => !knownIds.has(entry.id)),
        ];
      });
      setAuditNextCursor(data.data.nextCursor ?? null);
      setAuditHasMore(data.data.hasMore === true);
    } catch {
      if (controller.signal.aborted) return;

      setAuditError("Impossible de charger plus d'historique");
    } finally {
      if (auditAbortControllerRef.current !== controller) return;

      auditAbortControllerRef.current = null;
      setIsLoadingMoreAudit(false);
    }
  }, [
    auditFilters,
    auditHasMore,
    auditNextCursor,
    canFetchUserAudit,
    isLoadingMoreAudit,
    userId,
  ]);

  const handleAuditFiltersChange = useCallback(
    (nextFilters: UserHistoryFilters): void => {
      auditAbortControllerRef.current?.abort();
      auditAbortControllerRef.current = null;
      hasLoadedAuditLogsRef.current = false;
      setAuditFilters(nextFilters);
      setAuditLogs([]);
      setAuditNextCursor(null);
      setAuditHasMore(false);
      setAuditFacets(null);
      setAuditError(null);
      setIsLoadingAudit(false);
      setIsLoadingMoreAudit(false);

      const nextParams = new URLSearchParams(currentQueryString);
      nextParams.delete('scope');
      nextParams.delete('period');
      nextParams.delete('poleKey');
      nextParams.delete('pageKey');
      appendUserAuditFilters(nextParams, nextFilters);
      window.history.replaceState(
        null,
        '',
        `${pathname}?${nextParams.toString()}`,
      );
    },
    [currentQueryString, pathname],
  );

  const fetchSecuritySessions = useCallback(async (): Promise<void> => {
    sessionsAbortControllerRef.current?.abort();
    sessionsAbortControllerRef.current = null;

    if (!canViewTargetSessions) {
      setSecuritySessions([]);
      setSecuritySessionsError(null);
      setIsLoadingSecuritySessions(false);
      setHasLoadedSecuritySessions(true);

      return;
    }

    const controller = new AbortController();
    sessionsAbortControllerRef.current = controller;

    try {
      setIsLoadingSecuritySessions(true);
      setSecuritySessionsError(null);
      const data = await securityRequest<{ sessions: UserSessionInfo[] }>(
        `/api/users/${userId}/sessions`,
        controller.signal,
        { cache: 'no-store' },
      );
      if (controller.signal.aborted) return;
      setSecuritySessions(data.sessions);
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (
        failure instanceof ApiClientError &&
        [401, 403, 404].includes(failure.status)
      )
        setSecuritySessions([]);
      setSecuritySessionsError('Impossible de charger les sessions');
    } finally {
      if (sessionsAbortControllerRef.current !== controller) return;

      sessionsAbortControllerRef.current = null;
      setHasLoadedSecuritySessions(true);
      setIsLoadingSecuritySessions(false);
    }
  }, [canViewTargetSessions, userId]);

  const refreshAuditAfterMutation = useCallback((): void => {
    hasLoadedAuditLogsRef.current = false;
    if (activeSection === 'history') void fetchAuditData();
  }, [activeSection, fetchAuditData]);

  useEffect((): (() => void) => {
    mountedRef.current = true;
    if (mutationAbortControllerRef.current.signal.aborted)
      mutationAbortControllerRef.current = new AbortController();

    return (): void => {
      mountedRef.current = false;
      mutationAbortControllerRef.current.abort();
      userAbortControllerRef.current?.abort();
      auditAbortControllerRef.current?.abort();
      sessionsAbortControllerRef.current?.abort();
      userAbortControllerRef.current = null;
      auditAbortControllerRef.current = null;
      sessionsAbortControllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (initialUser?.id === userId) return;
    void fetchUser();
  }, [fetchUser, initialUser?.id, userId]);

  useEffect(() => {
    hasLoadedAuditLogsRef.current = false;
    setAuditLogs([]);
    setAuditNextCursor(null);
    setAuditHasMore(false);
    setAuditFacets(null);
    setAuditError(null);
    setIsLoadingAudit(false);
    setIsLoadingMoreAudit(false);
    setSecuritySessions([]);
    setSecuritySessionsError(null);
    setSecuritySessionsNotice(null);
    setHasLoadedSecuritySessions(false);
    setRevokingSecuritySessionId(null);
  }, [userId]);

  useEffect(() => {
    if (
      getUserAuditFiltersKey(requestedAuditFilters) ===
      getUserAuditFiltersKey(auditFilters)
    ) {
      return;
    }

    auditAbortControllerRef.current?.abort();
    auditAbortControllerRef.current = null;
    hasLoadedAuditLogsRef.current = false;
    setAuditFilters(requestedAuditFilters);
    setAuditLogs([]);
    setAuditNextCursor(null);
    setAuditHasMore(false);
    setAuditFacets(null);
    setAuditError(null);
    setIsLoadingAudit(false);
    setIsLoadingMoreAudit(false);
  }, [auditFilters, requestedAuditFilters]);

  useEffect(() => {
    if (activeSection !== 'history' || hasLoadedAuditLogsRef.current) return;
    void fetchAuditData();
  }, [activeSection, fetchAuditData]);

  useEffect(() => {
    if (user && activeSection === 'security' && !hasLoadedSecuritySessions) {
      void fetchSecuritySessions();
    }
  }, [activeSection, fetchSecuritySessions, hasLoadedSecuritySessions, user]);

  const isMutationPending =
    isSaving ||
    isSavingPermissions ||
    isResetting ||
    isDeleting ||
    isRevokingSecuritySessions ||
    revokingSecuritySessionId !== null;
  const navigation = useUnsavedNavigationGuard(
    hasUnsavedChanges ||
      passwordReset.hasUnacknowledgedPassword ||
      isMutationPending,
    () => {
      if (user) {
        setEditForm({
          contactEmail: user.contactEmail ?? '',
          firstName: user.firstName,
          isActive: user.isActive,
          lastName: user.lastName,
          loginName: user.loginName,
          role: user.role,
        });
        setPermissions(user.permissions);
      }
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

  const handleCancelProfile = (): void => {
    if (!user) return;

    setEditForm((currentForm) => ({
      ...currentForm,
      contactEmail: user.contactEmail ?? '',
      firstName: user.firstName,
      lastName: user.lastName,
      loginName: user.loginName,
    }));
  };

  const handleCancelAccess = (): void => {
    if (!user) return;

    setEditForm((currentForm) => ({
      ...currentForm,
      role: user.role,
    }));
    setPermissions((currentPermissions) =>
      resetPermissionOverridesForKeys(
        currentPermissions,
        user.permissions,
        ACCESS_PERMISSION_KEYS,
      ),
    );
  };

  const handleCancelAccount = (): void => {
    if (!user) return;

    setPermissions((currentPermissions) =>
      resetPermissionOverridesForKeys(
        currentPermissions,
        user.permissions,
        ACCOUNT_PERMISSION_KEYS,
      ),
    );
  };

  const handleCancelSecurity = (): void => {
    if (!user) return;

    setEditForm((currentForm) => ({
      ...currentForm,
      isActive: user.isActive,
    }));
  };

  const handleSaveProfile = async (
    isLoginChangeConfirmed = false,
  ): Promise<void> => {
    if (!mountedRef.current) return;
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

    if (!mutation.start()) return;
    const requestController = mutationAbortControllerRef.current;
    const submitted = {
      form: editForm,
      permissions,
      section: 'profile' as const,
    };
    setIsSaving(true);
    try {
      const { data, response } = await requestUserDetailMutation<{
        user: UserType;
      }>(`/api/users/${userId}`, requestController.signal, {
        body: JSON.stringify({
          expectedUpdatedAt: new Date(user.updatedAt).toISOString(),
          ...(hasProfileContactChanges
            ? {
                contactEmail:
                  editForm.contactEmail.trim().toLowerCase() || null,
              }
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
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
        signal: requestController.signal,
      });
      if (!mountedRef.current || requestController.signal.aborted) return;

      if (response.ok && data.success) {
        syncUserState(data.data.user, submitted);
        if (currentUser && data.data.user.id === currentUser.id) {
          // Preserve hidden administrative overrides while syncing self-profile fields.
          applyUserUpdate({
            ...currentUser,
            firstName: data.data.user.firstName,
            lastName: data.data.user.lastName,
            updatedAt: data.data.user.updatedAt ?? currentUser.updatedAt,
          });
        }
        refreshAuditAfterMutation();
        toast.success('Utilisateur mis à jour');
      } else {
        if (
          requestStepUpForResponse(data, {
            description:
              "La modification de l'identifiant de connexion ferme toutes les sessions du membre.",
            execute: () => handleSaveProfile(true),
            title: "Confirmer la modification de l'identifiant",
          })
        ) {
          return;
        }
        mutation.report(
          'profile',
          data.error?.message || 'Erreur lors de la mise à jour',
          response.status,
          data.error?.details,
          editForm,
        );
      }
    } catch {
      if (!mountedRef.current || requestController.signal.aborted) return;
      mutation.report(
        'profile',
        'La réponse du serveur n’a pas pu être confirmée. Actualisez la fiche avant de réessayer ; votre saisie sera conservée.',
      );
    } finally {
      if (requestController !== mutationAbortControllerRef.current) return;
      mutation.finish();
      if (!mountedRef.current) return;
      setIsSaving(false);
    }
  };

  const handleSaveAccess = async (): Promise<void> => {
    if (!mountedRef.current) return;
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

    if (!mutation.start()) return;
    const requestController = mutationAbortControllerRef.current;
    const submitted = {
      form: editForm,
      permissions,
      section: 'access' as const,
    };
    setIsSavingPermissions(true);
    try {
      const { data, response } = await requestUserDetailMutation<{
        user: UserType;
      }>(`/api/users/${userId}`, requestController.signal, {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
        signal: requestController.signal,
      });
      if (!mountedRef.current || requestController.signal.aborted) return;

      if (response.ok && data.success) {
        syncUserState(data.data.user, submitted);
        refreshAuditAfterMutation();
        toast.success('Autorisations mises à jour');
        requestAnimationFrame(() => {
          if (!mountedRef.current || requestController.signal.aborted) return;
          const panel = document.getElementById('user-access-panel');
          const control = panel?.querySelector<HTMLElement>(
            '#user-role:not(:disabled), button[aria-pressed]:not(:disabled):not([aria-hidden="true"])',
          );
          const target = control ?? panel?.querySelector<HTMLElement>('h3');
          if (target && !control) target.tabIndex = -1;
          target?.focus();
        });
      } else {
        if (
          requestPasswordReauthenticationForResponse(data, {
            description:
              'Ce changement peut modifier le rôle ou les autorisations sensibles de l’utilisateur et fermer ses sessions.',
            execute: handleSaveAccess,
            title: 'Confirmer la modification des autorisations',
          })
        ) {
          return;
        }
        mutation.report(
          'access',
          data.error?.message || 'Erreur lors de la mise à jour',
          response.status,
          data.error?.details,
          editForm,
        );
      }
    } catch {
      if (!mountedRef.current || requestController.signal.aborted) return;
      mutation.report(
        'access',
        'La réponse du serveur n’a pas pu être confirmée. Actualisez la fiche avant de réessayer ; votre saisie sera conservée.',
      );
    } finally {
      if (requestController !== mutationAbortControllerRef.current) return;
      mutation.finish();
      if (!mountedRef.current) return;
      setIsSavingPermissions(false);
    }
  };

  const handleSaveAccount = async (): Promise<void> => {
    if (!mountedRef.current) return;
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

    if (!mutation.start()) return;
    const requestController = mutationAbortControllerRef.current;
    const submitted = {
      form: editForm,
      permissions,
      section: 'account' as const,
    };
    setIsSavingPermissions(true);
    try {
      const { data, response } = await requestUserDetailMutation<{
        user: UserType;
      }>(`/api/users/${userId}`, requestController.signal, {
        body: JSON.stringify({
          expectedUpdatedAt: new Date(user.updatedAt).toISOString(),
          permissions: selectPermissionOverridesForKeys(
            permissions,
            ACCOUNT_PERMISSION_KEYS,
          ),
          permissionScope: 'account',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
        signal: requestController.signal,
      });
      if (!mountedRef.current || requestController.signal.aborted) return;

      if (response.ok && data.success) {
        syncUserState(data.data.user, submitted);
        refreshAuditAfterMutation();
        toast.success('Autonomie du compte mise à jour');
      } else {
        if (
          requestStepUpForResponse(data, {
            description:
              'Cette modification change les actions que le membre peut effectuer sur son propre compte.',
            execute: handleSaveAccount,
            title: 'Confirmer la politique du compte',
          })
        ) {
          return;
        }
        mutation.report(
          'account',
          data.error?.message || 'Erreur lors de la mise à jour',
          response.status,
          data.error?.details,
          editForm,
        );
      }
    } catch {
      if (!mountedRef.current || requestController.signal.aborted) return;
      mutation.report(
        'account',
        'La réponse du serveur n’a pas pu être confirmée. Actualisez la fiche avant de réessayer ; votre saisie sera conservée.',
      );
    } finally {
      if (requestController !== mutationAbortControllerRef.current) return;
      mutation.finish();
      if (!mountedRef.current) return;
      setIsSavingPermissions(false);
    }
  };

  const handleSaveSecurity = async (): Promise<void> => {
    if (!mountedRef.current) return;
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

    if (!mutation.start()) return;
    const requestController = mutationAbortControllerRef.current;
    const submitted = {
      form: editForm,
      permissions,
      section: 'security' as const,
    };
    setIsSaving(true);
    try {
      const { data, response } = await requestUserDetailMutation<{
        user: UserType;
      }>(`/api/users/${userId}`, requestController.signal, {
        body: JSON.stringify({
          expectedUpdatedAt: new Date(user.updatedAt).toISOString(),
          isActive: editForm.isActive,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
        signal: requestController.signal,
      });
      if (!mountedRef.current || requestController.signal.aborted) return;

      if (response.ok && data.success) {
        syncUserState(data.data.user, submitted);
        refreshAuditAfterMutation();
        void fetchSecuritySessions();
        toast.success(
          editForm.isActive ? 'Compte réactivé' : 'Compte désactivé',
        );
      } else {
        if (
          requestStepUpForResponse(data, {
            description:
              "Ce changement peut désactiver le compte et fermer l'accès du membre.",
            execute: handleSaveSecurity,
            title: "Confirmer le changement d'état",
          })
        ) {
          return;
        }
        mutation.report(
          'security',
          data.error?.message || 'Erreur lors de la mise à jour',
          response.status,
          data.error?.details,
          editForm,
        );
      }
    } catch {
      if (!mountedRef.current || requestController.signal.aborted) return;
      mutation.report(
        'security',
        'La réponse du serveur n’a pas pu être confirmée. Actualisez la fiche avant de réessayer ; votre saisie sera conservée.',
      );
    } finally {
      if (requestController !== mutationAbortControllerRef.current) return;
      mutation.finish();
      if (!mountedRef.current) return;
      setIsSaving(false);
    }
  };

  const handleResetPassword = async (): Promise<void> => {
    if (mutation.inFlight.current || mutation.isRefreshing) return;
    await passwordReset.reset();
  };

  const handleResetMfaComplete = (updatedUser: UserType): void => {
    syncUserState(updatedUser);
    setShowResetMfa(false);
    refreshAuditAfterMutation();
    void fetchSecuritySessions();
    toast.success('Double authentification réinitialisée');
  };

  const handleRevokeSecuritySession = async (
    sessionId?: string,
  ): Promise<void> => {
    if (!mountedRef.current || !canRevokeTargetSessions || !mutation.start())
      return;
    const requestController = mutationAbortControllerRef.current;
    sessionsMutationFocusRef.current = !sessionId && showRevokeSessionsConfirm;
    setSecuritySessionsNotice(null);
    if (sessionId) setRevokingSecuritySessionId(sessionId);
    else setIsRevokingSecuritySessions(true);
    try {
      await securityRequest<{ revokedSessions: number }>(
        sessionId
          ? `/api/users/${userId}/sessions?id=${encodeURIComponent(sessionId)}`
          : `/api/users/${userId}/sessions`,
        requestController.signal,
        { method: 'DELETE' },
      );
      if (!mountedRef.current || requestController.signal.aborted) return;
      toast.success(sessionId ? 'Session révoquée' : 'Sessions révoquées');
      refreshAuditAfterMutation();
      void fetchSecuritySessions();
      if (!sessionId) void fetchUser({ background: true });
    } catch (failure) {
      if (!mountedRef.current || requestController.signal.aborted) return;
      if (
        failure instanceof ApiClientError &&
        requestStepUpForResponse(
          { error: { code: failure.code } },
          {
            description: sessionId
              ? 'Cette session du membre sera immédiatement fermée.'
              : 'Toutes les sessions actives du membre seront immédiatement fermées.',
            execute: () => handleRevokeSecuritySession(sessionId),
            title: sessionId
              ? 'Confirmer la révocation de la session'
              : 'Confirmer la révocation des sessions',
          },
        )
      ) {
        sessionsStepUpFocusRef.current = true;

        return;
      }
      if (
        failure instanceof ApiClientError &&
        [401, 403].includes(failure.status)
      ) {
        setSecuritySessions([]);
        setSecuritySessionsError(
          'Votre accès aux sessions doit être vérifié. Rechargez la liste avant de continuer.',
        );
      } else if (
        !(failure instanceof ApiClientError) ||
        failure.status >= 500 ||
        failure.code === 'INVALID_RESPONSE'
      ) {
        setSecuritySessionsNotice(
          'La réponse n’a pas pu être confirmée. Vérifiez les sessions restantes avant de recommencer.',
        );
        void fetchSecuritySessions();
        void fetchUser({ background: true });
      } else if ([404, 409].includes(failure.status)) {
        setSecuritySessionsNotice(
          'La session ou le compte a changé. Vérifiez les informations actualisées avant de continuer.',
        );
        void fetchSecuritySessions();
        void fetchUser({ background: true });
      } else {
        setSecuritySessionsNotice(failure.message);
      }
    } finally {
      if (requestController === mutationAbortControllerRef.current) {
        mutation.finish();
        if (mountedRef.current) {
          setIsRevokingSecuritySessions(false);
          setRevokingSecuritySessionId(null);
          setShowRevokeSessionsConfirm(false);
        }
      }
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!mountedRef.current) return;
    if (deletionUnconfirmed) return;
    if (!user || deleteConfirmation.trim() !== user.loginName) return;
    if (!canRequestDeleteTargetUser) {
      toast.error(
        'Vous n’avez pas l’autorisation de supprimer cet utilisateur',
      );
      setShowDeleteConfirm(false);

      return;
    }
    if (user?.isActive !== false) {
      toast.error('Désactivez d’abord ce compte avant de le supprimer');
      setShowDeleteConfirm(false);

      return;
    }

    if (!mutation.start()) return;
    const requestController = mutationAbortControllerRef.current;
    setIsDeleting(true);
    try {
      const { data, response } = await requestUserDetailMutation<{
        user: UserType;
      }>(`/api/users/${userId}`, requestController.signal, {
        method: 'DELETE',
        signal: requestController.signal,
      });
      if (!mountedRef.current || requestController.signal.aborted) return;

      if (response.ok && data.success) {
        toast.success('Compte supprimé définitivement');
        router.push(returnHref);
      } else {
        if (
          requestPasswordReauthenticationForResponse(data, {
            description:
              'Le compte sera supprimé irréversiblement et son identité sera anonymisée.',
            execute: handleDelete,
            title: 'Confirmer la suppression définitive',
          })
        ) {
          return;
        }
        toast.error(data.error?.message || 'Impossible de supprimer ce compte');
      }
    } catch {
      if (!mountedRef.current || requestController.signal.aborted) return;
      setDeletionUnconfirmed(true);
      mutation.report(
        'security',
        'La suppression n’a pas pu être confirmée. Le compte a peut-être été supprimé. Actualisez la fiche avant toute nouvelle tentative.',
      );
    } finally {
      if (requestController !== mutationAbortControllerRef.current) return;
      mutation.finish();
      if (!mountedRef.current) return;
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const renderAuthorizationContent = (
    requestedView: 'access' | 'account',
  ): React.ReactNode => {
    if (!user) return null;

    if (!canViewTargetAccess && !canViewTargetPersonalAccount) {
      return (
        <AccessDeniedState description="Vous n'avez pas la permission de consulter les autorisations de cet utilisateur." />
      );
    }

    const selectedView =
      requestedView === 'access' && canViewTargetAccess
        ? 'access'
        : requestedView === 'account' && canViewTargetPersonalAccount
          ? 'account'
          : canViewTargetAccess
            ? 'access'
            : 'account';

    return (
      <section
        aria-labelledby="user-authorizations-title"
        className="space-y-3"
      >
        <h2 id="user-authorizations-title" className="sr-only">
          Autorisations
        </h2>
        {canViewTargetAccess && canViewTargetPersonalAccount && (
          <div
            aria-label="Catégorie d'autorisations"
            className="border-border/70 bg-surface-muted/75 grid min-h-11 w-full gap-1 rounded-lg border p-1 @min-[32rem]/page:inline-flex @min-[32rem]/page:w-auto"
            role="group"
          >
            <Button
              aria-pressed={selectedView === 'access'}
              className="h-auto min-h-10 min-w-0 whitespace-normal"
              onClick={() => handleSectionChange('access')}
              size="sm"
              type="button"
              variant={selectedView === 'access' ? 'secondary' : 'ghost'}
            >
              Autorisations administratives
              {hasAccessChanges && (
                <span
                  aria-label="Modifications non enregistrées"
                  className="bg-warning size-1.5 rounded-full"
                />
              )}
            </Button>
            <Button
              aria-pressed={selectedView === 'account'}
              className="h-auto min-h-10 min-w-0 whitespace-normal"
              onClick={() => handleSectionChange('account')}
              size="sm"
              type="button"
              variant={selectedView === 'account' ? 'secondary' : 'ghost'}
            >
              Compte personnel
              {hasAccountChanges && (
                <span
                  aria-label="Modifications non enregistrées"
                  className="bg-warning size-1.5 rounded-full"
                />
              )}
            </Button>
          </div>
        )}
        {selectedView === 'access' ? (
          <UserAccessTab
            user={user}
            role={editForm.role}
            setRole={(role) =>
              setEditForm((currentForm) => ({ ...currentForm, role }))
            }
            permissions={permissions}
            setPermissions={setPermissions}
            canChangePermission={decideAccessPermissionMutation}
            canDelegatePermissions={canDelegateTargetAccessPermissions}
            canEditRole={canEditTargetRole}
            canGrantPermissions={canGrantTargetAccessPermissions}
            canManagePermissions={canManageTargetAccessPermissions}
            canRevokePermissions={canRevokeTargetAccessPermissions}
            mutationSummary={accessMutationAnalysis?.summary ?? null}
            saveDisabledReason={accessMutationAnalysis?.decision.reason}
            isSaving={isSavingPermissions || mutation.isRefreshing}
            isRefreshing={mutation.isRefreshing}
            permissionPageKey={permissionPageKey}
            onPermissionPageChange={handlePermissionPageChange}
            onSave={handleSaveAccess}
            onCancel={handleCancelAccess}
            hasChanges={hasAccessChanges}
            canSave={canSaveAccess}
          />
        ) : (
          <UserAccountTab
            user={user}
            role={editForm.role}
            permissions={permissions}
            setPermissions={setPermissions}
            canManagePermissions={canManageTargetAccountPolicy}
            isSaving={isSavingPermissions || mutation.isRefreshing}
            isRefreshing={mutation.isRefreshing}
            onSave={handleSaveAccount}
            onCancel={handleCancelAccount}
            hasChanges={hasAccountChanges}
            canSave={canSaveAccount}
          />
        )}
      </section>
    );
  };

  const auditExportParams = new URLSearchParams({ format: 'csv' });
  appendUserAuditFilters(auditExportParams, auditFilters);
  const auditExportHref = `/api/users/${userId}/audit?${auditExportParams.toString()}`;

  async function handleAuditExport(): Promise<void> {
    if (isExportingAudit) return;

    try {
      setIsExportingAudit(true);
      const response = await fetch(auditExportHref, { cache: 'no-store' });

      if (!response.ok) {
        let errorBody: unknown = null;
        try {
          errorBody = await response.clone().json();
        } catch {
          // Infrastructure errors are not guaranteed to be JSON.
        }

        if (
          requestStepUpForResponse(errorBody, {
            description:
              'L’export contient l’historique de sécurité de ce compte.',
            execute: handleAuditExport,
            title: 'Confirmer l’export du journal',
          })
        ) {
          return;
        }

        const errorMessage = (
          errorBody as { error?: { message?: unknown } } | null
        )?.error?.message;
        throw new Error(
          typeof errorMessage === 'string'
            ? errorMessage
            : 'Impossible d’exporter l’activité de cet utilisateur',
        );
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `activite-utilisateur_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);

      if (response.headers.get('X-Export-Truncated') === 'true') {
        toast.warning('Export limité aux 50 000 événements les plus récents');
      } else {
        toast.success('Export complet prêt');
      }
    } catch (exportError) {
      toast.error(
        exportError instanceof Error
          ? exportError.message
          : 'Impossible d’exporter l’activité de cet utilisateur',
      );
    } finally {
      setIsExportingAudit(false);
    }
  }

  const hasMoreAuditLogs = auditHasMore;
  const shouldShowAuditLoading =
    isLoadingAudit ||
    (!hasLoadedAuditLogsRef.current &&
      auditError === null &&
      auditLogs.length === 0);

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
            canViewContact={canViewTargetContact}
            isSelf={isSelf}
            isSaving={isMutationPending || mutation.isRefreshing}
            isRefreshing={mutation.isRefreshing}
            canSave={!mutation.feedback?.conflict}
            onSave={handleSaveProfile}
            onCancel={handleCancelProfile}
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
            <UserPasswordResetFeedback
              controller={passwordReset}
              onCheck={async () => {
                const loaded = await fetchUser({ background: true });
                if (loaded) await fetchSecuritySessions();

                return Boolean(loaded);
              }}
              onRequestReset={() => setShowResetConfirm(true)}
            />
            <UserSecurityTab
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
              isRevokingSessionId={revokingSecuritySessionId}
              isRevokingSessions={isRevokingSecuritySessions}
              onSaveStatus={handleSaveSecurity}
              onResetMfa={() => setShowResetMfa(true)}
              onResetPassword={() => setShowResetConfirm(true)}
              onRevokeSession={handleRevokeSecuritySession}
              onRevokeSessions={() => setShowRevokeSessionsConfirm(true)}
              onRetrySessions={fetchSecuritySessions}
              currentUserId={currentUser?.id}
              canSaveStatus={canSaveSecurity && !mutation.feedback?.conflict}
              hasStatusChanges={hasSecurityChanges}
              onCancelStatus={handleCancelSecurity}
              canRequestDeleteUser={canRequestDeleteTargetUser}
              deletionBlocked={deletionUnconfirmed}
              onDeleteUser={() => setShowDeleteConfirm(true)}
              sessions={securitySessions}
              sessionsError={securitySessionsError}
              sessionsNotice={securitySessionsNotice}
            />
          </>
        );
      case 'history':
        if (!canViewTargetActivity) {
          return (
            <AccessDeniedState description="Vous n'avez pas la permission de consulter l'activité de cet utilisateur." />
          );
        }

        return (
          <UserHistoryTab
            auditLogs={auditLogs}
            canExport={canExportUsers}
            error={auditError}
            facets={auditFacets}
            filters={auditFilters}
            hasMoreAuditLogs={hasMoreAuditLogs}
            isExporting={isExportingAudit}
            isLoading={shouldShowAuditLoading}
            isLoadingMore={isLoadingMoreAudit}
            onFiltersChange={handleAuditFiltersChange}
            onExport={
              canExportUsers
                ? (): void => {
                    void handleAuditExport();
                  }
                : undefined
            }
            onLoadMore={() => void fetchMoreAuditData()}
            onRetry={() => void fetchAuditData()}
            perspective={isSelf ? 'personal' : 'managed'}
            totalAuditLogs={auditLogs.length}
            userId={userId}
          />
        );
      default:
        return null;
    }
  };

  if (isCurrentUserLoading && !currentUser) {
    return <UserDetailPageSkeleton returnHref={returnHref} />;
  }

  if (!canViewUsers) {
    return (
      <AuthenticatedLayout
        breadcrumbs={[
          {
            label: FEATURES.users.audit.poleLabel,
          },
          { href: returnHref, label: FEATURES.users.label },
          { label: 'Fiche' },
        ]}
      >
        <AccessDeniedState
          actionHref={returnHref}
          actionLabel="Retour aux utilisateurs"
          description="Vous n'avez pas la permission de consulter cet utilisateur."
        />
      </AuthenticatedLayout>
    );
  }

  if (isLoading) {
    return <UserDetailPageSkeleton returnHref={returnHref} />;
  }

  if (errorMessage || !user) {
    const isNotFound = errorStatus === 404;

    return (
      <AuthenticatedLayout
        breadcrumbs={[
          {
            label: FEATURES.users.audit.poleLabel,
          },
          { href: returnHref, label: FEATURES.users.label },
          { label: 'Fiche' },
        ]}
      >
        {errorStatus === 403 ? (
          <AccessDeniedState
            actionHref={returnHref}
            actionLabel="Retour aux utilisateurs"
            description="Vous n'avez pas la permission de consulter cet utilisateur."
          />
        ) : (
          <PageState
            actionHref={isNotFound ? returnHref : undefined}
            actionLabel={isNotFound ? 'Retour aux utilisateurs' : 'Réessayer'}
            description={
              isNotFound
                ? "Ce compte n'existe pas ou a été supprimé."
                : errorMessage || "Impossible de charger l'utilisateur."
            }
            onAction={
              isNotFound
                ? undefined
                : (): void => {
                    void fetchUser();
                  }
            }
            secondaryActionHref={isNotFound ? undefined : returnHref}
            secondaryActionLabel={
              isNotFound ? undefined : 'Retour aux utilisateurs'
            }
            title={
              isNotFound
                ? 'Utilisateur introuvable'
                : 'Impossible de charger la fiche'
            }
            tone="destructive"
          />
        )}
      </AuthenticatedLayout>
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
          <div className="min-w-0">
            <PageAsideLayout
              header={
                <PageIdentityHero
                  compact
                  title={getUserDisplayName(user)}
                  description={`Identifiant : ${getUserLoginDisplay(user)}`}
                  icon={
                    <UserAvatar
                      user={user}
                      className="size-full rounded-[7px]"
                    />
                  }
                  actions={<UserAccessBadge user={user} />}
                />
              }
              aside={
                <div className={cn(directoryStyles.directory, 'min-w-0')}>
                  <UserOverviewCard user={user} />
                </div>
              }
            >
              <div className="space-y-4">
                <PageSectionNavigation
                  activeSection={activeRailSection}
                  ariaLabel="Navigation de la fiche utilisateur"
                  dirtySections={railDirtySections}
                  getSectionHref={(sectionId) =>
                    buildUserDetailSectionHref(
                      pathname,
                      currentQueryString,
                      resolveRailSection(sectionId),
                    )
                  }
                  onSectionChange={(_section, href) =>
                    window.history.replaceState(null, '', href)
                  }
                  sections={visibleUserDetailSections}
                />
                {isTargetIdentityMasked && (
                  <div className="border-warning/30 bg-warning/10 text-foreground flex gap-3 rounded-lg border p-3 sm:p-4">
                    <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">
                        Compte système protégé
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs leading-5">
                        Ce compte reste visible pour la cohérence
                        administrative, mais son identité technique, ses accès,
                        sa sécurité et son activité sont réservés à son
                        propriétaire.
                      </p>
                    </div>
                  </div>
                )}
                {isSelf && (
                  <div className="border-primary/25 bg-primary/[0.08] flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                    <div className="min-w-0">
                      <p className="text-foreground text-sm font-medium">
                        Votre fiche administrative est en lecture seule
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs leading-5">
                        Consultez ici les informations de gestion. Utilisez Mon
                        compte pour modifier vos informations personnelles et
                        votre sécurité.
                      </p>
                    </div>
                    <Button asChild className="shrink-0" size="sm">
                      <Link href="/mon-compte">Gérer mon compte</Link>
                    </Button>
                  </div>
                )}
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
            </PageAsideLayout>
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
      <AlertDialog
        open={showLoginChangeConfirm}
        onOpenChange={setShowLoginChangeConfirm}
      >
        <AlertDialogContent className="overflow-y-auto p-0">
          <div className="p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <div className="bg-warning/10 flex h-8 w-8 items-center justify-center rounded-lg">
                  <AlertTriangle size={16} className="text-warning" />
                </div>
                Modifier l&apos;identifiant de connexion ?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Toutes les sessions de cet utilisateur seront fermées. Il devra
                ensuite utiliser le nouvel identifiant{' '}
                <strong>{editForm.loginName.trim().toLowerCase()}</strong> pour
                se reconnecter.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel className="border-border">
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-warning text-warning-foreground hover:bg-warning/90"
                onClick={() => {
                  setShowLoginChangeConfirm(false);
                  void handleSaveProfile(true);
                }}
              >
                Modifier et déconnecter
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
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
        onProofKindRequired={adminStepUp.setPendingStepUpProofKind}
        open={pendingStepUpAction !== null}
        proofKind={pendingStepUpAction?.proofKind ?? 'full'}
        title={pendingStepUpAction?.title ?? 'Confirmer votre identité'}
      />
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent className="overflow-y-auto p-0">
          <div className="p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <div className="bg-warning/10 flex h-8 w-8 items-center justify-center rounded-lg">
                  <AlertTriangle size={16} className="text-warning" />
                </div>
                Réinitialiser le mot de passe ?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Un nouveau mot de passe temporaire sera généré.
                L&apos;utilisateur devra le changer à sa prochaine connexion.
                Toutes ses sessions actives seront invalidées.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel className="border-border">
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResetPassword}
                disabled={isResetting}
                className="bg-warning text-warning-foreground hover:bg-warning/90"
              >
                {isResetting && (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                )}
                Réinitialiser
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={showRevokeSessionsConfirm}
        onOpenChange={(open) => {
          if (!isRevokingSecuritySessions) setShowRevokeSessionsConfirm(open);
        }}
      >
        <AlertDialogContent
          className="overflow-y-auto p-0"
          onCloseAutoFocus={(event) => {
            if (!sessionsMutationFocusRef.current) return;
            sessionsMutationFocusRef.current = false;
            event.preventDefault();
            if (document.querySelector('[role="dialog"][data-state="open"]'))
              return;
            focusSecuritySessionsHeading();
          }}
        >
          <div className="p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <div className="bg-warning/10 flex h-8 w-8 items-center justify-center rounded-lg">
                  <AlertTriangle size={16} className="text-warning" />
                </div>
                Révoquer les sessions ?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Toutes les sessions actives de cet utilisateur seront
                déconnectées. Il devra se reconnecter.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel
                className="border-border"
                disabled={isRevokingSecuritySessions}
              >
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  void handleRevokeSecuritySession();
                }}
                disabled={isRevokingSecuritySessions}
                className="bg-warning text-warning-foreground hover:bg-warning/90"
              >
                {isRevokingSecuritySessions && (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                )}
                Révoquer
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={showDeleteConfirm}
        onOpenChange={(open) => {
          if (isDeleting && !open) return;
          setShowDeleteConfirm(open);
          if (!open) setDeleteConfirmation('');
        }}
      >
        <AlertDialogContent className="overflow-y-auto p-0">
          <div className="p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <div className="bg-destructive/10 flex h-8 w-8 items-center justify-center rounded-lg">
                  <AlertTriangle size={16} className="text-destructive" />
                </div>
                Supprimer définitivement cet utilisateur ?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Le compte de{' '}
                <strong>
                  {user.firstName} {user.lastName}
                </strong>{' '}
                sera supprimé de manière irréversible et ne pourra pas être
                restauré. Son profil sera anonymisé et ses secrets
                d’authentification supprimés. Les traces indispensables au
                journal d’audit et la réservation de son identifiant seront
                conservées.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="mt-4 space-y-2">
              <Label htmlFor="delete-user-confirmation">
                Pour confirmer, saisissez <strong>{user.loginName}</strong>
              </Label>
              <Input
                autoComplete="off"
                id="delete-user-confirmation"
                disabled={isDeleting}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                placeholder={user.loginName}
                value={deleteConfirmation}
              />
            </div>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel
                className="border-border"
                disabled={isDeleting}
              >
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  void handleDelete();
                }}
                disabled={
                  isDeleting || deleteConfirmation.trim() !== user.loginName
                }
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting && (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                )}
                Supprimer définitivement
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </AuthenticatedLayout>
  );
};
