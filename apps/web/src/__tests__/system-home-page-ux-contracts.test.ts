import { existsSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const readSourceFile = (relativePath: string): string => {
  // Test-owned paths only; the helper never receives external input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
};

const systemHomeSource = readSourceFile(
  '../components/private-navigation/SystemHomePage.tsx',
);
const systemRouteSource = readSourceFile('../app/systeme/[[...slug]]/page.tsx');
const dashboardAliasSource = readSourceFile(
  '../app/tableau-de-bord/[[...slug]]/page.tsx',
);

const plannedRouteSources = [
  '../app/bureau-juridique/[[...slug]]/page.tsx',
  '../app/recherche/page.tsx',
  '../app/sport-team-control/[[...slug]]/page.tsx',
  '../app/tresorerie/[[...slug]]/page.tsx',
  '../app/vie-interne/[[...slug]]/page.tsx',
] as const;

describe('/systeme hub UX contracts', () => {
  it('derives authorized live tools from the shared navigation registry', () => {
    expect(systemHomeSource).toContain('getLiveNavigationSpaceTools');
    expect(systemHomeSource).not.toContain('SYSTEM_TOOL_HREFS');
    expect(systemHomeSource).not.toContain('getNavigationItemByHref');
  });

  it('uses one accessible link for the complete tool card', () => {
    expect(systemHomeSource).toMatch(
      /<Link[\s\S]{0,500}href=\{item\.href\}[\s\S]{0,300}<Card/,
    );
    expect(systemHomeSource).toContain('aria-label={actionLabel}');
    expect(systemHomeSource).toContain('<h3');
    expect(systemHomeSource).toContain('{item.label}');
    expect(systemHomeSource).toContain('focus-visible:ring-2');
    expect(systemHomeSource).not.toContain('<Button');
  });

  it('keeps the hierarchy concise and adapts a single-card layout', () => {
    expect(systemHomeSource).toContain('Accès rapides');
    expect(systemHomeSource).toContain('visibleTools.length');
    expect(systemHomeSource).toContain('visibleTools.length === 1');
    expect(systemHomeSource).not.toContain('Outils opérationnels');
    expect(systemHomeSource).not.toContain('Outils disponibles');
    expect(systemHomeSource).not.toContain('Opérationnel');
  });

  it('does not expose generic preparation pages for roadmap ideas', () => {
    expect(systemRouteSource).toContain('getNavigationAvailability');
    expect(systemRouteSource).toContain("!== 'live'");
    expect(systemRouteSource).not.toContain('PrivateFeaturePage');
    expect(dashboardAliasSource).not.toContain('PrivateFeaturePage');
    expect(dashboardAliasSource).toContain('notFound()');
    expect(
      // Static, test-owned path only.
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      existsSync(
        new URL(
          '../components/private-navigation/PrivateFeaturePage.tsx',
          import.meta.url,
        ),
      ),
    ).toBe(false);

    for (const relativePath of plannedRouteSources) {
      // Static, test-owned paths only.
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      expect(existsSync(new URL(relativePath, import.meta.url))).toBe(false);
    }
  });
});
