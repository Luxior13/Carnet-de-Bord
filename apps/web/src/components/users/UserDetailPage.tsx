'use client';

import { UserRole } from '@repo/database';
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
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
import { AccessDeniedState, PageState } from '$components/layout/PageState';
import { AdminMfaResetDialog } from '$components/users/user-detail/AdminMfaResetDialog';
import { AdminStepUpDialog } from '$components/users/user-detail/AdminStepUpDialog';
import { UserAccessTab } from '$components/users/user-detail/UserAccessTab';
import { UserAccountTab } from '$components/users/user-detail/UserAccountTab';
import {
  getUserDetailSectionLabel,
  normalizeUserDetailSection,
  USER_DETAIL_SECTIONS,
  type UserDetailSectionId,
} from '$components/users/user-detail/UserDetailNavigation';
import { UserDetailSectionRail } from '$components/users/user-detail/UserDetailSectionRail';
import {
  DEFAULT_USER_HISTORY_FILTERS,
  type UserHistoryFacets,
  type UserHistoryFilters,
  UserHistoryTab,
} from '$components/users/user-detail/UserHistoryTab';
import {
  type ProfileForm,
  UserProfileTab,
} from '$components/users/user-detail/UserProfileTab';
import { UserResumeTab } from '$components/users/user-detail/UserResumeTab';
import { UserSecurityTab } from '$components/users/user-detail/UserSecurityTab';
import { UserAvatar } from '$components/users/UserAvatar';
import { UsersAdminHero } from '$components/users/UsersAdminHero';
import {
  getAccessLabel,
  getAccessPermissionKeys,
  getAccountPermissionKeys,
  getRoleColor,
  hasPermission,
  PERMISSION_CATEGORIES,
  PERMISSIONS,
  type PermissionsData,
} from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
import { ErrorCode } from '$types/api.types';
import type {
  AuditLogEntry,
  UserAuditStats,
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
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Card, CardContent } from '$ui/card';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';
import { apiFetch } from '$utils/api.utils';
import {
  getUserDisplayName,
  getUserLoginDisplay,
  isUserIdentityMasked,
} from '$utils/user-display.utils';

type UserDetailPageProps = {
  userId: string;
};

type PendingNavigation =
  | {
      href: string;
      kind: 'href';
    }
  | {
      href: string;
      kind: 'section';
    };

type PendingStepUpAction = {
  description: string;
  execute: () => Promise<void> | void;
  title: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
const LOGIN_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/;

const USER_AUDIT_PAGE_SIZE = 50;
const USER_AUDIT_SUMMARY_PAGE_SIZE = 1;
const DEFAULT_PERMISSION_PAGE_KEY = PERMISSION_CATEGORIES[0]?.key ?? '';
const ACCESS_PERMISSION_KEYS = getAccessPermissionKeys();
const ACCOUNT_PERMISSION_KEYS = getAccountPermissionKeys();

const havePermissionOverridesChangedForKeys = (
  first: PermissionsData | null | undefined,
  second: PermissionsData | null | undefined,
  permissionKeys: readonly string[],
): boolean => {
  const firstPermissionsMap = new Map(Object.entries(first ?? {}));
  const secondPermissionsMap = new Map(Object.entries(second ?? {}));

  for (const permissionKey of permissionKeys) {
    if (
      firstPermissionsMap.get(permissionKey) !==
      secondPermissionsMap.get(permissionKey)
    ) {
      return true;
    }
  }

  return false;
};

const resetPermissionOverridesForKeys = (
  currentPermissions: PermissionsData | null | undefined,
  originalPermissions: PermissionsData | null | undefined,
  permissionKeys: readonly string[],
): PermissionsData | null => {
  const nextPermissionsMap = new Map(Object.entries(currentPermissions ?? {}));
  const originalPermissionsMap = new Map(
    Object.entries(originalPermissions ?? {}),
  );

  for (const permissionKey of permissionKeys) {
    const originalValue = originalPermissionsMap.get(permissionKey);

    if (typeof originalValue === 'boolean') {
      nextPermissionsMap.set(permissionKey, originalValue);
    } else {
      nextPermissionsMap.delete(permissionKey);
    }
  }

  return nextPermissionsMap.size > 0
    ? (Object.fromEntries(nextPermissionsMap) as PermissionsData)
    : null;
};

const selectPermissionOverridesForKeys = (
  permissions: PermissionsData | null | undefined,
  permissionKeys: readonly string[],
): PermissionsData | null => {
  const permissionKeySet = new Set(permissionKeys);
  const selectedPermissions = Object.fromEntries(
    Object.entries(permissions ?? {}).filter(([permissionKey]) =>
      permissionKeySet.has(permissionKey),
    ),
  ) as PermissionsData;

  return Object.keys(selectedPermissions).length > 0
    ? selectedPermissions
    : null;
};

const buildUserDetailSectionHref = (
  pathname: string,
  currentQueryString: string,
  sectionId: UserDetailSectionId,
): string => {
  const nextParams = new URLSearchParams(currentQueryString);

  if (sectionId === 'resume') {
    nextParams.delete('section');
  } else {
    nextParams.set('section', sectionId);
  }

  const nextQueryString = nextParams.toString();

  return nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
};

const normalizePermissionPageKey = (pageKey: string | null): string => {
  if (!pageKey) return DEFAULT_PERMISSION_PAGE_KEY;

  return PERMISSION_CATEGORIES.some((category) => category.key === pageKey)
    ? pageKey
    : DEFAULT_PERMISSION_PAGE_KEY;
};

const appendUserAuditFilters = (
  params: URLSearchParams,
  filters: UserHistoryFilters,
): void => {
  params.set('scope', filters.activityScope);

  params.set('period', filters.dateFilter);
  if (filters.poleFilter !== 'all') {
    params.set('poleKey', filters.poleFilter);
  }
  if (filters.pageFilter !== 'all') {
    params.set('pageKey', filters.pageFilter);
  }
};

const getUserAuditFiltersFromParams = (params: {
  get: (name: string) => string | null;
}): UserHistoryFilters => {
  const requestedScope = params.get('scope');
  const requestedPeriod = params.get('period');

  return {
    activityScope:
      requestedScope === 'all' ||
      requestedScope === 'by' ||
      requestedScope === 'on'
        ? requestedScope
        : DEFAULT_USER_HISTORY_FILTERS.activityScope,
    dateFilter:
      requestedPeriod === 'all' ||
      requestedPeriod === '7' ||
      requestedPeriod === '30' ||
      requestedPeriod === '90'
        ? requestedPeriod
        : DEFAULT_USER_HISTORY_FILTERS.dateFilter,
    pageFilter:
      params.get('pageKey') || DEFAULT_USER_HISTORY_FILTERS.pageFilter,
    poleFilter:
      params.get('poleKey') || DEFAULT_USER_HISTORY_FILTERS.poleFilter,
  };
};

const getUserAuditFiltersKey = (filters: UserHistoryFilters): string =>
  [
    filters.activityScope,
    filters.dateFilter,
    filters.poleFilter,
    filters.pageFilter,
  ].join('|');

const isPlainLeftClick = (event: MouseEvent): boolean => {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.shiftKey
  );
};

const findAnchorElement = (
  target: EventTarget | null,
): HTMLAnchorElement | null => {
  if (!(target instanceof Element)) return null;

  return target.closest('a[href]');
};

const isInternalNavigationLink = (anchor: HTMLAnchorElement): boolean => {
  const target = anchor.getAttribute('target');
  const href = anchor.getAttribute('href');

  if (!href) return false;
  if (target && target !== '_self') return false;
  if (
    href.startsWith('#') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  ) {
    return false;
  }

  return anchor.origin === window.location.origin;
};

const DetailSkeleton: FC = () => (
  <PageShell className="py-0">
    <PageCanvas contentClassName="relative space-y-4">
      <div className="hidden 2xl:absolute 2xl:top-0 2xl:right-[calc(100%+2.5rem)] 2xl:bottom-0 2xl:block 2xl:w-44">
        <div className="border-border/70 bg-surface sticky top-4 rounded-lg border p-1 shadow-[var(--shadow-panel)]">
          <Skeleton className="mx-2 my-2 h-4 w-14" />
          <div className="space-y-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 rounded-md" />
            ))}
          </div>
        </div>
      </div>
      <div className="min-w-0 space-y-4">
        <Card className="shrink-0 overflow-hidden py-0">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Skeleton className="size-10 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-52 max-w-full" />
                  <Skeleton className="h-4 w-72 max-w-full" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-7 w-32 rounded-md" />
                <Skeleton className="h-7 w-24 rounded-md" />
                <Skeleton className="h-7 w-28 rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Skeleton className="h-11 w-full rounded-lg 2xl:hidden" />
        <Skeleton className="min-h-96 w-full rounded-lg" />
      </div>
    </PageCanvas>
  </PageShell>
);

export const UserDetailPageSkeleton: FC = () => (
  <AuthenticatedLayout
    breadcrumbs={[
      { label: 'Administration' },
      { href: '/administration/utilisateurs', label: 'Utilisateurs' },
    ]}
  >
    <DetailSkeleton />
  </AuthenticatedLayout>
);

export const UserDetailPage: FC<UserDetailPageProps> = ({ userId }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [activeSection, setActiveSection] =
    useState<UserDetailSectionId>(requestedSection);
  const [pendingNavigation, setPendingNavigation] =
    useState<PendingNavigation | null>(null);
  const [showUnsavedNavigationConfirm, setShowUnsavedNavigationConfirm] =
    useState(false);
  const [showLoginChangeConfirm, setShowLoginChangeConfirm] = useState(false);
  const skipSectionNavigationGuardRef = useRef(false);
  const userAbortControllerRef = useRef<AbortController | null>(null);
  const auditAbortControllerRef = useRef<AbortController | null>(null);
  const sessionsAbortControllerRef = useRef<AbortController | null>(null);
  const hasLoadedAuditLogsRef = useRef(false);
  const hasLoadedAuditSummaryRef = useRef(false);

  const [editForm, setEditForm] = useState({
    contactEmail: '',
    firstName: '',
    isActive: true,
    lastName: '',
    loginName: '',
    role: 'USER' as UserRole,
  });
  const [isSaving, setIsSaving] = useState(false);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showResetMfa, setShowResetMfa] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [showRevokeSessionsConfirm, setShowRevokeSessionsConfirm] =
    useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingStepUpAction, setPendingStepUpAction] =
    useState<PendingStepUpAction | null>(null);

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditNextCursor, setAuditNextCursor] = useState<string | null>(null);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [auditStats, setAuditStats] = useState<UserAuditStats | null>(null);
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
  const [isRevokingSecuritySessions, setIsRevokingSecuritySessions] =
    useState(false);
  const [revokingSecuritySessionId, setRevokingSecuritySessionId] = useState<
    string | null
  >(null);

  const [permissions, setPermissions] = useState<PermissionsData | null>(null);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

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
        PERMISSIONS.USERS.MANAGE_STATUS,
        currentUser.permissions,
      )
    : false;
  const canManageUserRoles = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.MANAGE_ROLES,
        currentUser.permissions,
      )
    : false;
  const canViewUserAccess = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.VIEW_ACCESS,
        currentUser.permissions,
      )
    : false;
  const canEditUserPermissions = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.EDIT_PERMISSIONS,
        currentUser.permissions,
      )
    : false;
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
        PERMISSIONS.USERS.MANAGE_ACCOUNT_POLICY,
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
        PERMISSIONS.USERS.EXPORT,
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
  const canDeleteUsers = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.DELETE,
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
    (canViewUserAccess || canEditUserPermissions || canManageUserRoles);
  const canViewTargetPersonalAccount =
    !!user &&
    !isTargetIdentityMasked &&
    (canViewUserAccountPolicy || canManageUserAccountPolicy);
  const canManageTargetAccessPermissions =
    !!user &&
    canEditUserPermissions &&
    !isSelf &&
    !user.isProtected &&
    !isTargetAdminAccessRestricted;
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
  const canDeleteTargetUser =
    !!user &&
    canDeleteUsers &&
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
  const loginReadOnlyHint = isSelf
    ? "Votre propre identifiant ne se modifie pas depuis l'administration."
    : user?.isProtected
      ? "L'identifiant du compte superadmin est protégé."
      : isTargetAdminAccessRestricted
        ? "Seul le superadmin peut modifier l'identifiant d'un administrateur."
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
      canDeleteTargetUser);
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
  const profileErrors = useMemo(() => {
    return {
      contactEmail:
        !editForm.contactEmail.trim() ||
        EMAIL_PATTERN.test(editForm.contactEmail.trim())
          ? null
          : 'Email de contact invalide',
      firstName: !editForm.firstName.trim()
        ? 'Prénom obligatoire'
        : editForm.firstName.trim().length > 50
          ? 'Prénom trop long'
          : null,
      lastName: !editForm.lastName.trim()
        ? 'Nom obligatoire'
        : editForm.lastName.trim().length > 50
          ? 'Nom trop long'
          : null,
      loginName: LOGIN_NAME_PATTERN.test(
        editForm.loginName.trim().toLowerCase(),
      )
        ? null
        : 'Identifiant invalide : 3 à 32 caractères, lettres, chiffres, points, tirets ou underscores',
    };
  }, [editForm]);
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
  const hasAccountChanges = hasAccountPermissionChanges;
  const hasSecurityChanges = !!user && editForm.isActive !== user.isActive;
  const hasCurrentSectionChanges =
    (activeSection === 'profile' && hasProfileChanges) ||
    (activeSection === 'access' && hasAccessChanges) ||
    (activeSection === 'account' && hasAccountChanges) ||
    (activeSection === 'security' && hasSecurityChanges);
  const hasUnsavedChanges =
    hasProfileChanges ||
    hasAccessChanges ||
    hasAccountChanges ||
    hasSecurityChanges;
  const canSaveProfile =
    ((hasProfileIdentityChanges && canEditTargetProfile) ||
      (hasProfileLoginChanges && canEditTargetLogin) ||
      (hasProfileContactChanges && canEditTargetContact)) &&
    !hasProfileErrors;
  const canSaveAccess =
    (hasRoleChanges && canEditTargetRole) ||
    (hasAccessPermissionChanges && canManageTargetAccessPermissions);
  const canSaveAccount =
    hasAccountPermissionChanges && canManageTargetAccountPolicy;
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

  const requestPendingNavigation = useCallback(
    (navigation: PendingNavigation): void => {
      setPendingNavigation(navigation);
      setShowUnsavedNavigationConfirm(true);
    },
    [],
  );

  const discardSectionChanges = useCallback(
    (sectionId: UserDetailSectionId): void => {
      if (!user) return;

      if (sectionId === 'profile') {
        setEditForm((currentForm) => ({
          ...currentForm,
          contactEmail: user.contactEmail ?? '',
          firstName: user.firstName,
          lastName: user.lastName,
          loginName: user.loginName,
        }));

        return;
      }

      if (sectionId === 'access') {
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

        return;
      }

      if (sectionId === 'account') {
        setPermissions((currentPermissions) =>
          resetPermissionOverridesForKeys(
            currentPermissions,
            user.permissions,
            ACCOUNT_PERMISSION_KEYS,
          ),
        );

        return;
      }

      if (sectionId === 'security') {
        setEditForm((currentForm) => ({
          ...currentForm,
          isActive: user.isActive,
        }));
      }
    },
    [user],
  );

  const handleNavigateBackToUsers = useCallback((): void => {
    const usersHref = '/administration/utilisateurs';

    if (hasUnsavedChanges) {
      requestPendingNavigation({ href: usersHref, kind: 'href' });

      return;
    }

    router.push(usersHref);
  }, [hasUnsavedChanges, requestPendingNavigation, router]);

  const fetchUser = useCallback(
    async (options: { background?: boolean } = {}): Promise<void> => {
      userAbortControllerRef.current?.abort();
      userAbortControllerRef.current = null;

      if (!canViewUsers) {
        setIsLoading(false);

        return;
      }

      const controller = new AbortController();
      userAbortControllerRef.current = controller;
      const isBackgroundFetch = options.background === true;

      try {
        if (!isBackgroundFetch) {
          setIsLoading(true);
          setErrorMessage(null);
          setErrorStatus(null);
        }

        const response = await fetch(`/api/users/${userId}`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (controller.signal.aborted) return;

        if (response.ok && data.success) {
          const loadedUser = data.data.user as UserType;
          setErrorStatus(null);
          setUser(loadedUser);
          setEditForm({
            contactEmail: loadedUser.contactEmail ?? '',
            firstName: loadedUser.firstName,
            isActive: loadedUser.isActive,
            lastName: loadedUser.lastName,
            loginName: loadedUser.loginName,
            role: loadedUser.role,
          });
          setPermissions(loadedUser.permissions);
        } else if (!isBackgroundFetch) {
          setErrorStatus(response.status);
          setErrorMessage(
            data.error?.message || "Impossible de charger l'utilisateur",
          );
        }
      } catch {
        if (controller.signal.aborted) return;

        if (!isBackgroundFetch) {
          setErrorStatus(0);
          setErrorMessage("Impossible de charger l'utilisateur");
        }
      } finally {
        if (userAbortControllerRef.current !== controller) return;

        userAbortControllerRef.current = null;
        if (!isBackgroundFetch) {
          setIsLoading(false);
        }
      }
    },
    [canViewUsers, userId],
  );

  const fetchAuditData = useCallback(
    async (includeLogs: boolean): Promise<void> => {
      auditAbortControllerRef.current?.abort();
      auditAbortControllerRef.current = null;

      if (!canFetchUserAudit) {
        setAuditLogs([]);
        setAuditNextCursor(null);
        setAuditHasMore(false);
        setAuditStats(null);
        setAuditFacets(null);
        setAuditError(null);
        setIsLoadingAudit(false);
        setIsLoadingMoreAudit(false);
        hasLoadedAuditLogsRef.current = false;
        hasLoadedAuditSummaryRef.current = false;

        return;
      }

      const controller = new AbortController();
      auditAbortControllerRef.current = controller;

      try {
        setIsLoadingAudit(true);
        setIsLoadingMoreAudit(false);
        setAuditError(null);
        const requestedPageSize = includeLogs
          ? USER_AUDIT_PAGE_SIZE
          : USER_AUDIT_SUMMARY_PAGE_SIZE;
        const auditParams = new URLSearchParams({
          pageSize: String(requestedPageSize),
        });

        if (includeLogs) {
          auditParams.set('includeFacets', 'true');
          auditParams.set(
            'includeStats',
            hasLoadedAuditSummaryRef.current ? 'false' : 'true',
          );
          appendUserAuditFilters(auditParams, auditFilters);
        } else {
          auditParams.set('includeLogs', 'false');
        }

        const response = await fetch(
          `/api/users/${userId}/audit?${auditParams.toString()}`,
          {
            signal: controller.signal,
          },
        );
        const data = await response.json();

        if (controller.signal.aborted) return;

        if (response.ok && data.success) {
          if (data.data.stats) {
            setAuditStats(data.data.stats);
          }
          hasLoadedAuditSummaryRef.current = true;

          if (includeLogs) {
            const loadedLogs = data.data.logs as AuditLogEntry[];

            setAuditLogs(loadedLogs);
            setAuditNextCursor(data.data.nextCursor ?? null);
            setAuditHasMore(data.data.hasMore === true);
            setAuditFacets(data.data.facets ?? null);
            hasLoadedAuditLogsRef.current = true;
          }
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
    },
    [auditFilters, canFetchUserAudit, userId],
  );

  const fetchMoreAuditData = useCallback(async (): Promise<void> => {
    if (!canFetchUserAudit || isLoadingMoreAudit) return;
    if (!auditHasMore || !auditNextCursor) return;

    auditAbortControllerRef.current?.abort();

    const controller = new AbortController();
    const auditParams = new URLSearchParams({
      cursor: auditNextCursor,
      includeFacets: 'false',
      includeStats: 'false',
      pageSize: String(USER_AUDIT_PAGE_SIZE),
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
      const response = await fetch(`/api/users/${userId}/sessions`, {
        signal: controller.signal,
      });
      const data = await response.json();

      if (controller.signal.aborted) return;

      if (response.ok && data.success) {
        setSecuritySessions(data.data.sessions);
      } else {
        setSecuritySessionsError(
          data.error?.message || 'Impossible de charger les sessions',
        );
      }
    } catch {
      if (controller.signal.aborted) return;

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
    hasLoadedAuditSummaryRef.current = false;
    void fetchAuditData(activeSection === 'history');
  }, [activeSection, fetchAuditData]);

  useEffect((): (() => void) => {
    return (): void => {
      userAbortControllerRef.current?.abort();
      auditAbortControllerRef.current?.abort();
      sessionsAbortControllerRef.current?.abort();
      userAbortControllerRef.current = null;
      auditAbortControllerRef.current = null;
      sessionsAbortControllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    hasLoadedAuditLogsRef.current = false;
    hasLoadedAuditSummaryRef.current = false;
    setAuditLogs([]);
    setAuditNextCursor(null);
    setAuditHasMore(false);
    setAuditStats(null);
    setAuditFacets(null);
    setAuditError(null);
    setIsLoadingAudit(false);
    setIsLoadingMoreAudit(false);
    setSecuritySessions([]);
    setSecuritySessionsError(null);
    setHasLoadedSecuritySessions(false);
    setRevokingSecuritySessionId(null);
    setTempPassword(null);
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
    if (activeSection === 'history') {
      if (hasLoadedAuditLogsRef.current) return;

      void fetchAuditData(true);

      return;
    }

    if (!hasLoadedAuditSummaryRef.current) {
      void fetchAuditData(false);
    }
  }, [activeSection, fetchAuditData]);

  useEffect(() => {
    if (activeSection === 'security' && !hasLoadedSecuritySessions) {
      void fetchSecuritySessions();
    }
  }, [activeSection, fetchSecuritySessions, hasLoadedSecuritySessions]);

  useEffect(() => {
    if (activeSection !== 'security') {
      setTempPassword(null);
    }
  }, [activeSection]);

  useEffect(() => {
    if (!tempPassword) return;

    const timeoutId = window.setTimeout(
      () => {
        setTempPassword(null);
      },
      2 * 60 * 1000,
    );

    return (): void => window.clearTimeout(timeoutId);
  }, [tempPassword]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return (): void => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleDocumentClick = (event: MouseEvent): void => {
      if (event.defaultPrevented || !isPlainLeftClick(event)) return;

      const anchor = findAnchorElement(event.target);
      if (!anchor || !isInternalNavigationLink(anchor)) return;

      const nextUrl = new URL(anchor.href);
      const currentUrl = new URL(window.location.href);

      if (nextUrl.pathname === currentUrl.pathname) return;

      event.preventDefault();
      event.stopPropagation();
      requestPendingNavigation({
        href: `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`,
        kind: 'href',
      });
    };

    document.addEventListener('click', handleDocumentClick, true);

    return (): void => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [hasUnsavedChanges, requestPendingNavigation]);

  useEffect(() => {
    if (requestedSection === activeSection) return;

    if (skipSectionNavigationGuardRef.current) {
      skipSectionNavigationGuardRef.current = false;
      setActiveSection(requestedSection);

      return;
    }

    if (hasCurrentSectionChanges) {
      requestPendingNavigation({
        href: buildUserDetailSectionHref(
          pathname,
          currentQueryString,
          requestedSection,
        ),
        kind: 'section',
      });
      window.history.replaceState(
        null,
        '',
        buildUserDetailSectionHref(pathname, currentQueryString, activeSection),
      );

      return;
    }

    setActiveSection(requestedSection);
  }, [
    activeSection,
    currentQueryString,
    hasCurrentSectionChanges,
    pathname,
    requestPendingNavigation,
    requestedSection,
  ]);

  const handleSectionChange = useCallback(
    (sectionId: UserDetailSectionId): void => {
      if (sectionId === activeSection) return;

      if (hasCurrentSectionChanges) {
        requestPendingNavigation({
          href: buildUserDetailSectionHref(
            pathname,
            currentQueryString,
            sectionId,
          ),
          kind: 'section',
        });

        return;
      }

      window.history.replaceState(
        null,
        '',
        buildUserDetailSectionHref(pathname, currentQueryString, sectionId),
      );
    },
    [
      activeSection,
      currentQueryString,
      hasCurrentSectionChanges,
      pathname,
      requestPendingNavigation,
    ],
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

  const handleCancelPendingNavigation = useCallback((): void => {
    setShowUnsavedNavigationConfirm(false);
    setPendingNavigation(null);
  }, []);

  const handleConfirmPendingNavigation = useCallback((): void => {
    if (!pendingNavigation) return;

    const navigation = pendingNavigation;

    setShowUnsavedNavigationConfirm(false);
    setPendingNavigation(null);

    if (navigation.kind === 'section') {
      discardSectionChanges(activeSection);
      skipSectionNavigationGuardRef.current = true;
      window.history.replaceState(null, '', navigation.href);

      return;
    }

    router.push(navigation.href);
  }, [activeSection, discardSectionChanges, pendingNavigation, router]);

  const requestStepUpForResponse = (
    data: unknown,
    action: PendingStepUpAction,
  ): boolean => {
    const errorCode = (data as { error?: { code?: string } } | null | undefined)
      ?.error?.code;

    if (errorCode !== ErrorCode.REAUTHENTICATION_REQUIRED) return false;

    setPendingStepUpAction(action);

    return true;
  };

  const handleStepUpComplete = async (): Promise<void> => {
    const action = pendingStepUpAction;

    setPendingStepUpAction(null);
    if (action) await action.execute();
  };

  const syncUserState = (updatedUser: UserType): void => {
    setUser(updatedUser);
    setEditForm({
      contactEmail: updatedUser.contactEmail ?? '',
      firstName: updatedUser.firstName,
      isActive: updatedUser.isActive,
      lastName: updatedUser.lastName,
      loginName: updatedUser.loginName,
      role: updatedUser.role,
    });
    setPermissions(updatedUser.permissions);
  };

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
    if (!canEditTargetProfile && !canEditTargetContact && !canEditTargetLogin) {
      toast.error('Permission insuffisante pour modifier cet utilisateur');

      return;
    }

    if (hasProfileErrors) {
      toast.error('Corrigez les champs du profil avant de sauvegarder');

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

    setIsSaving(true);
    try {
      const response = await apiFetch(`/api/users/${userId}`, {
        body: JSON.stringify({
          ...(user?.updatedAt
            ? {
                expectedUpdatedAt: new Date(user.updatedAt).toISOString(),
              }
            : {}),
          ...(canEditTargetContact
            ? {
                contactEmail:
                  editForm.contactEmail.trim().toLowerCase() || null,
              }
            : {}),
          ...(canEditTargetLogin
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
      });
      const data = await response.json();

      if (response.ok && data.success) {
        syncUserState(data.data.user);
        if (currentUser && data.data.user.id === currentUser.id) {
          // The administrative response is shaped for the actor and may hide
          // permission overrides. Update only the self-profile fields here so
          // the shared authenticated context remains complete and
          // /mon-compte changes immediately without a loading transition.
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
        toast.error(data.error?.message || 'Erreur lors de la mise à jour');
      }
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAccess = async (): Promise<void> => {
    if (!canEditTargetRole && !canManageTargetAccessPermissions) {
      toast.error('Permission insuffisante pour modifier les accès');

      return;
    }

    if (!hasAccessChanges) {
      toast.info('Aucune modification à enregistrer');

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

    setIsSavingPermissions(true);
    try {
      const response = await apiFetch(`/api/users/${userId}`, {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const data = await response.json();

      if (response.ok && data.success) {
        syncUserState(data.data.user);
        refreshAuditAfterMutation();
        toast.success('Accès mis à jour');
      } else {
        if (
          requestStepUpForResponse(data, {
            description:
              'Ce changement peut modifier le rôle ou les permissions sensibles du membre et fermer ses sessions.',
            execute: handleSaveAccess,
            title: 'Confirmer la modification des accès',
          })
        ) {
          return;
        }
        toast.error(data.error?.message || 'Erreur lors de la mise à jour');
      }
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const handleSaveAccount = async (): Promise<void> => {
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

    setIsSavingPermissions(true);
    try {
      const response = await apiFetch(`/api/users/${userId}`, {
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
      });
      const data = await response.json();

      if (response.ok && data.success) {
        syncUserState(data.data.user);
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
        toast.error(data.error?.message || 'Erreur lors de la mise à jour');
      }
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const handleSaveSecurity = async (): Promise<void> => {
    if (!canEditTargetStatus || isSelf) {
      toast.error('Permission insuffisante pour modifier cet état');

      return;
    }

    if (!hasSecurityChanges) {
      toast.info('Aucune modification à enregistrer');

      return;
    }

    setIsSaving(true);
    try {
      const response = await apiFetch(`/api/users/${userId}`, {
        body: JSON.stringify({
          ...(user?.updatedAt
            ? {
                expectedUpdatedAt: new Date(user.updatedAt).toISOString(),
              }
            : {}),
          isActive: editForm.isActive,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const data = await response.json();

      if (response.ok && data.success) {
        syncUserState(data.data.user);
        refreshAuditAfterMutation();
        void fetchSecuritySessions();
        toast.success('Sécurité mise à jour');
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
        toast.error(data.error?.message || 'Erreur lors de la mise à jour');
      }
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async (): Promise<void> => {
    if (!canResetTargetPassword) {
      toast.error('Permission insuffisante pour réinitialiser ce mot de passe');
      setShowResetConfirm(false);

      return;
    }

    setIsResetting(true);
    try {
      const response = await apiFetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setTempPassword(data.data.temporaryPassword);
        handleSectionChange('security');
        toast.success('Mot de passe réinitialisé');
        void fetchUser({ background: true });
        refreshAuditAfterMutation();
        void fetchSecuritySessions();
      } else {
        if (
          requestStepUpForResponse(data, {
            description:
              'Un nouveau secret temporaire sera créé et toutes les sessions du membre seront fermées.',
            execute: handleResetPassword,
            title: 'Confirmer la réinitialisation du mot de passe',
          })
        ) {
          return;
        }
        toast.error(
          data.error?.message || 'Erreur lors de la réinitialisation',
        );
      }
    } catch {
      toast.error('Erreur lors de la réinitialisation');
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  const handleResetMfaComplete = (updatedUser: UserType): void => {
    syncUserState(updatedUser);
    setShowResetMfa(false);
    refreshAuditAfterMutation();
    void fetchSecuritySessions();
    toast.success('Double authentification réinitialisée');
  };

  const handleRevokeSecuritySessions = async (): Promise<void> => {
    if (!canRevokeTargetSessions) {
      toast.error('Permission insuffisante pour révoquer les sessions');

      return;
    }

    setIsRevokingSecuritySessions(true);
    try {
      const response = await apiFetch(`/api/users/${userId}/sessions`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Sessions révoquées');
        refreshAuditAfterMutation();
        void fetchSecuritySessions();
        void fetchUser({ background: true });
      } else {
        if (
          requestStepUpForResponse(data, {
            description:
              'Toutes les sessions actives du membre seront immédiatement fermées.',
            execute: handleRevokeSecuritySessions,
            title: 'Confirmer la révocation des sessions',
          })
        ) {
          return;
        }
        toast.error(data.error?.message || 'Erreur lors de la révocation');
      }
    } catch {
      toast.error('Erreur lors de la révocation');
    } finally {
      setIsRevokingSecuritySessions(false);
      setShowRevokeSessionsConfirm(false);
    }
  };

  const handleRevokeSecuritySession = async (
    sessionId: string,
  ): Promise<void> => {
    if (!canRevokeTargetSessions) {
      toast.error('Permission insuffisante pour révoquer les sessions');

      return;
    }

    setRevokingSecuritySessionId(sessionId);
    try {
      const response = await apiFetch(
        `/api/users/${userId}/sessions?id=${encodeURIComponent(sessionId)}`,
        {
          method: 'DELETE',
        },
      );
      const data = await response.json();

      if (response.ok && data.success) {
        setSecuritySessions((currentSessions) =>
          currentSessions.filter((session) => session.id !== sessionId),
        );
        toast.success('Session révoquée');
        refreshAuditAfterMutation();
        void fetchSecuritySessions();
      } else {
        if (
          requestStepUpForResponse(data, {
            description: 'Cette session du membre sera immédiatement fermée.',
            execute: () => handleRevokeSecuritySession(sessionId),
            title: 'Confirmer la révocation de la session',
          })
        ) {
          return;
        }
        toast.error(data.error?.message || 'Erreur lors de la révocation');
      }
    } catch {
      toast.error('Erreur lors de la révocation');
    } finally {
      setRevokingSecuritySessionId(null);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!canDeleteTargetUser) {
      toast.error('Permission insuffisante pour supprimer cet utilisateur');
      setShowDeleteConfirm(false);

      return;
    }

    setIsDeleting(true);
    try {
      const response = await apiFetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Utilisateur supprimé');
        router.push('/administration/utilisateurs');
      } else {
        if (
          requestStepUpForResponse(data, {
            description:
              'Le compte sera désactivé, retiré des listes actives et toutes ses sessions seront fermées.',
            execute: handleDelete,
            title: 'Confirmer la suppression du compte',
          })
        ) {
          return;
        }
        toast.error(data.error?.message || 'Erreur lors de la suppression');
      }
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
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
            className="border-border/70 bg-surface-muted/75 inline-flex min-h-11 w-full items-center gap-1 rounded-lg border p-1 sm:w-auto"
            role="group"
          >
            <Button
              aria-pressed={selectedView === 'access'}
              className="min-h-9 flex-1 sm:flex-none"
              onClick={() => handleSectionChange('access')}
              size="sm"
              type="button"
              variant={selectedView === 'access' ? 'secondary' : 'ghost'}
            >
              Accès au site
              {hasAccessChanges && (
                <span
                  aria-label="Modifications non enregistrées"
                  className="bg-warning size-1.5 rounded-full"
                />
              )}
            </Button>
            <Button
              aria-pressed={selectedView === 'account'}
              className="min-h-9 flex-1 sm:flex-none"
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
            canEditRole={canEditTargetRole}
            canManagePermissions={canManageTargetAccessPermissions}
            isSaving={isSavingPermissions}
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
            isSaving={isSavingPermissions}
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
      case 'resume':
        return (
          <UserResumeTab
            auditStats={auditStats}
            canViewActivity={canFetchUserAudit}
            canViewContact={canViewTargetContact}
            user={user}
          />
        );
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
            isSaving={isSaving}
            onSave={handleSaveProfile}
            onCancel={handleCancelProfile}
            hasChanges={hasProfileChanges}
            canSave={canSaveProfile}
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
          <UserSecurityTab
            user={user}
            isActive={editForm.isActive}
            setIsActive={(isActive) => setEditForm({ ...editForm, isActive })}
            canEditStatus={canEditTargetStatus}
            canResetMfa={canResetTargetMfa}
            canResetPassword={canResetTargetPassword}
            canRevokeSessions={canRevokeTargetSessions}
            canViewSessions={canViewTargetSessions}
            isSaving={isSaving}
            isLoadingSessions={
              isLoadingSecuritySessions ||
              (canViewTargetSessions && !hasLoadedSecuritySessions)
            }
            isRevokingSessionId={revokingSecuritySessionId}
            isRevokingSessions={isRevokingSecuritySessions}
            onSaveStatus={handleSaveSecurity}
            onClearTempPassword={() => setTempPassword(null)}
            onResetMfa={() => setShowResetMfa(true)}
            onResetPassword={() => setShowResetConfirm(true)}
            onRevokeSession={handleRevokeSecuritySession}
            onRevokeSessions={() => setShowRevokeSessionsConfirm(true)}
            onRetrySessions={() => void fetchSecuritySessions()}
            tempPassword={tempPassword}
            currentUserId={currentUser?.id}
            canSaveStatus={canSaveSecurity}
            hasStatusChanges={hasSecurityChanges}
            onCancelStatus={handleCancelSecurity}
            canDeleteUser={canDeleteTargetUser}
            onDeleteUser={() => setShowDeleteConfirm(true)}
            sessions={securitySessions}
            sessionsError={securitySessionsError}
          />
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
            onRetry={() => void fetchAuditData(true)}
            perspective={isSelf ? 'personal' : 'managed'}
            totalAuditLogs={auditLogs.length}
            userId={userId}
          />
        );
      default:
        return (
          <UserResumeTab
            auditStats={auditStats}
            canViewActivity={canFetchUserAudit}
            canViewContact={canViewTargetContact}
            user={user}
          />
        );
    }
  };

  if (isCurrentUserLoading && !currentUser) {
    return <UserDetailPageSkeleton />;
  }

  if (!canViewUsers) {
    return (
      <AuthenticatedLayout
        breadcrumbs={[
          { label: 'Administration' },
          { href: '/administration/utilisateurs', label: 'Utilisateurs' },
        ]}
      >
        <AccessDeniedState
          actionHref="/administration/utilisateurs"
          actionLabel="Retour aux utilisateurs"
          description="Vous n'avez pas la permission de consulter cet utilisateur."
        />
      </AuthenticatedLayout>
    );
  }

  if (isLoading) {
    return <UserDetailPageSkeleton />;
  }

  if (errorMessage || !user) {
    const isNotFound = errorStatus === 404;

    return (
      <AuthenticatedLayout
        breadcrumbs={[
          { label: 'Administration' },
          { href: '/administration/utilisateurs', label: 'Utilisateurs' },
        ]}
      >
        {errorStatus === 403 ? (
          <AccessDeniedState
            actionHref="/administration/utilisateurs"
            actionLabel="Retour aux utilisateurs"
            description="Vous n'avez pas la permission de consulter cet utilisateur."
          />
        ) : (
          <PageState
            actionHref={isNotFound ? '/administration/utilisateurs' : undefined}
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
            secondaryActionHref={
              isNotFound ? undefined : '/administration/utilisateurs'
            }
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
        { label: 'Administration' },
        { href: '/administration/utilisateurs', label: 'Utilisateurs' },
        {
          href: `/administration/utilisateurs/${user.id}`,
          label: getUserDisplayName(user),
        },
      ]}
    >
      <PageShell className="py-0">
        <PageCanvas contentClassName="relative space-y-5">
          <UserDetailSectionRail
            activeSection={activeRailSection}
            className="2xl:absolute 2xl:top-0 2xl:right-[calc(100%+2.5rem)] 2xl:bottom-0 2xl:w-44"
            dirtySections={railDirtySections}
            getSectionHref={(sectionId) =>
              buildUserDetailSectionHref(
                pathname,
                currentQueryString,
                resolveRailSection(sectionId),
              )
            }
            onSectionChange={(sectionId) => {
              if (sectionId === 'access' && activeRailSection === 'access') {
                return;
              }

              handleSectionChange(resolveRailSection(sectionId));
            }}
            sections={visibleUserDetailSections}
          />
          <div className="min-w-0 space-y-3">
            <UsersAdminHero
              title={getUserDisplayName(user)}
              description={`Identifiant : ${getUserLoginDisplay(user)}`}
              actions={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleNavigateBackToUsers}
                >
                  <ArrowLeft className="size-4" />
                  Retour
                </Button>
              }
              icon={<UserAvatar user={user} className="size-full rounded-lg" />}
              iconClassName="overflow-hidden p-0"
              meta={
                <>
                  <Badge variant={getRoleColor(user.role)}>
                    {getAccessLabel(user)}
                  </Badge>
                  {user.isProtected && (
                    <Badge
                      variant="outline"
                      className="border-warning/40 text-warning"
                    >
                      Compte racine
                    </Badge>
                  )}
                  {!user.isActive && (
                    <Badge
                      variant="outline"
                      className="border-muted-foreground/35 bg-muted/30 text-muted-foreground"
                    >
                      Inactif
                    </Badge>
                  )}
                  {user.mustChangePassword && (
                    <Badge
                      variant="outline"
                      className="border-warning/40 text-warning"
                    >
                      Mot de passe à changer
                    </Badge>
                  )}
                </>
              }
            />
            {isTargetIdentityMasked && (
              <div className="border-warning/30 bg-warning/10 text-foreground flex gap-3 rounded-lg border p-3 sm:p-4">
                <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Compte système protégé</p>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    Ce compte reste visible pour la cohérence administrative,
                    mais son identité technique, ses accès, sa sécurité et son
                    activité sont réservés à son propriétaire.
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
                    compte pour modifier vos informations personnelles et votre
                    sécurité.
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
            <UserDetailSectionRail
              activeSection={activeRailSection}
              dirtySections={railDirtySections}
              getSectionHref={(sectionId) =>
                buildUserDetailSectionHref(
                  pathname,
                  currentQueryString,
                  resolveRailSection(sectionId),
                )
              }
              layout="mobile"
              onSectionChange={(sectionId) => {
                if (sectionId === 'access' && activeRailSection === 'access') {
                  return;
                }

                handleSectionChange(resolveRailSection(sectionId));
              }}
              sections={visibleUserDetailSections}
            />
            <div className="min-w-0">{renderContent()}</div>
          </div>
        </PageCanvas>
      </PageShell>
      <AlertDialog
        open={showUnsavedNavigationConfirm}
        onOpenChange={(open) => {
          if (open) {
            setShowUnsavedNavigationConfirm(true);

            return;
          }

          handleCancelPendingNavigation();
        }}
      >
        <AlertDialogContent className="border-border overflow-hidden rounded-lg p-0">
          <div className="p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <div className="bg-warning/10 flex h-8 w-8 items-center justify-center rounded-lg">
                  <AlertTriangle size={16} className="text-warning" />
                </div>
                Quitter sans enregistrer ?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Les modifications de cette section seront perdues. Vous pouvez
                rester sur la page pour les enregistrer ou les annuler
                manuellement.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel
                className="border-border"
                onClick={handleCancelPendingNavigation}
              >
                Rester
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmPendingNavigation}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Quitter sans enregistrer
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={showLoginChangeConfirm}
        onOpenChange={setShowLoginChangeConfirm}
      >
        <AlertDialogContent className="border-border overflow-hidden rounded-lg p-0">
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
        onCancel={() => setPendingStepUpAction(null)}
        onComplete={handleStepUpComplete}
        open={pendingStepUpAction !== null}
        title={pendingStepUpAction?.title ?? 'Confirmer votre identité'}
      />
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent className="border-border overflow-hidden rounded-lg p-0">
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
        onOpenChange={setShowRevokeSessionsConfirm}
      >
        <AlertDialogContent className="border-border overflow-hidden rounded-lg p-0">
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
              <AlertDialogCancel className="border-border">
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRevokeSecuritySessions}
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
          setShowDeleteConfirm(open);
          if (!open) setDeleteConfirmation('');
        }}
      >
        <AlertDialogContent className="border-border overflow-hidden rounded-lg p-0">
          <div className="p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <div className="bg-destructive/10 flex h-8 w-8 items-center justify-center rounded-lg">
                  <AlertTriangle size={16} className="text-destructive" />
                </div>
                Supprimer cet utilisateur ?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Le compte de{' '}
                <strong>
                  {user.firstName} {user.lastName}
                </strong>{' '}
                sera désactivé, masqué des listes actives et toutes ses sessions
                seront invalidées.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="mt-4 space-y-2">
              <Label htmlFor="delete-user-confirmation">
                Saisissez <strong>{user.loginName}</strong> pour confirmer
              </Label>
              <Input
                autoComplete="off"
                id="delete-user-confirmation"
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                placeholder={user.loginName}
                value={deleteConfirmation}
              />
            </div>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel className="border-border">
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={
                  isDeleting || deleteConfirmation.trim() !== user.loginName
                }
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting && (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                )}
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </AuthenticatedLayout>
  );
};
