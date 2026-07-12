'use client';

import { ArrowRight, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { type FC, useMemo, useState } from 'react';

import {
  getActiveNavigationSpace,
  getNavigationSpaceItems,
  getVisibleNavigationSpaces,
  type NavigationSpace,
  type NavItem,
} from '$constants/app.constants';
import { getNavigationIcon } from '$constants/navigation-icon.constants';
import { getNavigationSpaceToneClasses } from '$constants/navigation-theme.constants';
import { useUser } from '$context/UserContext';
import { Button } from '$ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '$ui/dialog';
import { Input } from '$ui/input';
import { cn } from '$utils/css.utils';

type SearchResult = {
  description?: string;
  href: string;
  icon: NavItem['icon'];
  label: string;
  searchText: string;
  space: NavigationSpace;
};

function normalizeSearchValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim();
}

function buildSearchResults(
  spaces: readonly NavigationSpace[],
): SearchResult[] {
  const seenHrefs = new Set<string>();
  const results: SearchResult[] = [];

  for (const space of spaces) {
    for (const item of getNavigationSpaceItems(space)) {
      if (seenHrefs.has(item.href)) continue;

      seenHrefs.add(item.href);
      results.push({
        description: item.description,
        href: item.href,
        icon: item.icon,
        label: item.label,
        searchText: normalizeSearchValue(
          `${space.label} ${space.summary} ${item.label} ${item.description ?? ''}`,
        ),
        space,
      });
    }
  }

  return results;
}

function getEmptyQueryResults(
  results: readonly SearchResult[],
  activeSpace: NavigationSpace,
): SearchResult[] {
  const activeSpaceResults = results.filter(
    (result) => result.space.id === activeSpace.id,
  );
  const otherResults = results.filter(
    (result) => result.space.id !== activeSpace.id,
  );

  return [...activeSpaceResults, ...otherResults].slice(0, 8);
}

export const GlobalSearch: FC = () => {
  const pathname = usePathname();
  const { userData } = useUser();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const spaces = useMemo(
    () => getVisibleNavigationSpaces(userData),
    [userData],
  );
  const activeSpace = useMemo(
    () => getActiveNavigationSpace(pathname, spaces),
    [pathname, spaces],
  );
  const allResults = useMemo(() => buildSearchResults(spaces), [spaces]);
  const normalizedQuery = normalizeSearchValue(query);
  const results = useMemo(() => {
    if (!normalizedQuery) {
      return getEmptyQueryResults(allResults, activeSpace);
    }

    return allResults
      .filter((result) => result.searchText.includes(normalizedQuery))
      .slice(0, 10);
  }, [activeSpace, allResults, normalizedQuery]);

  const closeSearch = (): void => {
    setOpen(false);
    setQuery('');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setQuery('');
      }}
    >
      <DialogTrigger asChild>
        <button
          aria-label="Ouvrir la recherche globale"
          className="border-sidebar-border/70 bg-surface-control text-muted-foreground hover:border-sidebar-ring/35 hover:text-foreground flex h-9 min-w-9 shrink-0 items-center justify-center gap-2 rounded-md border px-2.5 text-sm transition-colors lg:min-w-64 lg:justify-start"
          type="button"
        >
          <Search className="size-4" />
          <span className="hidden lg:inline">Rechercher...</span>
        </button>
      </DialogTrigger>
      <DialogContent
        className="border-sidebar-border/80 bg-surface-raised/98 max-w-2xl overflow-hidden p-0 shadow-[var(--shadow-panel-strong)]"
        fullscreenOnMobile
        hideCloseButton
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Recherche globale</DialogTitle>
          <DialogDescription>
            Recherche rapide dans les pages accessibles.
          </DialogDescription>
        </DialogHeader>
        <div className="border-sidebar-border/65 flex items-center gap-3 border-b px-4 py-3">
          <Search className="text-muted-foreground size-4 shrink-0" />
          <Input
            aria-label="Rechercher dans les pages accessibles"
            autoFocus
            className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une page..."
            value={query}
          />
        </div>
        <div className="max-h-[min(28rem,calc(100vh-11rem))] overflow-y-auto p-2">
          <span aria-live="polite" className="sr-only" role="status">
            {results.length} résultat{results.length > 1 ? 's' : ''}
          </span>
          {results.length > 0 ? (
            <div className="space-y-1">
              {results.map((result) => {
                const Icon = getNavigationIcon(result.icon);
                const tone = getNavigationSpaceToneClasses(result.space.tone);

                return (
                  <Link
                    className="hover:bg-sidebar-accent/55 focus-visible:ring-sidebar-ring/50 group flex min-w-0 items-center gap-3 rounded-md px-2.5 py-2.5 transition-colors outline-none focus-visible:ring-2"
                    href={result.href}
                    key={result.href}
                    onClick={closeSearch}
                  >
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-md border',
                        tone.icon,
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-foreground block truncate text-sm font-semibold">
                        {result.label}
                      </span>
                      <span className="text-muted-foreground mt-0.5 flex min-w-0 items-center gap-2 text-xs">
                        <span className="shrink-0">{result.space.label}</span>
                        {result.description && (
                          <span className="truncate">{result.description}</span>
                        )}
                      </span>
                    </span>
                    <ArrowRight className="text-muted-foreground size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center px-4 py-10 text-center">
              <span className="border-sidebar-border/70 bg-sidebar-accent/20 text-muted-foreground flex size-10 items-center justify-center rounded-lg border">
                <Search className="size-4" />
              </span>
              <p className="text-foreground mt-3 text-sm font-semibold">
                Aucun resultat
              </p>
            </div>
          )}
        </div>
        <div className="border-sidebar-border/65 flex items-center justify-end border-t p-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/recherche" onClick={closeSearch}>
              Recherche avancee
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
