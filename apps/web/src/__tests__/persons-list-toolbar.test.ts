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

const render = (props: Partial<ToolbarProps> = {}): string =>
  renderToStaticMarkup(
    createElement(PersonsListToolbar, {
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

/** Every quick filter, in order, with the visible caption of its group. */
const quickFilters = (
  html: string,
): Array<{ group: string; label: string; pressed: boolean }> =>
  [
    ...html.matchAll(
      /<div aria-label="Filtrer par [^"]+"[^>]*role="group"><span aria-hidden="true"[^>]*>([^<]+)<\/span>(.*?)<\/div>/g,
    ),
  ].flatMap(([, group = '', content = '']) =>
    [...content.matchAll(/<button([^>]*)>(.*?)<\/button>/g)].map(
      ([, attributes = '', text = '']) => ({
        group,
        label: text
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
        pressed: attributes.includes('aria-pressed="true"'),
      }),
    ),
  );

describe('directory quick filters', () => {
  it('replaces the status menu with captioned groups and their counts', () => {
    const html = render();

    expect(quickFilters(html)).toEqual([
      { group: 'Statut', label: 'Tous 12', pressed: true },
      { group: 'Statut', label: 'Dans la structure 8', pressed: false },
      { group: 'Statut', label: 'Hors structure 4', pressed: false },
      { group: 'Coordonnées', label: 'Sans coordonnées 3', pressed: false },
    ]);
    expect(html).not.toContain('Tous les statuts');
  });

  it('keeps the faceted counts visible while filters are combined', () => {
    // The server already applies the search and the other dimension.
    const html = render({
      missingContacts: true,
      overview: {
        inStructure: 2,
        noContacts: 1,
        outsideStructure: 1,
        total: 3,
      },
      status: 'OUTSIDE_STRUCTURE',
    });

    expect(quickFilters(html)).toEqual([
      { group: 'Statut', label: 'Tous 3', pressed: false },
      { group: 'Statut', label: 'Dans la structure 2', pressed: false },
      { group: 'Statut', label: 'Hors structure 1', pressed: true },
      { group: 'Coordonnées', label: 'Sans coordonnées 1', pressed: true },
    ]);
  });

  it('names each count for assistive technologies', () => {
    const html = render({ overview: { ...overview, outsideStructure: 1 } });

    expect(html).toContain('aria-label="Tous, 12 fiches"');
    expect(html).toContain('aria-label="Hors structure, 1 fiche"');
  });

  it('shows no count before the first response', () => {
    const labels = quickFilters(render({ overview: null })).map(
      (filter) => filter.label,
    );

    expect(labels).toEqual([
      'Tous',
      'Dans la structure',
      'Hors structure',
      'Sans coordonnées',
    ]);
  });

  it('offers the missing-contact filter only to readers of contacts', () => {
    const html = render({
      canViewContact: false,
      overview: { ...overview, noContacts: null },
    });

    expect(quickFilters(html).map((filter) => filter.group)).toEqual([
      'Statut',
      'Statut',
      'Statut',
    ]);
  });
});
