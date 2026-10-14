import type { DependencyList, EffectCallback, SetStateAction } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSystemSettings as createController } from '$features/settings/useSystemSettings';
import type { SystemSettingItem } from '$types/platform.types';

import { HookRuntime } from './helpers/hook-runtime';

type Controller = ReturnType<typeof createController>;
const mocks = vi.hoisted(() => ({
  runtime: null as HookRuntime<Controller> | null,
  success: vi.fn(),
}));
const runtime = (): HookRuntime<Controller> => {
  if (!mocks.runtime) throw new Error('Missing runtime');

  return mocks.runtime;
};
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useCallback: <T extends (...args: never[]) => unknown>(
    callback: T,
    dependencies: DependencyList,
  ): T => runtime().useCallback(callback, dependencies),
  useEffect: (effect: EffectCallback, dependencies?: DependencyList): void =>
    runtime().useEffect(effect, dependencies),
  useMemo: <T>(factory: () => T, dependencies: DependencyList): T =>
    runtime().useMemo(factory, dependencies),
  useRef: <T>(initial: T): { current: T } => runtime().useRef(initial),
  useState: <T>(
    initial: T | (() => T),
  ): [T, (value: SetStateAction<T>) => void] => runtime().useState(initial),
}));
vi.mock('sonner', () => ({ toast: { success: mocks.success } }));
vi.mock('$hooks/useUnsavedNavigationGuard', () => ({
  useUnsavedNavigationGuard: (): object => ({
    cancelPendingNavigation: vi.fn(),
    confirmPendingNavigation: vi.fn(),
    pendingNavigationHref: null,
    restoreFocus: vi.fn(),
  }),
}));

const key = 'audit.retentionDays';
const setting = (
  value = 1095,
  version = 0,
  isStoredValueInvalid = false,
): SystemSettingItem => ({
  description: 'Durée du journal',
  isStoredValueInvalid,
  key,
  updatedAt: '2026-10-11T20:00:00.000Z',
  value,
  version,
});
const fetchMock = vi.fn<typeof fetch>();
const response = (data: unknown): Response =>
  Response.json({ data, success: true });
const failure = (status: number, code = 'CONFLICT'): Response =>
  Response.json(
    { error: { code, message: 'Erreur simulée' }, success: false },
    { status },
  );
const deferred = (): {
  promise: Promise<Response>;
  resolve: (response: Response) => void;
} => {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((onResolve) => {
    resolve = onResolve;
  });

  return { promise, resolve };
};
const flush = async (): Promise<void> => {
  for (let index = 0; index < 12; index++) await Promise.resolve();
};
const mount = async (initial = setting()): Promise<Controller> => {
  fetchMock.mockResolvedValueOnce(response([initial]));
  runtime().render();
  await flush();

  return runtime().render();
};
const draft = (value: string): Controller => {
  const current = runtime().render();
  current.setDrafts(new Map([[key, value]]));

  return runtime().render();
};
const waitForAbort = (
  _input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () =>
      reject(new DOMException('Aborted', 'AbortError')),
    );
  });

beforeEach(() => {
  vi.useFakeTimers();
  mocks.runtime = new HookRuntime(() => createController(true));
  mocks.success.mockClear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('document', { cookie: '' });
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 0),
  );
});
afterEach(() => {
  runtime().unmount();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('system settings request lifecycle', () => {
  it('locks duplicate saves and closes only the confirmed editor', async () => {
    await mount();
    const controller = draft('1200');
    const pending = deferred();
    fetchMock.mockReturnValueOnce(pending.promise);
    const first = controller.updateSetting(key, 1200);
    await controller.updateSetting(key, 1200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(runtime().render().savingKey).toBe(key);
    pending.resolve(response(setting(1200, 1)));
    await first;
    const done = runtime().render();
    expect(done.settings?.get(key)?.value).toBe(1200);
    expect(done.savingKey).toBeNull();
    expect(mocks.success).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403])(
    'purges the old configuration on a non-JSON %i refresh refusal',
    async (status) => {
      await mount();
      const controller = draft('1200');
      fetchMock.mockResolvedValueOnce(new Response('Not JSON', { status }));
      await controller.loadSettings();
      const denied = runtime().render();
      expect(denied.accessDenied).toBe(true);
      expect(denied.settings).toBeNull();
      expect(denied.drafts.size).toBe(0);
      expect(denied.isLoading).toBe(false);
    },
  );

  it('keeps a draft blocked after an unknown PUT until an explicit read and choice, without replaying the mutation', async () => {
    await mount();
    const controller = draft('1200');
    fetchMock.mockRejectedValueOnce(new Error('Lost response'));
    await controller.updateSetting(key, 1200);
    const unknown = runtime().render();
    expect(unknown.conflicts.get(key)).toEqual({
      reason: 'unknown',
      status: 'unavailable',
    });
    unknown.handleSaveRequest(key);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock.mockResolvedValueOnce(response([setting(1200, 1)]));
    await unknown.reloadConflict(key);
    const verified = runtime().render();
    expect(verified.conflicts.get(key)?.status).toBe('ready');
    expect(verified.drafts.get(key)).toBe('1200');
    verified.clearSettingFeedback(key);
    runtime().render().handleSaveRequest(key);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it('keeps the old draft when conflict verification fails, then accepts only a freshly read version', async () => {
    await mount();
    const controller = draft('1250');
    fetchMock.mockResolvedValueOnce(failure(409));
    fetchMock.mockRejectedValueOnce(new Error('Read failed'));
    await controller.updateSetting(key, 1250);
    expect(runtime().render().conflicts.get(key)?.status).toBe('unavailable');
    expect(runtime().render().drafts.get(key)).toBe('1250');
    fetchMock.mockResolvedValueOnce(response([setting(1300, 4)]));
    await runtime().render().reloadConflict(key);
    const verified = runtime().render();
    expect(verified.settings?.get(key)?.version).toBe(4);
    expect(verified.drafts.get(key)).toBe('1250');
    verified.clearSettingFeedback(key);
    fetchMock.mockResolvedValueOnce(response(setting(1250, 5)));
    await runtime().render().updateSetting(key, 1250);
    const body = JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body));
    expect(body).toEqual({ expectedVersion: 4, value: 1250 });
  });

  it('allows repair at the unchanged software default but requires explicit confirmation and password proof', async () => {
    await mount(setting(1095, 3, true));
    const controller = draft('1095');
    controller.handleSaveRequest(key);
    expect(runtime().render().pendingReduction).toEqual({ key, value: 1095 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockResolvedValueOnce(
      failure(403, 'PASSWORD_REAUTHENTICATION_REQUIRED'),
    );
    await runtime().render().updateSetting(key, 1095);
    expect(runtime().render().pendingPasswordAction).toEqual({
      key,
      value: 1095,
    });
    expect(runtime().render().accessDenied).toBe(false);
    fetchMock.mockResolvedValueOnce(response(setting(1095, 4, false)));
    await runtime().render().updateSetting(key, 1095);
    expect(runtime().render().settings?.get(key)?.isStoredValueInvalid).toBe(
      false,
    );
  });

  it('releases loading after a 15-second read timeout and retains verification after a 30-second write timeout', async () => {
    fetchMock.mockImplementationOnce(waitForAbort);
    runtime().render();
    await vi.advanceTimersByTimeAsync(15_000);
    expect(runtime().render().isLoading).toBe(false);
    expect(runtime().render().loadError).toContain('délai');
    fetchMock.mockResolvedValueOnce(response([setting()]));
    await runtime().render().loadSettings();
    fetchMock.mockImplementationOnce(waitForAbort);
    const pending = draft('1200').updateSetting(key, 1200);
    await vi.advanceTimersByTimeAsync(30_000);
    await pending;
    const failed = runtime().render();
    expect(failed.savingKey).toBeNull();
    expect(failed.conflicts.get(key)).toEqual({
      reason: 'unknown',
      status: 'unavailable',
    });
  });

  it('ignores a write response after the owning page unmounts', async () => {
    await mount();
    const pending = deferred();
    fetchMock.mockReturnValueOnce(pending.promise);
    const save = draft('1200').updateSetting(key, 1200);
    runtime().unmount();
    pending.resolve(response(setting(1200, 1)));
    await save;
    expect(mocks.success).not.toHaveBeenCalled();
    expect(runtime().render().settings?.get(key)?.value).toBe(1095);
  });
});
