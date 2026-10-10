'use client';

import { ChevronLeft, ChevronRight, Plus, Search, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, {
  type FC,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { ContentState } from '$components/layout/ContentState';
import { PAGINATION } from '$constants/pagination.constants';
import { PAGE_PATHS, personDetailPath } from '$constants/routes.constants';
import { Button } from '$ui/button';
import {
  DataTableDesktop,
  DataTableMobileList,
  DataTableSection,
} from '$ui/data-table-section';
import directoryStyles from '$ui/directory.module.css';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '$ui/table';
import { cn } from '$utils/css.utils';

import { listPersons } from '../person.api';
import {
  PERSON_LIST_SORTS,
  PERSON_STRUCTURE_STATUSES,
} from '../person.constants';
import { formatPersonDateTime, getPersonDisplayName } from '../person.ui';
import {
  haveSamePersonsListRequest,
  MAX_PERSONS_PAGE,
  normalizePersonsPageIndex,
  type PersonsListRequest,
} from '../person-list-state';
import type {
  PersonListSort,
  PersonOverview,
  PersonsListResponse,
  PersonStructureStatus,
} from '../types/person.types';
import { PersonAvatar } from './PersonAvatar';
import {
  PersonContacts,
  PersonIdentity,
  PersonLastModified,
} from './PersonListCells';
import { PersonsListSkeleton } from './PersonsListSkeleton';
import { PersonsListToolbar, type StatusFilter } from './PersonsListToolbar';
import { PersonStatusBadge } from './PersonStatusBadge';
import { usePersonsListNavigation } from './usePersonsListNavigation';

type PersonsListProps = {
  canCreate: boolean;
  createHref: string;
  initialState?: {
    data: PersonsListResponse;
    request: PersonsListRequest;
  };
  navigationScope?: string;
  onOverviewChange?: (state: {
    isLoading: boolean;
    stats: PersonOverview | null;
  }) => void;
  returnHref: string;
};

const PAGE_LIMIT = PAGINATION.DEFAULT_LIMIT;
const SEARCH_DEBOUNCE_MS = 300;
const LIST_PATH = PAGE_PATHS.persons;

const normalizeQuery = (value: string | null): string =>
  value?.trim().slice(0, 100) ?? '';

const normalizeStatus = (value: string | null): StatusFilter =>
  PERSON_STRUCTURE_STATUSES.includes(value as PersonStructureStatus)
    ? (value as PersonStructureStatus)
    : 'ALL';

const normalizeSort = (value: string | null): PersonListSort =>
  PERSON_LIST_SORTS.includes(value as PersonListSort)
    ? (value as PersonListSort)
    : 'name';

const normalizeCursor = (value: string | null): string | undefined =>
  value && value.length <= 2_048 ? value : undefined;

const buildPersonHref = (personId: string, returnHref: string): string => {
  const params = new URLSearchParams({ returnTo: returnHref });

  return `${personDetailPath(personId)}?${params}`;
};

export const PersonsList: FC<PersonsListProps> = ({
  canCreate,
  createHref,
  initialState,
  navigationScope = '',
  onOverviewChange,
  returnHref,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const initialPageIndex = normalizePersonsPageIndex(searchParams.get('page'));
  const initialCursor = normalizeCursor(searchParams.get('cursor'));
  const effectiveInitialCursor =
    initialPageIndex > 0 ? initialCursor : undefined;
  const effectiveInitialPageIndex = effectiveInitialCursor
    ? initialPageIndex
    : 0;
  const [appliedQuery, setAppliedQuery] = useState(() =>
    normalizeQuery(searchParams.get('q')),
  );
  const [cursorStack, setCursorStack] = useState<
    Map<number, string | undefined>
  >(
    () =>
      new Map([
        [0, undefined],
        [effectiveInitialPageIndex, effectiveInitialCursor],
      ]),
  );
  const [data, setData] = useState<PersonsListResponse | null>(
    initialState?.data ?? null,
  );
  const [draftQuery, setDraftQuery] = useState(appliedQuery);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(!initialState);
  const [pageIndex, setPageIndex] = useState(effectiveInitialPageIndex);
  const [sort, setSort] = useState<PersonListSort>(() =>
    normalizeSort(searchParams.get('sort')),
  );
  const [status, setStatus] = useState<StatusFilter>(() =>
    normalizeStatus(searchParams.get('structureStatus')),
  );
  const [missingContacts, setMissingContacts] = useState(
    searchParams.get('contacts') === 'missing',
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const cursorCriteriaRef = useRef(
    JSON.stringify([appliedQuery, status, sort, missingContacts]),
  );
  const initialStateMatchesRequest = Boolean(
    initialState &&
    haveSamePersonsListRequest(initialState.request, {
      cursor: cursorStack.get(pageIndex),
      q: appliedQuery,
      sort,
      ...(status === 'ALL' ? {} : { structureStatus: status }),
      ...(missingContacts ? { contacts: 'missing' as const } : {}),
    }),
  );

  const { containerRef, onClickCapture } = usePersonsListNavigation({
    cursors: cursorStack,
    href: returnHref,
    ready: !isLoading && !error && data !== null,
    restoreCursors: setCursorStack,
    scope: navigationScope,
  });

  useEffect(() => {
    onOverviewChange?.({
      isLoading: !data && isLoading,
      stats: data?.overview ?? null,
    });
  }, [data, isLoading, onOverviewChange]);

  const updateUrl = useCallback(
    ({
      contacts,
      cursor,
      mode = 'replace',
      page,
      query,
      sort: nextSort,
      status: nextStatus,
    }: {
      contacts?: boolean;
      cursor?: string;
      mode?: 'push' | 'replace';
      page: number;
      query: string;
      sort: PersonListSort;
      status: StatusFilter;
    }): void => {
      const params = new URLSearchParams();
      if (contacts) params.set('contacts', 'missing');
      if (query) params.set('q', query);
      if (nextStatus !== 'ALL') {
        params.set('structureStatus', nextStatus);
      }
      if (nextSort !== 'name') params.set('sort', nextSort);
      if (cursor && page > 0) params.set('cursor', cursor);
      if (page > 0) params.set('page', String(page + 1));
      const href = `${LIST_PATH}${params.size ? `?${params}` : ''}`;
      if (mode === 'push') router.push(href, { scroll: false });
      else router.replace(href, { scroll: false });
    },
    [router],
  );

  const applyFilters = useCallback(
    (
      nextQuery: string,
      nextStatus: StatusFilter,
      nextSort: PersonListSort,
      nextMissingContacts = missingContacts,
    ): void => {
      const normalized = normalizeQuery(nextQuery);
      setAppliedQuery(normalized);
      setDraftQuery(normalized);
      setStatus(nextStatus);
      setSort(nextSort);
      setMissingContacts(nextMissingContacts);
      setCursorStack(new Map([[0, undefined]]));
      setPageIndex(0);
      updateUrl({
        contacts: nextMissingContacts,
        page: 0,
        query: normalized,
        sort: nextSort,
        status: nextStatus,
      });
    },
    [missingContacts, updateUrl],
  );

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const nextQuery = normalizeQuery(params.get('q'));
    const nextStatus = normalizeStatus(params.get('structureStatus'));
    const nextSort = normalizeSort(params.get('sort'));
    const nextMissingContacts = params.get('contacts') === 'missing';
    const requestedPageIndex = normalizePersonsPageIndex(params.get('page'));
    const requestedCursor = normalizeCursor(params.get('cursor'));
    const nextCursor = requestedPageIndex > 0 ? requestedCursor : undefined;
    const nextPageIndex = nextCursor ? requestedPageIndex : 0;
    const nextCriteria = JSON.stringify([
      nextQuery,
      nextStatus,
      nextSort,
      nextMissingContacts,
    ]);
    const criteriaChanged = cursorCriteriaRef.current !== nextCriteria;
    cursorCriteriaRef.current = nextCriteria;
    if (
      (params.has('page') &&
        params.get('page') !== String(nextPageIndex + 1)) ||
      (params.has('cursor') && !nextCursor) ||
      (params.has('contacts') && !nextMissingContacts)
    ) {
      updateUrl({
        contacts: nextMissingContacts,
        cursor: nextCursor,
        page: nextPageIndex,
        query: nextQuery,
        sort: nextSort,
        status: nextStatus,
      });
    }
    setAppliedQuery(nextQuery);
    setDraftQuery(nextQuery);
    setStatus(nextStatus);
    setSort(nextSort);
    setMissingContacts(nextMissingContacts);
    setPageIndex(nextPageIndex);
    setCursorStack((current) => {
      if (
        !criteriaChanged &&
        current.has(nextPageIndex) &&
        current.get(nextPageIndex) === nextCursor
      ) {
        return current;
      }

      // An unknown cursor may belong to a different snapshot. Keep only the
      // first-page fallback instead of reusing an unrelated cursor history.
      return new Map([
        [0, undefined],
        [nextPageIndex, nextCursor],
      ]);
    });
  }, [searchParamsString, updateUrl]);

  useEffect(() => {
    const normalized = normalizeQuery(draftQuery);
    if (normalized === appliedQuery) return;
    const timer = window.setTimeout(() => {
      applyFilters(normalized, status, sort);
    }, SEARCH_DEBOUNCE_MS);

    return (): void => window.clearTimeout(timer);
  }, [appliedQuery, applyFilters, draftQuery, sort, status]);

  const load = useCallback(async (): Promise<void> => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setError(null);
    setIsLoading(true);
    try {
      const response = await listPersons({
        cursor: cursorStack.get(pageIndex),
        limit: PAGE_LIMIT,
        q: appliedQuery,
        signal: controller.signal,
        sort,
        ...(status === 'ALL' ? {} : { structureStatus: status }),
        ...(missingContacts ? { contacts: 'missing' as const } : {}),
      });
      if (!controller.signal.aborted) setData(response);
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(
          caught instanceof Error ? caught : new Error('Erreur inconnue'),
        );
      }
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [appliedQuery, cursorStack, missingContacts, pageIndex, sort, status]);

  useEffect(() => {
    if (initialState && initialStateMatchesRequest) {
      abortControllerRef.current?.abort();
      setData(initialState.data);
      setError(null);
      setIsLoading(false);

      return;
    }

    void load();

    return (): void => abortControllerRef.current?.abort();
  }, [initialState, initialStateMatchesRequest, load]);

  const personHref = useCallback(
    (personId: string) => buildPersonHref(personId, returnHref),
    [returnHref],
  );
  const isFiltered = Boolean(
    appliedQuery || status !== 'ALL' || missingContacts,
  );
  const isRefreshing = isLoading && data !== null;
  const previousCursor = cursorStack.get(pageIndex - 1);
  const canGoPrevious =
    pageIndex === 1 || (pageIndex > 1 && previousCursor !== undefined);
  const total = data?.pagination.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const firstPageAction =
    pageIndex > 0 ? (
      <Button
        className="min-h-11 sm:min-h-8"
        onClick={() => applyFilters(appliedQuery, status, sort)}
        size="sm"
        type="button"
        variant="outline"
        disabled={isLoading}
      >
        Première page
      </Button>
    ) : null;
  const errorActions = (
    <div className="flex flex-wrap gap-2">
      {firstPageAction}
      <Button onClick={() => void load()} size="sm" variant="outline">
        Réessayer
      </Button>
    </div>
  );

  const emptyAction =
    firstPageAction ??
    (isFiltered ? (
      <Button
        onClick={() => applyFilters('', 'ALL', 'name', false)}
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

  if (!data && isLoading) return <PersonsListSkeleton />;

  if (error && !data) {
    return (
      <ContentState
        action={errorActions}
        description={error.message}
        icon={<Users aria-hidden="true" className="size-5" />}
        kind="error"
        layout="panel"
        title="Chargement impossible"
      />
    );
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
        className="border-border-content bg-surface-content rounded-[10px]"
        contentClassName={isRefreshing ? 'opacity-55' : undefined}
        headerClassName="bg-surface-content-header"
        toolbar={
          <PersonsListToolbar
            applyFilters={applyFilters}
            draftQuery={draftQuery}
            error={error}
            isRefreshing={isRefreshing}
            missingContacts={missingContacts}
            setDraftQuery={setDraftQuery}
            sort={sort}
            status={status}
            total={total}
          />
        }
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
              {data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-44 text-center">
                    <ContentState
                      action={emptyAction}
                      className="min-h-0 border-0 bg-transparent p-0"
                      icon={<Users aria-hidden="true" className="size-5" />}
                      layout="panel"
                      title={
                        isFiltered ? 'Aucune fiche trouvée' : 'Répertoire vide'
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((person) => {
                  const href = personHref(person.id);

                  return (
                    <TableRow
                      className="focus-within:ring-ring relative focus-within:ring-2 focus-within:ring-inset"
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
          {data?.items.length === 0 ? (
            <ContentState
              action={emptyAction}
              className="min-h-48 border-0 bg-transparent"
              icon={<Users aria-hidden="true" className="size-5" />}
              layout="panel"
              title={isFiltered ? 'Aucune fiche trouvée' : 'Répertoire vide'}
            />
          ) : (
            data?.items.map((person) => {
              const href = personHref(person.id);

              return (
                <Link
                  aria-label={`Ouvrir la fiche de ${getPersonDisplayName(person)}`}
                  className="group focus-visible:bg-primary/10 focus-visible:ring-primary/70 block px-4 py-3 hover:bg-[var(--surface-row-hover)] focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                  href={href}
                  key={person.id}
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="border-border-default bg-surface-inset relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[7px] border"
                    >
                      <PersonAvatar
                        className="size-full rounded-[inherit]"
                        person={person}
                      />
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="min-w-0">
                        <h3 className="text-foreground group-hover:text-primary-emphasis min-w-0 text-[13px] font-semibold [overflow-wrap:anywhere] group-hover:underline group-hover:underline-offset-[3px]">
                          {getPersonDisplayName(person)}
                        </h3>
                        {person.matchedByContact && (
                          <p className="text-success mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] leading-5">
                            <Search
                              aria-hidden="true"
                              className="size-3 shrink-0"
                            />
                            <span>Trouvée par email, téléphone ou réseau</span>
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <PersonStatusBadge status={person.structureStatus} />
                        <PersonContacts person={person} />
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-5 tabular-nums">
                        Modifiée le {formatPersonDateTime(person.updatedAt)}
                        {person.lastModifiedBy && (
                          <span className="block [overflow-wrap:anywhere]">
                            Par {person.lastModifiedBy.displayName}
                            {person.lastModifiedBy.loginName &&
                            person.lastModifiedBy.loginName !==
                              person.lastModifiedBy.displayName
                              ? ` (${person.lastModifiedBy.loginName})`
                              : ''}
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
        <nav
          aria-label="Pagination des membres"
          className={cn(directoryStyles.pagination, 'flex-wrap gap-2')}
        >
          <p>
            Page <strong>{pageIndex + 1}</strong>
            {totalPages > 1 ? (
              <>
                {' '}
                sur <strong>{totalPages}</strong>
              </>
            ) : null}
          </p>
          <div className={directoryStyles.paginationActions}>
            {firstPageAction}
            <Button
              aria-label="Page précédente"
              className={directoryStyles.pageButton}
              disabled={!canGoPrevious || isLoading || Boolean(error)}
              onClick={() => {
                if (!canGoPrevious) return;
                const nextPage = pageIndex - 1;
                const cursor = cursorStack.get(nextPage);
                setPageIndex(nextPage);
                updateUrl({
                  contacts: missingContacts,
                  cursor,
                  mode: 'push',
                  page: nextPage,
                  query: appliedQuery,
                  sort,
                  status,
                });
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
                !data?.pagination.hasMore ||
                !data.pagination.nextCursor ||
                isLoading ||
                Boolean(error) ||
                pageIndex + 1 >= MAX_PERSONS_PAGE
              }
              onClick={() => {
                const cursor = data?.pagination.nextCursor;
                if (!cursor) return;
                const nextPage = pageIndex + 1;
                setCursorStack((current) => {
                  return new Map(
                    [...current].filter(([index]) => index <= pageIndex),
                  ).set(nextPage, cursor);
                });
                setPageIndex(nextPage);
                updateUrl({
                  contacts: missingContacts,
                  cursor,
                  mode: 'push',
                  page: nextPage,
                  query: appliedQuery,
                  sort,
                  status,
                });
              }}
              size="icon"
              type="button"
              variant="ghost"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </nav>
      </DataTableSection>
    </div>
  );
};
