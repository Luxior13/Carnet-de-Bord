'use client';

import { ArrowRight, CircleX, Search, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import React, {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  normalizeSearchValue,
  rankSearchResults,
  SEARCH_QUERY_MAX_LENGTH,
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
import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';
import { requestGuardedNavigation } from '$utils/guarded-navigation.utils';

function isolateSearchButtonKeys(
  event: React.KeyboardEvent<HTMLButtonElement>,
): void {
  // Command handles Enter on its root; buttons must only activate their own action.
  if (event.key !== 'Escape') event.stopPropagation();
}

export const QuickNavigation: FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { userData } = useUser();
  const { featureAvailabilityLoaded, navigableFeatureIds } =
    useFeatureAvailability();
  const [activeResultHref, setActiveResultHref] = useState('');
  const [open, setOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const spaces = useMemo(
    () =>
      getVisibleNavigationSpaces(
        userData,
        'live',
        featureAvailabilityLoaded ? navigableFeatureIds : undefined,
      ),
    [featureAvailabilityLoaded, navigableFeatureIds, userData],
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
  const hasResults = results.length > 0;
  const advancedSearchHref =
    normalizedQuery && hasResults
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

  useEffect(() => closeSearch(), [closeSearch, pathname]);

  useEffect(() => {
    if (!results.some((result) => result.href === activeResultHref))
      setActiveResultHref(results.at(0)?.href ?? '');
  }, [activeResultHref, results]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : closeSearch())}
    >
      <Tooltip
        delayDuration={300}
        open={!open && tooltipOpen}
        onOpenChange={setTooltipOpen}
      >
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              aria-label="Rechercher une page"
              variant="outline"
              className="text-muted-foreground data-[state=open]:border-border-strong data-[state=open]:bg-surface-control-focus size-11 gap-2 rounded-sm p-0 font-normal focus-visible:ring-inset has-[>svg]:px-0 lg:h-9 lg:w-56 lg:justify-start lg:px-3 lg:has-[>svg]:px-3 xl:w-64"
              type="button"
            >
              <Search aria-hidden="true" className="size-4" />
              <span className="hidden lg:inline">Rechercher une page</span>
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="animate-none! rounded-sm shadow-none"
        >
          Rechercher une page
        </TooltipContent>
      </Tooltip>
      <DialogContent
        fullscreenOnMobile
        hideCloseButton
        overlayClassName="animate-none!"
        className="border-border-default bg-popover h-dvh max-w-2xl animate-none! overflow-hidden p-0 shadow-none sm:h-auto sm:max-h-[min(38rem,85dvh)] sm:rounded-sm"
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
          vimBindings={false}
          loop
          value={activeResultHref}
          onValueChange={setActiveResultHref}
          className="min-h-0 rounded-none"
        >
          <CommandInput
            aria-label="Rechercher une page"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            autoFocus
            className="focus-visible:ring-ring rounded-sm px-2 focus-visible:ring-[length:var(--ring-width)] focus-visible:ring-inset"
            data-1p-ignore="true"
            data-bwignore="true"
            data-lpignore="true"
            maxLength={SEARCH_QUERY_MAX_LENGTH}
            name="page-search"
            placeholder="Rechercher une page..."
            ref={searchInputRef}
            spellCheck={false}
            value={query}
            onValueChange={setQuery}
            trailing={
              <>
                {query && (
                  <Button
                    aria-label="Effacer la recherche"
                    className="size-11 rounded-sm transition-none focus-visible:ring-inset lg:size-11"
                    onClick={() => {
                      setQuery('');
                      searchInputRef.current?.focus();
                    }}
                    onKeyDown={isolateSearchButtonKeys}
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
                    className="size-11 rounded-sm transition-none focus-visible:ring-inset lg:size-11"
                    onKeyDown={isolateSearchButtonKeys}
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
            {results.length} résultat{results.length !== 1 ? 's' : ''} affiché
            {results.length !== 1 ? 's' : ''}
          </span>
          <CommandList
            label="Pages disponibles"
            className="max-h-none min-h-0 flex-1 p-2 sm:max-h-96"
          >
            <CommandEmpty className="px-4 py-8 text-center text-sm">
              <p className="font-medium">Aucune page trouvée</p>
              <p className="text-muted-foreground mt-1">
                Essayez un autre nom ou une rubrique.
              </p>
            </CommandEmpty>
            {hasResults && (
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
                      className="gap-3 rounded-sm py-3 outline-none forced-colors:-outline-offset-2 forced-colors:data-[selected=true]:[outline:2px_solid_Highlight]"
                      key={result.href}
                      value={result.href}
                      onSelect={() => navigateToHref(result.href)}
                    >
                      <Icon aria-hidden="true" className="size-4" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium [overflow-wrap:anywhere]">
                          {result.label}
                        </span>
                        <span className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                          <span className="shrink-0">{result.groupLabel}</span>
                          {isCurrentResult && (
                            <span className="shrink-0">
                              ·{' '}
                              {pathname === result.href
                                ? 'Page actuelle'
                                : 'Section actuelle'}
                            </span>
                          )}
                          {result.description && (
                            <span className="hidden truncate sm:inline">
                              · {result.description}
                            </span>
                          )}
                        </span>
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
          <div className="border-border-divider text-muted-foreground mx-4 flex shrink-0 flex-wrap items-center justify-end gap-x-4 gap-y-1 border-t pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-xs">
            <p className="hidden sm:block">
              ↑↓ Parcourir · Entrée Ouvrir · Échap Fermer
            </p>
            <Button
              className="text-primary-emphasis h-11 rounded-sm px-3 font-medium transition-none focus-visible:ring-inset sm:ml-auto lg:h-10"
              onClick={() => navigateToHref(advancedSearchHref)}
              onKeyDown={isolateSearchButtonKeys}
              type="button"
              variant="ghost"
            >
              {normalizedQuery
                ? hasResults
                  ? 'Voir tous les résultats'
                  : 'Parcourir les pages'
                : 'Ouvrir la recherche'}
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Button>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
};
