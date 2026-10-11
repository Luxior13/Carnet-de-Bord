import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { ListSearchField } from '$ui/list-search-field';
import { ListPagination, Pagination } from '$ui/pagination';

const pagination = {
  ariaLabel: 'Pagination du répertoire',
  canNext: true,
  canPrevious: false,
  onNext: vi.fn(),
  onPrevious: vi.fn(),
  page: 1,
};

describe('shared list controls', () => {
  it('does not invent totals or random page access for a cursor list', () => {
    const html = renderToStaticMarkup(
      createElement(ListPagination, pagination),
    );

    expect(html).toContain('aria-label="Pagination du répertoire"');
    expect(html).toContain('Page <strong>1</strong>');
    expect(html).not.toContain('sur <strong>');
    expect(html.match(/<button\b/g)).toHaveLength(2);
    expect(html).toMatch(/aria-label="Page précédente"[^>]*disabled=""/);
    expect(html).not.toMatch(/aria-label="Page suivante"[^>]*disabled=""/);
  });

  it.each([{ disabled: true }, { isLoading: true }])(
    'blocks both directions during an unavailable state %o',
    (state) => {
      const html = renderToStaticMarkup(
        createElement(ListPagination, {
          ...pagination,
          ...state,
          canPrevious: true,
          page: 3,
          totalPages: 10,
        }),
      );

      expect(html.match(/disabled=""/g)).toHaveLength(2);
      expect(html).toContain('sur <strong>10</strong>');
      expect(html.match(/type="button"/g)).toHaveLength(2);
    },
  );

  it('keeps a recovery action when a shared cursor has no previous history', () => {
    const html = renderToStaticMarkup(
      createElement(ListPagination, {
        ...pagination,
        canNext: false,
        leadingAction: createElement(
          'a',
          { href: '/repertoire' },
          'Première page',
        ),
        page: 3,
        totalPages: 1,
      }),
    );

    expect(html).toContain('Première page');
    expect(html).toContain('Page <strong>3</strong>');
    expect(html).not.toContain('sur <strong>1</strong>');
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });

  it('keeps numbered pagination bounded and never submits a surrounding form', () => {
    const html = renderToStaticMarkup(
      createElement(Pagination, {
        disabled: true,
        limit: 25,
        onPageChange: vi.fn(),
        page: 500,
        total: 25000,
        totalPages: 1000,
      }),
    );
    const buttons = html.match(/<button\b[^>]*>/g) ?? [];

    expect(buttons.length).toBeLessThanOrEqual(9);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    for (const button of buttons) {
      expect(button).toContain('type="button"');
      expect(button).toContain('disabled=""');
    }
  });

  it.each(['', 'Camille'])(
    'preserves field semantics with value %s',
    (value) => {
      const html = renderToStaticMarkup(
        createElement(ListSearchField, {
          ariaLabel: 'Chercher une personne',
          maxLength: 100,
          onClear: vi.fn(),
          onValueChange: vi.fn(),
          placeholder: 'Nom…',
          value,
        }),
      );

      expect(html).toContain('type="search"');
      expect(html).toContain('maxLength="100"');
      expect(html).toContain('autoComplete="off"');
      expect(html).toContain('aria-label="Chercher une personne"');
      expect(html.includes('aria-label="Effacer la recherche"')).toBe(
        Boolean(value),
      );
      if (value) {
        expect(html).toContain('type="button"');
        const inputId = html.match(/<input[^>]*id="([^"]+)"/)?.[1];
        expect(inputId).toBeTruthy();
        expect(html).toContain(`aria-controls="${inputId}"`);
      }
    },
  );
});
