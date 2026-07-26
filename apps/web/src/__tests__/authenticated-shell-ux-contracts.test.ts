import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const readSourceFile = (relativePath: string): string => {
  // Test-owned paths only; the helper never receives external input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
};

const rootLayoutSource = readSourceFile('../app/layout.tsx');
const authenticatedLayoutSource = readSourceFile(
  '../components/AuthenticatedLayout.tsx',
);
const breadcrumbSource = readSourceFile('../components/ui/breadcrumb.tsx');

describe('persistent authenticated shell UX contracts', () => {
  it('mounts one route-persistent shell above private page content', () => {
    expect(rootLayoutSource).toContain('<PersistentAuthenticatedShell>');
    expect(authenticatedLayoutSource).toContain(
      'AuthenticatedShellContext.Provider',
    );
    expect(authenticatedLayoutSource).toContain(
      'if (shellContext) return children;',
    );
    expect(authenticatedLayoutSource).toContain('registerPageConfig');
  });

  it('lets public routes pass through the persistent root wrapper', () => {
    expect(authenticatedLayoutSource).toContain('isPublicPagePath(pathname)');
    expect(authenticatedLayoutSource).toContain(
      'if (isPublicPage) return children;',
    );
  });

  it('keeps hidden breadcrumb levels reachable and removes duplicate home links', () => {
    expect(breadcrumbSource).toContain(
      'aria-label="Afficher les niveaux intermédiaires"',
    );
    expect(breadcrumbSource).toContain('collapsedItems.map');
    expect(breadcrumbSource).toContain(
      'allItems.length > 3 ? allItems.slice(1, -1) : []',
    );
    expect(breadcrumbSource).toContain(
      "showHome && items[0]?.href === '/' ? items.slice(1) : items",
    );
  });
});
