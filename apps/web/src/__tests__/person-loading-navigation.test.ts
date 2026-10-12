import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { type BreadcrumbEntry, BreadcrumbTrail } from '$ui/breadcrumb';

vi.mock('$components/AuthenticatedLayout', () => ({
  default: ({
    breadcrumbs,
    children,
  }: {
    breadcrumbs: BreadcrumbEntry[];
    children: ReactNode;
  }): ReactNode =>
    createElement(
      'div',
      null,
      createElement(BreadcrumbTrail, { items: breadcrumbs, showHome: false }),
      children,
    ),
}));

import PersonLoading from '$app/membres/repertoire/[id]/loading';

describe('person detail navigation while the server page is loading', () => {
  it('keeps the directory label without a fallback link that would discard return filters', () => {
    const html = renderToStaticMarkup(createElement(PersonLoading));

    expect(html).toContain('Répertoire');
    expect(html).toContain('Chargement de la fiche');
    expect(html).not.toContain('href="/membres/repertoire"');
  });
});
