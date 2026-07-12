const DEFAULT_AUTHENTICATED_PATH = '/';

/**
 * Accept only same-origin, application-relative return paths.
 * This prevents the login redirect parameter from becoming an open redirect.
 */
export function getSafeReturnPath(
  candidate: string | null | undefined,
  fallback = DEFAULT_AUTHENTICATED_PATH,
): string {
  if (!candidate || !candidate.startsWith('/')) return fallback;
  if (candidate.startsWith('//') || candidate.includes('\\')) return fallback;
  if (/\p{Cc}/u.test(candidate)) return fallback;

  try {
    const baseUrl = new URL('https://team-control.local');
    const parsedUrl = new URL(candidate, baseUrl);

    if (parsedUrl.origin !== baseUrl.origin) return fallback;
    if (parsedUrl.pathname === '/login') return fallback;
    if (parsedUrl.pathname.startsWith('/api/')) return fallback;

    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    return fallback;
  }
}
