'use client';

import { Plus, Users } from 'lucide-react';
import Link from 'next/link';
import React, { type FC, useEffect, useRef } from 'react';

import { ContentState } from '$components/layout/ContentState';
import { PageIdentityHero } from '$components/layout/PageIdentityHero';
import { FEATURES } from '$constants/feature-registry.constants';
import { PAGE_PATHS, userDetailPath } from '$constants/routes.constants';
import { Button } from '$ui/button';
import { DataTableSection } from '$ui/data-table-section';
import directoryStyles from '$ui/directory.module.css';
import { ListPagination } from '$ui/pagination';

import { getUsersListVisibilityKey } from './users-list.utils';
import { buildUsersPageUrlParams } from './users-list-state';
import { UsersListRowsSkeleton } from './UsersDirectorySkeleton';
import { UsersListResults } from './UsersListResults';
import { UsersListToolbar } from './UsersListToolbar';
import { useUsersList } from './useUsersList';
import { useUsersListNavigation } from './useUsersListNavigation';

export const UsersListPage: FC = () => {
  const list = useUsersList();
  const {
    canCreateUsers,
    canViewContact,
    changePage,
    clearFilters,
    currentPage,
    currentQueryString,
    currentUser,
    debouncedSearch,
    displayedPage,
    displayedUsers,
    fetchUsers,
    filterRole,
    filterStatus,
    hasActiveFilters,
    isLoading,
    isRefreshing,
    lastSuccessfulLoadAt,
    loadError,
    securityDetailsVisible,
    sortBy,
    totalPages,
  } = list;
  const returnHref = `${PAGE_PATHS.users}${currentQueryString ? `?${currentQueryString}` : ''}`;
  const navigation = useUsersListNavigation({
    href: returnHref,
    ready: !isLoading && !isRefreshing && !loadError,
    scope: currentUser ? getUsersListVisibilityKey(currentUser) : '',
  });
  const retryActionRef = useRef<HTMLButtonElement>(null);
  const retryRequestedRef = useRef(false);
  const filterIntent = JSON.stringify([
    list.searchQuery,
    filterRole,
    filterStatus,
    sortBy,
  ]);
  const previousFilterIntent = useRef(filterIntent);
  const { cancelPageChange } = navigation;

  useEffect(() => {
    if (previousFilterIntent.current === filterIntent) return;
    previousFilterIntent.current = filterIntent;
    retryRequestedRef.current = false;
    cancelPageChange();
  }, [cancelPageChange, filterIntent]);

  useEffect(() => {
    if (isLoading || isRefreshing || !retryRequestedRef.current) return;
    retryRequestedRef.current = false;
    if (loadError) {
      cancelPageChange();
      retryActionRef.current?.focus({ preventScroll: true });
    }
  }, [cancelPageChange, isLoading, isRefreshing, loadError]);

  const clearFiltersAndFocus = (): void => {
    clearFilters();
    navigation.containerRef.current
      ?.querySelector<HTMLInputElement>('input[type="search"]')
      ?.focus({ preventScroll: true });
  };
  const displayedQuery = buildUsersPageUrlParams({
    page: displayedPage,
    role: filterRole,
    search: debouncedSearch,
    sort: sortBy,
    status: filterStatus,
  }).toString();
  const displayedReturnHref = `${PAGE_PATHS.users}${displayedQuery ? `?${displayedQuery}` : ''}`;
  const getUserDetailHref = (userId: string): string =>
    `${userId === currentUser?.id ? '/mon-compte' : userDetailPath(userId)}?${new URLSearchParams({ returnTo: displayedReturnHref })}`;
  const createUserHref = `${PAGE_PATHS.newUser}?${new URLSearchParams({ returnTo: `${PAGE_PATHS.users}${currentQueryString ? `?${currentQueryString}` : ''}` })}`;

  return (
    <div
      className="space-y-[18px]"
      ref={navigation.containerRef}
      onClickCapture={navigation.onClickCapture}
    >
      <PageIdentityHero
        actions={
          canCreateUsers ? (
            <Button asChild className={directoryStyles.addButton}>
              <Link href={createUserHref}>
                <Plus aria-hidden="true" />
                Nouvel utilisateur
              </Link>
            </Button>
          ) : undefined
        }
        description="Gérez les comptes et leurs accès."
        icon={<Users aria-hidden="true" />}
        title={FEATURES.users.label}
      />
      <div className="space-y-4">
        {loadError && (
          <ContentState
            action={
              <Button
                disabled={isLoading || isRefreshing}
                onClick={() => {
                  navigation.preparePageChange();
                  retryRequestedRef.current = true;
                  void fetchUsers(
                    currentPage,
                    debouncedSearch,
                    filterStatus,
                    filterRole,
                    sortBy,
                  );
                }}
                ref={retryActionRef}
                size="sm"
                type="button"
                variant="outline"
              >
                Réessayer
              </Button>
            }
            description={
              lastSuccessfulLoadAt
                ? `Les dernières données fiables, actualisées à ${lastSuccessfulLoadAt.toLocaleTimeString(
                    'fr-FR',
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                    },
                  )}, restent affichées.`
                : undefined
            }
            kind="error"
            title={loadError}
          />
        )}
        <DataTableSection
          className="border-border-content bg-surface-content rounded-[10px]"
          headerClassName="bg-surface-content-header"
          contentClassName={
            isRefreshing ? 'opacity-60 transition-opacity' : undefined
          }
          toolbar={<UsersListToolbar list={list} />}
        >
          <div
            ref={navigation.resultsRef}
            tabIndex={-1}
            aria-label="Résultats des utilisateurs"
            aria-busy={isLoading || isRefreshing}
          >
            {isLoading ? (
              <div role="status" aria-label="Chargement">
                <UsersListRowsSkeleton />
              </div>
            ) : (
              <>
                <UsersListResults
                  displayedUsers={displayedUsers}
                  currentUser={currentUser}
                  canViewContact={canViewContact}
                  securityDetailsVisible={securityDetailsVisible}
                  loadError={loadError}
                  hasActiveFilters={hasActiveFilters}
                  clearFilters={clearFiltersAndFocus}
                  getUserDetailHref={getUserDetailHref}
                />
              </>
            )}
            <ListPagination
              ariaLabel="Pagination des utilisateurs"
              canNext={currentPage < totalPages}
              canPrevious={currentPage > 1}
              disabled={Boolean(loadError)}
              isLoading={isLoading || isRefreshing}
              onNext={() => {
                navigation.preparePageChange();
                changePage(Math.min(totalPages, currentPage + 1));
              }}
              onPrevious={() => {
                navigation.preparePageChange();
                changePage(Math.max(1, currentPage - 1));
              }}
              page={displayedPage}
              totalPages={totalPages}
            />
          </div>
        </DataTableSection>
      </div>
    </div>
  );
};
