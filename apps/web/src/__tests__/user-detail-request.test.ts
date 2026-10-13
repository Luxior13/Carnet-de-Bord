import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { requestUserDetailMutation } from '$components/users/user-detail/user-detail-request';

const fetchMock = vi.fn<typeof fetch>();
const requestSignal = (init?: RequestInit): AbortSignal => {
  if (!init?.signal) throw new Error('Missing request signal');

  return init.signal;
};

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

describe('user detail mutation deadline', () => {
  it.each(['headers', 'body'])(
    'releases a pending %s without ending the page lifetime',
    async (phase) => {
      const lifetime = new AbortController();
      fetchMock.mockImplementationOnce(async (_url, init) => {
        const signal = requestSignal(init);
        if (phase === 'headers')
          return new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(signal.reason), {
              once: true,
            });
          });

        return new Response(
          new ReadableStream({
            start(controller): void {
              signal.addEventListener(
                'abort',
                () => controller.error(signal.reason),
                { once: true },
              );
            },
          }),
        );
      });
      const pending = requestUserDetailMutation(
        '/api/users/test',
        lifetime.signal,
        { method: 'PATCH' },
      ).catch((error: unknown) => error);
      await vi.advanceTimersByTimeAsync(30_000);
      expect(await pending).toMatchObject({ name: 'AbortError' });
      expect(lifetime.signal.aborted).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      fetchMock.mockResolvedValueOnce(
        Response.json({ data: { user: { id: 'test' } }, success: true }),
      );
      await expect(
        requestUserDetailMutation('/api/users/test', lifetime.signal, {
          method: 'PATCH',
        }),
      ).resolves.toMatchObject({ data: { success: true } });
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it('preserves an explicit refusal for reauthentication without replaying the write', async () => {
    const error = {
      code: 'REAUTHENTICATION_REQUIRED',
      message: 'Proof required',
    };
    fetchMock.mockResolvedValueOnce(
      Response.json({ error, success: false }, { status: 403 }),
    );
    const result = await requestUserDetailMutation(
      '/api/users/test',
      new AbortController().signal,
      { method: 'DELETE' },
    );
    expect(result.response.status).toBe(403);
    expect(result.data).toEqual({ error, success: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('x-csrf-token'),
    ).toBe('fictitious-test-token');
  });

  it('treats a JSON server failure as unconfirmed, without an automatic second mutation', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json(
        { error: { message: 'Interrupted' }, success: false },
        { status: 500 },
      ),
    );
    await expect(
      requestUserDetailMutation(
        '/api/users/test',
        new AbortController().signal,
        { method: 'DELETE' },
      ),
    ).rejects.toThrow('Mutation response not confirmed');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
