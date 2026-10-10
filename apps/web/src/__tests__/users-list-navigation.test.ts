import { describe, expect, it } from 'vitest';

import {
  captureUsersNavigation,
  readUsersNavigation,
} from '$features/users/users-list-navigation';
import {
  buildUsersPageUrlParams,
  normalizeFilterRole,
  normalizePage,
} from '$features/users/users-list-state';

describe('users list navigation boundaries', () => {
  const href = '/systeme/utilisateurs?page=2&role=ADMIN';
  const state = captureUsersNavigation(
    'actor-contact-security',
    href,
    442,
    '/systeme/utilisateurs/u1?returnTo=test',
  );
  it('restores only the same account, visibility scope and criteria', () => {
    const raw = JSON.stringify(state);
    expect(
      readUsersNavigation(
        raw,
        state.scope,
        '/systeme/utilisateurs?role=ADMIN&page=2',
        state.at,
      ),
    ).toEqual(state);
    expect(
      readUsersNavigation(raw, 'another-account', href, state.at),
    ).toBeNull();
    expect(
      readUsersNavigation(raw, 'actor-no-contact', href, state.at),
    ).toBeNull();
    expect(
      readUsersNavigation(
        raw,
        state.scope,
        '/systeme/utilisateurs?page=1',
        state.at,
      ),
    ).toBeNull();
  });
  it('expires the single saved entry after 30 minutes', () => {
    expect(
      readUsersNavigation(
        JSON.stringify(state),
        state.scope,
        href,
        state.at + 30 * 60_000 + 1,
      ),
    ).toBeNull();
    expect(
      readUsersNavigation(
        JSON.stringify(state),
        state.scope,
        href,
        state.at - 1,
      ),
    ).toBeNull();
  });
  it.each([
    null,
    'bad json',
    '{}',
    'x'.repeat(20_001),
    JSON.stringify({ ...state, scrollTop: -1 }),
    JSON.stringify({ ...state, focusHref: 'x'.repeat(8193) }),
  ])('ignores malformed or excessive storage', (raw) => {
    expect(readUsersNavigation(raw, state.scope, href, state.at)).toBeNull();
  });
  it('bounds pages and rejects partial numeric URL values', () => {
    for (const value of [null, '-1', '0', '3abc', '2.3', '1e2'])
      expect(normalizePage(value)).toBe(1);
    expect(normalizePage('99999')).toBe(1000);
    expect(normalizePage('12')).toBe(12);
  });
  it('keeps the superadmin filter distinct and resets unrelated criteria', () => {
    expect(normalizeFilterRole('SUPERADMIN')).toBe('SUPERADMIN');
    expect(normalizeFilterRole('UNKNOWN')).toBe('all');
    expect(
      buildUsersPageUrlParams({
        page: 1,
        role: 'SUPERADMIN',
        search: '',
        sort: 'recent',
        status: 'all',
      }).toString(),
    ).toBe('role=SUPERADMIN&sort=recent');
  });
});
