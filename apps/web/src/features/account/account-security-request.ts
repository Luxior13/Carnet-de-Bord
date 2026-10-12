import { apiFetchJson } from '$utils/api.utils';

/** Bound both the response and its body without aborting the section lifetime. */
export async function accountSecurityRequest<T>(
  url: string,
  lifetime: AbortSignal,
  init: RequestInit = {},
): Promise<T> {
  lifetime.throwIfAborted();
  const request = new AbortController();
  const abort = (): void => request.abort(lifetime.reason);
  lifetime.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(() => request.abort(), 30_000);

  try {
    return await apiFetchJson<T>(url, { ...init, signal: request.signal });
  } finally {
    clearTimeout(timeout);
    lifetime.removeEventListener('abort', abort);
  }
}
