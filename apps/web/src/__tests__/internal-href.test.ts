import { describe, expect, it } from 'vitest';

import {
  isKnownInternalPageHref,
  isSafeInternalHref,
} from '$utils/internal-href.utils';

describe('safe internal hrefs', () => {
  it.each([
    '/',
    '/mon-compte',
    '/systeme/utilisateurs/user-1?section=access#permissions',
    '/recherche?q=%C3%A9quipe',
    '/systeme/utilisateurs/user-1?returnTo=%2Fsysteme%2Futilisateurs%3Fsearch%3DAlex',
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

describe('known page destinations', () => {
  it.each([
    '/',
    '/mon-compte?section=security',
    '/systeme/parametres',
    '/membres/repertoire/nouveau',
    '/membres/repertoire/person-1?section=contacts',
    '/systeme/utilisateurs/user-1?section=access',
  ])('accepts the live destination %s', (href) => {
    expect(isKnownInternalPageHref(href)).toBe(true);
  });

  it.each([
    '/personnes/nouveau',
    '/personnes/person-1?section=contacts',
    '/systeme/journal-activite?period=7d',
    '/mes-notifications?status=unread',
  ])(
    'keeps legacy or parked destinations redirectable: %s',
    (href) => {
      expect(isKnownInternalPageHref(href)).toBe(true);
    },
  );

  it.each(['/future-module', '/systeme/utilisateurs/user-1/unknown'])(
    'rejects the unknown or planned destination %s',
    (href) => {
      expect(isKnownInternalPageHref(href)).toBe(false);
    },
  );
});
