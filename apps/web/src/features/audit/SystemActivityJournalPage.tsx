'use client';

import { ChevronDown, Filter, Loader2, RefreshCw } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { ContentState } from '$components/layout/ContentState';
import { AccessDeniedState } from '$components/layout/PageState';
import { AdminStepUpDialog } from '$components/users/user-detail/AdminStepUpDialog';
import {
  canShowNavigationItem,
  type NavigationSpace,
  type NavItem,
} from '$constants/app.constants';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
import { type ApiResponse, ErrorCode } from '$types/api.types';
import { Button } from '$ui/button';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';

import {
  getPersonAuditFieldLabel,
  getPersonAuditSectionLabel,
} from '../persons/person-audit-display';
import { getAuditContextFilterChips } from './audit-context-filters';
import { AUDIT_ACTION_OPTIONS, formatAuditFullDate } from './audit-display';
import {
  type ActiveFilterChip,
  ALL_FILTER_VALUE,
  AUDIT_CATEGORY_OPTIONS,
  buildServerQuery,
  DEFAULT_FILTERS,
  getFiltersFromSearchParams,
  getPageOptions,
  JOURNAL_POLE_OPTIONS,
  type JournalExportFormat,
  type JournalFilters,
  normalizeJournalFilters,
  normalizeJournalSearch,
  PERIOD_OPTIONS,
  writeFiltersToSearchParams,
} from './journal-filters';
import { JournalEventRow } from './JournalEventRow';
import { JournalToolbar } from './JournalToolbar';
import type {
  SystemActivityJournalLog as JournalLog,
  SystemActivityJournalResponse as JournalResponse,
} from './system-activity.types';

type SystemActivityJournalPageProps = {
  item: NavItem;
  space: NavigationSpace;
};

const JournalSkeleton: FC = () => (
  <div aria-label="Chargement du journal" className="space-y-2" role="status">
    {Array.from({ length: 6 }).map((_, index) => (
      <Skeleton className="h-[4.5rem] rounded-lg" key={index} />
    ))}
  </div>
);

const getDownloadFilename = (
  response: Response,
  format: JournalExportFormat,
): string => {
  const disposition = response.headers.get('content-disposition');
  const match = disposition?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }

  return `journal-activite-${new Date().toISOString().slice(0, 10)}.${format}`;
};

export const SystemActivityJournalPage: FC<SystemActivityJournalPageProps> = ({
  item,
  space,
}) => {
  const { userData } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQueryString = searchParams.toString();
  const filters = useMemo(
    () => getFiltersFromSearchParams(new URLSearchParams(currentQueryString)),
    [currentQueryString],
  );
  const canAccessPage = canShowNavigationItem(userData, item);
  const canExport =
    !!userData &&
    (userData.isProtected ||
      hasPermission(
        userData.role,
        PERMISSIONS.AUDIT.EXPORT,
        userData.permissions,
      ));
  const [searchInput, setSearchInput] = useState(filters.search);
  const [logs, setLogs] = useState<JournalLog[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [openLogId, setOpenLogId] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(canAccessPage);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedCursor, setFailedCursor] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [snapshotAt, setSnapshotAt] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingExport, setPendingExport] = useState<{
    format: JournalExportFormat;
    query: string;
  } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const exportControllerRef = useRef<AbortController | null>(null);
  useEffect(
    () => (): void => {
      exportControllerRef.current?.abort();
    },
    [],
  );
  const hasLoadedOnceRef = useRef(false);
  const eventsId = 'journal-events';
  const pageOptions = useMemo(
    () => getPageOptions(filters.poleKey),
    [filters.poleKey],
  );
  const selectedPole = JOURNAL_POLE_OPTIONS.find(
    (option) => option.value === filters.poleKey,
  ) ?? {
    icon: 'Search' as const,
    label: filters.poleKey.replaceAll('-', ' '),
    tone: 'internal' as const,
    value: ALL_FILTER_VALUE,
  };
  const selectedPage = pageOptions.find(
    (option) => option.value === filters.pageKey,
  ) ?? {
    icon: 'FileText' as const,
    label: filters.pageKey.replaceAll('-', ' ').replaceAll('/', ' / '),
    tone: 'internal' as const,
    value: filters.pageKey,
  };

  const navigateToFilters = useCallback(
    (nextFilters: JournalFilters, replace = false): void => {
      const params = writeFiltersToSearchParams(
        new URLSearchParams(currentQueryString),
        nextFilters,
      );
      const query = params.toString();
      const href = query ? `${pathname}?${query}` : pathname;

      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [currentQueryString, pathname, router],
  );

  const updateFilters = useCallback(
    (patch: Partial<JournalFilters>, replace = false): void => {
      const nextFilters = normalizeJournalFilters({ ...filters, ...patch });
      navigateToFilters(nextFilters, replace);
    },
    [filters, navigateToFilters],
  );

  useEffect(() => {
    const normalized = writeFiltersToSearchParams(
      new URLSearchParams(currentQueryString),
      filters,
    ).toString();
    if (normalized !== currentQueryString)
      router.replace(normalized ? `${pathname}?${normalized}` : pathname, {
        scroll: false,
      });
  }, [currentQueryString, filters, pathname, router]);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  useEffect(() => {
    const normalizedSearch = normalizeJournalSearch(searchInput);
    if (normalizedSearch === filters.search) return;

    const timeout = window.setTimeout(() => {
      updateFilters({ search: normalizedSearch }, true);
    }, 350);

    return (): void => window.clearTimeout(timeout);
  }, [filters.search, searchInput, updateFilters]);

  const serverQuery = useMemo(() => buildServerQuery(filters), [filters]);

  const fetchLogs = useCallback(
    async (cursor?: string): Promise<void> => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const append = !!cursor;
      const params = new URLSearchParams(serverQuery);
      if (cursor) params.set('cursor', cursor);

      if (append) {
        setIsLoadingMore(true);
      } else {
        // The previous cursor belongs to the previous snapshot/filter set and
        // must never be reused while the replacement request is pending.
        setNextCursor(null);
        if (!hasLoadedOnceRef.current) setIsInitialLoading(true);
        else setIsRefreshing(true);
      }
      setError(null);

      try {
        const response = await fetch(
          `/api/systeme/journal-activite?${params.toString()}`,
          { cache: 'no-store', signal: controller.signal },
        );
        const body = (await response.json()) as ApiResponse<JournalResponse>;
        if (!response.ok || !body.success) {
          throw new Error(
            body.success
              ? 'Impossible de charger le journal'
              : body.error.message || 'Impossible de charger le journal',
          );
        }
        if (controller.signal.aborted) return;

        const firstNewLogId = append ? body.data.logs[0]?.id : null;
        setLogs((currentLogs) =>
          append ? [...currentLogs, ...body.data.logs] : body.data.logs,
        );
        setNextCursor(body.data.nextCursor);
        setSnapshotAt(body.data.snapshotAt ?? null);
        setFailedCursor(null);
        setUpdatedAt(new Date());
        hasLoadedOnceRef.current = true;
        setHasLoadedOnce(true);

        if (firstNewLogId) {
          window.requestAnimationFrame(() => {
            const newCard = Array.from(
              document.querySelectorAll<HTMLElement>('[data-log-id]'),
            ).find((element) => element.dataset.logId === firstNewLogId);
            newCard?.querySelector<HTMLElement>('button')?.focus();
          });
        }
      } catch (fetchError) {
        if (
          controller.signal.aborted ||
          (fetchError as { name?: string }).name === 'AbortError'
        )
          return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Impossible de charger le journal',
        );
        setFailedCursor(cursor ?? null);
        if (!hasLoadedOnceRef.current) {
          hasLoadedOnceRef.current = true;
          setHasLoadedOnce(true);
        }
      } finally {
        if (abortControllerRef.current === controller) {
          setIsInitialLoading(false);
          setIsRefreshing(false);
          setIsLoadingMore(false);
        }
      }
    },
    [serverQuery],
  );

  useEffect(() => {
    if (!canAccessPage) return;
    setOpenLogId(null);
    void fetchLogs();

    return (): void => abortControllerRef.current?.abort();
  }, [canAccessPage, fetchLogs]);

  const handleIdentityFilter = (
    identity: string,
    scope: 'actor' | 'target',
    userId: string | null,
  ): void => {
    if (userId) {
      updateFilters(
        scope === 'actor'
          ? { actorId: userId, search: '' }
          : { search: '', targetUserId: userId },
      );
      setSearchInput('');

      return;
    }

    setSearchInput(identity);
    updateFilters({ search: identity });
  };

  const handleResetFilters = (): void => {
    setSearchInput('');
    navigateToFilters(DEFAULT_FILTERS);
  };

  const handleExport = useCallback(
    async (request: {
      format: JournalExportFormat;
      query: string;
    }): Promise<void> => {
      const { format, query } = request;
      if (exportControllerRef.current) return;
      const controller = new AbortController();
      exportControllerRef.current = controller;
      try {
        setIsExporting(true);
        const response = await fetch(`/api/systeme/journal-activite?${query}`, {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          let errorBody: ApiResponse<never> | null = null;
          try {
            errorBody = (await response.clone().json()) as ApiResponse<never>;
          } catch {
            // The server can return a non-JSON infrastructure error.
          }
          if (
            errorBody &&
            !errorBody.success &&
            errorBody.error.code === ErrorCode.REAUTHENTICATION_REQUIRED
          ) {
            setPendingExport(request);

            return;
          }
          throw new Error(
            errorBody && !errorBody.success
              ? errorBody.error.message
              : 'Impossible d’exporter le journal',
          );
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = getDownloadFilename(response, format);
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        if (response.headers.get('X-Export-Truncated') === 'true') {
          toast.warning(
            `Export ${format.toUpperCase()} limité aux 50 000 événements les plus récents`,
          );
        } else {
          toast.success(`Export ${format.toUpperCase()} prêt`);
        }
      } catch (exportError) {
        if (controller.signal.aborted) return;
        toast.error(
          exportError instanceof Error
            ? exportError.message
            : 'Impossible d’exporter le journal',
        );
      } finally {
        exportControllerRef.current = null;
        setIsExporting(false);
      }
    },
    [],
  );

  const activeFilterChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (filters.search)
      chips.push({ key: 'search', label: `Recherche : ${filters.search}` });
    if (filters.actorId) {
      const actor = logs.find((log) => log.userId === filters.actorId);

      chips.push({
        key: 'actorId',
        label: `Auteur : ${actor?.actorName ?? filters.actorId}`,
      });
    }
    if (filters.targetUserId) {
      const target = logs.find(
        (log) => log.targetUserId === filters.targetUserId,
      );

      chips.push({
        key: 'targetUserId',
        label: `Compte concerné : ${target?.targetName ?? filters.targetUserId}`,
      });
    }
    chips.push(
      ...getAuditContextFilterChips(filters).map((chip) => {
        if (filters.entityType !== 'PERSON') return chip;
        if (chip.key === 'entityId') {
          const entityName = logs.find(
            (log) =>
              log.entityId === filters.entityId && log.entityType === 'PERSON',
          )?.entityDisplayName;

          return {
            ...chip,
            label: `Personne : ${entityName ?? filters.entityId}`,
          };
        }

        return {
          ...chip,
          label: `${getPersonAuditSectionLabel(filters.sectionKey)} · ${getPersonAuditFieldLabel(filters.fieldKey)}${filters.recordId ? ` · ${filters.recordId}` : ''}`,
        };
      }),
    );
    if (filters.period !== DEFAULT_FILTERS.period) {
      chips.push({
        key: 'period',
        label:
          filters.period === 'custom'
            ? `Du ${new Date(filters.from).toLocaleDateString('fr-FR')} au ${new Date(filters.to).toLocaleDateString('fr-FR')}`
            : (PERIOD_OPTIONS.find((option) => option.value === filters.period)
                ?.label ?? filters.period),
      });
    }
    if (filters.action !== ALL_FILTER_VALUE) {
      chips.push({
        key: 'action',
        label:
          AUDIT_ACTION_OPTIONS.find((option) => option.value === filters.action)
            ?.label ?? filters.action,
      });
    }
    if (
      filters.logType === 'activity' &&
      filters.category !== ALL_FILTER_VALUE
    ) {
      chips.push({
        key: 'category',
        label:
          AUDIT_CATEGORY_OPTIONS.find(
            (option) => option.value === filters.category,
          )?.label ?? filters.category,
      });
    }
    if (
      filters.logType === 'activity' &&
      filters.poleKey !== ALL_FILTER_VALUE
    ) {
      chips.push({ key: 'poleKey', label: selectedPole.label });
    }
    if (
      filters.logType === 'activity' &&
      filters.pageKey !== ALL_FILTER_VALUE
    ) {
      chips.push({ key: 'pageKey', label: selectedPage.label });
    }

    return chips;
  }, [filters, logs, selectedPage.label, selectedPole.label]);

  const removeFilter = (key: keyof JournalFilters): void => {
    if (key === 'entityId' || key === 'entityType') {
      updateFilters({
        entityId: '',
        entityType: '',
        fieldKey: '',
        recordId: '',
        sectionKey: '',
      });

      return;
    }
    if (key === 'fieldKey' || key === 'sectionKey' || key === 'recordId') {
      updateFilters({ fieldKey: '', recordId: '', sectionKey: '' });

      return;
    }
    if (key === 'period') {
      updateFilters({ from: '', period: DEFAULT_FILTERS.period, to: '' });

      return;
    }
    if (key === 'poleKey') {
      updateFilters({ pageKey: ALL_FILTER_VALUE, poleKey: ALL_FILTER_VALUE });

      return;
    }
    if (key === 'search') setSearchInput('');
    // key is restricted to the closed JournalFilters union.
    // eslint-disable-next-line security/detect-object-injection
    updateFilters({ [key]: DEFAULT_FILTERS[key] });
  };

  const liveStatus = isInitialLoading
    ? 'Chargement du journal'
    : isRefreshing
      ? 'Actualisation du journal'
      : isLoadingMore
        ? 'Chargement des événements suivants'
        : `${logs.length} événements chargés${nextCursor ? ', davantage disponibles' : ''}`;

  if (!canAccessPage) {
    return (
      <AuthenticatedLayout
        breadcrumbs={[
          { href: space.href, label: space.label },
          { label: item.label },
        ]}
      >
        <AccessDeniedState
          actionHref="/tableau-de-bord"
          actionLabel="Retour au tableau de bord"
          description="Vous n'avez pas les permissions nécessaires pour accéder au journal global."
        />
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout
      breadcrumbs={[
        { href: space.href, label: space.label },
        { label: item.label },
      ]}
    >
      <PageShell className="py-0">
        <PageCanvas contentClassName="space-y-5">
          <header className="space-y-2">
            <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
              {item.label}
            </h1>
            <p className="text-muted-foreground text-sm">
              Retrouvez les actions, leurs auteurs et les changements associés.
            </p>
          </header>
          <JournalToolbar
            activeFilterChips={activeFilterChips}
            canExport={canExport}
            exportBlocked={
              !hasLoadedOnce || Boolean(error) || pendingExport !== null
            }
            filters={filters}
            isExporting={isExporting}
            onExport={(format) => {
              void handleExport({
                format,
                query: buildServerQuery(filters, { exportFormat: format }),
              });
            }}
            onFilter={updateFilters}
            onRefresh={() => void fetchLogs()}
            onRemove={removeFilter}
            onReset={handleResetFilters}
            onSearch={setSearchInput}
            refreshing={isRefreshing || isInitialLoading || isLoadingMore}
            search={searchInput}
          />

          <section aria-labelledby="journal-events-title" className="space-y-2">
            <div className="flex flex-wrap items-end justify-between gap-2 px-1">
              <div>
                <h2
                  className="text-foreground text-base font-semibold"
                  id="journal-events-title"
                >
                  Événements
                </h2>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {logs.length} chargé{logs.length > 1 ? 's' : ''}
                  {nextCursor ? ' · davantage disponibles' : ''}
                  {updatedAt
                    ? ` · actualisé à ${updatedAt.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    : ''}
                </p>
              </div>
            </div>

            <div aria-live="polite" className="sr-only">
              {liveStatus}
            </div>
            {snapshotAt && (
              <span className="sr-only">
                Instantané du {formatAuditFullDate(snapshotAt)}
              </span>
            )}

            <div
              aria-busy={isInitialLoading || isRefreshing || isLoadingMore}
              id={eventsId}
            >
              {!hasLoadedOnce && isInitialLoading ? (
                <JournalSkeleton />
              ) : error && logs.length === 0 ? (
                <ContentState
                  action={
                    <Button
                      onClick={() => void fetchLogs()}
                      type="button"
                      variant="outline"
                    >
                      <RefreshCw className="size-4" />
                      Réessayer
                    </Button>
                  }
                  description={error}
                  kind="error"
                  layout="panel"
                  title="Journal indisponible"
                />
              ) : logs.length === 0 ? (
                <ContentState
                  description="Modifiez les filtres ou la période pour élargir la recherche."
                  icon={<Filter className="size-5" />}
                  layout="panel"
                  title="Aucun événement pour ces filtres"
                />
              ) : (
                <div className="space-y-2">
                  {isRefreshing && (
                    <div className="text-primary-emphasis flex items-center gap-2 px-1 text-xs">
                      <Loader2 className="size-3.5 animate-spin" />
                      Actualisation en cours… Les résultats restent affichés.
                    </div>
                  )}
                  {error && (
                    <ContentState
                      action={
                        <Button
                          disabled={isLoadingMore}
                          onClick={() =>
                            void fetchLogs(failedCursor ?? undefined)
                          }
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Réessayer
                        </Button>
                      }
                      description="Les résultats de la dernière lecture réussie restent affichés ; ils peuvent différer des filtres sélectionnés."
                      kind="error"
                      title={error}
                    />
                  )}
                  <div className="border-border-default bg-surface-panel-raised overflow-hidden rounded-[8px] border">
                    <div
                      aria-hidden="true"
                      className="text-muted-foreground border-border-divider hidden grid-cols-[1.25rem_minmax(0,1fr)_10rem_10rem_1.25rem] gap-3 border-b px-4 py-2 text-xs @min-[48rem]/page:grid @min-[64rem]/page:grid-cols-[1.25rem_minmax(0,1fr)_13rem_10rem_1.25rem]"
                    >
                      <span />
                      <span>Événement · objet concerné</span>
                      <span>Auteur</span>
                      <span className="text-right">Date et heure</span>
                      <span />
                    </div>
                    {logs.map((log) => (
                      <JournalEventRow
                        isOpen={openLogId === log.id}
                        key={log.id}
                        log={log}
                        onIdentityFilter={handleIdentityFilter}
                        onToggle={() =>
                          setOpenLogId((currentId) =>
                            currentId === log.id ? null : log.id,
                          )
                        }
                      />
                    ))}
                  </div>
                  {nextCursor && !error && (
                    <div className="pt-2 text-center">
                      <Button
                        className="h-11 rounded-[8px] lg:h-10"
                        aria-disabled={
                          isLoadingMore || isRefreshing || isInitialLoading
                        }
                        onClick={() => {
                          if (
                            !isLoadingMore &&
                            !isRefreshing &&
                            !isInitialLoading
                          )
                            void fetchLogs(nextCursor);
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {isLoadingMore ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                        Charger plus
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </PageCanvas>
      </PageShell>

      <AdminStepUpDialog
        actorLoginName={userData?.loginName ?? ''}
        description="Confirmez votre identité pour exporter les événements et leurs détails autorisés."
        onCancel={() => setPendingExport(null)}
        onComplete={async () => {
          const request = pendingExport;
          setPendingExport(null);
          if (request) await handleExport(request);
        }}
        open={pendingExport !== null}
        title="Confirmer l’export du journal"
      />
    </AuthenticatedLayout>
  );
};
