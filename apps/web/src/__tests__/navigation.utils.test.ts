import { describe, expect, it } from 'vitest';

import { getSafeReturnPath } from '$utils/navigation.utils';

describe('getSafeReturnPath', () => {
  it('keeps a local deep link with its query string', () => {
    expect(
      getSafeReturnPath('/administration/utilisateurs?page=2&status=active'),
    ).toBe('/administration/utilisateurs?page=2&status=active');
  });

  it.each([
    null,
    '',
    'https://example.com',
    '//example.com/path',
    '/\\example.com/path',
    '/login',
    '/api/users',
  ])('falls back for an unsafe return path: %s', (value) => {
    expect(getSafeReturnPath(value)).toBe('/');
  });
});
