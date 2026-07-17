import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const readSourceFile = (relativePath: string): string => {
  // Test-owned paths only; the helper never receives external input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
};

const pageSource = readSourceFile('../features/search/SearchPage.tsx');
const catalogSource = readSourceFile('../features/search/search-catalog.ts');
const navigationSource = readSourceFile('../shared/constants/app.constants.ts');

describe('advanced search UX contracts', () => {
  it('promotes search as a live registered destination', () => {
    expect(navigationSource).toContain('featureId: FEATURES.search.id');
    expect(navigationSource).toContain("href: '/recherche'");
    expect(navigationSource).toContain("label: 'Recherche avancée'");
  });

  it('uses one permission-filtered catalogue for quick and advanced search', () => {
    expect(catalogSource).toContain('getNavigationSpaceItems');
    expect(catalogSource).toContain(
      "getNavigationAvailability(item) !== 'live'",
    );
    expect(catalogSource).toContain('!canAccessNavigationItem(user, item)');
    expect(pageSource).toContain('buildSearchCatalog(spaces, userData)');
  });

  it('keeps query, pole and source filters in a shareable URL', () => {
    expect(pageSource).toContain("searchParams.get('q')");
    expect(pageSource).toContain("searchParams.get('pole')");
    expect(pageSource).toContain("searchParams.get('source')");
    expect(pageSource).toContain(
      'new URLSearchParams(searchParams.toString())',
    );
    expect(pageSource).toContain('router.push(queryString ?');
  });

  it('provides accessible search, result count and empty states', () => {
    expect(pageSource).toContain('role="search"');
    expect(pageSource).toContain('aria-live="polite"');
    expect(pageSource).toContain('role="status"');
    expect(pageSource).toContain('title="Aucun résultat"');
    expect(pageSource).toContain('Réinitialiser les filtres');
  });

  it('keeps the page inside its private background at sidebar widths', () => {
    expect(pageSource).toContain('<PageShell className="py-0">');
    expect(pageSource).toContain(
      'md:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_12rem_12rem_auto]',
    );
    expect(pageSource).not.toContain('width="wide"');
    expect(pageSource).not.toContain(
      'lg:grid-cols-[minmax(16rem,1fr)_13rem_13rem_auto]',
    );
  });
});
