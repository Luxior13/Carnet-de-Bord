'use client';

import dynamic from 'next/dynamic';
import { usePathname, useSearchParams } from 'next/navigation';
import React, {
  type FC,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { ContentState } from '$components/layout/ContentState';
import { PageAsideLayout } from '$components/layout/PageAsideLayout';
import { PageSectionNavigation } from '$components/layout/PageSectionNavigation';
import { UnsavedNavigationDialog } from '$components/layout/UnsavedNavigationDialog';
import { UserOverviewCard } from '$components/users/UserOverviewCard';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { PAGE_PATHS } from '$constants/routes.constants';
import { useUser } from '$context/UserContext';
import {
  getAccountScope,
  isOlderAccountSnapshot,
} from '$features/account/account.utils';
import {
  ACCOUNT_SECTIONS,
  AccountHeader,
  AccountPageContentSkeleton,
  type AccountSectionId,
  buildAccountSectionHref,
  normalizeAccountSection,
} from '$features/account/account-page.helpers';
import { useUnsavedNavigationGuard } from '$hooks/useUnsavedNavigationGuard';
import type { UserType } from '$types/auth.types';
import directoryStyles from '$ui/directory.module.css';
import { getSafeCollectionReturnHref } from '$utils/navigation.utils';

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

const AccountContent: FC<{ userData: UserType }> = ({ userData }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { applyUserUpdate, refreshUser } = useUser();
  const [isProfileDirty, setIsProfileDirty] = useState(false);
  const [profileResetKey, setProfileResetKey] = useState(0);
  const mountedRef = useRef(false);
  const currentUserRef = useRef(userData);
  currentUserRef.current = userData;
  useEffect(() => {
    mountedRef.current = true;

    return (): void => {
      mountedRef.current = false;
    };
  }, []);
  const allowed = (permission: string): boolean =>
    userData.isProtected ||
    hasPermission(userData.role, permission, userData.permissions);
  const canViewProfile = allowed(PERMISSIONS.ACCOUNT.VIEW_PROFILE);
  const canViewSecurity = allowed(PERMISSIONS.ACCOUNT.VIEW_SECURITY);
  const canChangePassword =
    userData.mustChangePassword || allowed(PERMISSIONS.ACCOUNT.CHANGE_PASSWORD);
  const canManageMfa = allowed(PERMISSIONS.ACCOUNT.MANAGE_MFA);
  const canManageSessions = allowed(PERMISSIONS.ACCOUNT.MANAGE_SESSIONS);
  const showSecurity =
    canViewSecurity || canChangePassword || canManageMfa || canManageSessions;
  const sections = ACCOUNT_SECTIONS.filter((section) =>
    section.id === 'profile'
      ? canViewProfile
      : section.id === 'security' && showSecurity,
  );
  const requestedSection = normalizeAccountSection(searchParams.get('section'));
  const activeSection = sections.some(
    (section) => section.id === requestedSection,
  )
    ? requestedSection
    : (sections[0]?.id ?? 'profile');
  const [visitedSections, setVisitedSections] = useState<
    ReadonlySet<AccountSectionId>
  >(() => new Set([activeSection]));
  useEffect(() => {
    setVisitedSections((current) =>
      current.has(activeSection)
        ? current
        : new Set([...current, activeSection]),
    );
  }, [activeSection]);
  const resetDraft = useCallback((): void => {
    setIsProfileDirty(false);
    setProfileResetKey((value) => value + 1);
  }, []);
  const {
    cancelPendingNavigation,
    confirmPendingNavigation,
    pendingNavigationHref,
    restoreFocus,
  } = useUnsavedNavigationGuard(isProfileDirty, resetDraft);
  const currentQueryString = searchParams.toString();
  const getSectionHref = (section: AccountSectionId): string =>
    buildAccountSectionHref(pathname, currentQueryString, section);
  const handleAccountUpdate = useCallback(
    async (updatedUser?: UserType): Promise<void> => {
      if (!mountedRef.current) return;
      if (updatedUser) {
        if (
          updatedUser.id !== currentUserRef.current.id ||
          isOlderAccountSnapshot(updatedUser, currentUserRef.current)
        )
          return;
        applyUserUpdate(updatedUser);
      } else await refreshUser();
    },
    [applyUserUpdate, refreshUser],
  );

  return (
    <>
      <PageAsideLayout
        header={
          <AccountHeader
            userData={userData}
            returnHref={
              searchParams.has('returnTo') && allowed(PERMISSIONS.USERS.VIEW)
                ? getSafeCollectionReturnHref(
                    searchParams.get('returnTo'),
                    PAGE_PATHS.users,
                  )
                : undefined
            }
          />
        }
        aside={
          <div className={directoryStyles.directory}>
            <UserOverviewCard user={userData} />
          </div>
        }
      >
        <div className="space-y-4">
          <PageSectionNavigation
            activeSection={activeSection}
            ariaLabel="Navigation du compte"
            dirtySections={isProfileDirty ? ['profile'] : []}
            getSectionHref={getSectionHref}
            onSectionChange={(_section, href) =>
              window.history.replaceState(null, '', href)
            }
            sections={sections}
          />
          <p className="sr-only" aria-live="polite">
            Section active :{' '}
            {sections.find((section) => section.id === activeSection)?.label ??
              'Compte'}
          </p>
          {sections.length === 0 && (
            <ContentState
              description="Les droits de compte personnel sont désactivés pour ce compte."
              layout="panel"
              title="Aucun onglet personnel disponible"
            />
          )}
          {canViewProfile && visitedSections.has('profile') && (
            <div hidden={activeSection !== 'profile'}>
              <ProfileSection
                key={profileResetKey}
                onDirtyChange={setIsProfileDirty}
                onUpdate={handleAccountUpdate}
                userData={userData}
              />
            </div>
          )}
          {showSecurity && visitedSections.has('security') && (
            <div hidden={activeSection !== 'security'}>
              <SecuritySection
                canChangePassword={canChangePassword}
                canManageMfa={canManageMfa}
                canManageSessions={canManageSessions}
                canViewSecurity={canViewSecurity}
                onUpdate={handleAccountUpdate}
                userData={userData}
              />
            </div>
          )}
        </div>
      </PageAsideLayout>
      <UnsavedNavigationDialog
        description="Les saisies du profil et de l’adresse de contact seront perdues. Une opération déjà envoyée peut avoir été enregistrée. Vous pouvez rester sur la page pour vérifier son résultat."
        open={pendingNavigationHref !== null}
        onCancel={cancelPendingNavigation}
        onConfirm={confirmPendingNavigation}
        onCloseAutoFocus={restoreFocus}
      />
    </>
  );
};

export const AccountPageContent: FC = () => {
  const { userData } = useUser();
  if (!userData) return <AccountPageContentSkeleton />;
  // Profile refreshes preserve drafts; identity/authority changes reset dialogs and requests.
  const scope = getAccountScope(userData);

  return <AccountContent key={scope} userData={userData} />;
};
