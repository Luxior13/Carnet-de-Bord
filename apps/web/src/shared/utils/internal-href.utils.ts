import { FEATURE_LIST } from '$constants/feature-registry.constants';

const INTERNAL_HREF_BASE_URL = new URL('https://team-control.local');
const INVALID_ENCODED_URL_BYTE_PATTERN =
  /%(?:0[0-9a-f]|1[0-9a-f]|25|2f|5c|7f)/i;
const INVALID_PERCENT_ENCODING_PATTERN = /%(?![0-9a-f]{2})/i;
const KNOWN_INTERNAL_PAGE_PATHS = new Set([
  ...FEATURE_LIST.filter(({ availability }) => availability === 'live').map(
    ({ href }) => href,
  ),
  '/administration',
  '/administration/utilisateurs/nouveau',
  '/mon-compte',
  '/vie-interne/repertoire/nouveau',
  // Compatibilité des notifications créées avant le renommage du répertoire.
  '/personnes/nouveau',
]);
const USER_DETAIL_PATH_PATTERN = /^\/administration\/utilisateurs\/[^/]+$/;
const PERSON_DETAIL_PATH_PATTERN = /^\/vie-interne\/repertoire\/[^/]+$/;
const LEGACY_PERSON_DETAIL_PATH_PATTERN = /^\/personnes\/[^/]+$/;

const containsUrlControlCharacter = (value: string): boolean =>
  [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;

    return codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f);
  });

/**
 * Accepts only a canonical, application-relative page destination.
 *
 * The exact serialization check rejects values that a WHATWG URL parser would
 * reinterpret (dot segments, raw spaces, host-like backslash paths, etc.).
 * Encoded separators and control bytes are rejected as well so a downstream
 * proxy cannot turn a same-origin value into a different routing target after
 * decoding it.
 */
export const isSafeInternalHref = (value: string): boolean => {
  if (!value || value !== value.trim() || value.length > 500) return false;
  if (!value.startsWith('/') || value.startsWith('//')) return false;
  if (value.includes('\\') || containsUrlControlCharacter(value)) {
    return false;
  }
  if (
    INVALID_PERCENT_ENCODING_PATTERN.test(value) ||
    INVALID_ENCODED_URL_BYTE_PATTERN.test(value)
  ) {
    return false;
  }

  try {
    // Unlike URL(), decodeURI rejects malformed or non-UTF-8 percent-encoded
    // byte sequences. Its result also exposes encoded C1 controls.
    const decodedHref = decodeURI(value);
    if (containsUrlControlCharacter(decodedHref)) return false;

    const parsedUrl = new URL(value, INTERNAL_HREF_BASE_URL);
    if (
      parsedUrl.origin !== INTERNAL_HREF_BASE_URL.origin ||
      parsedUrl.username.length > 0 ||
      parsedUrl.password.length > 0
    ) {
      return false;
    }

    const canonicalHref = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    if (canonicalHref !== value) return false;

    const decodedPathname = decodeURIComponent(parsedUrl.pathname);
    if (
      decodedPathname.includes('\\') ||
      decodedPathname.includes('?') ||
      decodedPathname.includes('#') ||
      containsUrlControlCharacter(decodedPathname) ||
      parsedUrl.pathname.includes('//')
    ) {
      return false;
    }

    const normalizedPathname = decodedPathname.toLowerCase();

    // Internal navigation targets pages, never authentication or API
    // endpoints.
    return (
      normalizedPathname !== '/login' &&
      !normalizedPathname.startsWith('/login/') &&
      normalizedPathname !== '/api' &&
      !normalizedPathname.startsWith('/api/')
    );
  } catch {
    return false;
  }
};

/** Returns the canonical pathname of a safe internal href, without its query
 * string or fragment. This lets permission checks resolve navigation entries
 * consistently for links such as `/systeme/parametres?section=retention`.
 */
export const getSafeInternalPathname = (value: string): string | null => {
  if (!isSafeInternalHref(value)) return null;

  return new URL(value, INTERNAL_HREF_BASE_URL).pathname;
};

/**
 * Notification links use a closed list of live pages. This prevents durable
 * messages from advertising stale, planned or mistyped destinations. Dynamic
 * records are admitted only through explicit page patterns.
 */
export const isKnownInternalPageHref = (value: string): boolean => {
  const pathname = getSafeInternalPathname(value);
  if (!pathname) return false;

  return (
    KNOWN_INTERNAL_PAGE_PATHS.has(pathname) ||
    USER_DETAIL_PATH_PATTERN.test(pathname) ||
    PERSON_DETAIL_PATH_PATTERN.test(pathname) ||
    LEGACY_PERSON_DETAIL_PATH_PATTERN.test(pathname)
  );
};
