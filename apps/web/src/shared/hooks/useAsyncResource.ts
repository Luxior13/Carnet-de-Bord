'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type AsyncResourceState<TData> = {
  data: TData | null;
  error: Error | null;
  isLoading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  reset: () => void;
};

type UseAsyncResourceOptions<TData> = {
  enabled?: boolean;
  initialData?: TData | null;
  keepPreviousData?: boolean;
};

/**
 * Standard cancellable loader for feature pages. The loader must be stable
 * (usually wrapped in useCallback) so effects only rerun intentionally.
 */
export const useAsyncResource = <TData>(
  loader: (signal: AbortSignal) => Promise<TData>,
  options: UseAsyncResourceOptions<TData> = {},
): AsyncResourceState<TData> => {
  const {
    enabled = true,
    initialData = null,
    keepPreviousData = true,
  } = options;
  const [data, setData] = useState<TData | null>(initialData);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(enabled && initialData === null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const dataRef = useRef<TData | null>(initialData);
  const requestSequenceRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (!enabled) return;

    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    if (dataRef.current === null) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const nextData = await loader(controller.signal);
      if (
        controller.signal.aborted ||
        requestSequence !== requestSequenceRef.current
      ) {
        return;
      }
      dataRef.current = nextData;
      setData(nextData);
    } catch (loadError) {
      if (controller.signal.aborted) return;
      setError(
        loadError instanceof Error
          ? loadError
          : new Error('Impossible de charger les données'),
      );
      if (!keepPreviousData) {
        dataRef.current = null;
        setData(null);
      }
    } finally {
      if (requestSequence === requestSequenceRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [enabled, keepPreviousData, loader]);

  const reset = useCallback((): void => {
    requestSequenceRef.current += 1;
    controllerRef.current?.abort();
    dataRef.current = initialData;
    setData(initialData);
    setError(null);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [initialData]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);

      return;
    }

    void refresh();

    return (): void => controllerRef.current?.abort();
  }, [enabled, refresh]);

  return { data, error, isLoading, isRefreshing, refresh, reset };
};
