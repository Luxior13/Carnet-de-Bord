'use client';

import { RotateCcw } from 'lucide-react';
import React, { type FC, useRef } from 'react';

import { Button } from '$ui/button';
import directoryStyles from '$ui/directory.module.css';
import { ListSearchField } from '$ui/list-search-field';
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
} from '../person.constants';
import type {
  PersonListSort,
  PersonOverview,
  PersonStructureStatus,
} from '../types/person.types';

export type StatusFilter = 'ALL' | PersonStructureStatus;
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

/**
 * Toggle of the quick filter row. The count is only given when it equals the
 * result the filter would show, so a number never contradicts the list.
 */
const QuickFilter: FC<{
  count: number | null;
  label: string;
  onClick: () => void;
  pressed: boolean;
}> = ({ count, label, onClick, pressed }) => (
  <Button
    aria-label={
      count === null
        ? undefined
        : `${label}, ${count.toLocaleString('fr-FR')} fiche${count > 1 ? 's' : ''}`
    }
    aria-pressed={pressed}
    className={directoryStyles.quickFilter}
    onClick={onClick}
    type="button"
    variant="ghost"
  >
    {label}
    {count !== null && (
      <span className={directoryStyles.quickFilterCount}>
        {count.toLocaleString('fr-FR')}
      </span>
    )}
  </Button>
);

type Props = {
  appliedQuery: string;
  applyFilters: (
    query: string,
    status: StatusFilter,
    sort: PersonListSort,
    missingContacts?: boolean,
  ) => void;
  canViewContact?: boolean;
  draftQuery: string;
  error: Error | null;
  isRefreshing: boolean;
  missingContacts: boolean;
  overview: PersonOverview | null;
  setDraftQuery: (query: string) => void;
  sort: PersonListSort;
  status: StatusFilter;
  total: number;
};

export const PersonsListToolbar: FC<Props> = ({
  appliedQuery,
  applyFilters,
  canViewContact = false,
  draftQuery,
  error,
  isRefreshing,
  missingContacts,
  overview,
  setDraftQuery,
  sort,
  status,
  total,
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const focusSearch = (): void => {
    toolbarRef.current
      ?.querySelector<HTMLInputElement>('input[type="search"]')
      ?.focus({ preventScroll: true });
  };
  const hasActiveToolbarFilters = Boolean(
    draftQuery || status !== 'ALL' || sort !== 'name' || missingContacts,
  );
  // The overview counts the whole directory: a count is shown only while no
  // other criterion narrows the result it announces.
  const statusCounts = !appliedQuery && !missingContacts ? overview : null;
  const missingContactsCount =
    !appliedQuery && status === 'ALL' ? (overview?.noContacts ?? null) : null;
  const statusFilters: ReadonlyArray<{
    count: number | null;
    label: string;
    value: StatusFilter;
  }> = [
    { count: statusCounts?.total ?? null, label: 'Tous', value: 'ALL' },
    {
      count: statusCounts?.inStructure ?? null,
      label: PERSON_STRUCTURE_STATUS_LABELS.IN_STRUCTURE,
      value: 'IN_STRUCTURE',
    },
    {
      count: statusCounts?.outsideStructure ?? null,
      label: PERSON_STRUCTURE_STATUS_LABELS.OUTSIDE_STRUCTURE,
      value: 'OUTSIDE_STRUCTURE',
    },
  ];

  return (
    <div className="w-full" ref={toolbarRef}>
      <form
        autoComplete="off"
        aria-label="Rechercher et filtrer les fiches"
        className={directoryStyles.filterForm}
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters(draftQuery, status, sort);
        }}
        role="search"
      >
        <ListSearchField
          ariaLabel={
            canViewContact
              ? 'Rechercher par pseudo, nom ou coordonnée'
              : 'Rechercher par pseudo ou nom'
          }
          maxLength={100}
          onClear={() => applyFilters('', status, sort)}
          onValueChange={setDraftQuery}
          placeholder={
            canViewContact ? 'Pseudo, nom ou coordonnée…' : 'Pseudo ou nom…'
          }
          value={draftQuery}
        />
        <div className={directoryStyles.filterSelects}>
          <Select
            onValueChange={(value) =>
              applyFilters(draftQuery, status, value as PersonListSort)
            }
            value={sort}
          >
            <SelectTrigger
              aria-label="Trier le répertoire"
              className={directoryStyles.selectTrigger}
              variant="compact"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent variant="compact">
              {PERSON_LIST_SORTS.map((item) => (
                <SelectItem key={item} value={item}>
                  {getSortLabel(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            aria-hidden={!hasActiveToolbarFilters || undefined}
            aria-label="Réinitialiser les filtres"
            className={cn(
              directoryStyles.iconButton,
              !hasActiveToolbarFilters && 'pointer-events-none invisible',
            )}
            onClick={() => {
              applyFilters('', 'ALL', 'name', false);
              focusSearch();
            }}
            size="icon"
            tabIndex={hasActiveToolbarFilters ? undefined : -1}
            type="button"
            variant="ghost"
          >
            <RotateCcw aria-hidden="true" />
          </Button>
        </div>
      </form>
      <div className={directoryStyles.filterBar}>
        <div
          aria-label="Filtres rapides"
          className={directoryStyles.quickFilters}
          role="group"
        >
          {statusFilters.map((filter) => (
            <QuickFilter
              count={filter.count}
              key={filter.value}
              label={filter.label}
              onClick={() => {
                if (filter.value !== status)
                  applyFilters(draftQuery, filter.value, sort);
              }}
              pressed={filter.value === status}
            />
          ))}
          {canViewContact && (
            <QuickFilter
              count={missingContactsCount}
              label="Sans coordonnées"
              onClick={() =>
                applyFilters(draftQuery, status, sort, !missingContacts)
              }
              pressed={missingContacts}
            />
          )}
        </div>
        <div className={directoryStyles.listCaption}>
          <p aria-live="polite" role="status">
            {isRefreshing
              ? 'Actualisation…'
              : error
                ? 'Résultats non actualisés'
                : `${total.toLocaleString('fr-FR')} fiche${total !== 1 ? 's' : ''} trouvée${total !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>
    </div>
  );
};
