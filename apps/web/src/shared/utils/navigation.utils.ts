import { isSafeInternalHref } from '$utils/internal-href.utils';

const DEFAULT_AUTHENTICATED_PATH = '/';

/**
 * Accept only same-origin, application-relative return paths.
 * This prevents the login redirect parameter from becoming an open redirect.
 */
export function getSafeReturnPath(
  candidate: string | null | undefined,
  fallback = DEFAULT_AUTHENTICATED_PATH,
): string {
  return candidate && isSafeInternalHref(candidate) ? candidate : fallback;
}
