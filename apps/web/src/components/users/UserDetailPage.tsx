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
import {
  normalizeUserDetailSection,
  type UserDetailSectionId,
} from '$components/users/user-detail/UserDetailNavigation';
import { UserDetailSectionRail } from '$components/users/user-detail/UserDetailSectionRail';
import { UserHistoryTab } from '$components/users/user-detail/UserHistoryTab';
import {
  type ProfileForm,
  type StaffProfileForm,
  UserProfileTab,
} from '$components/users/user-detail/UserProfileTab';
import { UserResumeTab } from '$components/users/user-detail/UserResumeTab';
import { UserSecurityTab } from '$components/users/user-detail/UserSecurityTab';
import { UserAvatar } from '$components/users/UserAvatar';
import { UsersAdminHero } from '$components/users/UsersAdminHero';
import {
  arePermissionOverridesEqual,
  getAccessLabel,
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
      sectionId: UserDetailSectionId;
    };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;

const EMPTY_STAFF_PROFILE_FORM: StaffProfileForm = {
  department: '',
  discordId: '',
  displayName: '',
  internalNote: '',
  jobTitle: '',
  joinedAt: '',
  phone: '',
  timezone: '',
};

const USER_AUDIT_PAGE_SIZE = 200;
const USER_AUDIT_SUMMARY_PAGE_SIZE = 1;
const DEFAULT_PERMISSION_PAGE_KEY = PERMISSION_CATEGORIES[0]?.key ?? '';

const STAFF_PROFILE_MAX_LENGTHS = {
  department: 80,
  discordId: 20,
  displayName: 80,
  internalNote: 1000,
  jobTitle: 80,
  phone: 32,
  timezone: 64,
} as const;

const formatDateInputValue = (
  date: Date | string | null | undefined,
): string => {
  if (!date) return '';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return '';

  return parsedDate.toISOString().slice(0, 10);
};

const normalizeProfileText = (value: string | null | undefined): string => {
  return value?.trim() ?? '';
};

const nullableProfileText = (value: string): string | null => {
  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : null;
};

const mapStaffProfileToForm = (
  staffProfile: UserType['staffProfile'],
): StaffProfileForm => ({
  department: normalizeProfileText(staffProfile?.department),
  discordId: normalizeProfileText(staffProfile?.discordId),
  displayName: normalizeProfileText(staffProfile?.displayName),
  internalNote: normalizeProfileText(staffProfile?.internalNote),
  jobTitle: normalizeProfileText(staffProfile?.jobTitle),
  joinedAt: formatDateInputValue(staffProfile?.joinedAt),
  phone: normalizeProfileText(staffProfile?.phone),
  timezone: normalizeProfileText(staffProfile?.timezone),
});

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
  const { isLoading: isCurrentUserLoading, userData: currentUser } = useUser();
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<UserDetailSectionId>(() =>
    normalizeUserDetailSection(searchParams.get('section')),
  );
  const [permissionPageKey, setPermissionPageKey] = useState(() =>
    normalizePermissionPageKey(searchParams.get('permissionPage')),
  );
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
    staffProfile: EMPTY_STAFF_PROFILE_FORM,
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
  const [auditStats, setAuditStats] = useState<UserAuditStats | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [securitySessions, setSecuritySessions] = useState<UserSessionInfo[]>(
    [],
  );
  const [isLoadingSecuritySessions, setIsLoadingSecuritySessions] =
    useState(false);
  const [isRevokingSecuritySessions, setIsRevokingSecuritySessions] =
    useState(false);

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
        PERMISSIONS.USERS.UPDATE,
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
    canEditTargetProfile && !isTargetAdminAccessRestricted;
  const canManageTargetPermissions =
    !!user &&
    canEditUserPermissions &&
    !user.isProtected &&
    !isTargetAdminAccessRestricted;
  const canResetTargetPassword =
    !!user &&
    canResetPasswords &&
    !isSelf &&
    (!user.isProtected || isProtectedActor) &&
    !isTargetAdminAccessRestricted;
  const canManageTargetSessions = canResetTargetPassword;
  const canDeleteTargetUser =
    !!user &&
    canDeleteUsers &&
    !user.isProtected &&
    !isSelf &&
    !isTargetAdminAccessRestricted;
  const canEditTargetRole = !!user && isProtectedActor && !user.isProtected;
  const canEditTargetStatus =
    canEditTargetProfile && !isTargetAdminAccessRestricted;
  /* eslint-disable security/detect-object-injection -- Profile keys are typed local StaffProfileForm fields, not user-controlled object paths. */
  const profileErrors = useMemo(() => {
    const buildLengthError = (
      field: keyof typeof STAFF_PROFILE_MAX_LENGTHS,
      label: string,
    ): string | null => {
      return editForm.staffProfile[field].trim().length >
        STAFF_PROFILE_MAX_LENGTHS[field]
        ? `${label} trop long`
        : null;
    };

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
      staffProfile: {
        department: buildLengthError('department', 'Pôle'),
        discordId:
          editForm.staffProfile.discordId.trim() &&
          !/^\d{17,20}$/.test(editForm.staffProfile.discordId.trim())
            ? 'ID Discord invalide'
            : buildLengthError('discordId', 'ID Discord'),
        displayName: buildLengthError('displayName', 'Nom affiché'),
        internalNote: buildLengthError('internalNote', 'Note interne'),
        jobTitle: buildLengthError('jobTitle', 'Poste'),
        joinedAt:
          editForm.staffProfile.joinedAt &&
          Number.isNaN(Date.parse(editForm.staffProfile.joinedAt))
            ? 'Date invalide'
            : null,
        phone: buildLengthError('phone', 'Téléphone'),
        timezone: buildLengthError('timezone', 'Fuseau horaire'),
      },
    };
  }, [editForm]);
  const hasProfileErrors =
    !!profileErrors.email ||
    !!profileErrors.firstName ||
    !!profileErrors.lastName ||
    Object.values(profileErrors.staffProfile).some(Boolean);
  const hasProfileChanges =
    !!user &&
    ((canEditTargetEmail &&
      editForm.email.trim().toLowerCase() !== user.email) ||
      editForm.firstName.trim() !== user.firstName ||
      editForm.lastName.trim() !== user.lastName ||
      (
        Object.keys(EMPTY_STAFF_PROFILE_FORM) as Array<keyof StaffProfileForm>
      ).some((field) => {
        const currentValue = normalizeProfileText(editForm.staffProfile[field]);
        const savedValue = mapStaffProfileToForm(user.staffProfile)[field];

        return currentValue !== savedValue;
      }));
  /* eslint-enable security/detect-object-injection */
  const hasRoleChanges = !!user && editForm.role !== user.role;
  const hasPermissionChanges =
    !!user && !arePermissionOverridesEqual(permissions, user.permissions);
  const hasAccessChanges = hasRoleChanges || hasPermissionChanges;
  const hasSecurityChanges = !!user && editForm.isActive !== user.isActive;
  const hasCurrentSectionChanges =
    (activeSection === 'profile' && hasProfileChanges) ||
    (activeSection === 'access' && hasAccessChanges) ||
    (activeSection === 'security' && hasSecurityChanges);
  const hasUnsavedChanges =
    hasProfileChanges || hasAccessChanges || hasSecurityChanges;
  const canSaveProfile =
    canEditTargetProfile && hasProfileChanges && !hasProfileErrors;
  const canSaveAccess =
    (hasRoleChanges && canEditTargetRole) ||
    (hasPermissionChanges && canManageTargetPermissions);
  const canSaveSecurity = canEditTargetStatus && !isSelf && hasSecurityChanges;
  const dirtySections = useMemo<UserDetailSectionId[]>(() => {
    const sections: UserDetailSectionId[] = [];

    if (hasProfileChanges) sections.push('profile');
    if (hasAccessChanges) sections.push('access');
    if (hasSecurityChanges) sections.push('security');

    return sections;
  }, [hasAccessChanges, hasProfileChanges, hasSecurityChanges]);

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
          staffProfile: mapStaffProfileToForm(user.staffProfile),
        }));

        return;
      }

      if (sectionId === 'access') {
        setEditForm((currentForm) => ({
          ...currentForm,
          role: user.role,
        }));
        setPermissions(user.permissions);

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
            staffProfile: mapStaffProfileToForm(loadedUser.staffProfile),
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

      if (!canViewUsers) {
        setAuditLogs([]);
        setAuditStats(null);
        setIsLoadingAudit(false);
        hasLoadedAuditLogsRef.current = false;
        hasLoadedAuditSummaryRef.current = false;

        return;
      }

      const controller = new AbortController();
      auditAbortControllerRef.current = controller;

      try {
        setIsLoadingAudit(true);
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
            const totalPages = Number(data.data.pagination?.totalPages ?? 1);

            for (let page = 2; page <= totalPages; page += 1) {
              const pageResponse = await fetch(
                `/api/users/${userId}/audit?${buildAuditParams(page).toString()}`,
                {
                  signal: controller.signal,
                },
              );
              const pageData = await pageResponse.json();

              if (controller.signal.aborted) return;
              if (!pageResponse.ok || !pageData.success) break;

              loadedLogs.push(...(pageData.data.logs as AuditLogEntry[]));
            }

            setAuditLogs(loadedLogs);
            hasLoadedAuditLogsRef.current = true;
          }
        }
      } catch {
        if (controller.signal.aborted) return;

        // Audit history is useful, but it should not block the profile page.
      } finally {
        if (auditAbortControllerRef.current !== controller) return;

        auditAbortControllerRef.current = null;
        setIsLoadingAudit(false);
      }
    },
    [canViewUsers, userId],
  );

  const fetchSecuritySessions = useCallback(async (): Promise<void> => {
    sessionsAbortControllerRef.current?.abort();
    sessionsAbortControllerRef.current = null;

    if (!canManageTargetSessions) {
      setSecuritySessions([]);
      setIsLoadingSecuritySessions(false);

      return;
    }

    const controller = new AbortController();
    sessionsAbortControllerRef.current = controller;

    try {
      setIsLoadingSecuritySessions(true);
      const response = await fetch(`/api/users/${userId}/sessions`, {
        signal: controller.signal,
      });
      const data = await response.json();

      if (controller.signal.aborted) return;

      if (response.ok && data.success) {
        setSecuritySessions(data.data.sessions);
      } else {
        setSecuritySessions([]);
      }
    } catch {
      if (controller.signal.aborted) return;

      setSecuritySessions([]);
    } finally {
      if (sessionsAbortControllerRef.current !== controller) return;

      sessionsAbortControllerRef.current = null;
      setIsLoadingSecuritySessions(false);
    }
  }, [canManageTargetSessions, userId]);

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
    setAuditStats(null);
    setIsLoadingAudit(false);
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
    const requestedPermissionPageKey = normalizePermissionPageKey(
      new URLSearchParams(currentQueryString).get('permissionPage'),
    );

    if (requestedPermissionPageKey === permissionPageKey) return;

    setPermissionPageKey(requestedPermissionPageKey);
  }, [currentQueryString, permissionPageKey]);

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
    const requestedSection = normalizeUserDetailSection(
      new URLSearchParams(currentQueryString).get('section'),
    );

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
        sectionId: requestedSection,
      });
      router.replace(
        buildUserDetailSectionHref(pathname, currentQueryString, activeSection),
        { scroll: false },
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
    router,
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
          sectionId,
        });

        return;
      }

      setActiveSection(sectionId);
      router.replace(
        buildUserDetailSectionHref(pathname, currentQueryString, sectionId),
        { scroll: false },
      );
    },
    [
      activeSection,
      currentQueryString,
      hasCurrentSectionChanges,
      pathname,
      requestPendingNavigation,
      router,
    ],
  );

  const handlePermissionPageChange = useCallback(
    (pageKey: string): void => {
      const nextPermissionPageKey = normalizePermissionPageKey(pageKey);
      const nextParams = new URLSearchParams(currentQueryString);

      setPermissionPageKey(nextPermissionPageKey);
      nextParams.set('section', 'access');
      nextParams.set('permissionPage', nextPermissionPageKey);

      router.replace(`${pathname}?${nextParams.toString()}`, {
        scroll: false,
      });
    },
    [currentQueryString, pathname, router],
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
      setActiveSection(navigation.sectionId);
      router.replace(navigation.href, { scroll: false });

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
      staffProfile: mapStaffProfileToForm(updatedUser.staffProfile),
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
      staffProfile: mapStaffProfileToForm(user.staffProfile),
    }));
  };

  const handleCancelAccess = (): void => {
    if (!user) return;

    setEditForm((currentForm) => ({
      ...currentForm,
      role: user.role,
    }));
    setPermissions(user.permissions);
  };

  const handleCancelSecurity = (): void => {
    if (!user) return;

    setEditForm((currentForm) => ({
      ...currentForm,
      isActive: user.isActive,
    }));
  };

  const handleSaveProfile = async (): Promise<void> => {
    if (!canEditTargetProfile) {
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
          ...(canEditTargetEmail ? { email: editForm.email.trim() } : {}),
          firstName: editForm.firstName.trim(),
          lastName: editForm.lastName.trim(),
          staffProfile: {
            department: nullableProfileText(editForm.staffProfile.department),
            discordId: nullableProfileText(editForm.staffProfile.discordId),
            displayName: nullableProfileText(editForm.staffProfile.displayName),
            internalNote: nullableProfileText(
              editForm.staffProfile.internalNote,
            ),
            jobTitle: nullableProfileText(editForm.staffProfile.jobTitle),
            joinedAt: editForm.staffProfile.joinedAt || null,
            phone: nullableProfileText(editForm.staffProfile.phone),
            timezone: nullableProfileText(editForm.staffProfile.timezone),
          },
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
    if (!canEditTargetRole && !canManageTargetPermissions) {
      toast.error('Permission insuffisante pour modifier les accès');

      return;
    }

    if (!hasAccessChanges) {
      toast.info('Aucune modification à enregistrer');

      return;
    }

    const payload: { permissions?: PermissionsData | null; role?: UserRole } =
      {};
    if (canEditTargetRole) payload.role = editForm.role;
    if (canManageTargetPermissions) payload.permissions = permissions;

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
        body: JSON.stringify({ isActive: editForm.isActive }),
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
    if (!canManageTargetSessions) {
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
    : String(auditStats?.totalActions ?? auditLogs.length);

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
              staffProfile: editForm.staffProfile,
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
        return (
          <UserAccessTab
            user={user}
            role={editForm.role}
            setRole={(role) => setEditForm({ ...editForm, role })}
            permissions={permissions}
            setPermissions={setPermissions}
            canEditRole={canEditTargetRole}
            canManagePermissions={canManageTargetPermissions}
            isSaving={isSavingPermissions}
            permissionPageKey={permissionPageKey}
            onPermissionPageChange={handlePermissionPageChange}
            onSave={handleSaveAccess}
            onCancel={handleCancelAccess}
            hasChanges={hasAccessChanges}
            canSave={canSaveAccess}
          />
        );
      case 'security':
        return (
          <UserSecurityTab
            user={user}
            isActive={editForm.isActive}
            setIsActive={(isActive) => setEditForm({ ...editForm, isActive })}
            canEditStatus={canEditTargetStatus}
            canResetPassword={canResetTargetPassword}
            canManageSessions={canManageTargetSessions}
            isSaving={isSaving}
            isLoadingSessions={isLoadingSecuritySessions}
            isRevokingSessions={isRevokingSecuritySessions}
            onSaveStatus={handleSaveSecurity}
            onResetPassword={() => setShowResetConfirm(true)}
            onRevokeSessions={() => setShowRevokeSessionsConfirm(true)}
            tempPassword={tempPassword}
            currentUserId={currentUser?.id}
            canSaveStatus={canSaveSecurity}
            hasStatusChanges={hasSecurityChanges}
            onCancelStatus={handleCancelSecurity}
            canDeleteUser={canDeleteTargetUser}
            onDeleteUser={() => setShowDeleteConfirm(true)}
            sessions={securitySessions}
          />
        );
      case 'history':
        return (
          <UserHistoryTab
            auditLogs={auditLogs}
            isLoading={isLoadingAudit}
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
