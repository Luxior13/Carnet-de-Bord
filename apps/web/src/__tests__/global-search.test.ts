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

describe('global page search', () => {
  it('normalizes accents, ligatures, punctuation and repeated spaces', () => {
    expect(
      normalizeSearchValue('  Modèles—d’activité / ÉQUIPE & œuvre  '),
    ).toBe('modeles d activite equipe oeuvre');
    expect(normalizeSearchValue('Utilisateurs & permissions')).toBe(
      'utilisateurs permissions',
    );
    expect(normalizeSearchValue('… / —')).toBe('');
  });

  it('matches all query words regardless of punctuation or order', () => {
    const fixtures = [
      createFixture({
        id: 'users',
        label: 'Utilisateurs & permissions',
        space: 'Système',
      }),
      createFixture({
        id: 'journal',
        label: "Journal d'activité",
        space: 'Système',
      }),
    ];

    expect(
      rankSearchResults(
        fixtures,
        normalizeSearchValue('permissions utilisateurs'),
      ).map((item) => item.id),
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

  it('provides the command-palette keyboard and ARIA contract', () => {
    expect(globalSearchSource).toContain("event.key === 'ArrowDown'");
    expect(globalSearchSource).toContain("event.key === 'ArrowUp'");
    expect(globalSearchSource).toContain("event.key === 'Enter'");
    expect(globalSearchSource).toContain('role="combobox"');
    expect(globalSearchSource).toContain('role="listbox"');
    expect(globalSearchSource).toContain('role="option"');
    expect(globalSearchSource).toContain('aria-activedescendant');
    expect(globalSearchSource).toContain('aria-selected={isActive}');
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

  it('keeps the dialog hierarchy and mobile safe areas explicit', () => {
    expect(globalSearchSource).toContain('bg-surface-panel h-dvh');
    expect(globalSearchSource).toContain('bg-surface-panel-raised/95');
    expect(globalSearchSource).toContain('bg-surface-inset/85');
    expect(globalSearchSource).toContain('bg-primary/10 ring-primary/30');
    expect(globalSearchSource).toContain('Pages suggérées');
    expect(globalSearchSource).toContain('safe-area-inset-top');
    expect(globalSearchSource).toContain('safe-area-inset-bottom');
    expect(globalSearchSource).toContain('ml-1 border-l pl-1');
    expect(globalSearchSource).toContain('hidden truncate sm:inline');
    expect(globalSearchSource).toContain('focus-visible:bg-transparent');
    expect(globalSearchSource).not.toContain('focus-within:border-primary');
  });
});
