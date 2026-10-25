const PUBLIC_PAGE_PATHS = new Set(['/login']);

export function isPublicPagePath(pathname: string): boolean {
  return PUBLIC_PAGE_PATHS.has(pathname);
}

const isProduction = process.env.NODE_ENV === 'production';

/**
 * In production the browser accepts a `__Host-` cookie only when it is Secure,
 * host-only and scoped to `/`, and a `__Secure-` cookie only when it is Secure:
 * a sibling subdomain or an insecure origin can then neither plant nor shadow
 * them. Development keeps plain names because those cookies are not Secure on
 * plain HTTP. Deleting a prefixed cookie must repeat Secure (and `/` for
 * `__Host-`), otherwise the browser ignores the deletion.
 */
export const SESSION_COOKIE_NAME = isProduction ? '__Host-session' : 'session';
export const CSRF_COOKIE_NAME = isProduction
  ? '__Host-csrf-token'
  : 'csrf-token';
export const MFA_CHALLENGE_COOKIE_NAME = isProduction
  ? '__Secure-mfa-challenge'
  : 'mfa-challenge';
export const CSRF_HEADER_NAME = 'x-csrf-token';
