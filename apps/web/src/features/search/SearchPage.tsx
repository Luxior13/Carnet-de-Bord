'use client';

import { ArrowRight, CircleX, Search, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, {
  type FC,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { ContentState } from '$components/layout/ContentState';
import {
  normalizeSearchValue,
  rankSearchResults,
} from '$components/layout/global-search.utils';
import { PageHero } from '$components/layout/PageHero';
import { getVisibleNavigationSpaces } from '$constants/app.constants';
import { getNavigationIcon } from '$constants/navigation-icon.constants';
import { getNavigationSpaceToneClasses } from '$constants/navigation-theme.constants';
import { useFeatureAvailability } from '$context/FeatureAvailabilityContext';
import { useUser } from '$context/UserContext';
import { buildSearchCatalog } from '$features/search/search-catalog';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Input } from '$ui/input';
import { PageCanvas, PageShell } from '$ui/page-shell';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';
import { cn } from '$utils/css.utils';

type SearchSourceFilter = 'account' | 'all' | 'navigation';

const sanitizeQuery = (value: string | null): string =>
  (value ?? '').trim().slice(0, 160);

export const SearchPage: FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userData } = useUser();
  const { featureAvailabilityLoaded, operationalFeatureIds } =
    useFeatureAvailability();
  const urlQuery = sanitizeQuery(searchParams.get('q'));
  const requestedSpace = searchParams.get('pole') ?? 'all';
  const requestedSource = searchParams.get('source') ?? 'all';
  const source: SearchSourceFilter = ['account', 'navigation'].includes(
    requestedSource,
  )
    ? (requestedSource as SearchSourceFilter)
    : 'all';
  const [queryInput, setQueryInput] = useState(urlQuery);
  const spaces = useMemo(
    () =>
      getVisibleNavigationSpaces(
        userData,
        'live',
        featureAvailabilityLoaded ? operationalFeatureIds : undefined,
      ),
    [featureAvailabilityLoaded, operationalFeatureIds, userData],
  );
  const catalog = useMemo(
    () => buildSearchCatalog(spaces, userData),
    [spaces, userData],
  );
  const availableSpaceIds = useMemo(
    () => new Set(catalog.map((item) => item.space.id)),
    [catalog],
  );
  const space = availableSpaceIds.has(requestedSpace) ? requestedSpace : 'all';
  const normalizedQuery = normalizeSearchValue(urlQuery);
  const results = useMemo(() => {
    const filteredCatalog = catalog.filter(
      (item) =>
        (space === 'all' || item.space.id === space) &&
        (source === 'all' || item.source === source),
    );

    return normalizedQuery
      ? rankSearchResults(
          filteredCatalog,
          normalizedQuery,
          filteredCatalog.length,
        )
      : filteredCatalog;
  }, [catalog, normalizedQuery, source, space]);

  useEffect(() => setQueryInput(urlQuery), [urlQuery]);

  const navigateWithFilters = useCallback(
    (updates: {
      pole?: string | null;
      q?: string | null;
      source?: string | null;
    }) => {
      const nextParams = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (!value || value === 'all') nextParams.delete(key);
        else nextParams.set(key, value);
      }
      const queryString = nextParams.toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const submitSearch = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    navigateWithFilters({ q: sanitizeQuery(queryInput) || null });
  };

  return (
    <AuthenticatedLayout
      breadcrumbs={[
        { href: '/', label: 'Tableau de bord' },
        { href: '/recherche', label: 'Recherche avancée' },
      ]}
    >
      <PageShell className="py-0">
        <PageCanvas contentClassName="space-y-5">
          <PageHero
            description="Explorez toutes les destinations actuellement disponibles pour votre compte. Les futures sources métier rejoindront ce même catalogue sans modifier l’accès rapide."
            icon={<Search className="size-5" />}
            meta={
              <>
                <Badge variant="secondary">Pages autorisées uniquement</Badge>
                <Badge variant="outline">
                  {catalog.length} destination{catalog.length > 1 ? 's' : ''}
                </Badge>
              </>
            }
            title="Recherche avancée"
          />

          <section
            aria-labelledby="search-filters-title"
            className="border-border-default bg-surface-panel rounded-xl border p-4 shadow-[var(--shadow-panel)]"
          >
            <div className="mb-3 flex items-center gap-2">
              <SlidersHorizontal
                aria-hidden="true"
                className="text-primary-emphasis size-4"
              />
              <h2 className="text-sm font-semibold" id="search-filters-title">
                Recherche et filtres
              </h2>
            </div>
            <form
              className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_12rem_12rem_auto]"
              onSubmit={submitSearch}
              role="search"
            >
              <div className="relative min-w-0">
                <Search
                  aria-hidden="true"
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                />
                <Input
                  aria-label="Rechercher dans les destinations"
                  autoComplete="off"
                  className="pr-11 pl-9"
                  maxLength={160}
                  name="q"
                  onChange={(event) => setQueryInput(event.target.value)}
                  placeholder="Nom d’une page, pôle ou description…"
                  type="search"
                  value={queryInput}
                />
                {queryInput && (
                  <button
                    aria-label="Effacer la recherche"
                    className="text-muted-foreground hover:bg-surface-tile-hover hover:text-foreground focus-visible:ring-ring/50 absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg outline-none focus-visible:ring-2"
                    onClick={() => {
                      setQueryInput('');
                      navigateWithFilters({ q: null });
                    }}
                    type="button"
                  >
                    <CircleX className="size-4" />
                  </button>
                )}
              </div>
              <Select
                onValueChange={(value) => navigateWithFilters({ pole: value })}
                value={space}
              >
                <SelectTrigger aria-label="Filtrer par pôle" className="w-full">
                  <SelectValue placeholder="Tous les pôles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les pôles</SelectItem>
                  {spaces
                    .filter((entry) => availableSpaceIds.has(entry.id))
                    .map((entry) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select
                onValueChange={(value) =>
                  navigateWithFilters({ source: value })
                }
                value={source}
              >
                <SelectTrigger
                  aria-label="Filtrer par source"
                  className="w-full"
                >
                  <SelectValue placeholder="Toutes les sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les sources</SelectItem>
                  <SelectItem value="navigation">Pages</SelectItem>
                  <SelectItem value="account">Compte personnel</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit">
                <Search />
                Rechercher
              </Button>
            </form>
          </section>

          <section aria-labelledby="search-results-title">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2
                  className="text-base font-semibold"
                  id="search-results-title"
                >
                  Résultats
                </h2>
                <p
                  aria-live="polite"
                  className="text-muted-foreground mt-1 text-sm"
                  role="status"
                >
                  {results.length} résultat{results.length !== 1 ? 's' : ''}
                  {urlQuery ? ` pour « ${urlQuery} »` : ''}
                </p>
              </div>
              {(urlQuery || space !== 'all' || source !== 'all') && (
                <Button
                  onClick={() => {
                    setQueryInput('');
                    navigateWithFilters({ pole: null, q: null, source: null });
                  }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Réinitialiser les filtres
                </Button>
              )}
            </div>

            {results.length > 0 ? (
              <ul className="grid gap-3 md:grid-cols-2" role="list">
                {results.map((result) => {
                  const Icon = getNavigationIcon(result.icon);
                  const tone = getNavigationSpaceToneClasses(result.space.tone);

                  return (
                    <li key={result.id}>
                      <Link
                        className="border-border-default bg-surface-panel hover:border-primary/35 hover:bg-surface-tile-hover focus-visible:ring-ring/40 group flex h-full min-w-0 items-start gap-3 rounded-xl border p-4 shadow-[var(--shadow-panel)] transition-[background-color,border-color] outline-none focus-visible:ring-2"
                        href={result.href}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            'flex size-10 shrink-0 items-center justify-center rounded-lg border',
                            tone.icon,
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-foreground text-sm font-semibold sm:text-base">
                              {result.label}
                            </span>
                            <Badge variant="outline">
                              {result.sourceLabel}
                            </Badge>
                          </span>
                          {result.description && (
                            <span className="text-muted-foreground mt-1.5 line-clamp-2 block text-sm leading-5">
                              {result.description}
                            </span>
                          )}
                          <span className="text-muted-foreground mt-2 block text-xs font-medium">
                            {result.groupLabel}
                          </span>
                        </span>
                        <ArrowRight className="text-muted-foreground group-hover:text-primary-emphasis mt-1 size-4 shrink-0 transition-colors" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <ContentState
                action={
                  <Button
                    onClick={() => {
                      setQueryInput('');
                      navigateWithFilters({
                        pole: null,
                        q: null,
                        source: null,
                      });
                    }}
                    type="button"
                    variant="outline"
                  >
                    Effacer les filtres
                  </Button>
                }
                description="Essayez moins de mots ou élargissez le pôle et la source. Les résultats non autorisés ne sont jamais exposés."
                layout="panel"
                title="Aucun résultat"
              />
            )}
          </section>
        </PageCanvas>
      </PageShell>
    </AuthenticatedLayout>
  );
};
