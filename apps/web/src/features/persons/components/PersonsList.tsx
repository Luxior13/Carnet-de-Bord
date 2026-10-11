'use client';

import { Plus, Search, Users } from 'lucide-react';
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
import { ApiClientError } from '$utils/api.utils';

import { listPersons } from '../person.api';
import { formatPersonDateTime, getPersonDisplayName } from '../person.ui';
import { retainPersonsCursors } from '../person-list-navigation';
import {
  haveSamePersonsListRequest,
  MAX_PERSONS_PAGE,
  normalizePersonsQuery,
  personsListHref,
  type PersonsListRequest,
  readPersonsListLocation,
} from '../person-list-state';
import type {
  PersonListSort,
  PersonOverview,
  PersonsListResponse,
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
  const location = readPersonsListLocation(
    new URLSearchParams(searchParamsString),
  );
  const effectiveInitialCursor = location.request.cursor;
  const effectiveInitialPageIndex = location.pageIndex;
  const matchingInitialState =
    initialState &&
    haveSamePersonsListRequest(initialState.request, location.request)
      ? initialState
      : undefined;
  const [appliedQuery, setAppliedQuery] = useState(location.request.q);
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
    matchingInitialState?.data ?? null,
  );
  const [dataRequest, setDataRequest] = useState<PersonsListRequest | null>(
    matchingInitialState?.request ?? null,
  );
  const [dataPageIndex, setDataPageIndex] = useState(effectiveInitialPageIndex);
  const [draftQuery, setDraftQuery] = useState(appliedQuery);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(!matchingInitialState);
  const [pageIndex, setPageIndex] = useState(effectiveInitialPageIndex);
  const [sort, setSort] = useState<PersonListSort>(location.request.sort);
  const [status, setStatus] = useState<StatusFilter>(
    location.request.structureStatus ?? 'ALL',
  );
  const [missingContacts, setMissingContacts] = useState(
    searchParams.get('contacts') === 'missing',
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryActionRef = useRef<HTMLButtonElement>(null);
  const retryRequestedRef = useRef(false);
  const consumedInitialState = useRef<typeof initialState>(undefined);
  const cursorCriteriaRef = useRef(
    JSON.stringify([appliedQuery, status, sort, missingContacts]),
  );
  const cursor = cursorStack.get(pageIndex);
  const request: PersonsListRequest = {
    cursor,
    q: appliedQuery,
    sort,
    ...(status === 'ALL' ? {} : { structureStatus: status }),
    ...(missingContacts ? { contacts: 'missing' as const } : {}),
  };
  const initialStateMatchesRequest = Boolean(
    initialState && haveSamePersonsListRequest(initialState.request, request),
  );
  const isDataCurrent = Boolean(
    dataRequest &&
    haveSamePersonsListRequest(dataRequest, request) &&
    dataPageIndex === pageIndex,
  );

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
      !isLoading &&
      !error &&
      data !== null &&
      isDataCurrent &&
      haveSamePersonsListRequest(location.request, request) &&
      location.pageIndex === pageIndex,
    restoreCursors: setCursorStack,
    scope: navigationScope,
  });

  useEffect(() => {
    onOverviewChange?.({
      isLoading: !data && isLoading,
      stats: data?.overview ?? null,
    });
  }, [data, isLoading, onOverviewChange]);

  useEffect(() => {
    if (isLoading || !retryRequestedRef.current) return;
    retryRequestedRef.current = false;
    if (error) {
      cancelPageChange();
      retryActionRef.current?.focus({ preventScroll: true });
    }
  }, [cancelPageChange, error, isLoading]);

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
      const href = personsListHref(
        {
          ...(contacts ? { contacts: 'missing' as const } : {}),
          cursor,
          q: query,
          sort: nextSort,
          ...(nextStatus !== 'ALL' ? { structureStatus: nextStatus } : {}),
        },
        page,
      );
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
      const normalized = normalizePersonsQuery(nextQuery);
      retryRequestedRef.current = false;
      cancelPageChange();
      cursorCriteriaRef.current = JSON.stringify([
        normalized,
        nextStatus,
        nextSort,
        nextMissingContacts,
      ]);
      setAppliedQuery(normalized);
      setDraftQuery(normalized);
      setStatus(nextStatus);
      setSort(nextSort);
      setMissingContacts(nextMissingContacts);
      setCursorStack((current) =>
        current.size === 1 && current.has(0)
          ? current
          : new Map([[0, undefined]]),
      );
      setPageIndex(0);
      updateUrl({
        contacts: nextMissingContacts,
        page: 0,
        query: normalized,
        sort: nextSort,
        status: nextStatus,
      });
    },
    [cancelPageChange, missingContacts, updateUrl],
  );

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const { pageIndex: nextPageIndex, request: nextRequest } =
      readPersonsListLocation(params);
    const nextQuery = nextRequest.q;
    const nextStatus = nextRequest.structureStatus ?? 'ALL';
    const nextSort = nextRequest.sort;
    const nextMissingContacts = Boolean(nextRequest.contacts);
    const nextCursor = nextRequest.cursor;
    const nextCriteria = JSON.stringify([
      nextQuery,
      nextStatus,
      nextSort,
      nextMissingContacts,
    ]);
    const criteriaChanged = cursorCriteriaRef.current !== nextCriteria;
    cursorCriteriaRef.current = nextCriteria;
    if (criteriaChanged) cancelPageChange();
    if (
      personsListHref(nextRequest, nextPageIndex) !==
      `${LIST_PATH}${searchParamsString ? `?${searchParamsString}` : ''}`
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
    // A local URL update can settle after the user has already typed the next
    // search. Only external criteria changes replace that newer draft.
    if (criteriaChanged) setDraftQuery(nextQuery);
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
  }, [cancelPageChange, searchParamsString, updateUrl]);

  useEffect(() => {
    const normalized = normalizePersonsQuery(draftQuery);
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
        cursor,
        limit: PAGE_LIMIT,
        q: appliedQuery,
        signal: controller.signal,
        sort,
        ...(status === 'ALL' ? {} : { structureStatus: status }),
        ...(missingContacts ? { contacts: 'missing' as const } : {}),
      });
      if (!controller.signal.aborted) {
        setData(response);
        setDataPageIndex(pageIndex);
        setDataRequest({
          cursor,
          q: appliedQuery,
          sort,
          ...(status === 'ALL' ? {} : { structureStatus: status }),
          ...(missingContacts ? { contacts: 'missing' as const } : {}),
        });
      }
    } catch (caught) {
      if (!controller.signal.aborted) {
        if (
          caught instanceof ApiClientError &&
          (caught.status === 401 || caught.status === 403)
        ) {
          setData(null);
          setDataRequest(null);
        }
        setError(
          caught instanceof Error ? caught : new Error('Erreur inconnue'),
        );
      }
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [appliedQuery, cursor, missingContacts, pageIndex, sort, status]);

  useEffect(() => {
    const isNewInitialState = initialState !== consumedInitialState.current;
    consumedInitialState.current = initialState;
    if (initialState && isNewInitialState && initialStateMatchesRequest) {
      abortControllerRef.current?.abort();
      setData(initialState.data);
      setDataPageIndex(pageIndex);
      setDataRequest(initialState.request);
      setError(null);
      setIsLoading(false);
    } else {
      void load();
    }

    return (): void => abortControllerRef.current?.abort();
  }, [initialState, initialStateMatchesRequest, load, pageIndex]);

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
        onClick={() => {
          applyFilters(appliedQuery, status, sort);
          preparePageChange();
        }}
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
      draftQuery={draftQuery}
      error={error}
      isRefreshing={isRefreshing}
      missingContacts={missingContacts}
      setDraftQuery={setDraftQuery}
      sort={sort}
      status={status}
      total={total}
    />
  );

  if (!data && isLoading) return <PersonsListSkeleton />;

  if (error && !data) {
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
                {data?.items.length === 0 ? (
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
                    className="group focus-visible:bg-primary/10 focus-visible:ring-ring block px-4 py-3 hover:bg-[var(--surface-row-hover)] focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
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
                              <span>
                                Trouvée par email, téléphone ou réseau
                              </span>
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
        </div>
        <ListPagination
          ariaLabel="Pagination des membres"
          canNext={Boolean(
            data?.pagination.hasMore &&
            data.pagination.nextCursor &&
            pageIndex + 1 < MAX_PERSONS_PAGE,
          )}
          canPrevious={canGoPrevious}
          disabled={Boolean(error) || !isDataCurrent}
          isLoading={isLoading}
          leadingAction={firstPageAction}
          onNext={() => {
            const cursor = data?.pagination.nextCursor;
            if (!cursor) return;
            preparePageChange();
            const nextPage = pageIndex + 1;
            setCursorStack((current) => {
              return retainPersonsCursors(
                new Map(
                  [...current].filter(([index]) => index <= pageIndex),
                ).set(nextPage, cursor),
                nextPage,
              );
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
          onPrevious={() => {
            if (!canGoPrevious) return;
            preparePageChange();
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
          page={dataPageIndex + 1}
          totalPages={totalPages}
        />
      </DataTableSection>
    </div>
  );
};
