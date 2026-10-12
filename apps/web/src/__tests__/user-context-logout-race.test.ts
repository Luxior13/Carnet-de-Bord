import type {
  DependencyList,
  EffectCallback,
  ReactElement,
  SetStateAction,
} from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { UserType } from '$types/auth.types';

import { HookRuntime } from './helpers/hook-runtime';

type Context = {
  isLoading: boolean;
  logout: () => Promise<void>;
  logoutStatus: string;
  refreshUser: () => Promise<void>;
  userData: UserType | null;
};
type Provider = ReactElement<{ value: Context }>;
const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
  runtime: null as HookRuntime<Provider> | null,
}));
const runtime = (): HookRuntime<Provider> => {
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
  useRef: <T>(initial: T): { current: T } => runtime().useRef(initial),
  useState: <T>(initial: T): [T, (value: SetStateAction<T>) => void] =>
    runtime().useState(initial),
}));
vi.mock('next/navigation', () => ({
  useRouter: (): {
    push: typeof mocks.routerPush;
    replace: typeof mocks.routerReplace;
  } => ({
    push: mocks.routerPush,
    replace: mocks.routerReplace,
  }),
}));
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));
vi.mock('$utils/api.utils', () => ({ apiFetch: mocks.apiFetch }));
vi.mock('$components/ui/button', () => ({ Button: (): null => null }));

import { UserProvider } from '$context/UserContext';

afterEach(() => {
  mocks.runtime?.unmount();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('logout priority over personal-account refreshes', () => {
  it('cannot restore the account or cancel the redirect when refresh begins during the logout POST', async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    const account = {
      firstName: 'Camille',
      id: 'logout-fixture',
      lastName: '',
      loginName: 'camille',
      mustChangePassword: false,
      permissions: null,
      role: 'USER',
      updatedAt: '2026-10-11T20:00:00.000Z',
    } as UserType;
    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      localStorage: { setItem: vi.fn() },
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          data: { session: { rememberMe: false }, user: account },
          success: true,
        }),
      ),
    );
    let finishLogout!: (value: Response) => void;
    mocks.apiFetch.mockReturnValue(
      new Promise<Response>((resolve) => {
        finishLogout = resolve;
      }),
    );
    mocks.runtime = new HookRuntime(
      () => UserProvider({ children: null, initialUser: account }) as Provider,
    );
    const context = runtime().render().props.value;
    const pending = context.logout();
    expect(runtime().render().props.value.userData).toBeNull();

    // A sibling operation can request a refresh while the logout request is
    // still reaching the server; /me may still see the session at that instant.
    await context.refreshUser();
    expect(fetch).not.toHaveBeenCalled();
    finishLogout(
      Response.json({
        data: { message: 'Déconnexion réussie' },
        success: true,
      }),
    );
    await pending;
    const done = runtime().render().props.value;
    expect(done.userData).toBeNull();
    expect(done.isLoading).toBe(false);
    expect(done.logoutStatus).toBe('confirmed');
    expect(mocks.routerPush).not.toHaveBeenCalled();
    expect(mocks.routerReplace).toHaveBeenCalledWith('/login');
  });
});
