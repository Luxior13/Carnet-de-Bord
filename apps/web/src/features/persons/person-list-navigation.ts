import { PAGE_PATHS } from '$constants/routes.constants';

import {
  MAX_PERSONS_PAGE,
  normalizePersonsPageIndex,
} from './person-list-state';

export const PERSONS_NAVIGATION_STORAGE_KEY = 'persons.navigation.v1';
const MAX_AGE_MS = 30 * 60 * 1_000;
const MAX_CURSORS = 64;

export type PersonsNavigation = {
  at: number;
  cursors: Array<[number, string | null]>;
  focusHref: string | null;
  href: string;
  scope: string;
  scrollTop: number;
};

const canonicalHref = (href: string): string => {
  const params = new URLSearchParams(href.split('?')[1]);
  params.sort();

  return `${PAGE_PATHS.persons}${params.size ? `?${params}` : ''}`;
};

export const capturePersonsNavigation = (
  scope: string,
  href: string,
  cursors: Map<number, string | undefined>,
  scrollTop: number,
  focusHref: string | null,
): PersonsNavigation => {
  const page = normalizePersonsPageIndex(
    new URLSearchParams(href.split('?')[1]).get('page'),
  );
  const nearby = [...cursors]
    .filter(([index]) => index !== 0)
    .sort(([a], [b]) => Math.abs(a - page) - Math.abs(b - page))
    .slice(0, MAX_CURSORS - 1);

  return {
    at: Date.now(),
    cursors: [
      [0, null],
      ...nearby.map(([index, cursor]): [number, string | null] => [
        index,
        cursor ?? null,
      ]),
    ],
    focusHref,
    href: canonicalHref(href),
    scope,
    scrollTop,
  };
};

export const readPersonsNavigation = (
  raw: string | null,
  scope: string,
  href: string,
  now = Date.now(),
): PersonsNavigation | null => {
  if (!raw || raw.length > 150_000 || !scope) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const state = value as Record<string, unknown>;
    if (
      state.scope !== scope ||
      state.href !== canonicalHref(href) ||
      typeof state.at !== 'number' ||
      !Number.isFinite(state.at) ||
      now < state.at ||
      now - state.at > MAX_AGE_MS ||
      typeof state.scrollTop !== 'number' ||
      !Number.isFinite(state.scrollTop) ||
      state.scrollTop < 0 ||
      state.scrollTop > 10_000_000 ||
      !(
        state.focusHref === null ||
        (typeof state.focusHref === 'string' && state.focusHref.length <= 8_192)
      ) ||
      !Array.isArray(state.cursors) ||
      state.cursors.length > MAX_CURSORS
    )
      return null;
    const cursors: Array<[number, string | null]> = [];
    for (const item of state.cursors) {
      if (!Array.isArray(item) || item.length !== 2) return null;
      const [index, cursor] = item as unknown[];
      if (
        typeof index !== 'number' ||
        !Number.isInteger(index) ||
        index < 0 ||
        index >= MAX_PERSONS_PAGE ||
        !(index === 0
          ? cursor === null
          : typeof cursor === 'string' &&
            cursor.length > 0 &&
            cursor.length <= 2_048)
      )
        return null;
      cursors.push([index, cursor as string | null]);
    }
    const map = new Map(cursors);
    const params = new URLSearchParams(href.split('?')[1]);
    const page = normalizePersonsPageIndex(params.get('page'));
    if (
      map.size !== cursors.length ||
      map.get(0) !== null ||
      !map.has(page) ||
      map.get(page) !== (page ? params.get('cursor') : null)
    )
      return null;

    return {
      at: state.at,
      cursors,
      focusHref: state.focusHref as string | null,
      href: state.href as string,
      scope,
      scrollTop: state.scrollTop,
    };
  } catch {
    return null;
  }
};
