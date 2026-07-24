'use client';

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Handshake,
  Search,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { type FC, useCallback, useEffect, useState } from 'react';

import { ContentState } from '$components/layout/ContentState';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '$ui/table';

import { listPartners } from '../partner.api';
import {
  PARTNER_CATEGORY_LABELS,
  PARTNER_STATUS_LABELS,
} from '../partner.constants';
import type {
  PartnerCategory,
  PartnerListSort,
  PartnersListResponse,
  PartnerStatus,
} from '../types/partner.types';
import { PartnerStatusBadge } from './PartnerStatusBadge';

const LIST_PATH = '/bureau-juridique/partenaires';

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export const PartnersList: FC<{ createHref: string; returnHref: string }> = ({
  createHref,
  returnHref,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') ?? '').slice(0, 100);
  const status = (searchParams.get('status') || '') as PartnerStatus | '';
  const category = (searchParams.get('category') || '') as PartnerCategory | '';
  const sort = (
    searchParams.get('sort') === 'updated' ? 'updated' : 'name'
  ) as PartnerListSort;
  const [input, setInput] = useState(query);
  const [data, setData] = useState<PartnersListResponse | null>(null);
  const [cursor, setCursor] = useState<string | undefined>();
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      setCursor(undefined);
      setCursorStack([]);
      router.replace(next.size ? `${LIST_PATH}?${next}` : LIST_PATH, {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  useEffect(() => {
    setInput(query);
  }, [query]);

  useEffect(() => {
    if (input === query) return;
    const timer = window.setTimeout(
      () => updateFilters({ q: input.trim() || null }),
      300,
    );

    return () => window.clearTimeout(timer);
  }, [input, query, updateFilters]);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const response = await listPartners({
          ...(category ? { category } : {}),
          ...(cursor ? { cursor } : {}),
          ...(query ? { q: query } : {}),
          ...(status ? { status } : {}),
          signal,
          sort,
        });
        setData(response);
        setError(null);
      } catch (caught) {
        if ((caught as Error).name !== 'AbortError') {
          setError(caught instanceof Error ? caught : new Error('Erreur'));
        }
      } finally {
        setLoading(false);
      }
    },
    [category, cursor, query, sort, status],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);

    return () => controller.abort();
  }, [load]);

  return (
    <section className="border-border-default bg-surface-panel overflow-hidden rounded-xl border shadow-[var(--shadow-panel)]">
      <div className="border-border-default border-b p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Toutes les organisations</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Sponsors, partenaires et relations en préparation.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href={createHref}>Nouvelle fiche</Link>
          </Button>
        </div>
        <div className="grid gap-2 lg:grid-cols-[minmax(15rem,1fr)_11rem_11rem_13rem]">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              aria-label="Rechercher une organisation"
              autoComplete="off"
              className="pr-9 pl-9"
              maxLength={100}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Nom, domaine ou coordonnée…"
              type="search"
              value={input}
            />
            {input && (
              <button
                aria-label="Effacer la recherche"
                className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 p-1"
                onClick={() => setInput('')}
                type="button"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Select
            onValueChange={(value) =>
              updateFilters({ status: value === 'all' ? null : value })
            }
            value={status || 'all'}
          >
            <SelectTrigger aria-label="Filtrer par statut" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(PARTNER_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            onValueChange={(value) =>
              updateFilters({ category: value === 'all' ? null : value })
            }
            value={category || 'all'}
          >
            <SelectTrigger
              aria-label="Filtrer par catégorie"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {Object.entries(PARTNER_CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            onValueChange={(value) =>
              updateFilters({
                sort: value === 'name' ? null : value,
              })
            }
            value={sort}
          >
            <SelectTrigger
              aria-label="Trier les organisations"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nom (A–Z)</SelectItem>
              <SelectItem value="updated">Modifiées récemment</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && !data ? (
        <div className="space-y-2 p-4">
          {[...Array(5)].map((_, index) => (
            <Skeleton className="h-12" key={index} />
          ))}
        </div>
      ) : error ? (
        <ContentState
          action={
            <Button onClick={() => void load()} size="sm" variant="outline">
              Réessayer
            </Button>
          }
          description={error.message}
          kind="error"
          title="Chargement impossible"
        />
      ) : !data?.items.length ? (
        <ContentState
          action={
            <Button asChild size="sm">
              <Link href={createHref}>Créer une fiche</Link>
            </Button>
          }
          description="Aucune organisation ne correspond aux filtres actuels."
          icon={<Handshake className="size-5" />}
          title="Aucun partenaire"
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Catégories</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Contact principal</TableHead>
                  <TableHead>Prochaine étape</TableHead>
                  <TableHead>Dernière modification</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((partner) => {
                  const href = `${LIST_PATH}/${encodeURIComponent(partner.id)}?${new URLSearchParams({ returnTo: returnHref })}`;

                  return (
                    <TableRow
                      className="hover:bg-surface-tile-hover relative transition-colors"
                      key={partner.id}
                    >
                      <TableCell className="font-medium">
                        <Link
                          aria-label={`Ouvrir la fiche de ${partner.name}`}
                          className="after:absolute after:inset-0 after:content-['']"
                          href={href}
                        >
                          {partner.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {partner.categories
                          .map((item) => PARTNER_CATEGORY_LABELS[item])
                          .join(' · ')}
                      </TableCell>
                      <TableCell>
                        <PartnerStatusBadge status={partner.status} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {partner.primaryContact?.displayName ??
                          (partner.primaryContact === null
                            ? '—'
                            : 'Contact restreint')}
                      </TableCell>
                      <TableCell className="max-w-56 truncate text-sm">
                        {partner.openAction?.description ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(partner.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <ArrowRight className="text-muted-foreground size-4" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="divide-border-default divide-y md:hidden">
            {data.items.map((partner) => (
              <Link
                className="hover:bg-surface-tile-hover flex items-center justify-between gap-3 p-4"
                href={`${LIST_PATH}/${encodeURIComponent(partner.id)}?${new URLSearchParams({ returnTo: returnHref })}`}
                key={partner.id}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{partner.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <PartnerStatusBadge status={partner.status} />
                  </div>
                </div>
                <ArrowRight className="text-muted-foreground size-4" />
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="border-border-default flex items-center justify-between border-t px-4 py-3">
        <span className="text-muted-foreground text-xs">
          {data?.items.length ?? 0} organisation
          {(data?.items.length ?? 0) > 1 ? 's' : ''}
        </span>
        <div className="flex gap-1">
          <Button
            aria-label="Page précédente"
            disabled={!cursorStack.length || loading}
            onClick={() => {
              const previous = [...cursorStack];
              const value = previous.pop();
              setCursorStack(previous);
              setCursor(value || undefined);
            }}
            size="icon"
            variant="ghost"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            aria-label="Page suivante"
            disabled={!data?.pagination.nextCursor || loading}
            onClick={() => {
              setCursorStack((items) => [...items, cursor ?? '']);
              setCursor(data?.pagination.nextCursor ?? undefined);
            }}
            size="icon"
            variant="ghost"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};
