import type { ApiErrorResponse, ApiSuccessResponse } from '$types/api.types';
import { apiFetch } from '$utils/api.utils';

type MutationResponse<T> =
  | (ApiSuccessResponse<T> & { error?: never })
  | (ApiErrorResponse & { data?: never });

/** Keep the server error envelope, and bound the response body as well as headers. */
export const requestUserDetailMutation = async <T>(
  url: string,
  lifetime: AbortSignal,
  init: RequestInit,
): Promise<{ data: MutationResponse<T>; response: Response }> => {
  lifetime.throwIfAborted();
  const request = new AbortController();
  const abort = (): void => request.abort(lifetime.reason);
  lifetime.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(() => request.abort(), 30_000);
  try {
    const response = await apiFetch(url, { ...init, signal: request.signal });
    const data = (await response.json()) as MutationResponse<T> | null;
    if (response.status >= 500 || !data || typeof data.success !== 'boolean')
      throw new Error('Mutation response not confirmed');

    return { data, response };
  } finally {
    clearTimeout(timeout);
    lifetime.removeEventListener('abort', abort);
  }
};
