import { describe, expect, it } from 'vitest';

import {
  isKnownInternalPageHref,
  isSafeInternalHref,
} from '$utils/internal-href.utils';

describe('safe internal notification hrefs', () => {
  it.each([
    '/',
    '/mon-compte',
    '/administration/utilisateurs/user-1?section=access#permissions',
    '/recherche?q=%C3%A9quipe',
  ])('accepts the canonical internal page %s', (href) => {
    expect(isSafeInternalHref(href)).toBe(true);
  });

  it.each([
    '',
    'https://evil.example/path',
    '//evil.example/path',
    '/\\evil.example/path',
    '/\\\\evil.example/path',
    '/mon-compte/../administration',
    '/%2e%2e/administration',
    '/mon compte',
    '/%2f%2fevil.example/path',
    '/%252f%252fevil.example/path',
    '/%5c%5cevil.example/path',
    '/%61pi/users',
    '/%6cogin',
    '/%C0%AFetc',
    '/path//ambiguous',
    '/%23fragment-like-path',
    '/%00evil',
    '/search?q=%C2%85',
    '/bad%',
    '/api',
    '/api/users',
    '/login',
    '/login/reset',
    ' /mon-compte',
    '/mon-compte\n',
  ])('rejects the ambiguous or non-page destination %s', (href) => {
    expect(isSafeInternalHref(href)).toBe(false);
  });
});

describe('known notification destinations', () => {
  it.each([
    '/',
    '/mon-compte?section=security',
    '/systeme/journal-activite?period=7d',
    '/systeme/parametres',
    '/administration/utilisateurs/user-1?section=access',
  ])('accepts the live destination %s', (href) => {
    expect(isKnownInternalPageHref(href)).toBe(true);
  });

  it.each(['/future-module', '/administration/utilisateurs/user-1/unknown'])(
    'rejects the unknown or planned destination %s',
    (href) => {
      expect(isKnownInternalPageHref(href)).toBe(false);
    },
  );
});
