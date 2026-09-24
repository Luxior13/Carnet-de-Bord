import {
  getCanonicalInternalHref,
  getSafeInternalPathname,
} from '$utils/internal-href.utils';

const DEFAULT_AUTHENTICATED_PATH = '/';

/**
 * Accept only same-origin, application-relative return paths.
 * This prevents the login redirect parameter from becoming an open redirect.
 */
export function getSafeReturnPath(
  candidate: string | null | undefined,
  fallback = DEFAULT_AUTHENTICATED_PATH,
): string {
  return (candidate && getCanonicalInternalHref(candidate)) || fallback;
}

/** A list return never grants permission to navigate to another collection. */
export function getSafeCollectionReturnHref(
  value: string | string[] | null | undefined,
  collection: string,
): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || getSafeInternalPathname(candidate) !== collection)
    return collection;

  return getCanonicalInternalHref(candidate) ?? collection;
}
