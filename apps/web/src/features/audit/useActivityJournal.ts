'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  buildJournalParams,
  isJournalSearchApplicable,
  type JournalQuery,
  type JournalResponse,
  readJournalQuery,
} from './audit-journal.types';

const SEARCH_DELAY_MS = 350;
const LOAD_ERROR = 'Impossible de charger le journal';

export type ActivityJournalController = {
  /** Applies new filters: back to page 1 and a fresh reading instant. */
  applyFilters: (changes: Partial<Omit<JournalQuery, 'page'>>) => void;
  changePage: (page: number) => void;
  clearFilters: () => void;
  data: JournalResponse | null;
  hasActiveFilters: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  loadError: string | null;
  query: JournalQuery;
  refresh: () => void;
  searchDraft: string;
  setSearchDraft: (value: string) => void;
};

const queryKey = (query: JournalQuery): string =>
  buildJournalParams(query).toString();

/**
 * State of the activity journal, kept in the URL like the other lists. A
 * page change keeps the reading instant of the first page, so the pages stay
 * the same while new events arrive; « Actualiser » and any filter take a new
 * one.
 */
export const useActivityJournal = (): ActivityJournalController => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQueryString = searchParams.toString();
  const [query, setQuery] = useState<JournalQuery>(() =>
    readJournalQuery(new URLSearchParams(urlQueryString)),
  );
  const [searchDraft, setSearchDraft] = useState(query.search);
  const [data, setData] = useState<JournalResponse | null>(null);
  const [dataKey, setDataKey] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const asOfRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastUrlRef = useRef(queryKey(query));
  const pageNavigationRef = useRef(false);

  // Back and forward buttons: the URL leads, with a fresh reading instant.
  useEffect((): void => {
    const next = readJournalQuery(new URLSearchParams(urlQueryString));
    const nextKey = queryKey(next);
    if (nextKey === lastUrlRef.current) return;
    lastUrlRef.current = nextKey;
    asOfRef.current = null;
    setQuery(next);
    setSearchDraft(next.search);
  }, [urlQueryString]);

  // The URL follows the state: a new entry for a page, a replacement else.
  useEffect((): void => {
    const key = queryKey(query);
    if (key === lastUrlRef.current) return;
    lastUrlRef.current = key;
    const href = key ? `${pathname}?${key}` : pathname;
    if (pageNavigationRef.current) window.history.pushState(null, '', href);
    else window.history.replaceState(null, '', href);
    pageNavigationRef.current = false;
  }, [pathname, query]);

  useEffect((): (() => void) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const key = queryKey(query);
    const params = buildJournalParams(query);
    if (query.page > 1 && asOfRef.current) params.set('asOf', asOfRef.current);
    setIsFetching(true);
    setLoadError(null);
    void (async (): Promise<void> => {
      try {
        const response = await fetch(`/api/audit?${params}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        // A refusal discards what was shown, even without a readable body.
        if (response.status === 401 || response.status === 403) {
          setData(null);
          setDataKey(null);
        }
        const body = (await response.json()) as {
          data?: JournalResponse;
          error?: { message?: string };
          success?: boolean;
        };
        if (controller.signal.aborted) return;
        if (!response.ok || !body.success || !body.data) {
          setLoadError(body.error?.message ?? LOAD_ERROR);

          return;
        }
        asOfRef.current = body.data.asOf;
        setData(body.data);
        setDataKey(key);
      } catch {
        if (!controller.signal.aborted) setLoadError(LOAD_ERROR);
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setIsFetching(false);
        }
      }
    })();

    return (): void => controller.abort();
  }, [query, reloadToken]);

  // The search applies after a pause, and only from three letters or digits.
  useEffect((): (() => void) => {
    const normalized = searchDraft.trim().replace(/\s+/gu, ' ');
    const applied = isJournalSearchApplicable(normalized) ? normalized : '';
    if (applied === query.search) return () => undefined;
    const timer = setTimeout((): void => {
      asOfRef.current = null;
      setQuery((current) => ({ ...current, page: 1, search: applied }));
    }, SEARCH_DELAY_MS);

    return (): void => clearTimeout(timer);
  }, [query.search, searchDraft]);

  const applyFilters = useCallback(
    (changes: Partial<Omit<JournalQuery, 'page'>>): void => {
      asOfRef.current = null;
      setQuery((current) => ({ ...current, ...changes, page: 1 }));
      if (changes.search !== undefined) setSearchDraft(changes.search);
    },
    [],
  );

  const changePage = (page: number): void => {
    if (isFetching || page === query.page) return;
    pageNavigationRef.current = true;
    setQuery((current) => ({ ...current, page }));
  };

  const clearFilters = (): void => {
    asOfRef.current = null;
    setSearchDraft('');
    setQuery((current) => ({
      ...current,
      page: 1,
      period: '7d',
      search: '',
      show: 'all',
      type: 'all',
    }));
  };

  const refresh = (): void => {
    asOfRef.current = null;
    if (query.page === 1) setReloadToken((token) => token + 1);
    else setQuery((current) => ({ ...current, page: 1 }));
  };

  const hasData = dataKey === queryKey(query);

  return {
    applyFilters,
    changePage,
    clearFilters,
    // A response only describes the criteria that produced it.
    data: hasData ? data : null,
    hasActiveFilters:
      query.type !== 'all' ||
      query.show !== 'all' ||
      query.period !== '7d' ||
      query.search !== '' ||
      searchDraft !== '',
    isLoading: !hasData && !loadError,
    isRefreshing: hasData && isFetching,
    loadError,
    query,
    refresh,
    searchDraft,
    setSearchDraft,
  };
};
