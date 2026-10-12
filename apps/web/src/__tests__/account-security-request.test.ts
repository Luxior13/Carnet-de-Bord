import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { accountSecurityRequest } from '$features/account/account-security-request';
import { ApiClientError } from '$utils/api.utils';

const fetchMock = vi.fn<typeof fetch>();
const getSignal = (init?: RequestInit): AbortSignal => {
  if (!init?.signal) throw new Error('Expected an abortable request');

  return init.signal;
};
const pendingUntilAbort = (signal: AbortSignal): Promise<Response> =>
  new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), {
      once: true,
    });
  });

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('document', { cookie: 'csrf-token=fictitious-test-token' });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('personal security request lifetime', () => {
  it('bounds a stalled mutation and permits a subsequent read with the same lifetime', async () => {
    const lifetime = new AbortController();
    fetchMock.mockImplementationOnce((_url, init) =>
      pendingUntilAbort(getSignal(init)),
    );
    const failure = accountSecurityRequest(
      '/api/auth/sessions',
      lifetime.signal,
      {
        method: 'DELETE',
      },
    ).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(await failure).toMatchObject({ name: 'AbortError' });
    expect(lifetime.signal.aborted).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('x-csrf-token'),
    ).toBe('fictitious-test-token');

    fetchMock.mockResolvedValueOnce(
      Response.json({ data: { sessions: [] }, success: true }),
    );
    await expect(
      accountSecurityRequest('/api/auth/sessions', lifetime.signal),
    ).resolves.toEqual({ sessions: [] });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('also bounds a response whose headers arrive but whose body stalls', async () => {
    const lifetime = new AbortController();
    fetchMock.mockImplementationOnce(
      async (_url, init) =>
        new Response(
          new ReadableStream({
            start(controller): void {
              getSignal(init).addEventListener(
                'abort',
                () => controller.error(getSignal(init).reason),
                { once: true },
              );
            },
          }),
        ),
    );
    const failure = accountSecurityRequest(
      '/api/auth/sessions',
      lifetime.signal,
    ).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(await failure).toMatchObject({ code: 'INVALID_RESPONSE' });
    expect(lifetime.signal.aborted).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aborts the active request on unmount and never starts one for an aborted owner', async () => {
    const lifetime = new AbortController();
    fetchMock.mockImplementationOnce((_url, init) =>
      pendingUntilAbort(getSignal(init)),
    );
    const failure = accountSecurityRequest(
      '/api/auth/sessions',
      lifetime.signal,
    ).catch((error: unknown) => error);
    lifetime.abort();
    expect(await failure).toMatchObject({ name: 'AbortError' });
    await expect(
      accountSecurityRequest('/api/auth/sessions', lifetime.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('preserves a denied HTTP status even when the response is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('Access denied', { status: 403 }),
    );
    const failure = await accountSecurityRequest(
      '/api/auth/sessions',
      new AbortController().signal,
    ).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ApiClientError);
    expect(failure).toMatchObject({ code: 'INVALID_RESPONSE', status: 403 });
    expect(vi.getTimerCount()).toBe(0);
  });
});
