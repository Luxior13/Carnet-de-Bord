'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

/** Local view filters participate in browser history without fetching the page again. */
export function usePageQuery(): {
  searchParams: ReturnType<typeof useSearchParams>;
  updateQuery: (
    updates: Record<string, string | null>,
    mode?: 'push' | 'replace',
  ) => void;
} {
  const searchParams = useSearchParams();
  const updateQuery = useCallback(
    (
      updates: Record<string, string | null>,
      mode: 'push' | 'replace' = 'push',
    ): void => {
      const url = new URL(window.location.href);
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') url.searchParams.delete(key);
        else url.searchParams.set(key, value);
      }
      const href = `${url.pathname}${url.search}${url.hash}`;
      if (
        href ===
        `${window.location.pathname}${window.location.search}${window.location.hash}`
      )
        return;
      if (mode === 'replace') window.history.replaceState(null, '', href);
      else window.history.pushState(null, '', href);
    },
    [],
  );

  return { searchParams, updateQuery };
}
