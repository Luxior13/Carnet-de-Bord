'use client';

import { ArrowRight, CircleX, Search, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import React, {
  type FC,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  normalizeSearchValue,
  type RankedSearchItem,
  rankSearchResults,
} from '$components/layout/global-search.utils';
import {
  canAccessNavigationItem,
  getActiveNavigationSpace,
  getDefaultNavigationSpace,
  getNavigationAvailability,
  getNavigationSpaceItems,
  getVisibleNavigationSpaces,
  type NavigationSpace,
  type NavItem,
} from '$constants/app.constants';
import { getNavigationIcon } from '$constants/navigation-icon.constants';
import { getNavigationSpaceToneClasses } from '$constants/navigation-theme.constants';
import { useUser } from '$context/UserContext';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '$ui/dialog';
import { Input } from '$ui/input';
import { cn } from '$utils/css.utils';

type SearchResult = RankedSearchItem & {
  description?: string;
  groupLabel: string;
  href: string;
  icon: NavItem['icon'];
  label: string;
  space: NavigationSpace;
};

function createSearchResult(
  item: Pick<NavItem, 'description' | 'href' | 'icon' | 'label'>,
  space: NavigationSpace,
  groupLabel = space.label,
): SearchResult {
  return {
    description: item.description,
    groupLabel,
    href: item.href,
    icon: item.icon,
    label: item.label,
    labelSearchText: normalizeSearchValue(item.label),
    searchText: normalizeSearchValue(
      `${groupLabel} ${space.summary} ${item.label} ${item.description ?? ''}`,
    ),
    space,
    spaceSearchText: normalizeSearchValue(groupLabel),
  };
}

function buildSearchResults(
  spaces: readonly NavigationSpace[],
  user: Parameters<typeof canAccessNavigationItem>[0],
): SearchResult[] {
  const seenHrefs = new Set<string>();
  const results: SearchResult[] = [];

  for (const space of spaces) {
    for (const item of getNavigationSpaceItems(space)) {
      if (
        seenHrefs.has(item.href) ||
        getNavigationAvailability(item) !== 'live' ||
        !canAccessNavigationItem(user, item)
      ) {
        continue;
      }

      seenHrefs.add(item.href);
      results.push(createSearchResult(item, space));
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

export const QuickNavigation: FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { userData } = useUser();
  const listboxId = useId();
  const activeResultRef = useRef<HTMLButtonElement | null>(null);
  const [activeResultHref, setActiveResultHref] = useState<string | null>(null);
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
  const allResults = useMemo(() => {
    const navigationResults = buildSearchResults(spaces, userData);

    if (
      !userData ||
      navigationResults.some((result) => result.href === '/mon-compte')
    ) {
      return navigationResults;
    }

    const accountSpace =
      spaces.find((space) => space.id === 'dashboard') ??
      getDefaultNavigationSpace();
    const accountResult = createSearchResult(
      {
        description: 'Profil, sécurité, sessions et activité personnelle.',
        href: '/mon-compte',
        icon: 'UserCheck',
        label: 'Mon compte',
      },
      accountSpace,
      'Compte personnel',
    );

    return [...navigationResults, accountResult];
  }, [spaces, userData]);
  const normalizedQuery = normalizeSearchValue(query);
  const results = useMemo(() => {
    if (!normalizedQuery) {
      return getEmptyQueryResults(allResults, activeSpace);
    }

    return rankSearchResults(allResults, normalizedQuery, 10);
  }, [activeSpace, allResults, normalizedQuery]);
  const activeIndex = useMemo(() => {
    const selectedIndex = activeResultHref
      ? results.findIndex((result) => result.href === activeResultHref)
      : -1;

    if (selectedIndex >= 0) return selectedIndex;

    return results.length > 0 ? 0 : -1;
  }, [activeResultHref, results]);
  const currentResultHref = useMemo(() => {
    const exactResult = results.find((result) => result.href === pathname);

    if (exactResult) return exactResult.href;

    return results.reduce<string | null>((currentHref, result) => {
      if (
        result.href === '/' ||
        !pathname.startsWith(`${result.href}/`) ||
        (currentHref && currentHref.length >= result.href.length)
      ) {
        return currentHref;
      }

      return result.href;
    }, null);
  }, [pathname, results]);

  const closeSearch = useCallback((): void => {
    setOpen(false);
    setQuery('');
    setActiveResultHref(null);
  }, []);

  const navigateToResult = useCallback(
    (result: SearchResult): void => {
      closeSearch();
      if (result.href !== pathname) router.push(result.href);
    },
    [closeSearch, pathname, router],
  );

  useEffect(() => {
    if (
      activeResultHref &&
      !results.some((result) => result.href === activeResultHref)
    ) {
      setActiveResultHref(null);
    }
  }, [activeResultHref, results]);

  useEffect(() => {
    activeResultRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, results]);

  const handleInputKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement>,
  ): void => {
    if (event.nativeEvent.isComposing) return;
    if (results.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = activeIndex >= results.length - 1 ? 0 : activeIndex + 1;
      setActiveResultHref(results.at(nextIndex)?.href ?? null);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex = activeIndex <= 0 ? results.length - 1 : activeIndex - 1;
      setActiveResultHref(results.at(nextIndex)?.href ?? null);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      const activeResult = results.at(activeIndex);
      if (activeResult) navigateToResult(activeResult);
    }
  };

  const activeOptionId =
    activeIndex >= 0 && results.at(activeIndex)
      ? `${listboxId}-option-${activeIndex}`
      : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setOpen(true);
        else closeSearch();
      }}
    >
      <DialogTrigger asChild>
        <button
          aria-label="Ouvrir la navigation rapide"
          className="border-border-control bg-surface-control text-muted-foreground hover:border-primary/35 hover:bg-surface-control-hover hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/35 flex h-10 min-w-10 shrink-0 items-center justify-center gap-2 rounded-lg border px-2.5 text-sm transition-[background-color,border-color,color,box-shadow] outline-none focus-visible:ring-[3px] lg:h-9 lg:min-w-64 lg:justify-start"
          type="button"
        >
          <Search aria-hidden="true" className="size-4" />
          <span className="hidden lg:inline">Aller à une page...</span>
        </button>
      </DialogTrigger>
      <DialogContent
        className="border-border-default bg-surface-panel h-dvh max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 shadow-[var(--shadow-panel-strong)] sm:h-auto sm:max-h-[min(38rem,85vh)] sm:rounded-xl"
        fullscreenOnMobile
        hideCloseButton
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Navigation rapide</DialogTitle>
          <DialogDescription>
            Accès rapide aux pages disponibles et autorisées.
          </DialogDescription>
        </DialogHeader>
        <div className="group/search border-border-divider bg-surface-panel-raised/95 flex items-center gap-2 border-b px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 sm:pt-2">
          <Search
            aria-hidden="true"
            className="text-muted-foreground group-focus-within/search:text-primary-emphasis ml-1 size-4 shrink-0 transition-colors"
          />
          <Input
            aria-activedescendant={activeOptionId}
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded="true"
            aria-label="Rechercher une page"
            autoComplete="off"
            autoFocus
            className="h-11 rounded-none border-0 bg-transparent px-1 shadow-none focus-visible:bg-transparent focus-visible:ring-0 lg:h-10"
            enterKeyHint="go"
            inputMode="search"
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveResultHref(null);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Rechercher une page..."
            role="combobox"
            value={query}
          />
          {query && (
            <button
              aria-label="Effacer la recherche"
              className="text-muted-foreground hover:bg-surface-tile-hover hover:text-foreground focus-visible:ring-ring/50 flex size-11 shrink-0 items-center justify-center rounded-lg outline-none focus-visible:ring-2"
              onClick={() => {
                setQuery('');
                setActiveResultHref(null);
              }}
              onMouseDown={(event) => event.preventDefault()}
              type="button"
            >
              <CircleX aria-hidden="true" className="size-4" />
            </button>
          )}
          <div className="border-border-divider ml-1 border-l pl-1">
            <DialogClose asChild>
              <button
                aria-label="Fermer la navigation rapide"
                className="text-muted-foreground hover:bg-surface-tile-hover hover:text-foreground focus-visible:ring-ring/50 flex size-11 shrink-0 items-center justify-center rounded-lg outline-none focus-visible:ring-2"
                type="button"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </DialogClose>
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pb-2">
          <span aria-live="polite" className="sr-only" role="status">
            {results.length} résultat{results.length !== 1 ? 's' : ''}
          </span>
          {!normalizedQuery && results.length > 0 && (
            <p className="text-muted-foreground px-2 pt-1 pb-2 text-[11px] font-semibold tracking-[0.12em] uppercase">
              Pages suggérées
            </p>
          )}
          <div
            aria-label="Pages disponibles"
            className="space-y-1"
            id={listboxId}
            role="listbox"
          >
            {results.map((result, index) => {
              const Icon = getNavigationIcon(result.icon);
              const tone = getNavigationSpaceToneClasses(result.space.tone);
              const isActive = index === activeIndex;
              const isCurrentPage = pathname === result.href;
              const isCurrentResult = result.href === currentResultHref;
              const optionId = `${listboxId}-option-${index}`;

              return (
                <button
                  aria-current={
                    isCurrentResult
                      ? isCurrentPage
                        ? 'page'
                        : 'location'
                      : undefined
                  }
                  aria-selected={isActive}
                  className={cn(
                    'group focus-visible:ring-ring/50 flex w-full min-w-0 items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors outline-none focus-visible:ring-2',
                    isActive
                      ? 'bg-primary/10 ring-primary/30 ring-1 ring-inset'
                      : 'hover:bg-surface-tile-hover',
                  )}
                  id={optionId}
                  key={result.href}
                  onClick={() => navigateToResult(result)}
                  onMouseEnter={() => setActiveResultHref(result.href)}
                  ref={isActive ? activeResultRef : undefined}
                  role="option"
                  tabIndex={-1}
                  type="button"
                >
                  <span
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-lg border',
                      tone.icon,
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-foreground block truncate text-sm font-semibold">
                      {result.label}
                    </span>
                    <span className="text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1.5 text-xs">
                      <span className="shrink-0">{result.groupLabel}</span>
                      {result.description && (
                        <>
                          <span aria-hidden="true" className="hidden sm:inline">
                            ·
                          </span>
                          <span className="hidden truncate sm:inline">
                            {result.description}
                          </span>
                        </>
                      )}
                    </span>
                  </span>
                  {isCurrentResult ? (
                    <span className="border-primary/25 bg-primary/10 text-primary-emphasis shrink-0 rounded border px-1.5 py-0.5 text-[11px]">
                      {isCurrentPage ? 'Actuelle' : 'Section actuelle'}
                    </span>
                  ) : (
                    <ArrowRight
                      aria-hidden="true"
                      className={cn(
                        'text-muted-foreground size-4 shrink-0 transition-opacity',
                        isActive
                          ? 'text-primary-emphasis opacity-100'
                          : 'opacity-0',
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
          {results.length === 0 && (
            <div className="flex flex-col items-center px-4 py-10 text-center">
              <span className="border-border-subtle bg-surface-inset text-muted-foreground flex size-10 items-center justify-center rounded-lg border">
                <Search aria-hidden="true" className="size-4" />
              </span>
              <p className="text-foreground mt-3 text-sm font-semibold">
                Aucune page trouvée
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Essayez avec moins de mots ou une autre formulation.
              </p>
            </div>
          )}
        </div>
        <div className="border-border-divider bg-surface-inset/85 text-muted-foreground hidden items-center gap-4 border-t px-4 py-2 text-[11px] sm:flex">
          <span className="flex items-center gap-1.5">
            <kbd className="border-border-subtle bg-surface-control rounded-md border px-1.5 py-0.5 font-mono">
              ↑↓
            </kbd>
            Parcourir
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="border-border-subtle bg-surface-control rounded-md border px-1.5 py-0.5 font-mono">
              Entrée
            </kbd>
            Ouvrir
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <kbd className="border-border-subtle bg-surface-control rounded-md border px-1.5 py-0.5 font-mono">
              Échap
            </kbd>
            Fermer
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
