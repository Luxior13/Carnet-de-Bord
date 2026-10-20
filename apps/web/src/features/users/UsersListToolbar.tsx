'use client';

import { RotateCcw } from 'lucide-react';
import React, { type FC, useRef } from 'react';

import { PAGINATION } from '$constants/pagination.constants';
import { canSearchUserContact } from '$features/users/users-list.utils';
import { Button } from '$ui/button';
import directoryStyles from '$ui/directory.module.css';
import { ListSearchField } from '$ui/list-search-field';
import { QuickFilter, QuickFilterGroup } from '$ui/quick-filter';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';
import { cn } from '$utils/css.utils';

import {
  type FilterRole,
  type FilterStatus,
  getSortLabel,
  normalizeSearchQuery,
  SORT_OPTIONS,
  USER_SEARCH_MAX_LENGTH,
} from './users-list-state';
import type { UsersListController } from './useUsersList';

const ACCOUNT_NOUN = ['compte', 'comptes'] as const;

export const UsersListToolbar: FC<{ list: UsersListController }> = ({
  list,
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const focusSearch = (): void => {
    toolbarRef.current
      ?.querySelector<HTMLInputElement>('input[type="search"]')
      ?.focus({ preventScroll: true });
  };
  const {
    canRequestSecurityDetails,
    clearFilters,
    currentUser,
    filterRole,
    filterStatus,
    handleFilterChange,
    hasActiveFilters,
    hasTruncatedPagination,
    isLoading,
    isRefreshing,
    loadError,
    searchQuery,
    setCurrentPage,
    setDebouncedSearch,
    setSearchQuery,
    sortBy,
    stats,
    totalFiltered,
  } = list;
  const canSearchContact = Boolean(
    currentUser && canSearchUserContact(currentUser),
  );
  // Faceted counts: the server applies the search and the other dimension to
  // each one, so they stay visible and always equal the result they announce.
  const statusFilters: ReadonlyArray<{
    count: number | null;
    label: string;
    value: FilterStatus;
  }> = [
    { count: stats?.total ?? null, label: 'Tous', value: 'all' },
    { count: stats?.active ?? null, label: 'Actifs', value: 'active' },
    {
      count: stats?.inactive ?? null,
      label: 'Désactivés',
      value: 'inactive',
    },
    ...(canRequestSecurityDetails
      ? [
          {
            count: stats?.pendingPasswordChange ?? null,
            label: 'Mot de passe à changer',
            value: 'pending' as const,
          },
        ]
      : []),
  ];
  const roleFilters: ReadonlyArray<{
    count: number | null;
    label: string;
    value: Exclude<FilterRole, 'all'>;
  }> = [
    {
      count: stats?.byRole.SUPERADMIN ?? null,
      label: 'Superadmin',
      value: 'SUPERADMIN',
    },
    {
      count: stats?.byRole.ADMIN ?? null,
      label: 'Administrateurs',
      value: 'ADMIN',
    },
    {
      count: stats?.byRole.USER ?? null,
      label: 'Utilisateurs',
      value: 'USER',
    },
  ];

  return (
    <div className="w-full" ref={toolbarRef}>
      <form
        autoComplete="off"
        aria-label="Rechercher et filtrer les utilisateurs"
        className={directoryStyles.filterForm}
        onSubmit={(event) => {
          event.preventDefault();
          setDebouncedSearch(normalizeSearchQuery(searchQuery));
          setCurrentPage(1);
        }}
        role="search"
      >
        <ListSearchField
          ariaLabel={
            canSearchContact
              ? 'Rechercher par nom, identifiant ou email'
              : 'Rechercher par nom ou identifiant'
          }
          maxLength={USER_SEARCH_MAX_LENGTH}
          onClear={() => {
            setSearchQuery('');
            setDebouncedSearch('');
            setCurrentPage(1);
          }}
          onValueChange={setSearchQuery}
          placeholder={
            canSearchContact
              ? 'Nom, identifiant ou email…'
              : 'Nom ou identifiant…'
          }
          value={searchQuery}
        />
        <div className={directoryStyles.filterSelects}>
          {/* Reset sits before the sort menu so the menu stays flush right. */}
          <Button
            aria-hidden={!hasActiveFilters || undefined}
            aria-label="Réinitialiser les filtres"
            className={cn(
              directoryStyles.iconButton,
              !hasActiveFilters && 'pointer-events-none invisible',
            )}
            onClick={() => {
              clearFilters();
              focusSearch();
            }}
            size="icon"
            tabIndex={hasActiveFilters ? undefined : -1}
            type="button"
            variant="ghost"
          >
            <RotateCcw aria-hidden="true" />
          </Button>
          <Select
            onValueChange={(value) => handleFilterChange('sort', value)}
            value={sortBy}
          >
            <SelectTrigger
              aria-label="Trier les comptes utilisateurs"
              className={directoryStyles.selectTrigger}
              variant="compact"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent variant="compact">
              {SORT_OPTIONS.map((item) => (
                <SelectItem key={item} value={item}>
                  {getSortLabel(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </form>
      <div className={directoryStyles.filterBar}>
        <div className={directoryStyles.quickFilterSets}>
          <QuickFilterGroup caption="État" label="Filtrer par état">
            {statusFilters.map((filter) => (
              <QuickFilter
                count={filter.count}
                key={filter.value}
                label={filter.label}
                noun={ACCOUNT_NOUN}
                onClick={() => {
                  if (filter.value !== filterStatus)
                    handleFilterChange('status', filter.value);
                }}
                pressed={filter.value === filterStatus}
              />
            ))}
          </QuickFilterGroup>
          <QuickFilterGroup caption="Rôle" label="Filtrer par rôle">
            {roleFilters.map((filter) => (
              <QuickFilter
                count={filter.count}
                key={filter.value}
                label={filter.label}
                noun={ACCOUNT_NOUN}
                onClick={() =>
                  handleFilterChange(
                    'role',
                    filter.value === filterRole ? 'all' : filter.value,
                  )
                }
                pressed={filter.value === filterRole}
              />
            ))}
          </QuickFilterGroup>
        </div>
        <div className={directoryStyles.listCaption}>
          <p role="status" aria-live="polite">
            {isLoading
              ? 'Chargement…'
              : isRefreshing
                ? 'Actualisation…'
                : loadError
                  ? 'Résultats non actualisés'
                  : `${totalFiltered.toLocaleString('fr-FR')} compte${totalFiltered !== 1 ? 's' : ''} trouvé${totalFiltered !== 1 ? 's' : ''}`}
            {!isLoading &&
              !isRefreshing &&
              !loadError &&
              hasTruncatedPagination && (
                <>
                  . Affinez la recherche : seules les{' '}
                  {PAGINATION.MAX_PAGE.toLocaleString('fr-FR')} premières pages
                  sont accessibles.
                </>
              )}
          </p>
        </div>
      </div>
    </div>
  );
};
