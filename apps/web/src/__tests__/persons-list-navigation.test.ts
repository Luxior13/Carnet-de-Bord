import { describe, expect, it } from 'vitest';

import {
  capturePersonsNavigation,
  readPersonsNavigation,
} from '$features/persons/person-list-navigation';
import { haveSamePersonsListRequest } from '$features/persons/person-list-state';
import { personsListQuerySchema } from '$features/persons/schemas/person.schemas';

const href = '/membres/repertoire?q=ada&cursor=third&page=3&contacts=missing';
const history = new Map<number, string | undefined>([
  [0, undefined],
  [1, 'second'],
  [2, 'third'],
]);

describe('directory return navigation', () => {
  it('restores the page history and position for the same account and canonical URL', () => {
    const state = capturePersonsNavigation(
      'user-a',
      href,
      history,
      750,
      '/membres/repertoire/person-001',
    );
    const saved = readPersonsNavigation(
      JSON.stringify(state),
      'user-a',
      '/membres/repertoire?page=3&contacts=missing&cursor=third&q=ada',
    );
    expect(saved?.scrollTop).toBe(750);
    expect(saved?.focusHref).toBe('/membres/repertoire/person-001');
    expect(new Map(saved?.cursors).get(1)).toBe('second');
  });

  it('isolates accounts, filters, snapshots and the 30-minute retention window', () => {
    const state = capturePersonsNavigation('user-a', href, history, 750, null);
    const raw = JSON.stringify(state);
    expect(readPersonsNavigation(raw, 'user-b', href)).toBeNull();
    expect(
      readPersonsNavigation(raw, 'user-a', href.replace('ada', 'grace')),
    ).toBeNull();
    expect(
      readPersonsNavigation(
        raw,
        'user-a',
        href.replace('third', 'different-snapshot'),
      ),
    ).toBeNull();
    expect(
      readPersonsNavigation(raw, 'user-a', href, state.at + 30 * 60_000 + 1),
    ).toBeNull();
    expect(readPersonsNavigation(raw, 'user-a', href, state.at - 1)).toBeNull();
  });

  it('bounds saved cursor history while preserving the current, previous and first pages', () => {
    const cursors = new Map<number, string | undefined>([[0, undefined]]);
    for (let index = 1; index < 200; index++)
      cursors.set(index, `cursor-${index}`);
    const state = capturePersonsNavigation(
      'user-a',
      '/membres/repertoire?page=151&cursor=cursor-150',
      cursors,
      0,
      null,
    );
    expect(state.cursors).toHaveLength(64);
    const restored = new Map(state.cursors);
    expect(restored.get(0)).toBeNull();
    expect(restored.get(149)).toBe('cursor-149');
    expect(restored.get(150)).toBe('cursor-150');
  });

  it.each([null, '{bad-json', 'null', '[]', '{"cursors":[999999999999]}'])(
    'ignores corrupt storage safely: %s',
    (raw) => {
      expect(readPersonsNavigation(raw, 'user-a', href)).toBeNull();
    },
  );

  it('rejects invalid positions, cursors and a cursor that differs from the URL', () => {
    const state = capturePersonsNavigation('user-a', href, history, 0, null);
    for (const patch of [
      { scrollTop: -1 },
      {
        cursors: [
          [0, null],
          [2, 'other'],
        ],
      },
      {
        cursors: [
          [0, null],
          [2, 'x'.repeat(2_049)],
        ],
      },
      {
        cursors: [
          [0, null],
          [1_000_000, 'third'],
        ],
      },
    ]) {
      expect(
        readPersonsNavigation(
          JSON.stringify({ ...state, ...patch }),
          'user-a',
          href,
        ),
      ).toBeNull();
    }
  });

  it('accepts only the documented contact filter and distinguishes server snapshots', () => {
    expect(
      personsListQuerySchema.safeParse({ contacts: 'missing' }).success,
    ).toBe(true);
    expect(
      personsListQuerySchema.safeParse({ contacts: 'false' }).success,
    ).toBe(false);
    expect(
      haveSamePersonsListRequest(
        { contacts: 'missing', q: '', sort: 'name' },
        { q: '', sort: 'name' },
      ),
    ).toBe(false);
  });
});
