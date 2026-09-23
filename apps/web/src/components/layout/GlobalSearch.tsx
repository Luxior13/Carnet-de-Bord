'use client';

import { ArrowRight, CircleX, Search, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import React, {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  normalizeSearchValue,
  rankSearchResults,
} from '$components/layout/global-search.utils';
import {
  getActiveNavigationSpace,
  getVisibleNavigationSpaces,
} from '$constants/app.constants';
import { getNavigationIcon } from '$constants/navigation-icon.constants';
import { useFeatureAvailability } from '$context/FeatureAvailabilityContext';
import { useUser } from '$context/UserContext';
import {
  buildSearchCatalog,
  getSuggestedSearchItems,
} from '$features/search/search-catalog';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '$ui/command';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '$ui/dialog';
import { requestGuardedNavigation } from '$utils/guarded-navigation.utils';

export const QuickNavigation: FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { userData } = useUser();
  const { featureAvailabilityLoaded, operationalFeatureIds } =
    useFeatureAvailability();
  const [activeResultHref, setActiveResultHref] = useState('');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const spaces = useMemo(
    () =>
      getVisibleNavigationSpaces(
        userData,
        'live',
        featureAvailabilityLoaded ? operationalFeatureIds : undefined,
      ),
    [featureAvailabilityLoaded, operationalFeatureIds, userData],
  );
  const activeSpace = useMemo(
    () => getActiveNavigationSpace(pathname, spaces),
    [pathname, spaces],
  );
  const allResults = useMemo(
    () => buildSearchCatalog(spaces, userData),
    [spaces, userData],
  );
  const normalizedQuery = normalizeSearchValue(query);
  const results = useMemo(
    () =>
      normalizedQuery
        ? rankSearchResults(allResults, normalizedQuery, 10)
        : getSuggestedSearchItems(allResults, activeSpace),
    [activeSpace, allResults, normalizedQuery],
  );
  const advancedSearchHref = normalizedQuery
    ? `/recherche?q=${encodeURIComponent(query.trim())}`
    : '/recherche';
  const currentResultHref = useMemo(() => {
    const exactResult = results.find((result) => result.href === pathname);
    if (exactResult) return exactResult.href;

    return results.reduce<string | null>((currentHref, result) => {
      if (
        result.href === '/' ||
        !pathname.startsWith(`${result.href}/`) ||
        (currentHref && currentHref.length >= result.href.length)
      )
        return currentHref;

      return result.href;
    }, null);
  }, [pathname, results]);

  const closeSearch = useCallback((): void => {
    setOpen(false);
    setQuery('');
    setActiveResultHref('');
  }, []);
  const navigateToHref = useCallback(
    (href: string): void => {
      closeSearch();
      if (href !== pathname && requestGuardedNavigation(href))
        router.push(href);
    },
    [closeSearch, pathname, router],
  );

  useEffect(() => {
    if (!results.some((result) => result.href === activeResultHref))
      setActiveResultHref(results.at(0)?.href ?? '');
  }, [activeResultHref, results]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : closeSearch())}
    >
      <DialogTrigger asChild>
        <Button
          aria-label="Ouvrir la navigation rapide"
          variant="outline"
          className="text-muted-foreground min-w-10 gap-2 px-2.5 font-normal lg:min-w-56 lg:justify-start xl:min-w-64"
          type="button"
        >
          <Search aria-hidden="true" className="size-4" />
          <span className="hidden lg:inline">Rechercher une page</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        fullscreenOnMobile
        hideCloseButton
        className="border-border-default bg-popover h-dvh max-w-2xl overflow-hidden p-0 sm:h-auto sm:max-h-[min(38rem,85dvh)]"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Navigation rapide</DialogTitle>
          <DialogDescription>
            Accès rapide aux pages disponibles et autorisées.
          </DialogDescription>
        </DialogHeader>
        <Command
          label="Rechercher une page"
          shouldFilter={false}
          loop
          value={activeResultHref}
          onValueChange={setActiveResultHref}
          className="min-h-0 rounded-none"
        >
          <CommandInput
            aria-label="Rechercher une page"
            autoComplete="off"
            autoFocus
            placeholder="Rechercher une page..."
            value={query}
            onValueChange={setQuery}
            trailing={
              <>
                {query && (
                  <Button
                    aria-label="Effacer la recherche"
                    className="size-11"
                    onClick={() => setQuery('')}
                    onMouseDown={(event) => event.preventDefault()}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <CircleX aria-hidden="true" className="size-4" />
                  </Button>
                )}
                <DialogClose asChild>
                  <Button
                    aria-label="Fermer la navigation rapide"
                    className="size-11"
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </Button>
                </DialogClose>
              </>
            }
          />
          <span aria-live="polite" className="sr-only" role="status">
            {results.length} résultat{results.length !== 1 ? 's' : ''}
          </span>
          <CommandList
            label="Pages disponibles"
            className="max-h-none min-h-0 flex-1 p-2 sm:max-h-96"
          >
            <CommandEmpty>
              Aucune page trouvée. Essayez une autre recherche.
            </CommandEmpty>
            <CommandGroup
              heading={normalizedQuery ? 'Résultats' : 'Pages suggérées'}
            >
              {results.map((result) => {
                const Icon = getNavigationIcon(result.icon);
                const isCurrentResult = result.href === currentResultHref;

                return (
                  <CommandItem
                    aria-current={
                      isCurrentResult
                        ? pathname === result.href
                          ? 'page'
                          : 'location'
                        : undefined
                    }
                    className="gap-3 py-3"
                    key={result.href}
                    value={result.href}
                    onSelect={() => navigateToHref(result.href)}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {result.label}
                      </span>
                      <span className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                        <span>{result.groupLabel}</span>
                        {result.description && (
                          <span className="hidden truncate sm:inline">
                            · {result.description}
                          </span>
                        )}
                      </span>
                    </span>
                    {isCurrentResult && (
                      <Badge variant="secondary">Actuelle</Badge>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          <div className="border-border-divider text-muted-foreground mx-4 shrink-0 border-t pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>Besoin de plus de filtres ?</span>
              <Button
                onClick={() => navigateToHref(advancedSearchHref)}
                size="inline"
                type="button"
                variant="link"
              >
                Recherche avancée
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Button>
            </div>
            <p className="mt-3 hidden sm:block">
              ↑↓ Parcourir · Entrée Ouvrir · Échap Fermer
            </p>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
};
