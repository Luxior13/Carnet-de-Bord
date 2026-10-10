import { PAGE_PATHS } from '$constants/routes.constants';

export const USERS_NAVIGATION_STORAGE_KEY = 'users.navigation.v1';
export type UsersNavigation = {
  at: number;
  focusHref: string | null;
  href: string;
  scope: string;
  scrollTop: number;
};

const canonicalHref = (href: string): string => {
  const params = new URLSearchParams(href.split('?')[1]);
  params.sort();

  return `${PAGE_PATHS.users}${params.size ? '?' + params : ''}`;
};

export const captureUsersNavigation = (
  scope: string,
  href: string,
  scrollTop: number,
  focusHref: string | null,
): UsersNavigation => ({
  at: Date.now(),
  focusHref,
  href: canonicalHref(href),
  scope,
  scrollTop,
});

export const readUsersNavigation = (
  raw: string | null,
  scope: string,
  href: string,
  now = Date.now(),
): UsersNavigation | null => {
  if (!raw || raw.length > 20_000 || !scope) return null;
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
      now - state.at > 30 * 60_000 ||
      typeof state.scrollTop !== 'number' ||
      !Number.isFinite(state.scrollTop) ||
      state.scrollTop < 0 ||
      state.scrollTop > 10_000_000 ||
      !(
        state.focusHref === null ||
        (typeof state.focusHref === 'string' && state.focusHref.length <= 8_192)
      )
    )
      return null;

    return {
      at: state.at,
      focusHref: state.focusHref as string | null,
      href: state.href as string,
      scope,
      scrollTop: state.scrollTop,
    };
  } catch {
    return null;
  }
};
