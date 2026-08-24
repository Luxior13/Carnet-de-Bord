'use client';

import { AlertTriangle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ContentState } from '$components/layout/ContentState';
import { UserDetailSectionRail } from '$components/users/user-detail/UserDetailSectionRail';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
import {
  ACCOUNT_SECTIONS,
  AccountHeader,
  AccountPageContentSkeleton,
  type AccountPendingNavigation,
  type AccountSectionId,
  buildAccountSectionHref,
  findAnchorElement,
  isInternalNavigationLink,
  isPlainLeftClick,
  normalizeAccountSection,
} from '$features/account/account-page.helpers';
import type { AuditLogEntry, UserType } from '$types/auth.types';
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
import {
  getGuardedNavigationRequest,
  GUARDED_NAVIGATION_REQUEST_EVENT,
} from '$utils/guarded-navigation.utils';

const ProfileSection = dynamic(() =>
  import('$features/account/components/ProfileSection').then(
    (module) => module.ProfileSection,
  ),
);
const SecuritySection = dynamic(() =>
  import('$features/account/components/SecuritySection').then(
    (module) => module.SecuritySection,
  ),
);
const UserHistoryTab = dynamic(() =>
  import('$components/users/user-detail/UserHistoryTab').then(
    (module) => module.UserHistoryTab,
  ),
);

export const AccountPageContent: FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQueryString = searchParams.toString();
  const requestedSection = normalizeAccountSection(searchParams.get('section'));
  const { applyUserUpdate, refreshUser, userData } = useUser();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditNextCursor, setAuditNextCursor] = useState<string | null>(null);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [isLoadingMoreAudit, setIsLoadingMoreAudit] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [isProfileDirty, setIsProfileDirty] = useState(false);
  const [profileResetKey, setProfileResetKey] = useState(0);
  const [pendingNavigation, setPendingNavigation] =
    useState<AccountPendingNavigation | null>(null);
  const [showUnsavedNavigationConfirm, setShowUnsavedNavigationConfirm] =
    useState(false);
  const auditAbortControllerRef = useRef<AbortController | null>(null);
  const hasLoadedAuditLogsRef = useRef(false);

  const canUseAccountPermission = useCallback(
    (permissionKey: string): boolean => {
      if (!userData) return false;
      if (userData.isProtected) return true;

      return hasPermission(userData.role, permissionKey, userData.permissions);
    },
    [userData],
  );
  const canViewProfile = canUseAccountPermission(
    PERMISSIONS.ACCOUNT.VIEW_PROFILE,
  );
  const canViewSecurity = canUseAccountPermission(
    PERMISSIONS.ACCOUNT.VIEW_SECURITY,
  );
  const canChangePassword =
    !!userData?.mustChangePassword ||
    canUseAccountPermission(PERMISSIONS.ACCOUNT.CHANGE_PASSWORD);
  const canManageSessions = canUseAccountPermission(
    PERMISSIONS.ACCOUNT.MANAGE_SESSIONS,
  );
  const canManageMfa = canUseAccountPermission(PERMISSIONS.ACCOUNT.MANAGE_MFA);
  const canViewActivity = canUseAccountPermission(
    PERMISSIONS.ACCOUNT.VIEW_ACTIVITY,
  );
  const canExportUserActivity = canViewActivity;
  const visibleAccountSections = useMemo(
    () =>
      userData
        ? ACCOUNT_SECTIONS.filter((section) => {
            if (section.id === 'profile') return canViewProfile;
            if (section.id === 'security') {
              return (
                canViewSecurity ||
                canChangePassword ||
                canManageMfa ||
                canManageSessions
              );
            }
            if (section.id === 'activity') return canViewActivity;

            return false;
          })
        : ACCOUNT_SECTIONS,
    [
      canChangePassword,
      canManageMfa,
      canManageSessions,
      canViewActivity,
      canViewProfile,
      canViewSecurity,
      userData,
    ],
  );
  const firstVisibleSection = visibleAccountSections[0]?.id ?? null;
  const resolvedRequestedSection = visibleAccountSections.some(
    (section) => section.id === requestedSection,
  )
    ? requestedSection
    : (firstVisibleSection ?? requestedSection);
  const [activeSection, setActiveSection] = useState<AccountSectionId>(
    resolvedRequestedSection,
  );
  const [visitedSections, setVisitedSections] = useState<
    ReadonlySet<AccountSectionId>
  >(() => new Set([activeSection]));
  const dirtySections = useMemo<readonly AccountSectionId[]>(
    () => (isProfileDirty ? ['profile'] : []),
    [isProfileDirty],
  );
  const requestPendingNavigation = useCallback(
    (navigation: AccountPendingNavigation): void => {
      setPendingNavigation(navigation);
      setShowUnsavedNavigationConfirm(true);
    },
    [],
  );

  const fetchAccountAuditLogs = useCallback(async (): Promise<void> => {
    auditAbortControllerRef.current?.abort();
    auditAbortControllerRef.current = null;

    if (!userData?.id || !canViewActivity) {
      setAuditLogs([]);
      setAuditNextCursor(null);
      setAuditHasMore(false);
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
        includeStats: 'false',
      });

      const response = await fetch(
        `/api/users/${userData.id}/audit?${auditParams.toString()}`,
        { signal: controller.signal },
      );
      const data = await response.json();

      if (controller.signal.aborted) return;

      if (response.ok && data.success) {
        const loadedLogs = data.data.logs as AuditLogEntry[];

        setAuditLogs(loadedLogs);
        setAuditNextCursor(data.data.nextCursor ?? null);
        setAuditHasMore(data.data.hasMore === true);
      } else {
        setAuditError(
          data.error?.message || "Impossible de charger l'activité",
        );
      }

      hasLoadedAuditLogsRef.current = true;
    } catch {
      if (controller.signal.aborted) return;

      setAuditError("Impossible de charger l'activité");
      hasLoadedAuditLogsRef.current = true;
    } finally {
      if (auditAbortControllerRef.current !== controller) return;

      auditAbortControllerRef.current = null;
      setIsLoadingAudit(false);
    }
  }, [canViewActivity, userData?.id]);

  const fetchMoreAccountAuditLogs = useCallback(async (): Promise<void> => {
    if (!userData?.id || !canViewActivity || isLoadingMoreAudit) return;
    if (!auditHasMore || !auditNextCursor) return;

    auditAbortControllerRef.current?.abort();

    const controller = new AbortController();
    const auditParams = new URLSearchParams({
      cursor: auditNextCursor,
      includeFacets: 'false',
      includeStats: 'false',
    });

    auditAbortControllerRef.current = controller;

    try {
      setIsLoadingMoreAudit(true);
      setAuditError(null);

      const response = await fetch(
        `/api/users/${userData.id}/audit?${auditParams.toString()}`,
        { signal: controller.signal },
      );
      const data = await response.json();

      if (controller.signal.aborted) return;

      if (!response.ok || !data.success) {
        setAuditError(
          data.error?.message || "Impossible de charger plus d'activité",
        );

        return;
      }

      const nextLogs = data.data.logs as AuditLogEntry[];

      setAuditLogs((currentLogs) => {
        const knownIds = new Set(currentLogs.map((entry) => entry.id));
        const uniqueNextLogs = nextLogs.filter(
          (entry) => !knownIds.has(entry.id),
        );

        return [...currentLogs, ...uniqueNextLogs];
      });
      setAuditNextCursor(data.data.nextCursor ?? null);
      setAuditHasMore(data.data.hasMore === true);
    } catch {
      if (controller.signal.aborted) return;

      setAuditError("Impossible de charger plus d'activité");
    } finally {
      if (auditAbortControllerRef.current !== controller) return;

      auditAbortControllerRef.current = null;
      setIsLoadingMoreAudit(false);
    }
  }, [
    auditHasMore,
    auditNextCursor,
    canViewActivity,
    isLoadingMoreAudit,
    userData?.id,
  ]);

  useEffect(() => {
    if (!userData) return;
    if (!firstVisibleSection) return;
    if (resolvedRequestedSection === activeSection) {
      if (requestedSection === resolvedRequestedSection) return;

      window.history.replaceState(
        null,
        '',
        buildAccountSectionHref(
          pathname,
          currentQueryString,
          resolvedRequestedSection,
        ),
      );

      return;
    }

    if (isProfileDirty && activeSection === 'profile') {
      requestPendingNavigation({
        href: buildAccountSectionHref(
          pathname,
          currentQueryString,
          resolvedRequestedSection,
        ),
        kind: 'section',
      });
      window.history.replaceState(
        null,
        '',
        buildAccountSectionHref(pathname, currentQueryString, activeSection),
      );

      return;
    }

    setActiveSection(resolvedRequestedSection);
  }, [
    activeSection,
    currentQueryString,
    firstVisibleSection,
    isProfileDirty,
    pathname,
    requestPendingNavigation,
    requestedSection,
    resolvedRequestedSection,
    userData,
  ]);

  useEffect(() => {
    setVisitedSections((currentSections) => {
      if (currentSections.has(activeSection)) return currentSections;

      return new Set([...currentSections, activeSection]);
    });
  }, [activeSection]);

  useEffect(() => {
    auditAbortControllerRef.current?.abort();
    auditAbortControllerRef.current = null;
    hasLoadedAuditLogsRef.current = false;
    setAuditLogs([]);
    setAuditNextCursor(null);
    setAuditHasMore(false);
    setAuditError(null);
    setIsLoadingAudit(false);
    setIsLoadingMoreAudit(false);
    setIsProfileDirty(false);
    setVisitedSections(
      new Set([
        normalizeAccountSection(
          new URLSearchParams(window.location.search).get('section'),
        ),
      ]),
    );
  }, [userData?.id]);

  useEffect(() => {
    return (): void => {
      auditAbortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (activeSection !== 'activity') return;
    if (!canViewActivity) return;
    if (hasLoadedAuditLogsRef.current) return;

    void fetchAccountAuditLogs();
  }, [activeSection, canViewActivity, fetchAccountAuditLogs]);

  useEffect(() => {
    if (!isProfileDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return (): void => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isProfileDirty]);

  useEffect(() => {
    if (!isProfileDirty) return;

    const handleDocumentClick = (event: MouseEvent): void => {
      if (event.defaultPrevented || !isPlainLeftClick(event)) return;

      const anchor = findAnchorElement(event.target);
      if (!anchor || !isInternalNavigationLink(anchor)) return;

      const nextUrl = new URL(anchor.href);
      const currentUrl = new URL(window.location.href);

      if (nextUrl.pathname === currentUrl.pathname) return;

      event.preventDefault();
      requestPendingNavigation({
        href: `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`,
        kind: 'href',
      });
    };

    document.addEventListener('click', handleDocumentClick, true);

    return (): void => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [isProfileDirty, requestPendingNavigation]);

  useEffect(() => {
    if (!isProfileDirty) return;

    const handleGuardedNavigationRequest = (event: Event): void => {
      if (event.defaultPrevented) return;
      const request = getGuardedNavigationRequest(event);
      if (!request) return;

      let nextUrl: URL;
      try {
        nextUrl = new URL(request.href, window.location.origin);
      } catch {
        return;
      }
      if (nextUrl.origin !== window.location.origin) return;

      const currentUrl = new URL(window.location.href);
      const nextHref = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      if (
        nextUrl.pathname === currentUrl.pathname &&
        nextUrl.search === currentUrl.search &&
        nextUrl.hash === currentUrl.hash
      ) {
        return;
      }

      event.preventDefault();
      requestPendingNavigation({
        ...(request.action ? { action: request.action } : {}),
        href: nextHref,
        kind: 'href',
      });
    };

    window.addEventListener(
      GUARDED_NAVIGATION_REQUEST_EVENT,
      handleGuardedNavigationRequest,
    );

    return (): void => {
      window.removeEventListener(
        GUARDED_NAVIGATION_REQUEST_EVENT,
        handleGuardedNavigationRequest,
      );
    };
  }, [isProfileDirty, requestPendingNavigation]);

  const handleSectionChange = useCallback(
    (sectionId: AccountSectionId): void => {
      if (sectionId === activeSection) return;

      const href = buildAccountSectionHref(
        pathname,
        currentQueryString,
        sectionId,
      );

      if (isProfileDirty && activeSection === 'profile') {
        requestPendingNavigation({ href, kind: 'section' });

        return;
      }

      window.history.replaceState(null, '', href);
    },
    [
      activeSection,
      currentQueryString,
      isProfileDirty,
      pathname,
      requestPendingNavigation,
    ],
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
    setIsProfileDirty(false);
    setProfileResetKey((currentKey) => currentKey + 1);

    if (navigation.kind === 'section') {
      window.history.replaceState(null, '', navigation.href);

      return;
    }
    if (navigation.action) {
      void navigation.action();

      return;
    }

    router.push(navigation.href);
  }, [pendingNavigation, router]);

  const handleAccountUpdate = useCallback(
    async (updatedUser?: UserType): Promise<void> => {
      if (updatedUser) {
        applyUserUpdate(updatedUser);
      } else {
        await refreshUser();
      }
      hasLoadedAuditLogsRef.current = false;

      if (activeSection === 'activity' && canViewActivity) {
        void fetchAccountAuditLogs();
      }
    },
    [
      activeSection,
      applyUserUpdate,
      canViewActivity,
      fetchAccountAuditLogs,
      refreshUser,
    ],
  );

  if (!userData) {
    return (
      <div className="relative space-y-5">
        <UserDetailSectionRail
          activeSection={activeSection}
          ariaLabel="Navigation du compte"
          className="2xl:absolute 2xl:top-0 2xl:right-[calc(100%+2.5rem)] 2xl:bottom-0 2xl:w-44"
          dirtySections={[]}
          getSectionHref={(sectionId) =>
            buildAccountSectionHref(pathname, currentQueryString, sectionId)
          }
          heading="Compte"
          onSectionChange={handleSectionChange}
          sections={ACCOUNT_SECTIONS}
        />
        <AccountPageContentSkeleton />
      </div>
    );
  }

  const shouldShowAuditLoading =
    isLoadingAudit ||
    (activeSection === 'activity' && !hasLoadedAuditLogsRef.current);
  const hasMoreAuditLogs = auditHasMore;
  const activeSectionLabel =
    visibleAccountSections.find((section) => section.id === activeSection)
      ?.label ?? 'Compte';

  return (
    <>
      <div className="relative space-y-5">
        <UserDetailSectionRail
          activeSection={activeSection}
          ariaLabel="Navigation du compte"
          className="2xl:absolute 2xl:top-0 2xl:right-[calc(100%+2.5rem)] 2xl:bottom-0 2xl:w-44"
          dirtySections={dirtySections}
          getSectionHref={(sectionId) =>
            buildAccountSectionHref(pathname, currentQueryString, sectionId)
          }
          heading="Compte"
          onSectionChange={handleSectionChange}
          sections={visibleAccountSections}
        />
        <AccountHeader userData={userData} />
        <UserDetailSectionRail
          activeSection={activeSection}
          ariaLabel="Navigation du compte"
          dirtySections={dirtySections}
          getSectionHref={(sectionId) =>
            buildAccountSectionHref(pathname, currentQueryString, sectionId)
          }
          layout="mobile"
          onSectionChange={handleSectionChange}
          sections={visibleAccountSections}
        />
        <p className="sr-only" aria-live="polite">
          Section active : {activeSectionLabel}
        </p>
        <div className="min-w-0">
          {visibleAccountSections.length === 0 && (
            <ContentState
              description="Les droits de compte personnel sont désactivés pour ce compte."
              layout="panel"
              title="Aucun onglet personnel disponible"
            />
          )}
          {canViewProfile && visitedSections.has('profile') && (
            <div hidden={activeSection !== 'profile'}>
              <ProfileSection
                key={`${userData.id}-${profileResetKey}`}
                onDirtyChange={setIsProfileDirty}
                onUpdate={handleAccountUpdate}
                userData={userData}
              />
            </div>
          )}
          {(canViewSecurity ||
            canChangePassword ||
            canManageMfa ||
            canManageSessions) &&
            visitedSections.has('security') && (
              <div hidden={activeSection !== 'security'}>
                <SecuritySection
                  key={userData.id}
                  canChangePassword={canChangePassword}
                  canManageMfa={canManageMfa}
                  canManageSessions={canManageSessions}
                  canViewSecurity={canViewSecurity}
                  onUpdate={handleAccountUpdate}
                  userData={userData}
                />
              </div>
            )}
          {canViewActivity && visitedSections.has('activity') && (
            <div hidden={activeSection !== 'activity'}>
              <UserHistoryTab
                key={userData.id}
                auditLogs={auditLogs}
                canExport={canExportUserActivity}
                error={auditError}
                hasMoreAuditLogs={hasMoreAuditLogs}
                isLoading={shouldShowAuditLoading}
                isLoadingMore={isLoadingMoreAudit}
                onLoadMore={() => void fetchMoreAccountAuditLogs()}
                onRetry={() => void fetchAccountAuditLogs()}
                perspective="personal"
                totalAuditLogs={auditLogs.length}
                userId={userData.id}
              />
            </div>
          )}
        </div>
      </div>
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
                <span className="bg-warning/10 flex size-8 items-center justify-center rounded-lg">
                  <AlertTriangle className="text-warning size-4" />
                </span>
                Quitter sans enregistrer ?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Les modifications du profil seront perdues. Vous pouvez rester
                sur la page pour les enregistrer ou les annuler vous-même.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel onClick={handleCancelPendingNavigation}>
                Rester
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleConfirmPendingNavigation}
              >
                Quitter sans enregistrer
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
