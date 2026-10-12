import {
  type DependencyList,
  type EffectCallback,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LoginPage from '../app/login/page';
import type { LoginResult } from '../shared/types/auth.types';
import { HookRuntime } from './helpers/hook-runtime';

const mocks = vi.hoisted(() => ({
  auth: {
    cancelMfaChallenge: vi.fn(),
    clearError: vi.fn(),
    completeAuthentication: vi.fn(),
    error: null as string | null,
    isLoading: false,
    login: vi.fn(),
    refreshUser: vi.fn(),
    userData: null,
    verifyMfa: vi.fn(),
  },
  replace: vi.fn(),
  runtime: null as HookRuntime<ReactNode> | null,
}));
const runtime = (): HookRuntime<ReactNode> => {
  if (!mocks.runtime) throw new Error('Missing login runtime');

  return mocks.runtime;
};
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useEffect: (effect: EffectCallback, dependencies?: DependencyList): void =>
    runtime().useEffect(effect, dependencies),
  useRef: <T>(initial: T): { current: T } => runtime().useRef(initial),
  useState: <T>(
    initial: T | (() => T),
  ): [T, (value: SetStateAction<T>) => void] => runtime().useState(initial),
}));
vi.mock('$context/UserContext', () => ({ useUser: (): object => mocks.auth }));
vi.mock('next/navigation', () => ({
  useRouter: (): object => ({ replace: mocks.replace }),
}));

type Element = ReactElement<Record<string, unknown>>;
const elements = (node: ReactNode): Element[] => {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Record<string, unknown>>(node)) return [];

  return [node, ...elements(node.props.children as ReactNode)];
};
const find = (predicate: (node: Element) => boolean): Element => {
  const found = elements(runtime().render()).find(predicate);
  if (!found) throw new Error('Expected login element not found');

  return found;
};
const byId = (id: string): Element => find((node) => node.props.id === id);
const changeInput = (id: string, value: string): void => {
  const onChange = byId(id).props.onChange as (event: unknown) => void;
  onChange({ target: { value } });
};
const submit = (): (() => Promise<void>) => {
  const form = find((node) => node.type === 'form');
  const handler = form.props.onSubmit as (event: unknown) => Promise<void>;

  return () => handler({ preventDefault: vi.fn() });
};
const buttonClick = (label: string): Promise<void> | void => {
  const button = find(
    (node) =>
      node.props['aria-label'] === label || node.props.children === label,
  );

  return (button.props.onClick as () => Promise<void> | void)();
};
const deferred = <T>(): {
  promise: Promise<T>;
  resolve: (result: T) => void;
} => {
  let resolve!: (result: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });

  return { promise, resolve };
};
const flush = async (): Promise<void> => {
  for (let iteration = 0; iteration < 8; iteration++) await Promise.resolve();
};
const challenge: LoginResult = {
  challengeExpiresAt: '2026-10-12T21:00:00.000Z',
  status: 'mfa_required',
};
const fillCredentials = (): void => {
  changeInput('loginName', ' Alice ');
  changeInput('password', 'Password-example');
};
const reachMfa = async (): Promise<void> => {
  mocks.auth.login.mockResolvedValueOnce(challenge);
  fillCredentials();
  await submit()();
  const onChange = byId('login-mfa-code').props.onChange as (
    value: string,
  ) => void;
  onChange('123456');
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.auth.login.mockReset();
  mocks.auth.verifyMfa.mockReset();
  mocks.auth.cancelMfaChallenge.mockReset();
  mocks.auth.refreshUser.mockReset();
  mocks.auth.error = null;
  mocks.auth.isLoading = false;
  mocks.runtime = new HookRuntime(LoginPage);
  vi.stubGlobal('window', {
    localStorage: {
      removeItem: (): never => {
        throw new Error('Storage blocked');
      },
    },
    location: { search: '?next=https://external.example' },
  });
  runtime().render();
  runtime().render();
});
afterEach(() => {
  runtime().unmount();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('login page request lifecycle', () => {
  it('locks one credentials operation and preserves the explicit trusted-device choice when storage is blocked', async () => {
    fillCredentials();
    (byId('rememberMe').props.onCheckedChange as (checked: boolean) => void)(
      true,
    );
    const pending = deferred<LoginResult>();
    mocks.auth.login.mockReturnValueOnce(pending.promise);
    const handler = submit();
    const first = handler();
    await handler();
    expect(mocks.auth.login).toHaveBeenCalledTimes(1);
    expect(mocks.auth.login).toHaveBeenCalledWith(
      { loginName: 'alice', password: 'Password-example', rememberMe: true },
      { signal: expect.any(AbortSignal) },
    );
    expect(byId('password').props.disabled).toBe(true);
    pending.resolve(challenge);
    await first;
    expect(byId('login-mfa-code').props.value).toBe('');
    expect(byId('login-mfa-code').props.disabled).toBe(false);
  });

  it('releases credentials after 30 seconds instead of staying blocked', async () => {
    fillCredentials();
    mocks.auth.login.mockImplementationOnce(
      (_credentials: unknown, { signal }: { signal: AbortSignal }) =>
        new Promise((resolve) =>
          signal.addEventListener('abort', () => resolve(null)),
        ),
    );
    const operation = submit()();
    await vi.advanceTimersByTimeAsync(30_000);
    await operation;
    expect(byId('password').props.disabled).toBe(false);
    expect(
      find((node) => node.props.role === 'alert').props.children,
    ).toContain('trop de temps');
  });

  it('aborts departure and ignores the login challenge arriving after unmount', async () => {
    fillCredentials();
    const pending = deferred<LoginResult>();
    mocks.auth.login.mockReturnValueOnce(pending.promise);
    const operation = submit()();
    const signal = mocks.auth.login.mock.calls[0]?.[1].signal as AbortSignal;
    runtime().unmount();
    expect(signal.aborted).toBe(true);
    pending.resolve(challenge);
    await operation;
    expect(mocks.auth.clearError).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('does not repeat an unknown MFA write and checks only the session before explicit restart', async () => {
    await reachMfa();
    mocks.auth.verifyMfa.mockRejectedValueOnce(
      new Error('Response lost after commit'),
    );
    await submit()();
    expect(byId('login-mfa-code').props.disabled).toBe(true);
    await submit()();
    expect(mocks.auth.verifyMfa).toHaveBeenCalledTimes(1);
    mocks.auth.refreshUser.mockResolvedValueOnce(undefined);
    buttonClick('Vérifier la session');
    await flush();
    expect(mocks.auth.refreshUser).toHaveBeenCalledTimes(1);
    expect(mocks.auth.verifyMfa).toHaveBeenCalledTimes(1);
    expect(
      find((node) => node.props.role === 'alert').props.children,
    ).toContain('Aucune session');
    mocks.auth.cancelMfaChallenge.mockResolvedValueOnce(undefined);
    buttonClick('Recommencer la connexion');
    await flush();
    expect(mocks.auth.cancelMfaChallenge).toHaveBeenCalledTimes(1);
    expect(byId('loginName').props.value).toBe(' Alice ');
    expect(byId('password').props.value).toBe('');
  });

  it('treats a timed-out MFA mutation as unknown and clears its code', async () => {
    await reachMfa();
    mocks.auth.verifyMfa.mockImplementationOnce(
      (_code: string, { signal }: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(new Error('Abort'))),
        ),
    );
    const operation = submit()();
    await vi.advanceTimersByTimeAsync(30_000);
    await operation;
    expect(byId('login-mfa-code').props.value).toBe('');
    expect(byId('login-mfa-code').props.disabled).toBe(true);
    expect(
      find((node) => node.props.children === 'Vérifier la session'),
    ).toBeDefined();
  });

  it('serializes challenge cancellation and returns to credentials after its deadline', async () => {
    await reachMfa();
    mocks.auth.cancelMfaChallenge.mockImplementationOnce(
      ({ signal }: { signal: AbortSignal }) =>
        new Promise((resolve) =>
          signal.addEventListener('abort', () => resolve(undefined)),
        ),
    );
    buttonClick('Retour à l’identifiant et au mot de passe');
    buttonClick('Retour à l’identifiant et au mot de passe');
    expect(mocks.auth.cancelMfaChallenge).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(30_000);
    await flush();
    expect(byId('password').props.value).toBe('');
    expect(byId('password').props.disabled).toBe(false);
  });
});
