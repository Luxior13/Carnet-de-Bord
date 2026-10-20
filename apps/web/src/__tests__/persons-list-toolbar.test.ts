import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { PersonsListToolbar } from '$features/persons/components/PersonsListToolbar';

const overview = {
  inStructure: 8,
  noContacts: 3,
  outsideStructure: 4,
  total: 12,
};

type ToolbarProps = Parameters<typeof PersonsListToolbar>[0];

const renderQuickFilters = (
  props: Partial<ToolbarProps> = {},
): Array<{ label: string; pressed: boolean }> => {
  const html = renderToStaticMarkup(
    createElement(PersonsListToolbar, {
      appliedQuery: '',
      applyFilters: vi.fn(),
      canViewContact: true,
      draftQuery: '',
      error: null,
      isRefreshing: false,
      missingContacts: false,
      overview,
      setDraftQuery: vi.fn(),
      sort: 'name',
      status: 'ALL',
      total: 12,
      ...props,
    }),
  );
  const group = html.match(
    /<div aria-label="Filtres rapides"[^>]*role="group">(.*?)<\/div>/,
  )?.[1];

  return [...(group ?? '').matchAll(/<button([^>]*)>(.*?)<\/button>/g)].map(
    ([, attributes = '', content = '']) => ({
      label: content
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
      pressed: attributes.includes('aria-pressed="true"'),
    }),
  );
};

describe('directory quick filters', () => {
  it('replaces the status menu and shows the whole-directory counts', () => {
    expect(renderQuickFilters()).toEqual([
      { label: 'Tous 12', pressed: true },
      { label: 'Dans la structure 8', pressed: false },
      { label: 'Hors structure 4', pressed: false },
      { label: 'Sans coordonnées 3', pressed: false },
    ]);
  });

  it('hides every count while a search narrows the result', () => {
    expect(
      renderQuickFilters({ appliedQuery: 'nox', status: 'IN_STRUCTURE' }),
    ).toEqual([
      { label: 'Tous', pressed: false },
      { label: 'Dans la structure', pressed: true },
      { label: 'Hors structure', pressed: false },
      { label: 'Sans coordonnées', pressed: false },
    ]);
  });

  it('keeps only the counts that still match the combined filters', () => {
    expect(renderQuickFilters({ missingContacts: true })).toEqual([
      { label: 'Tous', pressed: true },
      { label: 'Dans la structure', pressed: false },
      { label: 'Hors structure', pressed: false },
      { label: 'Sans coordonnées 3', pressed: true },
    ]);
    expect(renderQuickFilters({ status: 'OUTSIDE_STRUCTURE' }).at(-1)).toEqual({
      label: 'Sans coordonnées',
      pressed: false,
    });
  });

  it('names each count for assistive technologies', () => {
    const html = renderToStaticMarkup(
      createElement(PersonsListToolbar, {
        appliedQuery: '',
        applyFilters: vi.fn(),
        canViewContact: true,
        draftQuery: '',
        error: null,
        isRefreshing: false,
        missingContacts: false,
        overview: { ...overview, outsideStructure: 1 },
        setDraftQuery: vi.fn(),
        sort: 'name',
        status: 'ALL',
        total: 9,
      }),
    );

    expect(html).toContain('aria-label="Tous, 12 fiches"');
    expect(html).toContain('aria-label="Hors structure, 1 fiche"');
    expect(html).not.toContain('Filtrer par statut');
  });

  it('offers the missing-contact filter only to readers of contacts', () => {
    expect(
      renderQuickFilters({
        canViewContact: false,
        overview: { ...overview, noContacts: null },
      }).map((filter) => filter.label),
    ).toEqual(['Tous 12', 'Dans la structure 8', 'Hors structure 4']);
  });
});
