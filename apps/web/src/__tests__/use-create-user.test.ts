import type { DependencyList, EffectCallback, SetStateAction } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type CreateUserController,
  useCreateUser as createUserController,
} from '$features/users/useCreateUser';

import { HookRuntime } from './helpers/hook-runtime';

const mocks = vi.hoisted(() => ({
  runtime: null as HookRuntime<CreateUserController> | null,
}));
const runtime = (): HookRuntime<CreateUserController> => {
  if (!mocks.runtime) throw new Error('Missing hook runtime');

  return mocks.runtime;
};
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useEffect: (effect: EffectCallback, dependencies?: DependencyList): void =>
    runtime().useEffect(effect, dependencies),
  useRef: <T>(initial: T): { current: T } => runtime().useRef(initial),
  useState: <T>(initial: T): [T, (value: SetStateAction<T>) => void] =>
    runtime().useState(initial),
}));

const fetchMock = vi.fn<typeof fetch>();
const clipboard = vi.fn<(value: string) => Promise<void>>();
const reply = (data: unknown): Response =>
  Response.json({ data, success: true });
const created = (
  loginName = 'ada',
): {
  temporaryPassword: string;
  user: { firstName: string; id: string; loginName: string; role: string };
} => ({
  temporaryPassword: `fictitious-password-${loginName}`,
  user: { firstName: 'Ada', id: loginName, loginName, role: 'USER' },
});
const deferred = <T>(): {
  promise: Promise<T>;
  reject: (reason?: unknown) => void;
  resolve: (value: T) => void;
} => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });

  return { promise, reject, resolve };
};
const validForm = (loginName = ' Ada '): CreateUserController => {
  const controller = runtime().render();
  controller.updateField('firstName', ' Ada ');
  controller.updateField('loginName', loginName);

  return runtime().render();
};
const success = async (loginName = 'ada'): Promise<CreateUserController> => {
  fetchMock.mockResolvedValueOnce(reply(created(loginName)));
  await validForm(loginName).handleCreateUser();

  return runtime().render();
};
const rejectWhenAborted = (
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
  mocks.runtime = new HookRuntime(() => createUserController(true));
  fetchMock.mockReset();
  clipboard.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('document', { cookie: '' });
  vi.stubGlobal('navigator', { clipboard: { writeText: clipboard } });
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

describe('user creation controller', () => {
  it('rejects invalid local fields before sending a request', async () => {
    await runtime().render().handleCreateUser();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(runtime().render().errors).toMatchObject({
      firstName: 'Prénom obligatoire',
      loginName: 'Identifiant trop court',
    });
  });

  it('locks synchronous duplicate submissions and blocks another POST after success', async () => {
    const response = deferred<Response>();
    fetchMock.mockReturnValueOnce(response.promise);
    const controller = validForm();
    const first = controller.handleCreateUser();
    await controller.handleCreateUser();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const busy = runtime().render();
    expect(busy.isCreating).toBe(true);
    busy.updateField('loginName', 'changed');
    busy.resetForm();
    expect(runtime().render().form.loginName).toBe(' Ada ');
    response.resolve(reply(created()));
    await first;
    const done = runtime().render();
    expect(done.createdUser?.loginName).toBe('ada');
    expect(done.hasUnacknowledgedPassword).toBe(true);
    expect(done.isCreating).toBe(false);
    await done.handleCreateUser();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('requires verification after a 30-second POST timeout and keeps retry blocked after a 15-second verification timeout', async () => {
    fetchMock.mockImplementation(rejectWhenAborted);
    const post = validForm().handleCreateUser();
    await vi.advanceTimersByTimeAsync(29_999);
    expect(runtime().render().isCreating).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    await post;
    const unknown = runtime().render();
    expect(unknown.recovery).toEqual({ loginName: 'ada', status: 'unchecked' });
    expect(unknown.temporaryPassword).toBeNull();
    await unknown.handleCreateUser();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const check = unknown.checkCreation();
    await vi.advanceTimersByTimeAsync(14_999);
    expect(runtime().render().isChecking).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    await check;
    expect(runtime().render().recovery?.status).toBe('unchecked');
    expect(runtime().render().isChecking).toBe(false);
    await runtime().render().handleCreateUser();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('checks the normalized exact login and retries only explicitly with the unchanged payload after absence', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network unavailable'));
    await validForm().handleCreateUser();
    const initialPayload = fetchMock.mock.calls[0]?.[1]?.body;
    const checking = deferred<Response>();
    fetchMock.mockReturnValueOnce(checking.promise);
    const unknown = runtime().render();
    const first = unknown.checkCreation();
    await unknown.checkCreation();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      '/api/users?limit=1&loginName=ada',
    );
    checking.resolve(reply({ users: [] }));
    await first;
    const absent = runtime().render();
    expect(absent.recovery?.status).toBe('absent');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    absent.updateField('loginName', 'another-account');
    expect(runtime().render().form.loginName).toBe(' Ada ');
    fetchMock.mockResolvedValueOnce(reply(created()));
    await absent.handleCreateUser();
    expect(fetchMock.mock.calls[2]?.[1]?.body).toBe(initialPayload);
    expect(runtime().render().createdUser?.id).toBe('ada');
  });

  it('treats incomplete success as uncertain and never exposes a partial secret', async () => {
    fetchMock.mockResolvedValueOnce(reply({ user: created().user }));
    await validForm().handleCreateUser();
    const result = runtime().render();
    expect(result.recovery?.status).toBe('unchecked');
    expect(result.createdUser).toBeNull();
    expect(result.temporaryPassword).toBeNull();
  });

  it.each([401, 403])(
    'does not infer absence from a verification refusal (%s)',
    async (status) => {
      fetchMock.mockRejectedValueOnce(new TypeError('Lost response'));
      await validForm().handleCreateUser();
      fetchMock.mockResolvedValueOnce(
        Response.json(
          {
            error: { code: 'FORBIDDEN', message: 'Forbidden' },
            success: false,
          },
          { status },
        ),
      );
      await runtime().render().checkCreation();
      const result = runtime().render();
      expect(result.recovery?.status).toBe('unchecked');
      expect(result.submissionError).toContain('Vos droits actuels');
      await result.handleCreateUser();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  it('aborts on unmount and ignores a success that nevertheless arrives late', async () => {
    const response = deferred<Response>();
    fetchMock.mockReturnValueOnce(response.promise);
    const pending = validForm().handleCreateUser();
    const signal = fetchMock.mock.calls[0]?.[1]?.signal;
    runtime().unmount();
    expect(signal?.aborted).toBe(true);
    response.resolve(reply(created()));
    await pending;
    expect(runtime().render().temporaryPassword).toBeNull();
    expect(runtime().render().createdUser).toBeNull();
  });

  it.each(['resolve', 'reject'] as const)(
    'ignores a previous password copy that %s after reset and another creation',
    async (settle) => {
      const first = await success();
      const copy = deferred<undefined>();
      clipboard.mockReturnValueOnce(copy.promise);
      const pending = first.copyTemporaryPassword();
      expect(clipboard).toHaveBeenCalledWith(created().temporaryPassword);
      first.resetForm();
      const second = await success('bea');
      if (settle === 'resolve') copy.resolve(undefined);
      else copy.reject(new Error('Clipboard denied'));
      await pending;
      const current = runtime().render();
      expect(current.createdUser?.id).toBe(second.createdUser?.id);
      expect(current.copyMessage).toBeNull();
      expect(current.passwordAcknowledged).toBe(false);
    },
  );

  it('keeps the latest copy result and does not acknowledge password delivery automatically', async () => {
    const controller = await success();
    const older = deferred<undefined>();
    clipboard
      .mockReturnValueOnce(older.promise)
      .mockResolvedValueOnce(undefined);
    const first = controller.copyTemporaryPassword();
    await controller.copyTemporaryPassword();
    expect(runtime().render().copyMessage).toContain('Mot de passe copié');
    older.reject(new Error('Previous copy denied'));
    await first;
    expect(runtime().render().copyMessage).toContain('Mot de passe copié');
    expect(runtime().render().passwordAcknowledged).toBe(false);
  });
});
