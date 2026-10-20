'use client';

import { RotateCcw } from 'lucide-react';
import React, { type FC, useRef } from 'react';

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

const RECORD_NOUN = ['fiche', 'fiches'] as const;

type Props = {
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
  // Faceted counts: the server applies the search and the other dimension to
  // each one, so they stay visible and always equal the result they announce.
  const statusFilters: ReadonlyArray<{
    count: number | null;
    label: string;
    value: StatusFilter;
  }> = [
    { count: overview?.total ?? null, label: 'Tous', value: 'ALL' },
    {
      count: overview?.inStructure ?? null,
      label: PERSON_STRUCTURE_STATUS_LABELS.IN_STRUCTURE,
      value: 'IN_STRUCTURE',
    },
    {
      count: overview?.outsideStructure ?? null,
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
          {/* Reset sits before the sort menu so the menu stays flush right. */}
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
        </div>
      </form>
      <div className={directoryStyles.filterBar}>
        <div className={directoryStyles.quickFilterSets}>
          <QuickFilterGroup caption="Statut" label="Filtrer par statut">
            {statusFilters.map((filter) => (
              <QuickFilter
                count={filter.count}
                key={filter.value}
                label={filter.label}
                noun={RECORD_NOUN}
                onClick={() => {
                  if (filter.value !== status)
                    applyFilters(draftQuery, filter.value, sort);
                }}
                pressed={filter.value === status}
              />
            ))}
          </QuickFilterGroup>
          {canViewContact && (
            <QuickFilterGroup
              caption="Coordonnées"
              label="Filtrer par coordonnées"
            >
              <QuickFilter
                count={overview?.noContacts ?? null}
                label="Sans coordonnées"
                noun={RECORD_NOUN}
                onClick={() =>
                  applyFilters(draftQuery, status, sort, !missingContacts)
                }
                pressed={missingContacts}
              />
            </QuickFilterGroup>
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
