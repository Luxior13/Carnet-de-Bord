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

import { PAGINATION } from '$constants/pagination.constants';
import { PAGE_PATHS, personDetailPath } from '$constants/routes.constants';
import { Button } from '$ui/button';
import { Input } from '$ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';
import { Skeleton } from '$ui/skeleton';
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
  PersonsListResponse,
  PersonStructureStatus,
  PersonSummary,
} from '../types/person.types';
import { PersonAvatar } from './PersonAvatar';
import styles from './PersonsDirectory.module.css';

type PersonsListProps = {
  canCreate: boolean;
  createHref: string;
  initialState?: {
    data: PersonsListResponse;
    request: PersonsListRequest;
  };
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

const PersonsListSkeleton: FC = () => (
  <div
    aria-label="Chargement du répertoire"
    className={styles.list}
    role="status"
  >
    <div className={styles.toolbar}>
      <Skeleton className="h-[38px] w-full rounded-md" />
    </div>
    <div className="space-y-px">
      {[...Array(7)].map((_, index) => (
        <Skeleton className="h-[58px] rounded-none" key={index} />
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
    className={cn(styles.contactItem, count === 0 && styles.contactMuted)}
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
      <span className={styles.standardAccess} aria-label="Aucune coordonnée">
        —
      </span>
    );
  }

  return (
    <div className={styles.contacts}>
      <span className={styles.access}>
        <Share2 aria-hidden="true" />
        {total} coordonnée{total > 1 ? 's' : ''}
      </span>
      <span className={styles.contactRow}>
        <ContactCount
          count={emails}
          icon={<Mail aria-hidden="true" />}
          label="email(s)"
        />
        <ContactCount
          count={phones}
          icon={<Phone aria-hidden="true" />}
          label="téléphone(s)"
        />
        <ContactCount
          count={socialProfiles}
          icon={<Share2 aria-hidden="true" />}
          label="profil(s) social(aux)"
        />
      </span>
    </div>
  );
};

const PersonLastModified: FC<{
  href: string;
  person: PersonSummary;
}> = ({ href, person }) => {
  const actor = person.lastModifiedBy;
  const time = (
    <time dateTime={person.updatedAt}>
      {formatPersonDateTime(person.updatedAt)}
    </time>
  );

  if (!actor) {
    return (
      <Link className={styles.updated} href={href}>
        {time}
      </Link>
    );
  }

  const actorLabel = `Modifiée par ${actor.displayName}${
    actor.loginName && actor.loginName !== actor.displayName
      ? ` (${actor.loginName})`
      : ''
  }`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          aria-label={`${actorLabel}, le ${formatPersonDateTime(person.updatedAt)}`}
          className={styles.updated}
          href={href}
        >
          {time}
        </Link>
      </TooltipTrigger>
      <TooltipContent>{actorLabel}</TooltipContent>
    </Tooltip>
  );
};

const PersonIdentity: FC<{
  href: string;
  person: PersonSummary;
}> = ({ href, person }) => (
  <div className={styles.identity}>
    <span aria-hidden="true" className={styles.avatar}>
      <PersonAvatar person={person} />
    </span>
    <div className={styles.info}>
      <div className={styles.nameLine}>
        <Link className={styles.name} href={href}>
          {getPersonDisplayName(person)}
        </Link>
      </div>
      {person.matchedByContact && (
        <p className={styles.subline} data-state="active">
          <Search aria-hidden="true" />
          <span>Trouvée grâce à une coordonnée</span>
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
    <SelectTrigger aria-label={ariaLabel} className={styles.selectTrigger}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent className={styles.selectContent}>
      {options.map((option) => (
        <SelectItem
          className={styles.selectOption}
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
  const showEmpty = !isLoading && !error && (data?.items.length ?? 0) === 0;
  const isFiltered = Boolean(appliedQuery || status !== 'ALL');
  const isRefreshing = isLoading && data !== null;
  const previousCursor = cursorStack.at(pageIndex - 1);
  const canGoPrevious =
    pageIndex === 1 || (pageIndex > 1 && previousCursor !== undefined);
  const visibleCount = data?.items.length ?? 0;

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

  const activeFilters: React.ReactNode[] = [];
  if (appliedQuery) {
    activeFilters.push(
      <Button
        aria-label={`Retirer le filtre Recherche : ${appliedQuery}`}
        key="query"
        onClick={() => applyFilters('', status, sort)}
        size="inline"
        type="button"
        variant="ghost"
      >
        <span>Recherche : {appliedQuery}</span>
        <X aria-hidden="true" />
      </Button>,
    );
  }
  if (status !== 'ALL') {
    activeFilters.push(
      <Button
        aria-label={`Retirer le filtre Statut : ${getStatusLabel(status)}`}
        key="status"
        onClick={() => applyFilters(appliedQuery, 'ALL', sort)}
        size="inline"
        type="button"
        variant="ghost"
      >
        <span>Statut : {getStatusLabel(status)}</span>
        <X aria-hidden="true" />
      </Button>,
    );
  }

  const emptyAction = isFiltered ? (
    <Button
      className="mt-4"
      onClick={() => applyFilters('', 'ALL', sort)}
      size="sm"
      variant="outline"
    >
      <RotateCcw className="size-4" />
      Réinitialiser les filtres
    </Button>
  ) : canCreate ? (
    <Button asChild className="mt-4" size="sm">
      <Link href={createHref}>
        <Plus className="size-4" />
        Ajouter une fiche
      </Link>
    </Button>
  ) : undefined;

  if (!data && isLoading) return <PersonsListSkeleton />;

  if (error && !data) {
    return (
      <section className={styles.list}>
        <div className={styles.empty}>
          <Users aria-hidden="true" />
          <h2>Chargement impossible</h2>
          <p>{error.message}</p>
          <Button
            className="mt-2"
            onClick={() => void load()}
            size="sm"
            variant="outline"
          >
            Réessayer
          </Button>
        </div>
      </section>
    );
  }

  if (showEmpty) {
    return (
      <section className={styles.list}>
        <div className={styles.empty}>
          <Users aria-hidden="true" />
          <h2>{isFiltered ? 'Aucune fiche trouvée' : 'Répertoire vide'}</h2>
          <p>
            {isFiltered
              ? 'Essayez une autre recherche ou retirez les filtres.'
              : 'Créez la première fiche pour commencer le répertoire.'}
          </p>
          {emptyAction}
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Liste des membres" className={styles.list}>
      <div className={styles.toolbar}>
        <form
          aria-label="Rechercher et filtrer les membres"
          className={styles.filterForm}
          onSubmit={(event) => {
            event.preventDefault();
            applyFilters(draftQuery, status, sort);
          }}
          role="search"
        >
          <div className={styles.search}>
            <Search aria-hidden="true" />
            <Input
              aria-label="Rechercher par pseudo, nom ou coordonnée"
              autoComplete="off"
              id={searchInputId}
              maxLength={100}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="Pseudo, nom ou coordonnée…"
              type="search"
              value={draftQuery}
            />
            {draftQuery ? (
              <Button
                aria-label="Effacer la recherche"
                onClick={() => applyFilters('', status, sort)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X aria-hidden="true" />
              </Button>
            ) : (
              <Button
                aria-label="Rechercher les membres"
                size="icon"
                type="submit"
                variant="ghost"
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            )}
          </div>
          <div className={styles.filterSelects}>
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
            {isFiltered && (
              <Button
                aria-label="Réinitialiser les filtres"
                className={styles.iconButton}
                onClick={() => applyFilters('', 'ALL', sort)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <RotateCcw aria-hidden="true" />
              </Button>
            )}
          </div>
        </form>
        {activeFilters.length > 0 && (
          <div aria-label="Filtres actifs" className={styles.activeFilters}>
            {activeFilters}
          </div>
        )}
        <div className={styles.listCaption}>
          <p aria-live="polite" role="status">
            {visibleCount} membre{visibleCount > 1 ? 's' : ''} affiché
            {visibleCount > 1 ? 's' : ''}
            {isRefreshing ? ' · Actualisation…' : ''}
          </p>
          <span>{PAGE_LIMIT} par page</span>
        </div>
      </div>

      <div
        aria-busy={isRefreshing}
        className={cn(isRefreshing && 'opacity-55')}
      >
        {error && (
          <div className={styles.empty}>
            <Users aria-hidden="true" />
            <h2>Actualisation impossible</h2>
            <p>Les résultats précédents restent affichés.</p>
            <Button
              className="mt-2"
              onClick={() => void load()}
              size="sm"
              variant="outline"
            >
              Réessayer
            </Button>
          </div>
        )}

        <table className={styles.table}>
          <caption className="sr-only">
            Les fiches du répertoire, leur statut et leurs coordonnées
          </caption>
          <thead>
            <tr>
              <th scope="col">Membre</th>
              <th scope="col">Statut</th>
              <th scope="col">Coordonnées</th>
              <th scope="col">Dernière modification</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((person) => {
              const href = personHref(person.id);

              return (
                <tr className={styles.row} key={person.id}>
                  <td className={styles.memberCell}>
                    <PersonIdentity href={href} person={person} />
                  </td>
                  <td className={styles.statusCell}>
                    <span
                      className={styles.statusBadge}
                      data-status={person.structureStatus}
                    >
                      <span aria-hidden="true" />
                      {getStatusLabel(person.structureStatus)}
                    </span>
                  </td>
                  <td className={styles.accessCell}>
                    <PersonContacts person={person} />
                  </td>
                  <td className={styles.updatedCell}>
                    <PersonLastModified href={href} person={person} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <nav aria-label="Pagination des membres" className={styles.pagination}>
        <p>
          Page <strong>{pageIndex + 1}</strong>
        </p>
        <div className={styles.paginationActions}>
          <Button
            aria-label="Page précédente"
            className={styles.pageButton}
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
            className={styles.pageButton}
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
    </section>
  );
};
