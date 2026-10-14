'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  appendUserAuditFilters,
  getUserAuditFiltersFromParams,
  getUserAuditFiltersKey,
} from '$components/users/user-detail/user-detail-page.helpers';
import type {
  UserHistoryFacets,
  UserHistoryFilters,
} from '$components/users/user-detail/UserHistoryTab';
import type { UserDetailSectionId } from '$components/users/user-detail/UserDetailNavigation';
import type { AuditLogEntry } from '$types/auth.types';

type UseUserDetailAuditParams = {
  activeSection: UserDetailSectionId;
  canFetchUserAudit: boolean;
  currentQueryString: string;
  initialFilters: UserHistoryFilters;
  pathname: string;
  requestStepUpForResponse: (
    data: unknown,
    action: { description: string; execute: () => void; title: string },
  ) => boolean;
  userId: string;
};

type UseUserDetailAuditReturn = {
  auditError: string | null;
  auditExportHref: string;
  auditFacets: UserHistoryFacets | null;
  auditFilters: UserHistoryFilters;
  auditLogs: AuditLogEntry[];
  handleAuditExport: () => Promise<void>;
  handleAuditFiltersChange: (nextFilters: UserHistoryFilters) => void;
  hasMoreAuditLogs: boolean;
  isExportingAudit: boolean;
  isLoadingAudit: boolean;
  isLoadingMoreAudit: boolean;
  onLoadMoreAudit: () => void;
  onRetryAudit: () => void;
  refreshAuditAfterMutation: () => void;
  shouldShowAuditLoading: boolean;
};

export function useUserDetailAudit({
  activeSection,
  canFetchUserAudit,
  currentQueryString,
  initialFilters,
  pathname,
  requestStepUpForResponse,
  userId,
}: UseUserDetailAuditParams): UseUserDetailAuditReturn {
  const auditAbortControllerRef = useRef<AbortController | null>(null);
  const hasLoadedAuditLogsRef = useRef(false);

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditNextCursor, setAuditNextCursor] = useState<string | null>(null);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [isExportingAudit, setIsExportingAudit] = useState(false);
  const [auditFacets, setAuditFacets] = useState<UserHistoryFacets | null>(
    null,
  );
  const [auditFilters, setAuditFilters] =
    useState<UserHistoryFilters>(initialFilters);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [isLoadingMoreAudit, setIsLoadingMoreAudit] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const requestedAuditFilters = useMemo(
    () => getUserAuditFiltersFromParams(new URLSearchParams(currentQueryString)),
    [currentQueryString],
  );

  const fetchAuditData = useCallback(async (): Promise<void> => {
    auditAbortControllerRef.current?.abort();
    auditAbortControllerRef.current = null;

    if (!canFetchUserAudit) {
      setAuditLogs([]);
      setAuditNextCursor(null);
      setAuditHasMore(false);
      setAuditFacets(null);
      setAuditError(null);
      setIsLoadingAudit(false);
      setIsLoadingMoreAudit(false);
      hasLoadedAuditLogsRef.current = false;

      return;
    }

    const controller = new AbortController();
    auditAbortControllerRef.current = controller;

    try {
      setIsLoadingAudit(true);
      setIsLoadingMoreAudit(false);
      setAuditError(null);
      const auditParams = new URLSearchParams({
        includeFacets: 'true',
        includeStats: 'false',
      });
      appendUserAuditFilters(auditParams, auditFilters);

      const response = await fetch(
        `/api/users/${userId}/audit?${auditParams.toString()}`,
        {
          signal: controller.signal,
        },
      );
      const data = await response.json();

      if (controller.signal.aborted) return;

      if (response.ok && data.success) {
        const loadedLogs = data.data.logs as AuditLogEntry[];

        setAuditLogs(loadedLogs);
        setAuditNextCursor(data.data.nextCursor ?? null);
        setAuditHasMore(data.data.hasMore === true);
        setAuditFacets(data.data.facets ?? null);
        hasLoadedAuditLogsRef.current = true;
      } else {
        setAuditError(
          data.error?.message || "Impossible de charger l'historique",
        );
      }
    } catch {
      if (controller.signal.aborted) return;

      setAuditError("Impossible de charger l'historique");
    } finally {
      if (auditAbortControllerRef.current !== controller) return;

      auditAbortControllerRef.current = null;
      setIsLoadingAudit(false);
    }
  }, [auditFilters, canFetchUserAudit, userId]);

  const fetchMoreAuditData = useCallback(async (): Promise<void> => {
    if (!canFetchUserAudit || isLoadingMoreAudit) return;
    if (!auditHasMore || !auditNextCursor) return;

    auditAbortControllerRef.current?.abort();

    const controller = new AbortController();
    const auditParams = new URLSearchParams({
      cursor: auditNextCursor,
      includeFacets: 'false',
      includeStats: 'false',
    });
    appendUserAuditFilters(auditParams, auditFilters);
    auditAbortControllerRef.current = controller;

    try {
      setIsLoadingMoreAudit(true);
      setAuditError(null);

      const response = await fetch(
        `/api/users/${userId}/audit?${auditParams.toString()}`,
        { signal: controller.signal },
      );
      const data = await response.json();

      if (controller.signal.aborted) return;
      if (!response.ok || !data.success) {
        setAuditError(
          data.error?.message || "Impossible de charger plus d'historique",
        );

        return;
      }

      const nextLogs = data.data.logs as AuditLogEntry[];

      setAuditLogs((currentLogs) => {
        const knownIds = new Set(currentLogs.map((entry) => entry.id));

        return [
          ...currentLogs,
          ...nextLogs.filter((entry) => !knownIds.has(entry.id)),
        ];
      });
      setAuditNextCursor(data.data.nextCursor ?? null);
      setAuditHasMore(data.data.hasMore === true);
    } catch {
      if (controller.signal.aborted) return;

      setAuditError("Impossible de charger plus d'historique");
    } finally {
      if (auditAbortControllerRef.current !== controller) return;

      auditAbortControllerRef.current = null;
      setIsLoadingMoreAudit(false);
    }
  }, [
    auditFilters,
    auditHasMore,
    auditNextCursor,
    canFetchUserAudit,
    isLoadingMoreAudit,
    userId,
  ]);

  const handleAuditFiltersChange = useCallback(
    (nextFilters: UserHistoryFilters): void => {
      auditAbortControllerRef.current?.abort();
      auditAbortControllerRef.current = null;
      hasLoadedAuditLogsRef.current = false;
      setAuditFilters(nextFilters);
      setAuditLogs([]);
      setAuditNextCursor(null);
      setAuditHasMore(false);
      setAuditFacets(null);
      setAuditError(null);
      setIsLoadingAudit(false);
      setIsLoadingMoreAudit(false);

      const nextParams = new URLSearchParams(currentQueryString);
      nextParams.delete('scope');
      nextParams.delete('period');
      nextParams.delete('poleKey');
      nextParams.delete('pageKey');
      appendUserAuditFilters(nextParams, nextFilters);
      window.history.replaceState(
        null,
        '',
        `${pathname}?${nextParams.toString()}`,
      );
    },
    [currentQueryString, pathname],
  );

  const refreshAuditAfterMutation = useCallback((): void => {
    hasLoadedAuditLogsRef.current = false;
    if (activeSection === 'history') void fetchAuditData();
  }, [activeSection, fetchAuditData]);

  // Synchronise requestedAuditFilters → auditFilters when URL changes externally
  useEffect(() => {
    if (
      getUserAuditFiltersKey(requestedAuditFilters) ===
      getUserAuditFiltersKey(auditFilters)
    ) {
      return;
    }

    auditAbortControllerRef.current?.abort();
    auditAbortControllerRef.current = null;
    hasLoadedAuditLogsRef.current = false;
    setAuditFilters(requestedAuditFilters);
    setAuditLogs([]);
    setAuditNextCursor(null);
    setAuditHasMore(false);
    setAuditFacets(null);
    setAuditError(null);
    setIsLoadingAudit(false);
    setIsLoadingMoreAudit(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditFilters, requestedAuditFilters]);

  // Load audit logs when switching to history tab
  useEffect(() => {
    if (activeSection !== 'history' || hasLoadedAuditLogsRef.current) return;
    void fetchAuditData();
  }, [activeSection, fetchAuditData]);

  const auditExportParams = new URLSearchParams({ format: 'csv' });
  appendUserAuditFilters(auditExportParams, auditFilters);
  const auditExportHref = `/api/users/${userId}/audit?${auditExportParams.toString()}`;

  const handleAuditExport = useCallback(async (): Promise<void> => {
    if (isExportingAudit) return;

    try {
      setIsExportingAudit(true);
      const response = await fetch(auditExportHref, { cache: 'no-store' });

      if (!response.ok) {
        let errorBody: unknown = null;
        try {
          errorBody = await response.clone().json();
        } catch {
          // Infrastructure errors are not guaranteed to be JSON.
        }

        if (
          requestStepUpForResponse(errorBody, {
            description:
              'L’export contient l’historique de sécurité de ce compte.',
            execute: handleAuditExport,
            title: 'Confirmer l’export du journal',
          })
        ) {
          return;
        }

        const errorMessage = (
          errorBody as { error?: { message?: unknown } } | null
        )?.error?.message;
        throw new Error(
          typeof errorMessage === 'string'
            ? errorMessage
            : 'Impossible d’exporter l’activité de cet utilisateur',
        );
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `activite-utilisateur_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);

      if (response.headers.get('X-Export-Truncated') === 'true') {
        toast.warning('Export limité aux 50 000 événements les plus récents');
      } else {
        toast.success('Export complet prêt');
      }
    } catch (exportError) {
      toast.error(
        exportError instanceof Error
          ? exportError.message
          : 'Impossible d’exporter l’activité de cet utilisateur',
      );
    } finally {
      setIsExportingAudit(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditExportHref, isExportingAudit, requestStepUpForResponse]);

  const hasMoreAuditLogs = auditHasMore;
  const shouldShowAuditLoading =
    isLoadingAudit ||
    (!hasLoadedAuditLogsRef.current &&
      auditError === null &&
      auditLogs.length === 0);

  return {
    auditError,
    auditExportHref,
    auditFacets,
    auditFilters,
    auditLogs,
    handleAuditExport,
    handleAuditFiltersChange,
    hasMoreAuditLogs,
    isExportingAudit,
    isLoadingAudit,
    isLoadingMoreAudit,
    onLoadMoreAudit: () => void fetchMoreAuditData(),
    onRetryAudit: () => void fetchAuditData(),
    refreshAuditAfterMutation,
    shouldShowAuditLoading,
  };
}
