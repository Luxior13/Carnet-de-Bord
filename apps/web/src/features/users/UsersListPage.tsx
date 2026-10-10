'use client';

import { ChevronLeft, ChevronRight, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import React, { type FC } from 'react';

import { ContentState } from '$components/layout/ContentState';
import { PageAsideLayout } from '$components/layout/PageAsideLayout';
import { PageIdentityHero } from '$components/layout/PageIdentityHero';
import { FEATURES } from '$constants/feature-registry.constants';
import { PAGE_PATHS, userDetailPath } from '$constants/routes.constants';
import { UsersOverview } from '$features/users/UsersOverview';
import { Button } from '$ui/button';
import { DataTableSection } from '$ui/data-table-section';
import directoryStyles from '$ui/directory.module.css';
import { Skeleton } from '$ui/skeleton';

import { getUsersListVisibilityKey } from './users-list.utils';
import { UsersListResults } from './UsersListResults';
import { UsersListToolbar } from './UsersListToolbar';
import { useUsersList } from './useUsersList';
import { useUsersListNavigation } from './useUsersListNavigation';

export const UsersListPage: FC = () => {
  const list = useUsersList();
  const {
    canCreateUsers,
    canRequestSecurityDetails,
    canViewContact,
    clearFilters,
    currentPage,
    currentQueryString,
    currentUser,
    debouncedSearch,
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
    setCurrentPage,
    sortBy,
    stats,
    totalPages,
  } = list;
  const returnHref = `${PAGE_PATHS.users}${currentQueryString ? `?${currentQueryString}` : ''}`;
  const navigation = useUsersListNavigation({
    href: returnHref,
    ready: !isLoading && !isRefreshing && !loadError,
    scope: currentUser ? getUsersListVisibilityKey(currentUser) : '',
  });
  const getUserDetailHref = (userId: string): string =>
    `${userId === currentUser?.id ? '/mon-compte' : userDetailPath(userId)}?${new URLSearchParams({ returnTo: returnHref })}`;
  const createUserHref = `${PAGE_PATHS.newUser}?${new URLSearchParams({ returnTo: `${PAGE_PATHS.users}${currentQueryString ? `?${currentQueryString}` : ''}` })}`;

  return (
    <div
      ref={navigation.containerRef}
      onClickCapture={navigation.onClickCapture}
    >
      <PageAsideLayout
        aside={
          <UsersOverview
            isLoading={isLoading && !stats}
            query={currentQueryString}
            securityDetailsVisible={
              isLoading ? canRequestSecurityDetails : securityDetailsVisible
            }
            stats={stats}
          />
        }
        header={
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
        }
      >
        <div className="space-y-4">
          {loadError && (
            <ContentState
              action={
                <Button
                  onClick={() =>
                    void fetchUsers(
                      currentPage,
                      debouncedSearch,
                      filterStatus,
                      filterRole,
                      sortBy,
                    )
                  }
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
                <div role="status" aria-label="Chargement" className="p-4">
                  <Skeleton className="h-72 rounded-lg" />
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
                    clearFilters={clearFilters}
                    getUserDetailHref={getUserDetailHref}
                  />
                </>
              )}
              <nav
                aria-label="Pagination des utilisateurs"
                className={directoryStyles.pagination}
              >
                <p>
                  Page <strong>{currentPage}</strong>
                  {totalPages > 1 ? (
                    <>
                      {' '}
                      sur <strong>{totalPages}</strong>
                    </>
                  ) : null}
                </p>
                <div className={directoryStyles.paginationActions}>
                  <Button
                    aria-label="Page précédente"
                    className={directoryStyles.pageButton}
                    disabled={
                      isLoading ||
                      isRefreshing ||
                      !!loadError ||
                      currentPage <= 1
                    }
                    onClick={() => {
                      navigation.preparePageChange();
                      setCurrentPage((page) => Math.max(1, page - 1));
                    }}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                  <Button
                    aria-label="Page suivante"
                    className={directoryStyles.pageButton}
                    disabled={
                      isLoading ||
                      isRefreshing ||
                      !!loadError ||
                      currentPage >= totalPages
                    }
                    onClick={() => {
                      navigation.preparePageChange();
                      setCurrentPage((page) => Math.min(totalPages, page + 1));
                    }}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </div>
              </nav>
            </div>
          </DataTableSection>
        </div>
      </PageAsideLayout>
    </div>
  );
};
