'use client';

import { RotateCcw, Search, X } from 'lucide-react';
import React, { type FC, useId } from 'react';

import { PAGINATION } from '$constants/pagination.constants';
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
  PERSON_LIST_SORTS,
  PERSON_STRUCTURE_STATUS_LABELS,
  PERSON_STRUCTURE_STATUSES,
} from '../person.constants';
import type {
  PersonListSort,
  PersonStructureStatus,
} from '../types/person.types';

export type StatusFilter = 'ALL' | PersonStructureStatus;
const PAGE_LIMIT = PAGINATION.DEFAULT_LIMIT;
const SORT_LABELS = {
  created: 'Ajoutées récemment',
  name: 'Nom (A–Z)',
  updated: 'Modifiées récemment',
} as const satisfies Record<PersonListSort, string>;

const getSortLabel = (sort: PersonListSort): string => {
  if (sort === 'created') return SORT_LABELS.created;
  if (sort === 'updated') return SORT_LABELS.updated;

  return SORT_LABELS.name;
};

const getStatusLabel = (status: PersonStructureStatus): string =>
  status === 'IN_STRUCTURE'
    ? PERSON_STRUCTURE_STATUS_LABELS.IN_STRUCTURE
    : PERSON_STRUCTURE_STATUS_LABELS.OUTSIDE_STRUCTURE;

const DirectorySelect: FC<{
  ariaLabel: string;
  onValueChange: (value: string) => void;
  options: ReadonlyArray<{ label: string; value: string }>;
  value: string;
}> = ({ ariaLabel, onValueChange, options, value }) => (
  <Select onValueChange={onValueChange} value={value}>
    <SelectTrigger
      aria-label={ariaLabel}
      className={directoryStyles.selectTrigger}
    >
      <SelectValue />
    </SelectTrigger>
    <SelectContent className={directoryStyles.selectContent}>
      {options.map((option) => (
        <SelectItem
          className={directoryStyles.selectOption}
          key={option.value}
          value={option.value}
        >
          {option.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

type Props = {
  applyFilters: (
    query: string,
    status: StatusFilter,
    sort: PersonListSort,
    missingContacts?: boolean,
  ) => void;
  draftQuery: string;
  error: Error | null;
  isRefreshing: boolean;
  missingContacts: boolean;
  setDraftQuery: (query: string) => void;
  sort: PersonListSort;
  status: StatusFilter;
  total: number;
};

export const PersonsListToolbar: FC<Props> = ({
  applyFilters,
  draftQuery,
  error,
  isRefreshing,
  missingContacts,
  setDraftQuery,
  sort,
  status,
  total,
}) => {
  const searchInputId = useId();
  const hasActiveToolbarFilters = Boolean(
    draftQuery || status !== 'ALL' || sort !== 'name' || missingContacts,
  );
  const statusOptions = [
    { label: 'Tous les statuts', value: 'ALL' },
    ...PERSON_STRUCTURE_STATUSES.map((item) => ({
      label: getStatusLabel(item),
      value: item,
    })),
  ];
  const sortOptions = PERSON_LIST_SORTS.map((item) => ({
    label: getSortLabel(item),
    value: item,
  }));

  return (
    <div className="w-full">
      <form
        aria-label="Rechercher et filtrer les fiches"
        className={directoryStyles.filterForm}
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters(draftQuery, status, sort);
        }}
        role="search"
      >
        <div className={directoryStyles.search}>
          <Search aria-hidden="true" />
          <Input
            aria-label="Rechercher par pseudo, nom ou coordonnée"
            autoComplete="off"
            className={directoryStyles.searchInput}
            enterKeyHint="search"
            id={searchInputId}
            maxLength={100}
            onChange={(event) => setDraftQuery(event.target.value)}
            placeholder="Pseudo, nom ou coordonnée…"
            spellCheck={false}
            type="search"
            value={draftQuery}
          />
          {draftQuery ? (
            <Button
              aria-label="Effacer la recherche"
              className={directoryStyles.searchClear}
              onClick={() => applyFilters('', status, sort)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" />
            </Button>
          ) : null}
        </div>
        <div className={directoryStyles.filterSelects}>
          <DirectorySelect
            ariaLabel="Filtrer par statut"
            onValueChange={(value) =>
              applyFilters(draftQuery, value as StatusFilter, sort)
            }
            options={statusOptions}
            value={status}
          />
          <DirectorySelect
            ariaLabel="Trier le répertoire"
            onValueChange={(value) =>
              applyFilters(draftQuery, status, value as PersonListSort)
            }
            options={sortOptions}
            value={sort}
          />
          {hasActiveToolbarFilters ? (
            <Button
              aria-label="Réinitialiser les filtres"
              className={directoryStyles.iconButton}
              onClick={() => applyFilters('', 'ALL', 'name', false)}
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
      {missingContacts && (
        <Button
          className="mt-3 min-h-11 sm:min-h-8"
          size="sm"
          variant="outline"
          type="button"
          onClick={() => applyFilters(draftQuery, status, sort, false)}
          aria-label="Retirer le filtre Sans coordonnées"
        >
          Sans coordonnées <X aria-hidden="true" className="size-3" />
        </Button>
      )}
      <div className={cn(directoryStyles.listCaption, 'mt-3')}>
        <p aria-live="polite" role="status">
          {isRefreshing
            ? 'Actualisation…'
            : error
              ? 'Résultats non actualisés'
              : `${total.toLocaleString('fr-FR')} fiche${total !== 1 ? 's' : ''} trouvée${total !== 1 ? 's' : ''}`}
        </p>
        <span>{PAGE_LIMIT} par page</span>
      </div>
    </div>
  );
};
