'use client';

import { RotateCcw, Search, X } from 'lucide-react';
import React, { type FC } from 'react';

import { PAGINATION } from '$constants/pagination.constants';
import { canSearchUserContact } from '$features/users/users-list.utils';
import { Button } from '$ui/button';
import directoryStyles from '$ui/directory.module.css';
import { Input } from '$ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';
import { cn } from '$utils/css.utils';

import {
  getSortLabel,
  normalizeSearchQuery,
  USER_SEARCH_MAX_LENGTH,
} from './users-list-state';
import type { UsersListController } from './useUsersList';

export const UsersListToolbar: FC<{ list: UsersListController }> = ({
  list,
}) => {
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
    pageSize,
    searchQuery,
    setCurrentPage,
    setDebouncedSearch,
    setSearchQuery,
    sortBy,
    totalFiltered,
  } = list;

  return (
    <div className="w-full">
      <form
        aria-label="Rechercher et filtrer les utilisateurs"
        className={directoryStyles.filterForm}
        onSubmit={(event) => {
          event.preventDefault();
          setDebouncedSearch(normalizeSearchQuery(searchQuery));
          setCurrentPage(1);
        }}
        role="search"
      >
        <div className={directoryStyles.search}>
          <Search aria-hidden="true" />
          <Input
            aria-label="Rechercher un compte utilisateur"
            autoCapitalize="none"
            autoComplete="off"
            className={directoryStyles.searchInput}
            enterKeyHint="search"
            maxLength={USER_SEARCH_MAX_LENGTH}
            name="directory-search"
            placeholder="Rechercher…"
            spellCheck={false}
            title={
              currentUser && canSearchUserContact(currentUser)
                ? 'Nom, identifiant ou email'
                : 'Nom ou identifiant'
            }
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          {searchQuery ? (
            <Button
              aria-label="Effacer la recherche"
              className={directoryStyles.searchClear}
              onClick={() => setSearchQuery('')}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" />
            </Button>
          ) : null}
        </div>
        <div className={directoryStyles.filterSelects}>
          <Select
            value={filterStatus}
            onValueChange={(value) => handleFilterChange('status', value)}
          >
            <SelectTrigger
              aria-label="Filtrer par état du compte"
              className={directoryStyles.selectTrigger}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={directoryStyles.selectContent}>
              <SelectItem className={directoryStyles.selectOption} value="all">
                Tous les états
              </SelectItem>
              <SelectItem
                className={directoryStyles.selectOption}
                value="active"
              >
                Actifs
              </SelectItem>
              <SelectItem
                className={directoryStyles.selectOption}
                value="inactive"
              >
                Désactivés
              </SelectItem>
              {canRequestSecurityDetails && (
                <SelectItem
                  className={directoryStyles.selectOption}
                  value="pending"
                >
                  Mot de passe à changer
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Select
            value={filterRole}
            onValueChange={(value) => handleFilterChange('role', value)}
          >
            <SelectTrigger
              aria-label="Filtrer par rôle"
              className={directoryStyles.selectTrigger}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={directoryStyles.selectContent}>
              <SelectItem className={directoryStyles.selectOption} value="all">
                Tous les rôles
              </SelectItem>
              <SelectItem
                className={directoryStyles.selectOption}
                value="SUPERADMIN"
              >
                Superadmin
              </SelectItem>
              <SelectItem
                className={directoryStyles.selectOption}
                value="ADMIN"
              >
                Administrateurs
              </SelectItem>
              <SelectItem className={directoryStyles.selectOption} value="USER">
                Utilisateurs
              </SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortBy}
            onValueChange={(value) => handleFilterChange('sort', value)}
          >
            <SelectTrigger
              aria-label="Trier les comptes utilisateurs"
              className={directoryStyles.selectTrigger}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={directoryStyles.selectContent}>
              <SelectItem className={directoryStyles.selectOption} value="name">
                {getSortLabel('name')}
              </SelectItem>
              <SelectItem
                className={directoryStyles.selectOption}
                value="recent"
              >
                {getSortLabel('recent')}
              </SelectItem>
              <SelectItem
                className={directoryStyles.selectOption}
                value="created"
              >
                {getSortLabel('created')}
              </SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters ? (
            <Button
              aria-label="Réinitialiser les filtres"
              className={directoryStyles.iconButton}
              onClick={clearFilters}
              size="icon"
              type="button"
              variant="ghost"
            >
              <RotateCcw aria-hidden="true" />
            </Button>
          ) : (
            <span
              aria-hidden="true"
              className={cn(directoryStyles.iconButton, 'invisible')}
            />
          )}
        </div>
      </form>
      {hasActiveFilters && (
        <div aria-label="Filtres actifs" className="mt-3 flex flex-wrap gap-2">
          {searchQuery && (
            <Button
              className="h-auto min-h-8 max-w-full gap-2 whitespace-normal"
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setDebouncedSearch('');
                setCurrentPage(1);
              }}
              aria-label="Retirer le filtre de recherche"
            >
              <span className="truncate">Recherche : {searchQuery}</span>
              <X aria-hidden="true" className="size-3 shrink-0" />
            </Button>
          )}
          {filterStatus !== 'all' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleFilterChange('status', 'all')}
              aria-label="Retirer le filtre d’état"
            >
              {filterStatus === 'active'
                ? 'Actifs'
                : filterStatus === 'inactive'
                  ? 'Désactivés'
                  : 'Mot de passe à changer'}
              <X aria-hidden="true" className="size-3" />
            </Button>
          )}
          {filterRole !== 'all' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleFilterChange('role', 'all')}
              aria-label="Retirer le filtre de rôle"
            >
              {filterRole === 'SUPERADMIN'
                ? 'Superadmin'
                : filterRole === 'ADMIN'
                  ? 'Administrateurs'
                  : 'Utilisateurs'}
              <X aria-hidden="true" className="size-3" />
            </Button>
          )}
        </div>
      )}
      <div className={cn(directoryStyles.listCaption, 'mt-3')}>
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
        <span>{pageSize} par page</span>
      </div>
    </div>
  );
};
