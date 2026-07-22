'use client';

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  UserRound,
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

import { ResourceStateBoundary } from '$components/layout/ResourceStateBoundary';
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

import { listPersons } from '../person.api';
import {
  PERSON_STRUCTURE_STATUS_LABELS,
  PERSON_STRUCTURE_STATUSES,
} from '../person.constants';
import {
  formatPersonDateTime,
  getPersonDisplayName,
  getPersonInitials,
} from '../person.ui';
import type {
  PersonsListResponse,
  PersonStructureStatus,
  PersonSummary,
} from '../types/person.types';
import { PersonStatusBadge } from './PersonStatusBadge';

type PersonsListProps = {
  canCreate: boolean;
};

type StatusFilter = 'ALL' | PersonStructureStatus;

const PAGE_LIMIT = 25;

const normalizeStatus = (value: string | null): StatusFilter =>
  PERSON_STRUCTURE_STATUSES.includes(value as PersonStructureStatus)
    ? (value as PersonStructureStatus)
    : 'ALL';

const PersonsListSkeleton: FC = () => (
  <div
    className="space-y-2 p-4"
    role="status"
    aria-label="Chargement des personnes"
  >
    {[...Array(7)].map((_, index) => (
      <Skeleton className="h-14 rounded-lg" key={index} />
    ))}
  </div>
);

const PersonIdentity: FC<{ person: PersonSummary }> = ({ person }) => (
  <div className="flex min-w-0 items-center gap-3">
    <span className="border-border-default bg-surface-inset text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold">
      {getPersonInitials(person) || <UserRound className="size-4" />}
    </span>
    <div className="min-w-0">
      <p className="truncate text-sm font-medium">
        {getPersonDisplayName(person)}
      </p>
      {person.matchedByContact && (
        <p className="text-muted-foreground mt-0.5 text-xs">
          Correspondance trouvée dans une coordonnée
        </p>
      )}
    </div>
  </div>
);

const PersonMobileRow: FC<{ person: PersonSummary }> = ({ person }) => (
  <Link
    aria-label={`Ouvrir la fiche de ${getPersonDisplayName(person)}`}
    className="hover:bg-surface-tile-hover focus-visible:ring-ring/40 flex items-center gap-3 px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-inset"
    href={`/vie-interne/repertoire/${person.id}`}
  >
    <div className="min-w-0 flex-1 space-y-2">
      <PersonIdentity person={person} />
      <div className="flex flex-wrap items-center gap-2">
        <PersonStatusBadge status={person.structureStatus} />
        <span className="text-muted-foreground text-xs">
          Modifié le {formatPersonDateTime(person.updatedAt)}
        </span>
      </div>
    </div>
    <ArrowRight className="text-muted-foreground size-4 shrink-0" />
  </Link>
);

export const PersonsList: FC<PersonsListProps> = ({ canCreate }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [appliedQuery, setAppliedQuery] = useState(
    () => searchParams.get('q')?.trim().slice(0, 100) ?? '',
  );
  const [cursorStack, setCursorStack] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const [data, setData] = useState<PersonsListResponse | null>(null);
  const [draftQuery, setDraftQuery] = useState(appliedQuery);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [status, setStatus] = useState<StatusFilter>(() =>
    normalizeStatus(searchParams.get('structureStatus')),
  );
  const requestIdRef = useRef(0);

  const updateUrl = useCallback(
    (nextQuery: string, nextStatus: StatusFilter): void => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('cursor');
      if (nextQuery) params.set('q', nextQuery);
      else params.delete('q');
      if (nextStatus === 'ALL') params.delete('structureStatus');
      else params.set('structureStatus', nextStatus);
      router.replace(
        `/vie-interne/repertoire${params.size ? `?${params}` : ''}`,
        {
          scroll: false,
        },
      );
    },
    [router, searchParams],
  );

  const resetPagination = (): void => {
    setCursorStack([undefined]);
    setPageIndex(0);
  };

  const applyFilters = (nextQuery: string, nextStatus = status): void => {
    const normalized = nextQuery.trim().slice(0, 100);
    setAppliedQuery(normalized);
    setDraftQuery(normalized);
    setStatus(nextStatus);
    resetPagination();
    updateUrl(normalized, nextStatus);
  };

  const load = useCallback(async (): Promise<void> => {
    const requestId = ++requestIdRef.current;
    setError(null);
    setIsLoading(true);
    try {
      const response = await listPersons({
        cursor: cursorStack.at(pageIndex),
        limit: PAGE_LIMIT,
        q: appliedQuery,
        ...(status === 'ALL' ? {} : { structureStatus: status }),
      });
      if (requestId === requestIdRef.current) setData(response);
    } catch (caught) {
      if (requestId === requestIdRef.current) {
        setError(
          caught instanceof Error ? caught : new Error('Erreur inconnue'),
        );
      }
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [appliedQuery, cursorStack, pageIndex, status]);

  useEffect((): void => {
    void load();
  }, [load]);

  const showEmpty = !isLoading && !error && (data?.items.length ?? 0) === 0;
  const isFiltered = Boolean(appliedQuery || status !== 'ALL');

  return (
    <div className="space-y-4">
      <DataTableSection
        description="Les coordonnées privées restent visibles uniquement dans chaque fiche."
        title="Toutes les fiches"
        toolbar={
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <form
              className="relative min-w-0 flex-1"
              onSubmit={(event) => {
                event.preventDefault();
                applyFilters(draftQuery);
              }}
              role="search"
            >
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                aria-label="Rechercher une personne"
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
                  onClick={() => applyFilters('')}
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
                applyFilters(appliedQuery, value as StatusFilter)
              }
              value={status}
            >
              <SelectTrigger
                aria-label="Filtrer par statut dans la structure"
                className="w-full sm:w-56"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                {PERSON_STRUCTURE_STATUSES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item === 'IN_STRUCTURE'
                      ? PERSON_STRUCTURE_STATUS_LABELS.IN_STRUCTURE
                      : PERSON_STRUCTURE_STATUS_LABELS.OUTSIDE_STRUCTURE}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      >
        <ResourceStateBoundary
          emptyDescription={
            isFiltered
              ? 'Essayez une autre recherche ou retirez les filtres.'
              : 'Créez la première fiche pour commencer le répertoire.'
          }
          emptyTitle={
            isFiltered ? 'Aucune personne trouvée' : 'Répertoire vide'
          }
          error={error}
          isEmpty={showEmpty}
          isLoading={isLoading}
          loadingFallback={<PersonsListSkeleton />}
          onRetry={() => void load()}
        >
          <>
            <DataTableDesktop>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Personne</TableHead>
                    <TableHead>Statut dans la structure</TableHead>
                    <TableHead>Dernière modification</TableHead>
                    <TableHead className="w-16">
                      <span className="sr-only">Action</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.items.map((person) => (
                    <TableRow key={person.id}>
                      <TableCell>
                        <PersonIdentity person={person} />
                      </TableCell>
                      <TableCell>
                        <PersonStatusBadge status={person.structureStatus} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatPersonDateTime(person.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          asChild
                          aria-label={`Ouvrir ${getPersonDisplayName(person)}`}
                          size="icon"
                          variant="ghost"
                        >
                          <Link href={`/vie-interne/repertoire/${person.id}`}>
                            <ArrowRight className="size-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableDesktop>
            <DataTableMobileList>
              {data?.items.map((person) => (
                <PersonMobileRow key={person.id} person={person} />
              ))}
            </DataTableMobileList>
            <div className="border-border-divider bg-surface-inset flex items-center justify-between gap-3 border-t px-4 py-3">
              <p aria-live="polite" className="text-muted-foreground text-xs">
                Page {pageIndex + 1} · {data?.items.length ?? 0} résultat
                {(data?.items.length ?? 0) > 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  aria-label="Page précédente"
                  disabled={pageIndex === 0 || isLoading}
                  onClick={() =>
                    setPageIndex((value) => Math.max(0, value - 1))
                  }
                  size="icon"
                  variant="ghost"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  aria-label="Page suivante"
                  disabled={
                    !data?.pagination.hasMore ||
                    !data.pagination.nextCursor ||
                    isLoading
                  }
                  onClick={() => {
                    if (!data?.pagination.nextCursor) return;
                    setCursorStack((current) => {
                      const next = current.slice(0, pageIndex + 1);
                      next.push(data.pagination.nextCursor ?? undefined);

                      return next;
                    });
                    setPageIndex((value) => value + 1);
                  }}
                  size="icon"
                  variant="ghost"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        </ResourceStateBoundary>
      </DataTableSection>
      {showEmpty && !isFiltered && canCreate && (
        <Button asChild>
          <Link href="/vie-interne/repertoire/nouveau">
            <Plus className="size-4" />
            Ajouter une personne
          </Link>
        </Button>
      )}
      {showEmpty && isFiltered && (
        <Button onClick={() => applyFilters('', 'ALL')} variant="outline">
          <Users className="size-4" />
          Réinitialiser les filtres
        </Button>
      )}
      {data && !showEmpty && (
        <div className="sr-only" aria-live="polite">
          {data.items.length} personnes affichées sur cette page
        </div>
      )}
    </div>
  );
};
