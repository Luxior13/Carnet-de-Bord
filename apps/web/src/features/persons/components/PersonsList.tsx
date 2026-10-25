'use client';

import { Plus, Users } from 'lucide-react';
import Link from 'next/link';
import React, { type FC, useCallback, useEffect, useRef } from 'react';

import { ContentState } from '$components/layout/ContentState';
import { PAGINATION } from '$constants/pagination.constants';
import { personDetailPath } from '$constants/routes.constants';
import { Button } from '$ui/button';
import {
  DataTableDesktop,
  DataTableMobileList,
  DataTableSection,
} from '$ui/data-table-section';
import directoryStyles from '$ui/directory.module.css';
import { ListPagination } from '$ui/pagination';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '$ui/table';

import {
  formatPersonActor,
  formatPersonDateTime,
  getPersonDisplayName,
} from '../person.ui';
import { retainPersonsCursors } from '../person-list-navigation';
import {
  MAX_PERSONS_PAGE,
  type PersonsListRequest,
} from '../person-list-state';
import type { PersonsListResponse } from '../types/person.types';
import {
  PersonAvatarFrame,
  PersonContactMatchHint,
  PersonContacts,
  PersonIdentity,
  PersonLastModified,
} from './PersonListCells';
import { PersonsListSkeleton } from './PersonsListSkeleton';
import { PersonsListToolbar } from './PersonsListToolbar';
import { PersonStatusBadge } from './PersonStatusBadge';
import { usePersonsListNavigation } from './usePersonsListNavigation';
import { usePersonsListState } from './usePersonsListState';

type PersonsListProps = {
  canCreate: boolean;
  canViewContact?: boolean;
  createHref: string;
  initialState?: {
    data: PersonsListResponse;
    request: PersonsListRequest;
  };
  navigationScope?: string;
  returnHref: string;
};

const PAGE_LIMIT = PAGINATION.DEFAULT_LIMIT;

const buildPersonHref = (personId: string, returnHref: string): string => {
  const params = new URLSearchParams({ returnTo: returnHref });

  return `${personDetailPath(personId)}?${params}`;
};

export const PersonsList: FC<PersonsListProps> = ({
  canCreate,
  canViewContact = false,
  createHref,
  initialState,
  navigationScope = '',
  returnHref,
}) => {
  // cancelPageChange comes from usePersonsListNavigation but is also needed by
  // usePersonsListState. A ref breaks the circular dependency: it's initialised
  // as a no-op and updated to the real function after navigation hook runs.
  const cancelPageChangeRef = useRef<() => void>(() => {});

  const {
    appliedQuery,
    applyFilters,
    cursorStack,
    data,
    dataPageIndex,
    draftQuery,
    error,
    isDataCurrent,
    isLoading,
    isUrlInSync,
    load,
    missingContacts,
    pageIndex,
    retryRequestedRef,
    setCursorStack,
    setDraftQuery,
    setPageIndex,
    sort,
    status,
    updateUrl,
  } = usePersonsListState({
    cancelPageChangeRef,
    initialState,
  });

  const {
    cancelPageChange,
    containerRef,
    onClickCapture,
    preparePageChange,
    resultsRef,
  } = usePersonsListNavigation({
    cursors: cursorStack,
    href: returnHref,
    ready:
      !isLoading && !error && data !== null && isDataCurrent && isUrlInSync,
    restoreCursors: setCursorStack,
    scope: navigationScope,
  });

  // Keep the ref in sync so usePersonsListState can call cancelPageChange.
  cancelPageChangeRef.current = cancelPageChange;

  const retryActionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isLoading || !retryRequestedRef.current) return;
    retryRequestedRef.current = false;
    if (error) {
      cancelPageChange();
      retryActionRef.current?.focus({ preventScroll: true });
    }
  }, [cancelPageChange, error, isLoading, retryRequestedRef]);

  const personHref = useCallback(
    (personId: string) => buildPersonHref(personId, returnHref),
    [returnHref],
  );

  const isFiltered = Boolean(
    appliedQuery || status !== 'ALL' || missingContacts,
  );
  const isRefreshing = (isLoading || !isDataCurrent) && data !== null && !error;
  const previousCursor = cursorStack.get(pageIndex - 1);
  const canGoPrevious =
    pageIndex === 1 || (pageIndex > 1 && previousCursor !== undefined);
  const total = data?.pagination.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const firstPageAction =
    pageIndex > 0 ? (
      <Button
        className="min-h-11 sm:min-h-8"
        disabled={isLoading}
        onClick={() => {
          applyFilters(appliedQuery, status, sort);
          preparePageChange();
        }}
        size="sm"
        type="button"
        variant="outline"
      >
        Première page
      </Button>
    ) : null;

  const errorActions = (
    <div className="flex flex-wrap gap-2">
      {firstPageAction}
      <Button
        disabled={isLoading}
        onClick={() => {
          preparePageChange();
          retryRequestedRef.current = true;
          void load();
        }}
        ref={retryActionRef}
        size="sm"
        type="button"
        variant="outline"
      >
        Réessayer
      </Button>
    </div>
  );

  const emptyAction =
    firstPageAction ??
    (isFiltered ? (
      <Button
        onClick={() => {
          applyFilters('', 'ALL', 'name', false);
          containerRef.current
            ?.querySelector<HTMLInputElement>('input[type="search"]')
            ?.focus({ preventScroll: true });
        }}
        size="sm"
        type="button"
        variant="link"
      >
        Réinitialiser
      </Button>
    ) : canCreate ? (
      <Button asChild size="sm">
        <Link href={createHref}>
          <Plus className="size-4" />
          Ajouter une fiche
        </Link>
      </Button>
    ) : undefined);

  const toolbar = (
    <PersonsListToolbar
      applyFilters={applyFilters}
      canViewContact={canViewContact}
      draftQuery={draftQuery}
      error={error}
      isRefreshing={isRefreshing}
      missingContacts={missingContacts}
      overview={data?.overview ?? null}
      setDraftQuery={setDraftQuery}
      sort={sort}
      status={status}
      total={total}
    />
  );

  if (!data) {
    if (error) {
      return (
        <DataTableSection toolbar={toolbar}>
          <ContentState
            action={errorActions}
            description={error.message}
            icon={<Users aria-hidden="true" className="size-5" />}
            kind="error"
            layout="panel"
            title="Chargement impossible"
          />
        </DataTableSection>
      );
    }

    return <PersonsListSkeleton />;
  }

  return (
    <div
      className="space-y-4"
      ref={containerRef}
      onClickCapture={onClickCapture}
    >
      {error && data && (
        <ContentState
          action={errorActions}
          description="Les résultats précédents restent affichés."
          icon={<Users aria-hidden="true" className="size-5" />}
          kind="error"
          title="Actualisation impossible"
        />
      )}
      <DataTableSection
        className="border-border-content bg-surface-content rounded-panel"
        contentClassName={isRefreshing ? 'opacity-55' : undefined}
        headerClassName="bg-surface-content-header"
        toolbar={toolbar}
      >
        <div
          aria-busy={isRefreshing}
          aria-label="Résultats du répertoire"
          ref={resultsRef}
          tabIndex={-1}
        >
          <DataTableDesktop>
            <Table
              aria-busy={isRefreshing}
              aria-label="Liste des fiches"
              className={directoryStyles.table}
            >
              <TableCaption className="sr-only">
                Les fiches du répertoire, leur statut et leurs coordonnées
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Personne</TableHead>
                  <TableHead className="w-[130px]">Statut</TableHead>
                  <TableHead className="w-[220px]">Coordonnées</TableHead>
                  <TableHead className="w-[150px]">
                    Dernière modification
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-44 text-center">
                      <ContentState
                        action={emptyAction}
                        className="min-h-0 border-0 bg-transparent p-0"
                        icon={<Users aria-hidden="true" className="size-5" />}
                        layout="panel"
                        title={
                          isFiltered
                            ? 'Aucune fiche trouvée'
                            : 'Répertoire vide'
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((person) => {
                    const href = personHref(person.id);

                    return (
                      <TableRow
                        className="has-[a:focus-visible]:ring-ring relative has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-inset"
                        key={person.id}
                      >
                        <TableCell>
                          <PersonIdentity href={href} person={person} />
                        </TableCell>
                        <TableCell className="pointer-events-none">
                          <PersonStatusBadge status={person.structureStatus} />
                        </TableCell>
                        <TableCell className="pointer-events-none">
                          <PersonContacts person={person} />
                        </TableCell>
                        <TableCell>
                          <PersonLastModified person={person} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </DataTableDesktop>
          <DataTableMobileList className={directoryStyles.mobileList}>
            {data.items.length === 0 ? (
              <ContentState
                action={emptyAction}
                className="min-h-48 border-0 bg-transparent"
                icon={<Users aria-hidden="true" className="size-5" />}
                layout="panel"
                title={isFiltered ? 'Aucune fiche trouvée' : 'Répertoire vide'}
              />
            ) : (
              data.items.map((person) => {
                const href = personHref(person.id);

                return (
                  <Link
                    aria-label={`Ouvrir la fiche de ${getPersonDisplayName(person)}`}
                    className="group focus-visible:bg-primary/10 focus-visible:ring-ring block px-4 py-3 hover:bg-[var(--surface-row-hover)] focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                    href={href}
                    key={person.id}
                  >
                    <div className="flex items-start gap-3">
                      <PersonAvatarFrame person={person} />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="min-w-0">
                          <h3 className="text-foreground group-hover:text-primary-emphasis min-w-0 text-sm font-semibold [overflow-wrap:anywhere] group-hover:underline group-hover:underline-offset-[3px]">
                            {getPersonDisplayName(person)}
                          </h3>
                          {person.matchedByContact && (
                            <PersonContactMatchHint />
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <PersonStatusBadge status={person.structureStatus} />
                          <PersonContacts person={person} />
                        </div>
                        <p className="text-muted-foreground text-xs leading-5 tabular-nums">
                          Modifiée le {formatPersonDateTime(person.updatedAt)}
                          {person.lastModifiedBy && (
                            <span className="block [overflow-wrap:anywhere]">
                              Par {formatPersonActor(person.lastModifiedBy)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </DataTableMobileList>
        </div>
        <ListPagination
          ariaLabel="Pagination des membres"
          canNext={Boolean(
            data.pagination.hasMore &&
            data.pagination.nextCursor &&
            pageIndex + 1 < MAX_PERSONS_PAGE,
          )}
          canPrevious={canGoPrevious}
          disabled={Boolean(error) || !isDataCurrent}
          isLoading={isLoading}
          leadingAction={firstPageAction}
          onNext={() => {
            const nextCursor = data.pagination.nextCursor;
            if (!nextCursor) return;
            preparePageChange();
            const nextPage = pageIndex + 1;
            setCursorStack((current) =>
              retainPersonsCursors(
                new Map(
                  [...current].filter(([index]) => index <= pageIndex),
                ).set(nextPage, nextCursor),
                nextPage,
              ),
            );
            setPageIndex(nextPage);
            updateUrl({
              contacts: missingContacts,
              cursor: nextCursor,
              mode: 'push',
              page: nextPage,
              query: appliedQuery,
              sort,
              status,
            });
          }}
          onPrevious={() => {
            if (!canGoPrevious) return;
            preparePageChange();
            const nextPage = pageIndex - 1;
            const prevCursor = cursorStack.get(nextPage);
            setPageIndex(nextPage);
            updateUrl({
              contacts: missingContacts,
              cursor: prevCursor,
              mode: 'push',
              page: nextPage,
              query: appliedQuery,
              sort,
              status,
            });
          }}
          page={dataPageIndex + 1}
          totalPages={totalPages}
        />
      </DataTableSection>
    </div>
  );
};
