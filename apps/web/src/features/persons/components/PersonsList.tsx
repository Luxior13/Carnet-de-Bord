'use client';

import {
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Share2,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, {
  type FC,
  useCallback,
  useEffect,
  useId,
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
import { Input } from '$ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';
import { Skeleton } from '$ui/skeleton';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '$ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';
import { cn } from '$utils/css.utils';

import { listPersons } from '../person.api';
import {
  PERSON_LIST_SORTS,
  PERSON_STRUCTURE_STATUS_LABELS,
  PERSON_STRUCTURE_STATUSES,
} from '../person.constants';
import { formatPersonDateTime, getPersonDisplayName } from '../person.ui';
import {
  haveSamePersonsListRequest,
  type PersonsListRequest,
} from '../person-list-state';
import type {
  PersonListSort,
  PersonOverview,
  PersonsListResponse,
  PersonStructureStatus,
  PersonSummary,
} from '../types/person.types';
import { PersonAvatar } from './PersonAvatar';
import { PersonStatusBadge } from './PersonStatusBadge';

type PersonsListProps = {
  canCreate: boolean;
  createHref: string;
  initialState?: {
    data: PersonsListResponse;
    request: PersonsListRequest;
  };
  onOverviewChange?: (state: {
    isLoading: boolean;
    stats: PersonOverview | null;
  }) => void;
  returnHref: string;
};

type StatusFilter = 'ALL' | PersonStructureStatus;

const PAGE_LIMIT = PAGINATION.DEFAULT_LIMIT;
const SEARCH_DEBOUNCE_MS = 300;
const LIST_PATH = PAGE_PATHS.persons;

const SORT_LABELS = {
  created: 'Ajoutées récemment',
  name: 'Nom (A–Z)',
  updated: 'Modifiées récemment',
} as const satisfies Record<PersonListSort, string>;

const getSortLabel = (sort: PersonListSort): string => {
  if (sort === 'created') return SORT_LABELS.created;
  if (sort === 'updated') return SORT_LABELS.updated;

  return SORT_LABELS.name;
};

const getStatusLabel = (status: PersonStructureStatus): string =>
  status === 'IN_STRUCTURE'
    ? PERSON_STRUCTURE_STATUS_LABELS.IN_STRUCTURE
    : PERSON_STRUCTURE_STATUS_LABELS.OUTSIDE_STRUCTURE;

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

const normalizePageIndex = (value: string | null): number => {
  const page = Number.parseInt(value ?? '', 10);

  return Number.isFinite(page) && page > 1 ? page - 1 : 0;
};

const normalizeCursor = (value: string | null): string | undefined =>
  value && value.length <= 2_048 ? value : undefined;

export const PersonsListSkeleton: FC = () => (
  <div
    aria-label="Chargement du répertoire"
    className="border-border-content bg-surface-content overflow-hidden rounded-[10px] border"
    role="status"
  >
    <div className="bg-surface-content-header p-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <Skeleton className="bg-surface-table-head h-[38px] min-w-[180px] flex-1 rounded-md" />
        <Skeleton className="bg-surface-table-head hidden h-[38px] w-[170px] rounded-md sm:block" />
        <Skeleton className="bg-surface-table-head hidden h-[38px] w-[170px] rounded-md sm:block" />
      </div>
    </div>
    <div aria-hidden="true" className="divide-border-divider divide-y">
      {[...Array(6)].map((_, index) => (
        <div className="flex items-center gap-2.5 px-4 py-3" key={index}>
          <Skeleton className="bg-surface-table-head size-9 shrink-0 rounded-[7px]" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="bg-surface-table-head h-[13px] w-40 max-w-full rounded-sm" />
            <Skeleton className="bg-surface-table-head h-[10px] w-24 max-w-full rounded-sm" />
          </div>
          <Skeleton className="bg-surface-table-head hidden h-5 w-28 rounded-full sm:block" />
          <Skeleton className="bg-surface-table-head hidden h-4 w-28 rounded-sm lg:block" />
        </div>
      ))}
    </div>
  </div>
);

const ContactCount: FC<{
  count: number;
  icon: React.ReactNode;
  label: string;
}> = ({ count, icon, label }) => (
  <span
    aria-label={`${count} ${label}`}
    className={cn(
      'inline-flex items-center gap-1 text-[10px] tabular-nums',
      count === 0 && 'opacity-50',
    )}
    title={`${count} ${label}`}
  >
    {icon}
    {count}
  </span>
);

const PersonContacts: FC<{ person: PersonSummary }> = ({ person }) => {
  const { emails, phones, socialProfiles } = person.contactCounts;
  const total = emails + phones + socialProfiles;

  if (total === 0) {
    return (
      <span
        aria-label="Aucune coordonnée"
        className="text-muted-foreground text-[11px]"
      >
        —
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-[5px] border border-[var(--border-external)] bg-[var(--surface-external)] px-1.5 py-0.5 text-[10px] leading-5 font-medium whitespace-nowrap text-[var(--text-external)]">
        <Share2 aria-hidden="true" className="size-3.5 shrink-0" />
        {total} coordonnée{total > 1 ? 's' : ''}
      </span>
      <span className="text-muted-foreground flex flex-nowrap items-center gap-x-2 gap-y-1 text-[10px]">
        <ContactCount
          count={emails}
          icon={<Mail aria-hidden="true" className="size-3" />}
          label="email(s)"
        />
        <ContactCount
          count={phones}
          icon={<Phone aria-hidden="true" className="size-3" />}
          label="téléphone(s)"
        />
        <ContactCount
          count={socialProfiles}
          icon={<Share2 aria-hidden="true" className="size-3" />}
          label="profil(s) social(aux)"
        />
      </span>
    </div>
  );
};

const PersonLastModified: FC<{
  person: PersonSummary;
}> = ({ person }) => {
  const actor = person.lastModifiedBy;
  const time = (
    <time dateTime={person.updatedAt}>
      {formatPersonDateTime(person.updatedAt)}
    </time>
  );

  if (!actor) {
    return <span className="text-muted-foreground text-[11px]">{time}</span>;
  }

  const actorLabel = `Modifiée par ${actor.displayName}${
    actor.loginName && actor.loginName !== actor.displayName
      ? ` (${actor.loginName})`
      : ''
  }`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={`${actorLabel}, le ${formatPersonDateTime(person.updatedAt)}`}
          className="text-muted-foreground text-[11px]"
        >
          {time}
        </span>
      </TooltipTrigger>
      <TooltipContent>{actorLabel}</TooltipContent>
    </Tooltip>
  );
};

const PersonIdentity: FC<{
  href: string;
  person: PersonSummary;
}> = ({ href, person }) => (
  <div className="flex min-w-0 items-center gap-2.5">
    <span
      aria-hidden="true"
      className="border-border-default bg-surface-inset relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[7px] border"
    >
      <PersonAvatar className="size-full rounded-[inherit]" person={person} />
    </span>
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-1.5">
        <Link
          className="text-foreground hover:text-primary-emphasis text-[13px] leading-[1.6] font-semibold after:absolute after:inset-0 hover:underline hover:underline-offset-[3px]"
          href={href}
        >
          <span className="truncate">{getPersonDisplayName(person)}</span>
        </Link>
      </div>
      {person.matchedByContact && (
        <p className="text-success mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] leading-5">
          <Search aria-hidden="true" className="size-3 shrink-0" />
          <span className="truncate">
            Trouvée par email, téléphone ou réseau
          </span>
        </p>
      )}
    </div>
  </div>
);

const buildPersonHref = (personId: string, returnHref: string): string => {
  const params = new URLSearchParams({ returnTo: returnHref });

  return `${personDetailPath(personId)}?${params}`;
};

const DirectorySelect: FC<{
  ariaLabel: string;
  onValueChange: (value: string) => void;
  options: ReadonlyArray<{ label: string; value: string }>;
  value: string;
}> = ({ ariaLabel, onValueChange, options, value }) => (
  <Select onValueChange={onValueChange} value={value}>
    <SelectTrigger
      aria-label={ariaLabel}
      className={directoryStyles.selectTrigger}
    >
      <SelectValue />
    </SelectTrigger>
    <SelectContent className={directoryStyles.selectContent}>
      {options.map((option) => (
        <SelectItem
          className={directoryStyles.selectOption}
          key={option.value}
          value={option.value}
        >
          {option.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export const PersonsList: FC<PersonsListProps> = ({
  canCreate,
  createHref,
  initialState,
  onOverviewChange,
  returnHref,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputId = useId();
  const searchParamsString = searchParams.toString();
  const initialPageIndex = normalizePageIndex(searchParams.get('page'));
  const initialCursor = normalizeCursor(searchParams.get('cursor'));
  const effectiveInitialCursor =
    initialPageIndex > 0 ? initialCursor : undefined;
  const effectiveInitialPageIndex = effectiveInitialCursor
    ? initialPageIndex
    : 0;
  const [appliedQuery, setAppliedQuery] = useState(() =>
    normalizeQuery(searchParams.get('q')),
  );
  const [cursorStack, setCursorStack] = useState<Array<string | undefined>>(
    () => {
      return [
        ...Array<string | undefined>(effectiveInitialPageIndex),
        effectiveInitialCursor,
      ];
    },
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const initialStateMatchesRequest = Boolean(
    initialState &&
    haveSamePersonsListRequest(initialState.request, {
      cursor: cursorStack.at(pageIndex),
      q: appliedQuery,
      sort,
      ...(status === 'ALL' ? {} : { structureStatus: status }),
    }),
  );

  useEffect(() => {
    onOverviewChange?.({
      isLoading: !data && isLoading,
      stats: data?.overview ?? null,
    });
  }, [data, isLoading, onOverviewChange]);

  const updateUrl = useCallback(
    ({
      cursor,
      mode = 'replace',
      page,
      query,
      sort: nextSort,
      status: nextStatus,
    }: {
      cursor?: string;
      mode?: 'push' | 'replace';
      page: number;
      query: string;
      sort: PersonListSort;
      status: StatusFilter;
    }): void => {
      const params = new URLSearchParams();
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
    ): void => {
      const normalized = normalizeQuery(nextQuery);
      setAppliedQuery(normalized);
      setDraftQuery(normalized);
      setStatus(nextStatus);
      setSort(nextSort);
      setCursorStack([undefined]);
      setPageIndex(0);
      updateUrl({
        page: 0,
        query: normalized,
        sort: nextSort,
        status: nextStatus,
      });
    },
    [updateUrl],
  );

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const nextQuery = normalizeQuery(params.get('q'));
    const nextStatus = normalizeStatus(params.get('structureStatus'));
    const nextSort = normalizeSort(params.get('sort'));
    const requestedPageIndex = normalizePageIndex(params.get('page'));
    const requestedCursor = normalizeCursor(params.get('cursor'));
    const nextCursor = requestedPageIndex > 0 ? requestedCursor : undefined;
    const nextPageIndex = nextCursor ? requestedPageIndex : 0;
    setAppliedQuery(nextQuery);
    setDraftQuery(nextQuery);
    setStatus(nextStatus);
    setSort(nextSort);
    setPageIndex(nextPageIndex);
    setCursorStack((current) => {
      if (
        current.length >= nextPageIndex + 1 &&
        current.at(nextPageIndex) === nextCursor
      ) {
        return current;
      }
      const requiredLength = Math.max(current.length, nextPageIndex + 1);

      return [
        ...current.slice(0, nextPageIndex),
        nextCursor,
        ...current.slice(nextPageIndex + 1, requiredLength),
      ];
    });
  }, [searchParamsString]);

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
        cursor: cursorStack.at(pageIndex),
        limit: PAGE_LIMIT,
        q: appliedQuery,
        signal: controller.signal,
        sort,
        ...(status === 'ALL' ? {} : { structureStatus: status }),
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
  }, [appliedQuery, cursorStack, pageIndex, sort, status]);

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
  const isFiltered = Boolean(appliedQuery || status !== 'ALL');
  const hasActiveToolbarFilters = Boolean(
    draftQuery || status !== 'ALL' || sort !== 'name',
  );
  const isRefreshing = isLoading && data !== null;
  const previousCursor = cursorStack.at(pageIndex - 1);
  const canGoPrevious =
    pageIndex === 1 || (pageIndex > 1 && previousCursor !== undefined);
  const total = data?.pagination.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const statusOptions = [
    { label: 'Tous les statuts', value: 'ALL' },
    ...PERSON_STRUCTURE_STATUSES.map((item) => ({
      label: getStatusLabel(item),
      value: item,
    })),
  ];
  const sortOptions = PERSON_LIST_SORTS.map((item) => ({
    label: getSortLabel(item),
    value: item,
  }));

  const emptyAction = isFiltered ? (
    <Button
      onClick={() => applyFilters('', 'ALL', 'name')}
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
  ) : undefined;

  if (!data && isLoading) return <PersonsListSkeleton />;

  if (error && !data) {
    return (
      <ContentState
        action={
          <Button onClick={() => void load()} size="sm" variant="outline">
            Réessayer
          </Button>
        }
        description={error.message}
        icon={<Users aria-hidden="true" className="size-5" />}
        kind="error"
        layout="panel"
        title="Chargement impossible"
      />
    );
  }

  return (
    <div className="space-y-4">
      {error && data && (
        <ContentState
          action={
            <Button onClick={() => void load()} size="sm" variant="outline">
              Réessayer
            </Button>
          }
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
          <div className="w-full">
            <form
              aria-label="Rechercher et filtrer les membres"
              className={directoryStyles.filterForm}
              onSubmit={(event) => {
                event.preventDefault();
                applyFilters(draftQuery, status, sort);
              }}
              role="search"
            >
              <div className={directoryStyles.search}>
                <Search aria-hidden="true" />
                <Input
                  aria-label="Rechercher par pseudo, nom ou coordonnée"
                  autoComplete="off"
                  className={directoryStyles.searchInput}
                  enterKeyHint="search"
                  id={searchInputId}
                  maxLength={100}
                  onChange={(event) => setDraftQuery(event.target.value)}
                  placeholder="Pseudo, nom ou coordonnée…"
                  spellCheck={false}
                  type="search"
                  value={draftQuery}
                />
                {draftQuery ? (
                  <Button
                    aria-label="Effacer la recherche"
                    className={directoryStyles.searchClear}
                    onClick={() => applyFilters('', status, sort)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <X aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
              <div className={directoryStyles.filterSelects}>
                <DirectorySelect
                  ariaLabel="Filtrer par statut"
                  onValueChange={(value) =>
                    applyFilters(draftQuery, value as StatusFilter, sort)
                  }
                  options={statusOptions}
                  value={status}
                />
                <DirectorySelect
                  ariaLabel="Trier le répertoire"
                  onValueChange={(value) =>
                    applyFilters(draftQuery, status, value as PersonListSort)
                  }
                  options={sortOptions}
                  value={sort}
                />
                {hasActiveToolbarFilters ? (
                  <Button
                    aria-label="Réinitialiser les filtres"
                    className={directoryStyles.iconButton}
                    onClick={() => applyFilters('', 'ALL', 'name')}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <RotateCcw aria-hidden="true" />
                  </Button>
                ) : (
                  <span
                    aria-hidden="true"
                    className={cn(directoryStyles.iconButton, 'invisible')}
                  />
                )}
              </div>
            </form>
            <div className={cn(directoryStyles.listCaption, 'mt-3')}>
              <p aria-live="polite" role="status">
                {isRefreshing
                  ? 'Actualisation…'
                  : error
                    ? 'Résultats non actualisés'
                    : `${total.toLocaleString('fr-FR')} membre${total !== 1 ? 's' : ''} trouvé${total !== 1 ? 's' : ''}`}
              </p>
              <span>{PAGE_LIMIT} par page</span>
            </div>
          </div>
        }
      >
        <DataTableDesktop>
          <Table
            aria-busy={isRefreshing}
            aria-label="Liste des membres"
            className={directoryStyles.table}
          >
            <TableCaption className="sr-only">
              Les fiches du répertoire, leur statut et leurs coordonnées
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Membre</TableHead>
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
                      className="relative focus-within:ring-2 focus-within:ring-inset"
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
          className={directoryStyles.pagination}
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
            <Button
              aria-label="Page précédente"
              className={directoryStyles.pageButton}
              disabled={!canGoPrevious || isLoading}
              onClick={() => {
                if (!canGoPrevious) return;
                const nextPage = pageIndex - 1;
                const cursor = cursorStack.at(nextPage);
                setPageIndex(nextPage);
                updateUrl({
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
                isLoading
              }
              onClick={() => {
                const cursor = data?.pagination.nextCursor;
                if (!cursor) return;
                const nextPage = pageIndex + 1;
                setCursorStack((current) => {
                  const next = current.slice(0, pageIndex + 1);
                  next.push(cursor);

                  return next;
                });
                setPageIndex(nextPage);
                updateUrl({
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
