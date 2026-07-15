'use client';

import {
  Activity,
  CalendarDays,
  Clock3,
  ShieldCheck,
  User,
} from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
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
import {
  formatAccountDate,
  formatRelativeAccountTime,
} from '$features/account/account.utils';
import { ProfileSection } from '$features/account/components/ProfileSection';
import { SecuritySection } from '$features/account/components/SecuritySection';
import type { AuditLogEntry, UserType } from '$types/auth.types';
import { Badge } from '$ui/badge';
import { Skeleton } from '$ui/skeleton';

type AccountSectionId = 'activity' | 'profile' | 'security';

const ACCOUNT_AUDIT_PAGE_SIZE = 200;
const ACCOUNT_AUDIT_MAX_PREFETCH_PAGES = 5;

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
    description={`Identifiant : ${userData.loginName}`}
    meta={
      <>
        <Badge variant="secondary">{getAccessLabel(userData)}</Badge>
        <Badge variant="outline">Compte privé</Badge>
        {userData.isProtected && <Badge variant="warning">Protégé</Badge>}
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
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.95fr)] lg:items-start">
      <div className="space-y-4">
        <Skeleton className="h-72 rounded-md" />
        <Skeleton className="h-96 rounded-md" />
      </div>
      <Skeleton className="h-[34rem] rounded-md" />
    </div>
  </div>
);

export const AccountPageContent: FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQueryString = searchParams.toString();
  const requestedSection = normalizeAccountSection(searchParams.get('section'));
  const { applyUserUpdate, refreshUser, userData } = useUser();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditTotalLogs, setAuditTotalLogs] = useState<number | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
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
  const activeSection = visibleAccountSections.some(
    (section) => section.id === requestedSection,
  )
    ? requestedSection
    : (firstVisibleSection ?? requestedSection);

  const fetchAccountAuditLogs = useCallback(async (): Promise<void> => {
    auditAbortControllerRef.current?.abort();
    auditAbortControllerRef.current = null;

    if (!userData?.id || !canViewActivity) {
      setAuditLogs([]);
      setAuditTotalLogs(null);
      setAuditError(null);
      setIsLoadingAudit(false);
      hasLoadedAuditLogsRef.current = false;

      return;
    }

    const controller = new AbortController();
    auditAbortControllerRef.current = controller;

    try {
      setIsLoadingAudit(true);
      setAuditError(null);

      const buildAuditParams = (page: number): URLSearchParams => {
        return new URLSearchParams({
          page: String(page),
          pageSize: String(ACCOUNT_AUDIT_PAGE_SIZE),
        });
      };

      const response = await fetch(
        `/api/users/${userData.id}/audit?${buildAuditParams(1).toString()}`,
        { signal: controller.signal },
      );
      const data = await response.json();

      if (controller.signal.aborted) return;

      if (response.ok && data.success) {
        const loadedLogs = [...(data.data.logs as AuditLogEntry[])];
        const totalLogs = Number(
          data.data.pagination?.total ?? loadedLogs.length,
        );
        const safeTotalLogs = Number.isFinite(totalLogs)
          ? totalLogs
          : loadedLogs.length;
        const totalPages = Number(data.data.pagination?.totalPages ?? 1);
        const pagesToFetch = Math.min(
          totalPages,
          ACCOUNT_AUDIT_MAX_PREFETCH_PAGES,
        );
        let didFailToLoadEveryPage = false;

        for (let page = 2; page <= pagesToFetch; page += 1) {
          const pageResponse = await fetch(
            `/api/users/${userData.id}/audit?${buildAuditParams(page).toString()}`,
            { signal: controller.signal },
          );
          const pageData = await pageResponse.json();

          if (controller.signal.aborted) return;
          if (!pageResponse.ok || !pageData.success) {
            didFailToLoadEveryPage = true;
            setAuditError(
              pageData.error?.message ||
                "Impossible de charger toute l'activité",
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

  useEffect(() => {
    if (!userData) return;
    if (!firstVisibleSection) return;
    if (requestedSection === activeSection) return;

    window.history.replaceState(
      null,
      '',
      buildAccountSectionHref(pathname, currentQueryString, activeSection),
    );
  }, [
    activeSection,
    currentQueryString,
    firstVisibleSection,
    pathname,
    requestedSection,
    userData,
  ]);

  useEffect(() => {
    auditAbortControllerRef.current?.abort();
    auditAbortControllerRef.current = null;
    hasLoadedAuditLogsRef.current = false;
    setAuditLogs([]);
    setAuditTotalLogs(null);
    setAuditError(null);
    setIsLoadingAudit(false);
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

  const handleSectionChange = (sectionId: AccountSectionId): void => {
    if (sectionId === activeSection) return;

    window.history.replaceState(
      null,
      '',
      buildAccountSectionHref(pathname, currentQueryString, sectionId),
    );
  };

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

  const summaryItems = [
    {
      description: 'Date de création du compte',
      icon: CalendarDays,
      title: 'Compte depuis',
      value: formatAccountDate(userData.createdAt),
    },
    {
      description: 'Dernière activité connue',
      icon: Clock3,
      title: 'Dernière connexion',
      value: userData.lastLoginAt
        ? formatRelativeAccountTime(userData.lastLoginAt)
        : 'Jamais',
    },
    {
      description: 'Dernière modification',
      icon: ShieldCheck,
      title: 'Mot de passe',
      value: userData.passwordChangedAt
        ? formatRelativeAccountTime(userData.passwordChangedAt)
        : 'Jamais',
    },
  ];
  const shouldShowAuditLoading =
    isLoadingAudit ||
    (activeSection === 'activity' && !hasLoadedAuditLogsRef.current);

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
        sections={visibleAccountSections}
      />
      <AccountHeader userData={userData} />
      <section className="border-border/70 bg-surface overflow-hidden rounded-lg border shadow-[var(--shadow-panel)]">
        <div className="divide-border/45 grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
          {summaryItems.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.title} className="flex min-w-0 gap-3 p-4 sm:p-5">
                <span className="border-border/50 bg-surface-raised text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg border">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-foreground text-sm font-bold tracking-normal">
                    {item.title}
                  </p>
                  <p className="text-foreground mt-1 truncate text-lg font-semibold tracking-normal">
                    {item.value}
                  </p>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <UserDetailSectionRail
        activeSection={activeSection}
        ariaLabel="Navigation du compte"
        dirtySections={[]}
        getSectionHref={(sectionId) =>
          buildAccountSectionHref(pathname, currentQueryString, sectionId)
        }
        layout="mobile"
        onSectionChange={handleSectionChange}
        sections={visibleAccountSections}
      />
      <div className="min-w-0">
        {visibleAccountSections.length === 0 && (
          <ContentState
            description="Les droits de compte personnel sont désactivés pour ce compte."
            layout="panel"
            title="Aucun onglet personnel disponible"
          />
        )}
        {canViewProfile && (
          <div hidden={activeSection !== 'profile'}>
            <ProfileSection
              userData={userData}
              onUpdate={handleAccountUpdate}
            />
          </div>
        )}
        {(canViewSecurity ||
          canChangePassword ||
          canManageMfa ||
          canManageSessions) && (
          <div hidden={activeSection !== 'security'}>
            <SecuritySection
              userData={userData}
              onUpdate={handleAccountUpdate}
              canChangePassword={canChangePassword}
              canManageMfa={canManageMfa}
              canManageSessions={canManageSessions}
              canViewSecurity={canViewSecurity}
            />
          </div>
        )}
        {canViewActivity && (
          <div hidden={activeSection !== 'activity'}>
            <UserHistoryTab
              auditLogs={auditLogs}
              canExport={canExportUserActivity}
              error={auditError}
              isAuditTruncated={
                auditTotalLogs !== null && auditLogs.length < auditTotalLogs
              }
              isLoading={shouldShowAuditLoading}
              onRetry={() => void fetchAccountAuditLogs()}
              perspective="personal"
              totalAuditLogs={auditTotalLogs ?? auditLogs.length}
              userId={userData.id}
            />
          </div>
        )}
      </div>
    </div>
  );
};
