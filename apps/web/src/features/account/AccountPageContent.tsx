'use client';

import { Activity, AlertTriangle, ShieldCheck, User } from 'lucide-react';
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
import { PageHero } from '$components/layout/PageHero';
import type { UserDetailSection } from '$components/users/user-detail/UserDetailNavigation';
import { UserDetailSectionRail } from '$components/users/user-detail/UserDetailSectionRail';
import { UserHistoryTab } from '$components/users/user-detail/UserHistoryTab';
import { UserAvatar } from '$components/users/UserAvatar';
import {
  getAccessLabel,
  hasPermission,
  PERMISSIONS,
} from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
import { ProfileSection } from '$features/account/components/ProfileSection';
import { SecuritySection } from '$features/account/components/SecuritySection';
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
import { Badge } from '$ui/badge';
import { Skeleton } from '$ui/skeleton';

type AccountSectionId = 'activity' | 'profile' | 'security';

const ACCOUNT_AUDIT_PAGE_SIZE = 50;

type PendingNavigation =
  | {
      href: string;
      kind: 'href';
    }
  | {
      href: string;
      kind: 'section';
    };

const ACCOUNT_SECTIONS: Array<UserDetailSection<AccountSectionId>> = [
  {
    icon: <User className="h-4 w-4" />,
    id: 'profile',
    label: 'Profil',
  },
  {
    icon: <ShieldCheck className="h-4 w-4" />,
    id: 'security',
    label: 'Sécurité',
  },
  {
    icon: <Activity className="h-4 w-4" />,
    id: 'activity',
    label: 'Activité',
  },
];

const normalizeAccountSection = (value: string | null): AccountSectionId => {
  if (value === 'security') return 'security';
  if (value === 'activity' || value === 'history') return 'activity';

  return 'profile';
};

const buildAccountSectionHref = (
  pathname: string,
  currentQueryString: string,
  sectionId: AccountSectionId,
): string => {
  const nextParams = new URLSearchParams(currentQueryString);

  if (sectionId === 'profile') {
    nextParams.delete('section');
  } else {
    nextParams.set('section', sectionId);
  }

  const nextQueryString = nextParams.toString();

  return nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
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

const getAccountDisplayName = (userData: UserType): string => {
  return (
    `${userData.firstName} ${userData.lastName}`.trim() || userData.loginName
  );
};

type AccountHeaderProps = {
  userData: UserType;
};

const AccountHeader: FC<AccountHeaderProps> = ({ userData }) => (
  <PageHero
    title={getAccountDisplayName(userData)}
    description={`Identifiant de connexion : ${userData.loginName}`}
    eyebrow={
      <span className="text-muted-foreground text-xs font-medium">
        Mon compte
      </span>
    }
    meta={
      <>
        <Badge variant="secondary">{getAccessLabel(userData)}</Badge>
        {userData.isProtected && <Badge variant="warning">Compte racine</Badge>}
      </>
    }
    icon={<UserAvatar user={userData} className="size-full rounded-md" />}
    iconClassName="overflow-hidden p-0"
    tone="dashboard"
  />
);

const AccountPageContentSkeleton: FC = () => (
  <div className="space-y-5" role="status" aria-label="Chargement">
    <Skeleton className="h-28 rounded-md" />
    <Skeleton className="h-12 rounded-md 2xl:hidden" />
    <Skeleton className="h-[32rem] rounded-md" />
  </div>
);

export const AccountPageContent: FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQueryString = searchParams.toString();
  const requestedSection = normalizeAccountSection(searchParams.get('section'));
  const { applyUserUpdate, refreshUser, userData } = useUser();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditTotalLogs, setAuditTotalLogs] = useState<number | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [isLoadingMoreAudit, setIsLoadingMoreAudit] = useState(false);
  const [auditLoadedPage, setAuditLoadedPage] = useState(0);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [isProfileDirty, setIsProfileDirty] = useState(false);
  const [profileResetKey, setProfileResetKey] = useState(0);
  const [pendingNavigation, setPendingNavigation] =
    useState<PendingNavigation | null>(null);
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
    (navigation: PendingNavigation): void => {
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
      setAuditTotalLogs(null);
      setAuditLoadedPage(0);
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
        page: '1',
        pageSize: String(ACCOUNT_AUDIT_PAGE_SIZE),
      });

      const response = await fetch(
        `/api/users/${userData.id}/audit?${auditParams.toString()}`,
        { signal: controller.signal },
      );
      const data = await response.json();

      if (controller.signal.aborted) return;

      if (response.ok && data.success) {
        const loadedLogs = data.data.logs as AuditLogEntry[];
        const totalLogs = Number(
          data.data.pagination?.total ?? loadedLogs.length,
        );
        const safeTotalLogs = Number.isFinite(totalLogs)
          ? totalLogs
          : loadedLogs.length;

        setAuditLogs(loadedLogs);
        setAuditTotalLogs(safeTotalLogs);
        setAuditLoadedPage(1);
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
    if (auditLoadedPage < 1) return;
    if (auditTotalLogs !== null && auditLogs.length >= auditTotalLogs) return;

    auditAbortControllerRef.current?.abort();

    const controller = new AbortController();
    const nextPage = auditLoadedPage + 1;
    const auditParams = new URLSearchParams({
      page: String(nextPage),
      pageSize: String(ACCOUNT_AUDIT_PAGE_SIZE),
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
      const totalLogs = Number(
        data.data.pagination?.total ?? auditTotalLogs ?? auditLogs.length,
      );

      setAuditLogs((currentLogs) => {
        const knownIds = new Set(currentLogs.map((entry) => entry.id));
        const uniqueNextLogs = nextLogs.filter(
          (entry) => !knownIds.has(entry.id),
        );

        return [...currentLogs, ...uniqueNextLogs];
      });
      setAuditTotalLogs(
        Number.isFinite(totalLogs) ? totalLogs : (auditTotalLogs ?? null),
      );
      setAuditLoadedPage(nextPage);
    } catch {
      if (controller.signal.aborted) return;

      setAuditError("Impossible de charger plus d'activité");
    } finally {
      if (auditAbortControllerRef.current !== controller) return;

      auditAbortControllerRef.current = null;
      setIsLoadingMoreAudit(false);
    }
  }, [
    auditLoadedPage,
    auditLogs.length,
    auditTotalLogs,
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
    setAuditTotalLogs(null);
    setAuditLoadedPage(0);
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
  const hasMoreAuditLogs =
    auditTotalLogs !== null && auditLogs.length < auditTotalLogs;
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
                isAuditTruncated={hasMoreAuditLogs}
                isLoading={shouldShowAuditLoading}
                isLoadingMore={isLoadingMoreAudit}
                onLoadMore={() => void fetchMoreAccountAuditLogs()}
                onRetry={() => void fetchAccountAuditLogs()}
                perspective="personal"
                totalAuditLogs={auditTotalLogs ?? auditLogs.length}
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
