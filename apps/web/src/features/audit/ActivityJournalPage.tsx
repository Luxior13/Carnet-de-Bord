'use client';

import { History, RefreshCw, RotateCcw, SearchX, X } from 'lucide-react';
import React, { type FC, useRef } from 'react';

import { ContentState } from '$components/layout/ContentState';
import { PageIdentityHero } from '$components/layout/PageIdentityHero';
import { FEATURES } from '$constants/feature-registry.constants';
import { Button } from '$ui/button';
import { DataTableSection } from '$ui/data-table-section';
import directoryStyles from '$ui/directory.module.css';
import { ListSearchField } from '$ui/list-search-field';
import { ListPagination } from '$ui/pagination';
import { QuickFilter, QuickFilterGroup } from '$ui/quick-filter';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';
import { Skeleton } from '$ui/skeleton';
import { cn } from '$utils/css.utils';

import styles from './ActivityJournal.module.css';
import { ActivityJournalList } from './ActivityJournalList';
import {
  isJournalSearchApplicable,
  JOURNAL_PERIOD_LABELS,
  JOURNAL_PERIODS,
  JOURNAL_SEARCH_MAX_LENGTH,
  JOURNAL_SHOW_LABELS,
  JOURNAL_SHOWS,
  JOURNAL_TYPE_LABELS,
  JOURNAL_TYPES,
  journalLabel,
  type JournalPeriod,
} from './audit-journal.types';
import { useActivityJournal } from './useActivityJournal';

// Counts would need one query per filter: the chips stay without numbers,
// the total of the current view is announced under them.
const NO_COUNT = null;
const EVENT_NOUN = ['événement', 'événements'] as const;

const RowsSkeleton: FC = () => (
  <div aria-label="Chargement du journal" className="space-y-px" role="status">
    {Array.from({ length: 8 }, (_, index) => (
      <Skeleton className="h-12 rounded-none" key={index} />
    ))}
  </div>
);

export const ActivityJournalPage: FC = () => {
  const journal = useActivityJournal();
  const {
    applyFilters,
    changePage,
    clearFilters,
    data,
    hasActiveFilters,
    isLoading,
    isRefreshing,
    loadError,
    query,
    refresh,
    searchDraft,
    setSearchDraft,
  } = journal;
  const toolbarRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const focusSearch = (): void =>
    toolbarRef.current
      ?.querySelector<HTMLInputElement>('input[type="search"]')
      ?.focus({ preventScroll: true });
  const total = data?.pagination.total ?? 0;
  const searchTooShort =
    searchDraft.trim() !== '' && !isJournalSearchApplicable(searchDraft);
  const focusKind = query.person ? 'Fiche' : query.user ? 'Compte' : null;

  return (
    <div className="space-y-[18px]">
      <PageIdentityHero
        description="Qui a fait quoi, quand et sur quel dossier. Lecture seule ; chaque consultation est tracée."
        icon={<History aria-hidden="true" />}
        title={FEATURES.systemActivity.label}
      />
      <div className="space-y-4">
        {loadError && (
          <ContentState
            action={
              <Button
                disabled={isRefreshing}
                onClick={refresh}
                size="sm"
                type="button"
                variant="outline"
              >
                Réessayer
              </Button>
            }
            kind="error"
            title={loadError}
          />
        )}
        <DataTableSection
          className="border-border-content bg-surface-content rounded-panel"
          contentClassName={
            isRefreshing ? 'opacity-60 transition-opacity' : undefined
          }
          headerClassName="bg-surface-content-header"
          toolbar={
            <div className="w-full" ref={toolbarRef}>
              <form
                aria-label="Rechercher et filtrer le journal"
                autoComplete="off"
                className={directoryStyles.filterForm}
                onSubmit={(event) => event.preventDefault()}
                role="search"
              >
                <ListSearchField
                  ariaLabel="Rechercher un auteur ou un compte concerné"
                  maxLength={JOURNAL_SEARCH_MAX_LENGTH}
                  onClear={() => applyFilters({ search: '' })}
                  onValueChange={setSearchDraft}
                  placeholder="Auteur ou compte concerné…"
                  value={searchDraft}
                />
                <div className={directoryStyles.filterSelects}>
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
                  <Button
                    aria-label="Actualiser le journal"
                    className={directoryStyles.iconButton}
                    disabled={isLoading}
                    onClick={refresh}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <RefreshCw aria-hidden="true" />
                  </Button>
                  <Select
                    onValueChange={(value) =>
                      applyFilters({ period: value as JournalPeriod })
                    }
                    value={query.period}
                  >
                    <SelectTrigger
                      aria-label="Période"
                      className={directoryStyles.selectTrigger}
                      variant="compact"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent variant="compact">
                      {JOURNAL_PERIODS.map((period) => (
                        <SelectItem key={period} value={period}>
                          {`Période : ${journalLabel(JOURNAL_PERIOD_LABELS, period)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </form>
              <div className={directoryStyles.filterBar}>
                <div className={directoryStyles.quickFilterSets}>
                  <QuickFilterGroup caption="Type" label="Filtrer par type">
                    {JOURNAL_TYPES.map((type) => (
                      <QuickFilter
                        count={NO_COUNT}
                        key={type}
                        label={journalLabel(JOURNAL_TYPE_LABELS, type)}
                        noun={EVENT_NOUN}
                        onClick={() => {
                          if (type !== query.type) applyFilters({ type });
                        }}
                        pressed={type === query.type}
                      />
                    ))}
                  </QuickFilterGroup>
                  <QuickFilterGroup
                    caption="Afficher"
                    label="Filtrer par importance"
                  >
                    {JOURNAL_SHOWS.map((show) => (
                      <QuickFilter
                        count={NO_COUNT}
                        key={show}
                        label={journalLabel(JOURNAL_SHOW_LABELS, show)}
                        noun={EVENT_NOUN}
                        onClick={() => {
                          if (show !== query.show) applyFilters({ show });
                        }}
                        pressed={show === query.show}
                      />
                    ))}
                  </QuickFilterGroup>
                </div>
                <div className={directoryStyles.listCaption}>
                  <p aria-live="polite" role="status">
                    {searchTooShort
                      ? 'Saisissez au moins trois lettres ou chiffres.'
                      : isLoading
                        ? 'Chargement…'
                        : isRefreshing
                          ? 'Actualisation…'
                          : loadError
                            ? 'Résultats non actualisés'
                            : `${total.toLocaleString('fr-FR')} événement${total > 1 ? 's' : ''} sur ${journalLabel(JOURNAL_PERIOD_LABELS, query.period)}`}
                  </p>
                  {focusKind && (
                    <span className={styles.focus}>
                      {focusKind} :{' '}
                      <span className={styles.focusName}>
                        {data?.focusLabel ?? 'introuvable'}
                      </span>
                      <Button
                        aria-label={`Retirer le filtre ${focusKind.toLowerCase()}`}
                        className={directoryStyles.iconButton}
                        onClick={() =>
                          applyFilters({ person: null, user: null })
                        }
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <X aria-hidden="true" />
                      </Button>
                    </span>
                  )}
                </div>
              </div>
            </div>
          }
        >
          <div
            aria-busy={isLoading || isRefreshing}
            aria-label="Résultats du journal"
            ref={resultsRef}
            tabIndex={-1}
          >
            {isLoading ? (
              <RowsSkeleton />
            ) : data && data.events.length > 0 ? (
              <ActivityJournalList
                events={data.events}
                onFocus={(changes) => applyFilters(changes)}
                query={query}
              />
            ) : (
              <ContentState
                action={
                  hasActiveFilters || focusKind ? (
                    <Button
                      onClick={() => {
                        clearFilters();
                        applyFilters({ person: null, user: null });
                        focusSearch();
                      }}
                      type="button"
                      variant="link"
                    >
                      Effacer les filtres
                    </Button>
                  ) : undefined
                }
                className="min-h-0 border-0 bg-transparent py-10"
                icon={<SearchX className="size-5" />}
                layout="panel"
                title={
                  loadError
                    ? 'Journal indisponible'
                    : hasActiveFilters || focusKind
                      ? 'Aucun événement pour ces filtres'
                      : `Aucun événement sur ${journalLabel(JOURNAL_PERIOD_LABELS, query.period)}`
                }
              />
            )}
            <ListPagination
              ariaLabel="Pagination du journal"
              canNext={
                (data?.pagination.page ?? 1) <
                (data?.pagination.totalPages ?? 1)
              }
              canPrevious={(data?.pagination.page ?? 1) > 1}
              disabled={Boolean(loadError)}
              isLoading={isLoading || isRefreshing}
              onNext={() => {
                changePage(query.page + 1);
                resultsRef.current?.focus({ preventScroll: false });
              }}
              onPrevious={() => {
                changePage(Math.max(1, query.page - 1));
                resultsRef.current?.focus({ preventScroll: false });
              }}
              page={data?.pagination.page ?? query.page}
              totalPages={data?.pagination.totalPages}
            />
          </div>
        </DataTableSection>
      </div>
    </div>
  );
};
