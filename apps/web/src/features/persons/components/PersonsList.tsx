'use client';

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Plus,
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
  useRef,
  useState,
} from 'react';

import { ContentState } from '$components/layout/ContentState';
import { Button } from '$ui/button';
import {
  DataTableDesktop,
  DataTableMobileList,
  DataTableSection,
} from '$ui/data-table-section';
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
import type {
  PersonListSort,
  PersonsListResponse,
  PersonStructureStatus,
  PersonSummary,
} from '../types/person.types';
import { PersonAvatar } from './PersonAvatar';
import { PersonStatusBadge } from './PersonStatusBadge';

type PersonsListProps = {
  canCreate: boolean;
  createHref: string;
  returnHref: string;
};

type StatusFilter = 'ALL' | PersonStructureStatus;

const PAGE_LIMIT = 25;
const SEARCH_DEBOUNCE_MS = 300;
const LIST_PATH = '/vie-interne/repertoire';

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
    className="space-y-2 p-4"
    role="status"
    aria-label="Chargement du répertoire"
  >
    {[...Array(7)].map((_, index) => (
      <Skeleton className="h-12 rounded-lg" key={index} />
    ))}
  </div>
);

const PersonIdentity: FC<{
  href: string;
  person: PersonSummary;
}> = ({ href, person }) => (
  <Link
    aria-label={`Ouvrir la fiche de ${getPersonDisplayName(person)}`}
    className="group flex min-w-0 items-center gap-2.5 rounded-md outline-none after:absolute after:inset-0 after:z-10 after:content-['']"
    href={href}
  >
    <PersonAvatar
      className="border-border-default group-hover:border-primary/35 size-8 rounded-full border transition-colors"
      person={person}
    />
    <div className="min-w-0">
      <p className="group-hover:text-primary-emphasis truncate text-sm font-medium transition-colors">
        {getPersonDisplayName(person)}
      </p>
      {person.matchedByContact && (
        <p className="text-muted-foreground mt-0.5 text-xs">
          Trouvée grâce à une coordonnée
        </p>
      )}
    </div>
  </Link>
);

const ContactCount: FC<{
  count: number;
  icon: React.ReactNode;
  label: string;
}> = ({ count, icon, label }) => (
  <span
    aria-label={`${count} ${label}`}
    className={cn(
      'inline-flex items-center gap-1 tabular-nums',
      count === 0 && 'opacity-45',
    )}
    title={`${count} ${label}`}
  >
    {icon}
    {count}
  </span>
);

const PersonContactCounts: FC<{ person: PersonSummary }> = ({ person }) => (
  <div className="text-muted-foreground flex items-center gap-3 text-xs">
    {person.contactCounts.emails > 0 && (
      <ContactCount
        count={person.contactCounts.emails}
        icon={<Mail aria-hidden="true" className="size-3.5" />}
        label="email(s)"
      />
    )}
    {person.contactCounts.phones > 0 && (
      <ContactCount
        count={person.contactCounts.phones}
        icon={<Phone aria-hidden="true" className="size-3.5" />}
        label="téléphone(s)"
      />
    )}
    {person.contactCounts.socialProfiles > 0 && (
      <ContactCount
        count={person.contactCounts.socialProfiles}
        icon={<Share2 aria-hidden="true" className="size-3.5" />}
        label="profil(s) social(aux)"
      />
    )}
    {person.contactCounts.emails === 0 &&
      person.contactCounts.phones === 0 &&
      person.contactCounts.socialProfiles === 0 && (
        <span>Aucune coordonnée</span>
      )}
  </div>
);

const getLastModifiedByLabel = (person: PersonSummary): string | null => {
  const actor = person.lastModifiedBy;
  if (!actor) return null;

  return `Modifiée par ${actor.displayName}${
    actor.loginName && actor.loginName !== actor.displayName
      ? ` (${actor.loginName})`
      : ''
  }`;
};

const PersonLastModifiedAt: FC<{
  href?: string;
  person: PersonSummary;
}> = ({ href, person }) => {
  const actorLabel = getLastModifiedByLabel(person);
  const time = (
    <time dateTime={person.updatedAt}>
      {formatPersonDateTime(person.updatedAt)}
    </time>
  );

  if (!actorLabel || !href) return time;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          aria-label={`Ouvrir la fiche — ${actorLabel}, le ${formatPersonDateTime(person.updatedAt)}`}
          className="focus-visible:ring-ring/40 relative z-20 inline-flex cursor-help rounded-sm underline decoration-dotted underline-offset-4 outline-none focus-visible:ring-2"
          href={href}
        >
          {time}
        </Link>
      </TooltipTrigger>
      <TooltipContent>{actorLabel}</TooltipContent>
    </Tooltip>
  );
};

const buildPersonHref = (personId: string, returnHref: string): string => {
  const params = new URLSearchParams({ returnTo: returnHref });

  return `${LIST_PATH}/${encodeURIComponent(personId)}?${params}`;
};

const PersonMobileRow: FC<{
  href: string;
  person: PersonSummary;
}> = ({ href, person }) => (
  <Link
    aria-label={`Ouvrir la fiche de ${getPersonDisplayName(person)}`}
    className="hover:bg-surface-tile-hover focus-visible:ring-ring/40 flex items-center gap-3 px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-inset"
    href={href}
  >
    <div className="min-w-0 flex-1 space-y-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <PersonAvatar
          className="border-border-default size-8 rounded-full border"
          person={person}
        />
        <p className="truncate text-sm font-medium">
          {getPersonDisplayName(person)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <PersonStatusBadge status={person.structureStatus} />
        <PersonContactCounts person={person} />
      </div>
      <p className="text-muted-foreground text-xs">
        Modifiée le <PersonLastModifiedAt person={person} />
      </p>
    </div>
    <ArrowRight className="text-muted-foreground size-4 shrink-0" />
  </Link>
);

export const PersonsList: FC<PersonsListProps> = ({
  canCreate,
  createHref,
  returnHref,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [data, setData] = useState<PersonsListResponse | null>(null);
  const [draftQuery, setDraftQuery] = useState(appliedQuery);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(effectiveInitialPageIndex);
  const [sort, setSort] = useState<PersonListSort>(() =>
    normalizeSort(searchParams.get('sort')),
  );
  const [status, setStatus] = useState<StatusFilter>(() =>
    normalizeStatus(searchParams.get('structureStatus')),
  );
  const abortControllerRef = useRef<AbortController | null>(null);

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
    void load();

    return (): void => abortControllerRef.current?.abort();
  }, [load]);

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

  const emptyAction = isFiltered ? (
    <Button
      className="mt-4"
      onClick={() => applyFilters('', 'ALL', sort)}
      size="sm"
      variant="outline"
    >
      <Users className="size-4" />
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

  return (
    <DataTableSection
      description="Recherchez une identité ou une coordonnée. Les données privées restent dans chaque fiche."
      headerClassName="p-3 sm:p-4"
      headerLayout="stacked"
      title="Toutes les fiches"
      toolbar={
        <div className="grid w-full min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_13rem_13rem]">
          <form
            className="relative min-w-0 sm:col-span-2 xl:col-span-1"
            onSubmit={(event) => {
              event.preventDefault();
              applyFilters(draftQuery, status, sort);
            }}
            role="search"
          >
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              aria-label="Rechercher dans le répertoire"
              className="pr-10 pl-9"
              maxLength={100}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="Pseudo, nom ou coordonnée…"
              value={draftQuery}
            />
            {draftQuery && (
              <Button
                aria-label="Effacer la recherche"
                className="absolute top-1/2 right-1 size-8 -translate-y-1/2"
                onClick={() => applyFilters('', status, sort)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X className="size-4" />
              </Button>
            )}
          </form>
          <Select
            onValueChange={(value) =>
              applyFilters(draftQuery, value as StatusFilter, sort)
            }
            value={status}
          >
            <SelectTrigger
              aria-label="Filtrer par statut dans la structure"
              className="w-full min-w-0"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              {PERSON_STRUCTURE_STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {getStatusLabel(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            onValueChange={(value) =>
              applyFilters(draftQuery, status, value as PersonListSort)
            }
            value={sort}
          >
            <SelectTrigger
              aria-label="Trier le répertoire"
              className="w-full min-w-0"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERSON_LIST_SORTS.map((item) => (
                <SelectItem key={item} value={item}>
                  {getSortLabel(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {!data && isLoading ? (
        <PersonsListSkeleton />
      ) : error && !data ? (
        <ContentState
          action={
            <Button onClick={() => void load()} size="sm" variant="outline">
              Réessayer
            </Button>
          }
          description={error.message}
          kind="error"
          layout="panel"
          title="Chargement impossible"
        />
      ) : showEmpty ? (
        <ContentState
          action={emptyAction}
          description={
            isFiltered
              ? 'Essayez une autre recherche ou retirez les filtres.'
              : 'Créez la première fiche pour commencer le répertoire.'
          }
          layout="panel"
          title={isFiltered ? 'Aucune fiche trouvée' : 'Répertoire vide'}
        />
      ) : (
        <div
          aria-busy={isRefreshing}
          className={cn('transition-opacity', isRefreshing && 'opacity-55')}
        >
          {error && (
            <ContentState
              action={
                <Button onClick={() => void load()} size="sm" variant="outline">
                  Réessayer
                </Button>
              }
              className="m-3"
              description="Les résultats précédents restent affichés."
              kind="error"
              title="Actualisation impossible"
            />
          )}
          <DataTableDesktop>
            <Table>
              <TableHeader className="[&_th]:h-9">
                <TableRow>
                  <TableHead>Fiche</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Coordonnées</TableHead>
                  <TableHead>Dernière modification</TableHead>
                  <TableHead className="w-14">
                    <span className="sr-only">Action</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((person) => {
                  const href = personHref(person.id);

                  return (
                    <TableRow
                      className="group/row focus-within:ring-ring/40 relative cursor-pointer focus-within:ring-2 focus-within:ring-inset"
                      key={person.id}
                    >
                      <TableCell className="py-2">
                        <PersonIdentity href={href} person={person} />
                      </TableCell>
                      <TableCell className="py-2">
                        <PersonStatusBadge status={person.structureStatus} />
                      </TableCell>
                      <TableCell className="py-2">
                        <PersonContactCounts person={person} />
                      </TableCell>
                      <TableCell className="text-muted-foreground py-2 text-sm">
                        <PersonLastModifiedAt href={href} person={person} />
                      </TableCell>
                      <TableCell className="pointer-events-none py-1.5">
                        <ArrowRight
                          aria-hidden="true"
                          className="text-muted-foreground size-4 transition-transform group-hover/row:translate-x-0.5"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </DataTableDesktop>
          <DataTableMobileList>
            {data?.items.map((person) => (
              <PersonMobileRow
                href={personHref(person.id)}
                key={person.id}
                person={person}
              />
            ))}
          </DataTableMobileList>
          <div className="border-border-divider bg-surface-inset flex items-center justify-between gap-3 border-t px-4 py-2">
            <p aria-live="polite" className="text-muted-foreground text-xs">
              Page {pageIndex + 1} · {data?.items.length ?? 0} fiche
              {(data?.items.length ?? 0) > 1 ? 's' : ''}
              {isRefreshing ? ' · Actualisation…' : ''}
            </p>
            <div className="flex items-center gap-1">
              <Button
                aria-label="Page précédente"
                className="lg:size-8"
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
                variant="ghost"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                aria-label="Page suivante"
                className="lg:size-8"
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
                variant="ghost"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
      {data && !showEmpty && (
        <div className="sr-only" aria-live="polite">
          {data.items.length} fiches affichées sur cette page
        </div>
      )}
    </DataTableSection>
  );
};
