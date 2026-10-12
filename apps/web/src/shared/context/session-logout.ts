import { RoutesApi } from '$types/api.types';
import { apiFetch } from '$utils/api.utils';

export type LogoutStatus = 'idle' | 'pending' | 'unconfirmed' | 'confirmed';
export const LOGOUT_TIMEOUT_MS = 15_000;

/** A retry is explicit; 401 means the session is already absent on this route. */
export async function requestSessionLogout(signal: AbortSignal): Promise<void> {
  const readResult = async (): Promise<void> => {
    const response = await apiFetch(RoutesApi.logout, {
      method: 'POST',
      signal,
    });
    if (signal.aborted) throw new Error('Logout aborted');
    if (response.status === 401) return;
    if (!response.ok) throw new Error('Logout refused');
    const payload: unknown = await response.json();
    if (
      signal.aborted ||
      !payload ||
      typeof payload !== 'object' ||
      !('success' in payload) ||
      payload.success !== true ||
      !('data' in payload) ||
      !payload.data ||
      typeof payload.data !== 'object' ||
      !('message' in payload.data) ||
      typeof payload.data.message !== 'string'
    )
      throw new Error('Logout not confirmed');
  };
  let onAbort = (): void => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = (): void => reject(new Error('Logout aborted'));
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
  });
  try {
    // Settle the UI deadline even if a transport does not honor cancellation.
    await Promise.race([readResult(), aborted]);
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
}
