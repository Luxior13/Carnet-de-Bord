'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { PAGINATION } from '$constants/pagination.constants';
import { PAGE_PATHS } from '$constants/routes.constants';
import { ApiClientError } from '$utils/api.utils';

import { listPersons } from '../person.api';
import {
  haveSamePersonsListRequest,
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
import type { StatusFilter } from './PersonsListToolbar';

const PAGE_LIMIT = PAGINATION.DEFAULT_LIMIT;
const SEARCH_DEBOUNCE_MS = 300;
const LIST_PATH = PAGE_PATHS.persons;

type InitialState = {
  data: PersonsListResponse;
  request: PersonsListRequest;
};

type UpdateUrlParams = {
  contacts?: boolean;
  cursor?: string;
  mode?: 'push' | 'replace';
  page: number;
  query: string;
  sort: PersonListSort;
  status: StatusFilter;
};

type UsePersonsListStateParams = {
  /**
   * Ref to cancelPageChange from usePersonsListNavigation.
   * Initialized as a no-op; updated by the component after navigation hook runs.
   * This breaks the circular dependency between data state and navigation state.
   */
  cancelPageChangeRef: React.MutableRefObject<() => void>;
  initialState: InitialState | undefined;
  onOverviewChange?: (state: {
    isLoading: boolean;
    stats: PersonOverview | null;
  }) => void;
};

export type UsePersonsListStateResult = {
  appliedQuery: string;
  cursorStack: Map<number, string | undefined>;
  data: PersonsListResponse | null;
  dataPageIndex: number;
  draftQuery: string;
  error: Error | null;
  isDataCurrent: boolean;
  isLoading: boolean;
  /** True when URL params match the current in-memory request and page. */
  isUrlInSync: boolean;
  missingContacts: boolean;
  pageIndex: number;
  retryRequestedRef: React.MutableRefObject<boolean>;
  sort: PersonListSort;
  status: StatusFilter;
  applyFilters: (
    query: string,
    status: StatusFilter,
    sort: PersonListSort,
    missingContacts?: boolean,
  ) => void;
  load: () => Promise<void>;
  setCursorStack: React.Dispatch<
    React.SetStateAction<Map<number, string | undefined>>
  >;
  setDraftQuery: (query: string) => void;
  setPageIndex: React.Dispatch<React.SetStateAction<number>>;
  updateUrl: (params: UpdateUrlParams) => void;
};

export function usePersonsListState({
  cancelPageChangeRef,
  initialState,
  onOverviewChange,
}: UsePersonsListStateParams): UsePersonsListStateResult {
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
  const isUrlInSync =
    haveSamePersonsListRequest(location.request, request) &&
    location.pageIndex === pageIndex;

  useEffect(() => {
    onOverviewChange?.({
      isLoading: !data && isLoading,
      stats: data?.overview ?? null,
    });
  }, [data, isLoading, onOverviewChange]);

  const updateUrl = useCallback(
    ({
      contacts,
      cursor: urlCursor,
      mode = 'replace',
      page,
      query,
      sort: nextSort,
      status: nextStatus,
    }: UpdateUrlParams): void => {
      const href = personsListHref(
        {
          ...(contacts ? { contacts: 'missing' as const } : {}),
          cursor: urlCursor,
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
      cancelPageChangeRef.current();
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
    [cancelPageChangeRef, missingContacts, updateUrl],
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
    if (criteriaChanged) cancelPageChangeRef.current();
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
  }, [cancelPageChangeRef, searchParamsString, updateUrl]);

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

  return {
    appliedQuery,
    cursorStack,
    data,
    dataPageIndex,
    draftQuery,
    error,
    isDataCurrent,
    isLoading,
    isUrlInSync,
    missingContacts,
    pageIndex,
    retryRequestedRef,
    sort,
    status,
    applyFilters,
    load,
    setCursorStack,
    setDraftQuery,
    setPageIndex,
    updateUrl,
  };
}
