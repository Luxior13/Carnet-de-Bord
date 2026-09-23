import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  normalizeSearchValue,
  type RankedSearchItem,
  rankSearchResults,
} from '$components/layout/global-search.utils';

type SearchFixture = RankedSearchItem & {
  id: string;
};

const createFixture = ({
  description = '',
  id,
  label,
  space = '',
}: {
  description?: string;
  id: string;
  label: string;
  space?: string;
}): SearchFixture => ({
  id,
  labelSearchText: normalizeSearchValue(label),
  searchText: normalizeSearchValue(`${space} ${label} ${description}`),
  spaceSearchText: normalizeSearchValue(space),
});

// Static, test-owned path only.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const globalSearchSource = readFileSync(
  new URL('../components/layout/GlobalSearch.tsx', import.meta.url),
  'utf8',
);
// Static, test-owned path only.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const searchCatalogSource = readFileSync(
  new URL('../features/search/search-catalog.ts', import.meta.url),
  'utf8',
);

// Static, test-owned path only.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const commandSource = readFileSync(
  new URL('../components/ui/command.tsx', import.meta.url),
  'utf8',
);

describe('global page search', () => {
  it('normalizes accents, ligatures, punctuation and repeated spaces', () => {
    expect(
      normalizeSearchValue('  Modèles—d’activité / ÉQUIPE & œuvre  '),
    ).toBe('modeles d activite equipe oeuvre');
    expect(normalizeSearchValue('Membres & adhérents')).toBe(
      'membres adherents',
    );
    expect(normalizeSearchValue('… / —')).toBe('');
  });

  it('matches all query words regardless of punctuation or order', () => {
    const fixtures = [
      createFixture({
        id: 'users',
        label: 'Utilisateurs',
        space: 'Système',
      }),
      createFixture({
        id: 'journal',
        label: "Journal d'activité",
        space: 'Système',
      }),
    ];

    expect(
      rankSearchResults(fixtures, normalizeSearchValue('utilisateurs')).map(
        (item) => item.id,
      ),
    ).toEqual(['users']);
    expect(
      rankSearchResults(fixtures, normalizeSearchValue('journal activite')).map(
        (item) => item.id,
      ),
    ).toEqual(['journal']);
  });

  it('ranks exact and label-prefix matches before descriptions', () => {
    const fixtures = [
      createFixture({
        description: 'Consulter le journal central.',
        id: 'description',
        label: 'Historique',
      }),
      createFixture({ id: 'prefix', label: "Journal d'activité" }),
      createFixture({ id: 'exact', label: 'Journal' }),
    ];

    expect(
      rankSearchResults(fixtures, normalizeSearchValue('journal')).map(
        (item) => item.id,
      ),
    ).toEqual(['exact', 'prefix', 'description']);
  });

  it('keeps catalog order for equal scores and respects the result limit', () => {
    const fixtures = ['first', 'second', 'third'].map((id) =>
      createFixture({ id, label: 'Page test' }),
    );

    expect(
      rankSearchResults(fixtures, normalizeSearchValue('page'), 2).map(
        (item) => item.id,
      ),
    ).toEqual(['first', 'second']);
  });

  it('delegates keyboard and ARIA behavior to the shadcn Command primitive', () => {
    expect(commandSource).toContain("from 'cmdk'");
    for (const primitive of ['CommandInput', 'CommandList', 'CommandItem'])
      expect(globalSearchSource).toContain('<' + primitive);
    expect(globalSearchSource).toContain('shouldFilter={false}');
    expect(globalSearchSource).toMatch(/<Command[\s\S]+?\bloop\b/);
    expect(globalSearchSource).toContain('value={activeResultHref}');
    expect(globalSearchSource).toContain('onValueChange={setActiveResultHref}');
    expect(globalSearchSource).toContain(
      'onSelect={() => navigateToHref(result.href)}',
    );
  });

  it('opens only from the header button without a global shortcut', () => {
    expect(globalSearchSource).not.toContain('aria-keyshortcuts');
    expect(globalSearchSource).not.toContain('handleGlobalShortcut');
    expect(globalSearchSource).not.toContain("event.code !== 'KeyK'");
  });

  it('keeps mobile dismissal explicit and only indexes live pages', () => {
    expect(globalSearchSource).toContain(
      'aria-label="Fermer la navigation rapide"',
    );
    expect(globalSearchSource).toContain('size-11');
    expect(searchCatalogSource).toContain(
      "getNavigationAvailability(item) !== 'live'",
    );
    expect(searchCatalogSource).toContain(
      '!canAccessNavigationItem(user, item)',
    );
    expect(searchCatalogSource).toContain("href: '/mon-compte'");
    expect(globalSearchSource).toContain('aria-label="Effacer la recherche"');
  });

  it('links the quick dialog to the shareable advanced search', () => {
    expect(globalSearchSource).toContain('advancedSearchHref');
    expect(globalSearchSource).toContain('Recherche avancée');
    expect(globalSearchSource).toContain('requestGuardedNavigation(href)');
    expect(globalSearchSource).toMatch(
      /\/recherche\?q=.*encodeURIComponent\(query\.trim\(\)\)/,
    );
  });

  it('preserves selection by destination and marks one current result', () => {
    expect(globalSearchSource).toContain('activeResultHref');
    expect(globalSearchSource).toContain('currentResultHref');
    expect(globalSearchSource).toContain(
      'const isCurrentResult = result.href === currentResultHref',
    );
    expect(globalSearchSource).not.toContain('setActiveIndex');
  });

  it('keeps a flat dialog hierarchy and explicit mobile safe areas', () => {
    expect(globalSearchSource).toContain('bg-popover h-dvh');
    expect(commandSource).toContain('border-border-divider mx-4');
    expect(globalSearchSource).toContain(
      'border-border-divider text-muted-foreground mx-4',
    );
    expect(commandSource).toContain(
      'data-[selected=true]:bg-surface-navigation-active',
    );
    expect(globalSearchSource).not.toContain('bg-surface-panel-raised/95');
    expect(globalSearchSource).not.toContain('ring-primary/30');
    expect(globalSearchSource).toContain('Pages suggérées');
    expect(commandSource).toContain('safe-area-inset-top');
    expect(globalSearchSource).toContain('safe-area-inset-bottom');
    expect(globalSearchSource).toContain('hidden truncate sm:inline');
    expect(globalSearchSource).not.toContain('focus-within:border-primary');
  });
});
