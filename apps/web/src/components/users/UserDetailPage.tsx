'use client';

import { UserRole } from '@repo/database';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Clock,
  Loader2,
  type LucideIcon,
  ShieldCheck,
} from 'lucide-react';
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
import { UserAccessTab } from '$components/users/user-detail/UserAccessTab';
import { UserAccountTab } from '$components/users/user-detail/UserAccountTab';
import {
  normalizeUserDetailSection,
  USER_DETAIL_SECTIONS,
  type UserDetailSectionId,
} from '$components/users/user-detail/UserDetailNavigation';
import { UserDetailSectionRail } from '$components/users/user-detail/UserDetailSectionRail';
import { UserHistoryTab } from '$components/users/user-detail/UserHistoryTab';
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
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';
import { apiFetch } from '$utils/api.utils';

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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;

const USER_AUDIT_PAGE_SIZE = 200;
const USER_AUDIT_MAX_PREFETCH_PAGES = 5;
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

const formatCompactDate = (date: Date | string | null): string => {
  if (!date) return 'Jamais';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return 'Jamais';

  return parsedDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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

const UserDetailMetricCard: FC<{
  icon: LucideIcon;
  iconClassName?: string;
  label: string;
  value: string;
}> = ({ icon: Icon, iconClassName, label, value }) => (
  <div className="border-sidebar-border/70 bg-surface flex min-w-0 items-center gap-3 rounded-lg border p-3 shadow-[var(--shadow-panel)]">
    <span
      className={[
        'border-sidebar-ring/35 bg-sidebar-ring/15 text-sidebar-ring flex size-9 shrink-0 items-center justify-center rounded-lg border',
        iconClassName ?? '',
      ].join(' ')}
    >
      <Icon className="size-4" />
    </span>
    <div className="min-w-0">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="truncate text-sm font-medium">{value}</p>
    </div>
  </div>
);

const DetailSkeleton: FC = () => (
  <PageShell className="py-0">
    <PageCanvas contentClassName="relative space-y-4">
      <div className="hidden 2xl:absolute 2xl:top-0 2xl:right-[calc(100%+2.5rem)] 2xl:bottom-0 2xl:block 2xl:w-44">
        <div className="border-sidebar-border/70 bg-surface sticky top-4 rounded-lg border p-1 shadow-[var(--shadow-panel)]">
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
          <div className="bg-primary h-1 w-full" />
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-[4.125rem] rounded-lg" />
          <Skeleton className="h-[4.125rem] rounded-lg" />
          <Skeleton className="h-[4.125rem] rounded-lg" />
          <Skeleton className="h-[4.125rem] rounded-lg" />
        </div>
        <Skeleton className="h-11 w-full rounded-lg lg:hidden" />
        <Skeleton className="min-h-96 w-full rounded-lg" />
      </div>
    </PageCanvas>
  </PageShell>
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
  const { isLoading: isCurrentUserLoading, userData: currentUser } = useUser();
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] =
    useState<UserDetailSectionId>(requestedSection);
  const [pendingNavigation, setPendingNavigation] =
    useState<PendingNavigation | null>(null);
  const [showUnsavedNavigationConfirm, setShowUnsavedNavigationConfirm] =
    useState(false);
  const skipSectionNavigationGuardRef = useRef(false);
  const userAbortControllerRef = useRef<AbortController | null>(null);
  const auditAbortControllerRef = useRef<AbortController | null>(null);
  const sessionsAbortControllerRef = useRef<AbortController | null>(null);
  const hasLoadedAuditLogsRef = useRef(false);
  const hasLoadedAuditSummaryRef = useRef(false);

  const [editForm, setEditForm] = useState({
    email: '',
    firstName: '',
    isActive: true,
    lastName: '',
    role: 'USER' as UserRole,
  });
  const [isSaving, setIsSaving] = useState(false);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [showRevokeSessionsConfirm, setShowRevokeSessionsConfirm] =
    useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditTotalLogs, setAuditTotalLogs] = useState<number | null>(null);
  const [auditStats, setAuditStats] = useState<UserAuditStats | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [securitySessions, setSecuritySessions] = useState<UserSessionInfo[]>(
    [],
  );
  const [isLoadingSecuritySessions, setIsLoadingSecuritySessions] =
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
  const canUpdateUserLogin = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.UPDATE_LOGIN,
        currentUser.permissions,
      )
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
  const isTargetAdminAccessRestricted =
    !!user && user.role === UserRole.ADMIN && !isProtectedActor;
  const canEditTargetProfile =
    !!user && canUpdateUsers && (!user.isProtected || isProtectedActor);
  const canEditTargetEmail =
    !!user &&
    canUpdateUserLogin &&
    (!user.isProtected || isProtectedActor) &&
    !isTargetAdminAccessRestricted;
  const canViewTargetAccess =
    !!user &&
    (canViewUserAccess || canEditUserPermissions || canManageUserRoles);
  const canViewTargetPersonalAccount =
    !!user && (canViewUserAccountPolicy || canManageUserAccountPolicy);
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
    (!user.isProtected || isProtectedActor) &&
    !isTargetAdminAccessRestricted;
  const canViewTargetSessions =
    !!user &&
    canViewUserSessions &&
    !isSelf &&
    (!user.isProtected || isProtectedActor) &&
    !isTargetAdminAccessRestricted;
  const canRevokeTargetSessions =
    !!user &&
    canRevokeUserSessions &&
    !isSelf &&
    (!user.isProtected || isProtectedActor) &&
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
    (!user.isProtected || isProtectedActor) &&
    !isTargetAdminAccessRestricted;
  const canViewTargetActivity = !!user && (isSelf || canViewUserActivity);
  const canFetchUserAudit = currentUser?.id === userId || canViewUserActivity;
  const canViewTargetSecurity =
    canResetTargetPassword ||
    canViewTargetSessions ||
    canRevokeTargetSessions ||
    canEditTargetStatus ||
    canDeleteTargetUser;
  const visibleUserDetailSections = useMemo(
    () =>
      USER_DETAIL_SECTIONS.filter((section) => {
        if (section.id === 'access') return canViewTargetAccess;
        if (section.id === 'account') return canViewTargetPersonalAccount;
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
      email: !editForm.email.trim()
        ? 'Email obligatoire'
        : EMAIL_PATTERN.test(editForm.email.trim())
          ? null
          : 'Email invalide',
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
    };
  }, [editForm]);
  const hasProfileErrors =
    (canEditTargetEmail && !!profileErrors.email) ||
    (canEditTargetProfile &&
      (!!profileErrors.firstName || !!profileErrors.lastName));
  const hasProfileIdentityChanges =
    !!user &&
    (editForm.firstName.trim() !== user.firstName ||
      editForm.lastName.trim() !== user.lastName);
  const hasProfileLoginChanges =
    !!user &&
    canEditTargetEmail &&
    editForm.email.trim().toLowerCase() !== user.email;
  const hasProfileChanges = hasProfileIdentityChanges || hasProfileLoginChanges;
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
      (hasProfileLoginChanges && canEditTargetEmail)) &&
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
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
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
        }

        const response = await fetch(`/api/users/${userId}`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (controller.signal.aborted) return;

        if (response.ok && data.success) {
          const loadedUser = data.data.user as UserType;
          setUser(loadedUser);
          setEditForm({
            email: loadedUser.email,
            firstName: loadedUser.firstName,
            isActive: loadedUser.isActive,
            lastName: loadedUser.lastName,
            role: loadedUser.role,
          });
          setPermissions(loadedUser.permissions);
        } else if (!isBackgroundFetch) {
          setErrorMessage(
            data.error?.message || "Impossible de charger l'utilisateur",
          );
        }
      } catch {
        if (controller.signal.aborted) return;

        if (!isBackgroundFetch) {
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
        setAuditTotalLogs(null);
        setAuditStats(null);
        setAuditError(null);
        setIsLoadingAudit(false);
        hasLoadedAuditLogsRef.current = false;
        hasLoadedAuditSummaryRef.current = false;

        return;
      }

      const controller = new AbortController();
      auditAbortControllerRef.current = controller;

      try {
        setIsLoadingAudit(true);
        setAuditError(null);
        const requestedPageSize = includeLogs
          ? USER_AUDIT_PAGE_SIZE
          : USER_AUDIT_SUMMARY_PAGE_SIZE;
        const buildAuditParams = (page: number): URLSearchParams => {
          const params = new URLSearchParams({
            page: String(page),
            pageSize: String(requestedPageSize),
          });

          if (!includeLogs) {
            params.set('includeLogs', 'false');
          }

          return params;
        };

        const response = await fetch(
          `/api/users/${userId}/audit?${buildAuditParams(1).toString()}`,
          {
            signal: controller.signal,
          },
        );
        const data = await response.json();

        if (controller.signal.aborted) return;

        if (response.ok && data.success) {
          setAuditStats(data.data.stats);
          hasLoadedAuditSummaryRef.current = true;

          if (includeLogs) {
            const loadedLogs = [...(data.data.logs as AuditLogEntry[])];
            const totalLogs = Number(
              data.data.pagination?.total ??
                data.data.stats?.totalActions ??
                loadedLogs.length,
            );
            const safeTotalLogs = Number.isFinite(totalLogs)
              ? totalLogs
              : loadedLogs.length;
            const totalPages = Number(data.data.pagination?.totalPages ?? 1);
            const pagesToFetch = Math.min(
              totalPages,
              USER_AUDIT_MAX_PREFETCH_PAGES,
            );
            let didFailToLoadEveryPage = false;

            for (let page = 2; page <= pagesToFetch; page += 1) {
              const pageResponse = await fetch(
                `/api/users/${userId}/audit?${buildAuditParams(page).toString()}`,
                {
                  signal: controller.signal,
                },
              );
              const pageData = await pageResponse.json();

              if (controller.signal.aborted) return;
              if (!pageResponse.ok || !pageData.success) {
                didFailToLoadEveryPage = true;
                setAuditError(
                  pageData.error?.message ||
                    "Impossible de charger tout l'historique",
                );
                break;
              }

              loadedLogs.push(...(pageData.data.logs as AuditLogEntry[]));
            }

            if (didFailToLoadEveryPage) {
              setAuditLogs((previousLogs) =>
                previousLogs.length > 0 ? previousLogs : loadedLogs,
              );
              setAuditTotalLogs((previousTotal) =>
                previousTotal === null ? safeTotalLogs : previousTotal,
              );
            } else {
              setAuditLogs(loadedLogs);
              setAuditTotalLogs(safeTotalLogs);
            }
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
    [canFetchUserAudit, userId],
  );

  const fetchSecuritySessions = useCallback(async (): Promise<void> => {
    sessionsAbortControllerRef.current?.abort();
    sessionsAbortControllerRef.current = null;

    if (!canViewTargetSessions) {
      setSecuritySessions([]);
      setSecuritySessionsError(null);
      setIsLoadingSecuritySessions(false);

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
    setAuditTotalLogs(null);
    setAuditStats(null);
    setAuditError(null);
    setIsLoadingAudit(false);
    setSecuritySessions([]);
    setSecuritySessionsError(null);
    setRevokingSecuritySessionId(null);
    setTempPassword(null);
  }, [userId]);

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
    if (activeSection === 'security') {
      void fetchSecuritySessions();
    }
  }, [activeSection, fetchSecuritySessions]);

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

  const syncUserState = (updatedUser: UserType): void => {
    setUser(updatedUser);
    setEditForm({
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      isActive: updatedUser.isActive,
      lastName: updatedUser.lastName,
      role: updatedUser.role,
    });
    setPermissions(updatedUser.permissions);
  };

  const handleCancelProfile = (): void => {
    if (!user) return;

    setEditForm((currentForm) => ({
      ...currentForm,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
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

  const handleSaveProfile = async (): Promise<void> => {
    if (!canEditTargetProfile && !canEditTargetEmail) {
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

    setIsSaving(true);
    try {
      const response = await apiFetch(`/api/users/${userId}`, {
        body: JSON.stringify({
          ...(user?.updatedAt
            ? {
                expectedUpdatedAt: new Date(user.updatedAt).toISOString(),
              }
            : {}),
          ...(canEditTargetEmail ? { email: editForm.email.trim() } : {}),
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
        refreshAuditAfterMutation();
        toast.success('Utilisateur mis à jour');
      } else {
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
      } else {
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
        toast.error(data.error?.message || 'Erreur lors de la suppression');
      }
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const trackedActionsLabel = isLoadingAudit
    ? 'Chargement'
    : canFetchUserAudit
      ? String(auditStats?.totalActions ?? auditLogs.length)
      : 'Restreint';

  const renderContent = (): React.ReactNode => {
    if (!user) return null;

    switch (activeSection) {
      case 'resume':
        return <UserResumeTab user={user} auditStats={auditStats} />;
      case 'profile':
        return (
          <UserProfileTab
            form={{
              email: editForm.email,
              firstName: editForm.firstName,
              lastName: editForm.lastName,
            }}
            setForm={(form: ProfileForm) =>
              setEditForm((currentForm) => ({ ...currentForm, ...form }))
            }
            canEdit={canEditTargetProfile}
            canEditEmail={canEditTargetEmail}
            isSaving={isSaving}
            onSave={handleSaveProfile}
            onCancel={handleCancelProfile}
            hasChanges={hasProfileChanges}
            canSave={canSaveProfile}
            errors={profileErrors}
          />
        );
      case 'access':
        if (!canViewTargetAccess) {
          return (
            <AccessDeniedState description="Vous n'avez pas la permission de consulter les accès de cet utilisateur." />
          );
        }

        return (
          <UserAccessTab
            user={user}
            role={editForm.role}
            setRole={(role) => setEditForm({ ...editForm, role })}
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
        );
      case 'account':
        if (!canViewTargetPersonalAccount) {
          return (
            <AccessDeniedState description="Vous n'avez pas la permission de consulter l'autonomie de ce compte." />
          );
        }

        return (
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
        );
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
            canResetPassword={canResetTargetPassword}
            canRevokeSessions={canRevokeTargetSessions}
            canViewSessions={canViewTargetSessions}
            isSaving={isSaving}
            isLoadingSessions={isLoadingSecuritySessions}
            isRevokingSessionId={revokingSecuritySessionId}
            isRevokingSessions={isRevokingSecuritySessions}
            onSaveStatus={handleSaveSecurity}
            onClearTempPassword={() => setTempPassword(null)}
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
            isAuditTruncated={
              auditTotalLogs !== null && auditLogs.length < auditTotalLogs
            }
            isLoading={isLoadingAudit}
            onRetry={() => void fetchAuditData(true)}
            perspective="managed"
            totalAuditLogs={auditTotalLogs ?? auditStats?.totalActions}
            userId={userId}
          />
        );
      default:
        return <UserResumeTab user={user} auditStats={auditStats} />;
    }
  };

  if (isCurrentUserLoading) {
    return (
      <AuthenticatedLayout
        breadcrumbs={[
          { label: 'Administration' },
          { href: '/administration/utilisateurs', label: 'Utilisateurs' },
        ]}
      >
        <DetailSkeleton />
      </AuthenticatedLayout>
    );
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
    return (
      <AuthenticatedLayout
        breadcrumbs={[
          { label: 'Administration' },
          { href: '/administration/utilisateurs', label: 'Utilisateurs' },
        ]}
      >
        <DetailSkeleton />
      </AuthenticatedLayout>
    );
  }

  if (errorMessage || !user) {
    return (
      <AuthenticatedLayout
        breadcrumbs={[
          { label: 'Administration' },
          { href: '/administration/utilisateurs', label: 'Utilisateurs' },
        ]}
      >
        <PageState
          actionHref="/administration/utilisateurs"
          actionLabel="Retour aux utilisateurs"
          description={errorMessage || "Impossible de charger l'utilisateur."}
          title="Utilisateur introuvable"
          tone="destructive"
        />
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
          label: `${user.firstName} ${user.lastName}`,
        },
      ]}
    >
      <PageShell className="py-0">
        <PageCanvas contentClassName="relative space-y-5">
          <UserDetailSectionRail
            activeSection={activeSection}
            className="2xl:absolute 2xl:top-0 2xl:right-[calc(100%+2.5rem)] 2xl:bottom-0 2xl:w-44"
            dirtySections={dirtySections}
            getSectionHref={(sectionId) =>
              buildUserDetailSectionHref(
                pathname,
                currentQueryString,
                sectionId,
              )
            }
            onSectionChange={handleSectionChange}
            sections={visibleUserDetailSections}
          />
          <div className="min-w-0 space-y-3">
            <UsersAdminHero
              title={`${user.firstName} ${user.lastName}`}
              description={user.email}
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
                      className="border-amber-500/40 text-amber-400"
                    >
                      Protégé
                    </Badge>
                  )}
                  {user.isActive ? (
                    <Badge variant="secondary">Actif</Badge>
                  ) : (
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
                      className="border-amber-500/40 text-amber-400"
                    >
                      Mot de passe à changer
                    </Badge>
                  )}
                </>
              }
            />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="border-sidebar-border/70 bg-surface flex items-center gap-3 rounded-lg border p-3 shadow-[var(--shadow-panel)]">
                <span className="border-sidebar-ring/35 bg-sidebar-ring/15 text-sidebar-ring flex size-9 shrink-0 items-center justify-center rounded-lg border">
                  <Clock className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">
                    Dernière connexion
                  </p>
                  <p className="truncate text-sm font-medium">
                    {formatCompactDate(user.lastLoginAt)}
                  </p>
                </div>
              </div>
              <div className="border-sidebar-border/70 bg-surface flex items-center gap-3 rounded-lg border p-3 shadow-[var(--shadow-panel)]">
                <span className="border-sidebar-ring/35 bg-sidebar-ring/15 text-sidebar-ring flex size-9 shrink-0 items-center justify-center rounded-lg border">
                  <Calendar className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">Créé</p>
                  <p className="truncate text-sm font-medium">
                    {formatCompactDate(user.createdAt)}
                  </p>
                </div>
              </div>
              <div className="border-sidebar-border/70 bg-surface flex items-center gap-3 rounded-lg border p-3 shadow-[var(--shadow-panel)]">
                <span className="border-sidebar-ring/35 bg-sidebar-ring/15 text-sidebar-ring flex size-9 shrink-0 items-center justify-center rounded-lg border">
                  <Activity className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">Activité</p>
                  <p className="truncate text-sm font-medium">
                    {trackedActionsLabel}
                  </p>
                </div>
              </div>
              <UserDetailMetricCard
                icon={ShieldCheck}
                label="Accès"
                value={getAccessLabel(user)}
              />
            </div>
            <UserDetailSectionRail
              activeSection={activeSection}
              dirtySections={dirtySections}
              getSectionHref={(sectionId) =>
                buildUserDetailSectionHref(
                  pathname,
                  currentQueryString,
                  sectionId,
                )
              }
              layout="mobile"
              onSectionChange={handleSectionChange}
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
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <AlertTriangle size={16} className="text-amber-400" />
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
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent className="border-border overflow-hidden rounded-lg p-0">
          <div className="p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <AlertTriangle size={16} className="text-amber-400" />
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
                className="bg-amber-500 text-white hover:bg-amber-500/90"
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
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <AlertTriangle size={16} className="text-amber-400" />
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
                className="bg-amber-500 text-white hover:bg-amber-500/90"
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
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
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
                Le compte sera désactivé, masqué des listes actives et toutes
                ses sessions seront invalidées.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel className="border-border">
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
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
