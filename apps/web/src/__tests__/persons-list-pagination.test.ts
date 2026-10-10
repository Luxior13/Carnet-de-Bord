import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PersonsList } from '$features/persons/components/PersonsList';
import { normalizePersonsPageIndex } from '$features/persons/person-list-state';
import type { PersonsListResponse } from '$features/persons/types/person.types';

const mocks = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock('next/navigation', () => ({
  useRouter: (): {
    push: ReturnType<typeof vi.fn>;
    replace: ReturnType<typeof vi.fn>;
  } => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: (): URLSearchParams => mocks.params,
}));

const emptyData: PersonsListResponse = {
  items: [],
  overview: { inStructure: 0, noContacts: 0, outsideStructure: 0, total: 0 },
  pagination: {
    hasMore: false,
    limit: 25,
    nextCursor: null,
    snapshotAt: '2026-10-10T10:00:00.000Z',
    total: 0,
  },
};

describe('directory URL pagination', () => {
  beforeEach(() => {
    mocks.params = new URLSearchParams();
  });

  it.each([
    '4294967297',
    '1e9',
    '2abc',
    '2.5',
    '-1',
    '0',
    'Infinity',
    '9007199254740991',
    '1000001',
    '0002',
    ' 2',
  ])('resets an invalid display page %s', (value) => {
    expect(normalizePersonsPageIndex(value)).toBe(0);
  });

  it('preserves valid positions without needing a dense history', () => {
    expect(normalizePersonsPageIndex('3')).toBe(2);
    expect(normalizePersonsPageIndex('1000000')).toBe(999999);
  });

  it.each(['4294967297', '1000000'])(
    'renders safely with page=%s and a cursor',
    (page) => {
      mocks.params = new URLSearchParams({ cursor: 'untrusted', page });
      expect(() =>
        renderToStaticMarkup(
          createElement(PersonsList, {
            canCreate: false,
            createHref: '/membres/repertoire/nouveau',
            returnHref: '/membres/repertoire',
          }),
        ),
      ).not.toThrow();
    },
  );

  it('offers a first-page recovery when a deep link has no previous history', () => {
    mocks.params = new URLSearchParams({
      cursor: 'page-three',
      page: '3',
      q: 'ada',
    });
    const html = renderToStaticMarkup(
      createElement(PersonsList, {
        canCreate: false,
        createHref: '/membres/repertoire/nouveau',
        initialState: {
          data: emptyData,
          request: { cursor: 'page-three', q: 'ada', sort: 'name' },
        },
        returnHref: '/membres/repertoire?page=3&cursor=page-three&q=ada',
      }),
    );
    expect(html).toContain('Première page');
    expect(html).not.toContain('Ajouter une fiche');
  });
});
