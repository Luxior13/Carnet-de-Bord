import type {
  DependencyList,
  Dispatch,
  EffectCallback,
  ReactElement,
  SetStateAction,
} from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  LoginCredentials,
  LoginResult,
  UserType,
} from '$types/auth.types';

type Cleanup = Exclude<ReturnType<EffectCallback>, void>;

type EffectSlot = {
  cleanup?: Cleanup;
  dependencies?: DependencyList;
};

type MemoSlot<T> = {
  dependencies: DependencyList;
  value: T;
};

type StateSlot<T> = {
  setValue: Dispatch<SetStateAction<T>>;
  value: T;
};

const dependenciesAreEqual = (
  previous: DependencyList | undefined,
  next: DependencyList | undefined,
): boolean =>
  previous !== undefined &&
  next !== undefined &&
  previous.length === next.length &&
  previous.every((value, index) => Object.is(value, next.at(index)));

class HookRuntime {
  private callbackSlots = new Map<number, MemoSlot<unknown>>();
  private component: (() => ReactElement) | null = null;
  private effectSlots = new Map<number, EffectSlot>();
  private hookIndex = 0;
  private pendingEffects: Array<{
    dependencies?: DependencyList;
    effect: EffectCallback;
    index: number;
  }> = [];
  private refSlots = new Map<number, { current: unknown }>();
  private stateSlots = new Map<number, unknown>();

  output: ReactElement | null = null;

  render(component?: () => ReactElement): ReactElement {
    if (component) this.component = component;
    if (!this.component) throw new Error('No component registered');

    this.hookIndex = 0;
    this.pendingEffects = [];
    this.output = this.component();

    for (const pendingEffect of this.pendingEffects) {
      const previous = this.effectSlots.get(pendingEffect.index);
      previous?.cleanup?.();

      const cleanup = pendingEffect.effect();
      this.effectSlots.set(pendingEffect.index, {
        cleanup: cleanup || undefined,
        dependencies: pendingEffect.dependencies,
      });
    }

    return this.output;
  }

  unmount(): void {
    for (const effect of this.effectSlots.values()) effect.cleanup?.();
    this.effectSlots.clear();
    this.component = null;
    this.output = null;
  }

  useCallback<T>(callback: T, dependencies: DependencyList): T {
    const index = this.hookIndex++;
    const previous = this.callbackSlots.get(index) as MemoSlot<T> | undefined;

    if (previous && dependenciesAreEqual(previous.dependencies, dependencies)) {
      return previous.value;
    }

    this.callbackSlots.set(index, { dependencies, value: callback });

    return callback;
  }

  useEffect(effect: EffectCallback, dependencies?: DependencyList): void {
    const index = this.hookIndex++;
    const previous = this.effectSlots.get(index);

    if (!dependenciesAreEqual(previous?.dependencies, dependencies)) {
      this.pendingEffects.push({ dependencies, effect, index });
    }
  }

  useRef<T>(initialValue: T): { current: T } {
    const index = this.hookIndex++;
    let slot = this.refSlots.get(index) as { current: T } | undefined;

    if (!slot) {
      slot = { current: initialValue };
      this.refSlots.set(index, slot);
    }

    return slot;
  }

  useState<T>(initialValue: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
    const index = this.hookIndex++;
    let slot = this.stateSlots.get(index) as StateSlot<T> | undefined;

    if (!slot) {
      const stateSlot: StateSlot<T> = {
        setValue: (nextValue): void => {
          stateSlot.value =
            typeof nextValue === 'function'
              ? (nextValue as (previous: T) => T)(stateSlot.value)
              : nextValue;
        },
        value:
          typeof initialValue === 'function'
            ? (initialValue as () => T)()
            : initialValue,
      };
      slot = stateSlot;
      this.stateSlots.set(index, stateSlot);
    }

    return [slot.value, slot.setValue];
  }
}

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
  runtime: null as HookRuntime | null,
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  toastWarning: vi.fn(),
}));

const getRuntime = (): HookRuntime => {
  if (!mocks.runtime) throw new Error('Hook runtime is not initialized');

  return mocks.runtime;
};

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();

  return {
    ...actual,
    useCallback: <T>(callback: T, dependencies: DependencyList): T =>
      getRuntime().useCallback(callback, dependencies),
    useEffect: (effect: EffectCallback, dependencies?: DependencyList): void =>
      getRuntime().useEffect(effect, dependencies),
    useRef: <T>(initialValue: T): { current: T } =>
      getRuntime().useRef(initialValue),
    useState: <T>(
      initialValue: T | (() => T),
    ): [T, Dispatch<SetStateAction<T>>] => getRuntime().useState(initialValue),
  };
});

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
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
    warning: mocks.toastWarning,
  },
}));

vi.mock('$utils/api.utils', () => ({ apiFetch: mocks.apiFetch }));

vi.mock('$components/ui/button', () => ({
  Button: (): null => null,
}));

import { UserProvider } from '$context/UserContext';

type Listener = EventListenerOrEventListenerObject;

class FakeWindow {
  private listeners = new Map<string, Set<Listener>>();
  private storage = new Map<string, string>();

  localStorage = {
    clear: (): void => this.storage.clear(),
    getItem: (key: string): string | null => this.storage.get(key) ?? null,
    key: (): string | null => null,
    get length(): number {
      return 0;
    },
    removeItem: (key: string): void => {
      this.storage.delete(key);
    },
    setItem: (key: string, value: string): void => {
      this.storage.set(key, value);
    },
  } as Storage;

  addEventListener(type: string, listener: Listener): void {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  emit(type: string, event: Record<string, unknown> = {}): void {
    for (const listener of this.listeners.get(type) ?? []) {
      if (typeof listener === 'function') {
        listener.call(this, event as unknown as Event);
      } else {
        listener.handleEvent(event as unknown as Event);
      }
    }
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }
}

type ContextValue = {
  applyUserUpdate: (user: UserType) => void;
  authorizationRevision: number;
  cancelMfaChallenge: (options?: { signal?: AbortSignal }) => Promise<void>;
  error: string | null;
  extendSession: () => Promise<void>;
  isLoading: boolean;
  login: (
    credentials: LoginCredentials,
    options?: { signal?: AbortSignal },
  ) => Promise<LoginResult | null>;
  logout: () => Promise<void>;
  logoutStatus: 'idle' | 'pending' | 'unconfirmed' | 'confirmed';
  refreshUser: () => Promise<void>;
  showSessionWarning: boolean;
  userData: UserType | null;
  verifyMfa: (
    code: string,
    options?: { signal?: AbortSignal },
  ) => Promise<boolean>;
};

const NOW = new Date('2026-07-13T10:00:00.000Z');
const SESSION_ACTIVITY_STORAGE_KEY = 'team-control:last-session-activity';

const user = {
  contactEmail: 'agent@example.com',
  contactEmailVerifiedAt: null,
  createdAt: NOW,
  failedLoginAttempts: 0,
  firstName: 'Alex',
  id: 'user-1',
  isActive: true,
  isProtected: false,
  lastLoginAt: NOW,
  lastName: 'Martin',
  lockedUntil: null,
  loginName: 'agent',
  mfaEnabledAt: null,
  mustChangePassword: false,
  passwordChangedAt: NOW,
  permissions: null,
  role: 'USER',
} as UserType;

const jsonResponse = (
  rememberMe: boolean,
  responseUser: UserType = user,
): Response =>
  ({
    json: vi.fn().mockResolvedValue({
      data: {
        session: {
          expiresAt: new Date(NOW.getTime() + 86_400_000).toISOString(),
          idleExpiresAt: new Date(NOW.getTime() + 1_800_000).toISOString(),
          lastSeenAt: NOW.toISOString(),
          rememberMe,
        },
        user: responseUser,
      },
      success: true,
    }),
    ok: true,
    status: 200,
  }) as unknown as Response;

const heartbeatResponse = (
  status = 200,
  responseUser: UserType = user,
): Response =>
  status >= 200 && status < 300
    ? jsonResponse(false, responseUser)
    : ({ ok: false, status } as Response);

const apiJsonResponse = (data: unknown, status = 200): Response =>
  ({
    json: vi.fn().mockResolvedValue(data),
    ok: status >= 200 && status < 300,
    status,
  }) as unknown as Response;

const flushPromises = async (): Promise<void> => {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
};

const getContext = (runtime: HookRuntime): ContextValue => {
  const provider = runtime.output as ReactElement<{ value: ContextValue }>;
  if (!provider) throw new Error('Provider has not been rendered');

  return provider.props.value as ContextValue;
};

const findElementByText = (
  node: unknown,
  text: string,
): ReactElement | undefined => {
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElementByText(child, text);
      if (match) return match;
    }

    return undefined;
  }

  if (!node || typeof node !== 'object' || !('props' in node)) return undefined;

  const element = node as ReactElement<{ children?: unknown }>;
  if (element.props.children === text) return element;

  return findElementByText(element.props.children, text);
};

describe('UserContext session activity', () => {
  let fakeWindow: FakeWindow;
  let runtime: HookRuntime;

  const mountAuthenticatedProvider = async (
    rememberMe = false,
  ): Promise<void> => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(rememberMe));
    runtime.render(() => UserProvider({ children: null }) as ReactElement);
    await flushPromises();
    runtime.render();
  };

  const mountAnonymousProvider = async (): Promise<void> => {
    vi.mocked(fetch).mockResolvedValueOnce(
      apiJsonResponse(
        {
          error: { code: 'UNAUTHORIZED', message: 'Non authentifié' },
          success: false,
        },
        401,
      ),
    );
    runtime.render(() => UserProvider({ children: null }) as ReactElement);
    await flushPromises();
    runtime.render();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.clearAllMocks();

    fakeWindow = new FakeWindow();
    runtime = new HookRuntime();
    mocks.runtime = runtime;
    vi.stubGlobal('window', fakeWindow as unknown as Window);
    vi.stubGlobal('fetch', vi.fn());
    mocks.apiFetch.mockResolvedValue(
      apiJsonResponse({
        data: { message: 'Déconnexion réussie' },
        success: true,
      }),
    );
  });

  afterEach(() => {
    runtime.unmount();
    mocks.runtime = null;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('throttles the server heartbeat while local activity continues', async () => {
    await mountAuthenticatedProvider();
    vi.mocked(fetch).mockClear();
    vi.mocked(fetch).mockResolvedValue(heartbeatResponse());

    vi.advanceTimersByTime(15_000);
    fakeWindow.emit('mousedown');
    fakeWindow.emit('scroll');
    expect(fetch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(45_000);
    fakeWindow.emit('keydown');
    await flushPromises();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/api/auth/me', {
      cache: 'no-store',
      signal: expect.any(AbortSignal),
    });

    vi.advanceTimersByTime(15_000);
    fakeWindow.emit('touchstart');
    await flushPromises();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('hydrates a server-authenticated account without another session request', () => {
    runtime.render(
      () =>
        UserProvider({
          children: null,
          initialSessionRememberMe: true,
          initialUser: user,
        }) as ReactElement,
    );

    expect(fetch).not.toHaveBeenCalled();
    expect(getContext(runtime).isLoading).toBe(false);
    expect(getContext(runtime).userData?.id).toBe('user-1');
  });

  it('applies profile changes returned by the silent session heartbeat', async () => {
    await mountAuthenticatedProvider();
    vi.mocked(fetch).mockClear();
    vi.mocked(fetch).mockResolvedValue(
      heartbeatResponse(200, {
        ...user,
        firstName: 'Nouveau',
        lastName: 'Profil',
      }),
    );

    vi.advanceTimersByTime(60_000);
    fakeWindow.emit('keydown');
    await flushPromises();
    runtime.render();

    expect(getContext(runtime).userData).toMatchObject({
      firstName: 'Nouveau',
      lastName: 'Profil',
    });
    expect(fetch).toHaveBeenCalledWith('/api/auth/me', {
      cache: 'no-store',
      signal: expect.any(AbortSignal),
    });
  });

  it('refreshes the current user silently without clearing the mounted account', async () => {
    await mountAuthenticatedProvider();
    vi.mocked(fetch).mockClear();
    let resolveRefresh!: (response: Response) => void;
    const pendingRefresh = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
    vi.mocked(fetch).mockReturnValueOnce(pendingRefresh);

    const refreshPromise = getContext(runtime).refreshUser();
    runtime.render();

    expect(getContext(runtime).isLoading).toBe(false);
    expect(getContext(runtime).userData?.contactEmail).toBe(
      'agent@example.com',
    );

    resolveRefresh(
      jsonResponse(false, {
        ...user,
        contactEmail: 'next@example.com',
      }),
    );
    await refreshPromise;
    await flushPromises();
    runtime.render();

    expect(getContext(runtime).isLoading).toBe(false);
    expect(getContext(runtime).userData?.contactEmail).toBe('next@example.com');
  });

  it('keeps the login page mounted while a second factor is pending', async () => {
    await mountAnonymousProvider();
    mocks.apiFetch.mockResolvedValueOnce(
      apiJsonResponse({
        data: {
          challengeExpiresAt: '2026-07-13T10:05:00.000Z',
          status: 'mfa_required',
        },
        success: true,
      }),
    );

    const result = await getContext(runtime).login({
      loginName: 'agent',
      password: 'correct-password',
      rememberMe: false,
    });
    runtime.render();

    expect(result).toEqual({
      challengeExpiresAt: '2026-07-13T10:05:00.000Z',
      status: 'mfa_required',
    });
    expect(getContext(runtime).isLoading).toBe(false);
    expect(getContext(runtime).userData).toBeNull();
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it('creates the client session only after successful MFA verification', async () => {
    await mountAnonymousProvider();
    const authenticatedUser = {
      ...user,
      mfaEnabledAt: NOW,
    };
    mocks.apiFetch.mockResolvedValueOnce(
      apiJsonResponse({
        data: {
          mustChangePassword: false,
          session: {
            expiresAt: '2026-07-13T11:00:00.000Z',
            idleExpiresAt: '2026-07-13T10:30:00.000Z',
            lastSeenAt: NOW.toISOString(),
            rememberMe: false,
          },
          status: 'authenticated',
          user: authenticatedUser,
        },
        success: true,
      }),
    );

    const success = await getContext(runtime).verifyMfa('123456');
    runtime.render();

    expect(success).toBe(true);
    expect(getContext(runtime).isLoading).toBe(false);
    expect(getContext(runtime).userData?.mfaEnabledAt).toEqual(NOW);
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Connexion réussie');
  });

  it('cancels a pending MFA challenge without starting a global load', async () => {
    await mountAnonymousProvider();
    mocks.apiFetch.mockResolvedValueOnce(apiJsonResponse({ success: true }));

    await getContext(runtime).cancelMfaChallenge();
    runtime.render();

    expect(mocks.apiFetch).toHaveBeenCalledWith('/api/auth/mfa/challenge', {
      method: 'DELETE',
    });
    expect(getContext(runtime).isLoading).toBe(false);
    expect(getContext(runtime).userData).toBeNull();
  });

  it('releases the initial session check after its deadline and permits a new check', async () => {
    vi.mocked(fetch).mockImplementationOnce(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new Error('Aborted')),
            { once: true },
          );
        }),
    );
    runtime.render(() => UserProvider({ children: null }) as ReactElement);
    await vi.advanceTimersByTimeAsync(15_000);
    runtime.render();
    expect(getContext(runtime).isLoading).toBe(false);
    expect(getContext(runtime).error).toBe(
      'Impossible de vérifier votre session',
    );
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(false));
    await getContext(runtime).refreshUser();
    runtime.render();
    expect(getContext(runtime).userData?.id).toBe(user.id);
  });

  it('ignores a pending login response after its caller aborts', async () => {
    await mountAnonymousProvider();
    let resolve!: (response: Response) => void;
    mocks.apiFetch.mockReturnValueOnce(
      new Promise<Response>((done) => {
        resolve = done;
      }),
    );
    const controller = new AbortController();
    const result = getContext(runtime).login(
      { loginName: 'agent', password: 'fictive-password', rememberMe: false },
      { signal: controller.signal },
    );
    controller.abort();
    resolve(
      apiJsonResponse({
        data: { challengeExpiresAt: NOW.toISOString(), status: 'mfa_required' },
        success: true,
      }),
    );
    expect(await result).toBeNull();
    runtime.render();
    expect(getContext(runtime).error).toBeNull();
    expect(getContext(runtime).userData).toBeNull();
  });

  it('does not authenticate from a verification superseded by cancellation', async () => {
    await mountAnonymousProvider();
    let resolve!: (response: Response) => void;
    mocks.apiFetch.mockReturnValueOnce(
      new Promise<Response>((done) => {
        resolve = done;
      }),
    );
    const verification = getContext(runtime).verifyMfa('123456');
    await getContext(runtime).cancelMfaChallenge();
    resolve(
      apiJsonResponse({
        data: {
          mustChangePassword: false,
          session: { rememberMe: false },
          status: 'authenticated',
          user,
        },
        success: true,
      }),
    );
    expect(await verification).toBe(false);
    runtime.render();
    expect(getContext(runtime).userData).toBeNull();
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it.each(['network', 'server', 'invalid-json', 'aborted'] as const)(
    'signals an unknown MFA outcome after %s without retrying',
    async (kind) => {
      await mountAnonymousProvider();
      const controller = new AbortController();
      if (kind === 'network')
        mocks.apiFetch.mockRejectedValueOnce(new Error('Network failed'));
      else if (kind === 'server')
        mocks.apiFetch.mockResolvedValueOnce(
          apiJsonResponse(
            { error: { message: 'Failure' }, success: false },
            500,
          ),
        );
      else if (kind === 'invalid-json')
        mocks.apiFetch.mockResolvedValueOnce({
          json: async () => {
            throw new SyntaxError('Invalid JSON');
          },
          ok: true,
          status: 200,
        });
      else
        mocks.apiFetch.mockImplementationOnce(async () => {
          controller.abort();

          return apiJsonResponse({
            data: {
              mustChangePassword: false,
              session: { rememberMe: false },
              status: 'authenticated',
              user,
            },
            success: true,
          });
        });
      await expect(
        getContext(runtime).verifyMfa('123456', { signal: controller.signal }),
      ).rejects.toThrow('n’a pas pu être confirmé');
      runtime.render();
      expect(getContext(runtime).userData).toBeNull();
      expect(mocks.apiFetch).toHaveBeenCalledTimes(1);
      expect(mocks.toastSuccess).not.toHaveBeenCalled();
    },
  );

  it('keeps credential and MFA refusals local and retryable', async () => {
    await mountAnonymousProvider();
    mocks.apiFetch.mockResolvedValueOnce(
      apiJsonResponse(
        {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Identifiant ou mot de passe incorrect',
          },
          success: false,
        },
        401,
      ),
    );
    expect(
      await getContext(runtime).login({
        loginName: 'agent',
        password: 'fictive-password',
        rememberMe: false,
      }),
    ).toBeNull();
    runtime.render();
    expect(getContext(runtime).error).toBe(
      'Identifiant ou mot de passe incorrect',
    );
    expect(mocks.toastError).not.toHaveBeenCalled();
    mocks.apiFetch.mockResolvedValueOnce(
      apiJsonResponse(
        {
          error: { code: 'UNAUTHORIZED', message: 'Code incorrect ou expiré' },
          success: false,
        },
        401,
      ),
    );
    expect(await getContext(runtime).verifyMfa('123456')).toBe(false);
    runtime.render();
    expect(getContext(runtime).error).toBe('Code incorrect ou expiré');
  });

  it('keeps the mounted account when a silent refresh temporarily fails', async () => {
    await mountAuthenticatedProvider();
    vi.mocked(fetch).mockClear();
    vi.mocked(fetch).mockRejectedValueOnce(
      new Error('temporary network error'),
    );

    await getContext(runtime).refreshUser();
    await flushPromises();
    runtime.render();

    expect(getContext(runtime).isLoading).toBe(false);
    expect(getContext(runtime).userData?.id).toBe('user-1');
    expect(getContext(runtime).userData?.contactEmail).toBe(
      'agent@example.com',
    );
  });

  it('uses a loading state when retrying an initial session failure', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('initial network error'));
    runtime.render(() => UserProvider({ children: null }) as ReactElement);
    await flushPromises();
    runtime.render();

    expect(getContext(runtime).userData).toBeNull();
    expect(getContext(runtime).isLoading).toBe(false);

    let resolveRetry!: (response: Response) => void;
    const pendingRetry = new Promise<Response>((resolve) => {
      resolveRetry = resolve;
    });
    vi.mocked(fetch).mockReturnValueOnce(pendingRetry);

    const retryPromise = getContext(runtime).refreshUser();
    runtime.render();

    expect(getContext(runtime).userData).toBeNull();
    expect(getContext(runtime).isLoading).toBe(true);

    resolveRetry(jsonResponse(false));
    await retryPromise;
    await flushPromises();
    runtime.render();

    expect(getContext(runtime).isLoading).toBe(false);
    expect(getContext(runtime).userData?.id).toBe('user-1');
  });

  it('applies a successful account mutation without another request', async () => {
    await mountAuthenticatedProvider();
    vi.mocked(fetch).mockClear();
    const previousAuthorizationRevision =
      getContext(runtime).authorizationRevision;

    getContext(runtime).applyUserUpdate({
      ...user,
      contactEmail: 'updated@example.com',
    });
    runtime.render();

    expect(fetch).not.toHaveBeenCalled();
    expect(getContext(runtime).userData?.contactEmail).toBe(
      'updated@example.com',
    );
    expect(getContext(runtime).authorizationRevision).toBeGreaterThan(
      previousAuthorizationRevision,
    );
  });

  it('does not restore an account from a refresh that finishes after logout', async () => {
    await mountAuthenticatedProvider();
    let resolveRefresh!: (response: Response) => void;
    vi.mocked(fetch).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    const pending = getContext(runtime).refreshUser();
    mocks.apiFetch.mockResolvedValueOnce(apiJsonResponse({ success: true }));
    await getContext(runtime).logout();
    resolveRefresh(jsonResponse(false));
    await pending;
    runtime.render();
    expect(getContext(runtime).userData).toBeNull();
  });

  it('keeps a confirmed mutation when an earlier refresh finishes later', async () => {
    await mountAuthenticatedProvider();
    let resolveRefresh!: (response: Response) => void;
    vi.mocked(fetch).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    const pending = getContext(runtime).refreshUser();
    getContext(runtime).applyUserUpdate({
      ...user,
      firstName: 'Saved',
      updatedAt: new Date('2026-07-13T11:00:00Z'),
    });
    resolveRefresh(jsonResponse(false, { ...user, updatedAt: NOW }));
    await pending;
    runtime.render();
    expect(getContext(runtime).userData?.firstName).toBe('Saved');
  });

  it('rejects a mutation for another account and a lower saved version', async () => {
    await mountAuthenticatedProvider();
    getContext(runtime).applyUserUpdate({
      ...user,
      firstName: 'Saved',
      updatedAt: new Date('2026-07-13T11:00:00Z'),
    });
    getContext(runtime).applyUserUpdate({
      ...user,
      firstName: 'Foreign',
      id: 'another-account',
    });
    getContext(runtime).applyUserUpdate({
      ...user,
      firstName: 'Old',
      updatedAt: NOW,
    });
    runtime.render();
    expect(getContext(runtime).userData?.id).toBe(user.id);
    expect(getContext(runtime).userData?.firstName).toBe('Saved');
  });

  it('clears a mounted account on a non JSON refusal during silent refresh', async () => {
    await mountAuthenticatedProvider();
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => {
        throw new Error('Not JSON');
      },
      ok: false,
      status: 403,
    } as unknown as Response);
    await getContext(runtime).refreshUser();
    runtime.render();
    expect(getContext(runtime).userData).toBeNull();
  });

  it('ignores an older session read after a newer refresh has completed', async () => {
    await mountAuthenticatedProvider();
    let resolveRefresh!: (response: Response) => void;
    vi.mocked(fetch).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    const pending = getContext(runtime).refreshUser();
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(false, { ...user, firstName: 'Latest' }),
    );
    await getContext(runtime).refreshUser();
    resolveRefresh(jsonResponse(false, { ...user, firstName: 'Old' }));
    await pending;
    runtime.render();
    expect(getContext(runtime).userData?.firstName).toBe('Latest');
  });

  it('unmounts the authenticated account while logout is pending', async () => {
    await mountAuthenticatedProvider();
    let resolveLogout!: (response: Response) => void;
    const pendingLogout = new Promise<Response>((resolve) => {
      resolveLogout = resolve;
    });
    mocks.apiFetch.mockReturnValueOnce(pendingLogout);

    const logoutPromise = getContext(runtime).logout();
    runtime.render();

    expect(getContext(runtime).isLoading).toBe(true);
    expect(getContext(runtime).userData).toBeNull();
    expect(mocks.apiFetch).toHaveBeenCalledWith('/api/auth/logout', {
      method: 'POST',
      signal: expect.any(AbortSignal),
    });

    resolveLogout(
      apiJsonResponse({
        data: { message: 'Déconnexion réussie' },
        success: true,
      }),
    );
    await logoutPromise;
    runtime.render();

    expect(mocks.routerReplace).toHaveBeenCalledWith('/login');
    expect(getContext(runtime).isLoading).toBe(false);
  });

  it.each([403, 500])(
    'keeps logout unconfirmed on HTTP %s and blocks account refresh',
    async (status) => {
      await mountAuthenticatedProvider();
      vi.mocked(fetch).mockClear();
      mocks.apiFetch.mockResolvedValueOnce(
        apiJsonResponse({ success: false }, status),
      );

      await getContext(runtime).logout();
      runtime.render();
      expect(getContext(runtime).userData).toBeNull();
      expect(mocks.toastSuccess).not.toHaveBeenCalled();
      expect(mocks.routerPush).not.toHaveBeenCalled();
      expect(mocks.routerReplace).not.toHaveBeenCalled();
      expect(getContext(runtime).logoutStatus).toBe('unconfirmed');
      await getContext(runtime).refreshUser();
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it('does not confirm logout from a malformed successful response', async () => {
    await mountAuthenticatedProvider();
    mocks.apiFetch.mockResolvedValueOnce(apiJsonResponse({ success: false }));
    await getContext(runtime).logout();
    runtime.render();
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.routerReplace).not.toHaveBeenCalled();
    expect(getContext(runtime).logoutStatus).toBe('unconfirmed');
  });

  it('explicitly retries a lost logout response and accepts an already absent session', async () => {
    await mountAuthenticatedProvider();
    mocks.apiFetch.mockRejectedValueOnce(new TypeError('Lost after commit'));
    await getContext(runtime).logout();
    runtime.render();
    expect(mocks.apiFetch).toHaveBeenCalledTimes(1);
    expect(mocks.routerPush).not.toHaveBeenCalled();
    expect(mocks.routerReplace).not.toHaveBeenCalled();
    expect(getContext(runtime).logoutStatus).toBe('unconfirmed');

    mocks.apiFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    await getContext(runtime).logout();
    runtime.render();
    expect(mocks.apiFetch).toHaveBeenCalledTimes(2);
    expect(getContext(runtime).logoutStatus).toBe('confirmed');
    expect(mocks.routerReplace).toHaveBeenCalledWith('/login');
  });

  it('bounds a logout request and ignores a late successful response', async () => {
    await mountAuthenticatedProvider();
    let resolveLogout!: (response: Response) => void;
    mocks.apiFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLogout = resolve;
      }),
    );
    const logout = getContext(runtime).logout;
    const pending = logout();
    await logout();
    expect(mocks.apiFetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(15_000);
    runtime.render();
    expect(getContext(runtime).isLoading).toBe(false);
    expect(getContext(runtime).logoutStatus).toBe('unconfirmed');
    const signal = mocks.apiFetch.mock.calls[0]?.[1]?.signal as AbortSignal;
    expect(signal.aborted).toBe(true);
    resolveLogout(
      apiJsonResponse({
        data: { message: 'Déconnexion réussie' },
        success: true,
      }),
    );
    await pending;
    runtime.render();
    expect(getContext(runtime).logoutStatus).toBe('unconfirmed');
    expect(mocks.routerReplace).not.toHaveBeenCalled();
  });

  it('ignores a logout response after unmount', async () => {
    await mountAuthenticatedProvider();
    let resolveLogout!: (response: Response) => void;
    mocks.apiFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLogout = resolve;
      }),
    );
    const pending = getContext(runtime).logout();
    runtime.unmount();
    resolveLogout(
      apiJsonResponse({
        data: { message: 'Déconnexion réussie' },
        success: true,
      }),
    );
    await pending;
    expect(mocks.routerReplace).not.toHaveBeenCalled();
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it('keeps logout confirmed if routing fails after the server response', async () => {
    await mountAuthenticatedProvider();
    mocks.routerReplace.mockImplementationOnce(() => {
      throw new Error('Navigation failed');
    });
    await getContext(runtime).logout();
    runtime.render();
    expect(getContext(runtime).logoutStatus).toBe('confirmed');
    expect(getContext(runtime).userData).toBeNull();
  });

  it('allows an explicit new credentials flow to check an uncertain MFA session', async () => {
    await mountAuthenticatedProvider();
    mocks.apiFetch.mockRejectedValueOnce(new TypeError('Uncertain logout'));
    await getContext(runtime).logout();
    runtime.render();
    mocks.apiFetch.mockResolvedValueOnce(
      apiJsonResponse({
        data: {
          challengeExpiresAt: new Date(NOW.getTime() + 60_000).toISOString(),
          status: 'mfa_required',
        },
        success: true,
      }),
    );
    await getContext(runtime).login({
      loginName: 'second',
      password: 'fictitious-only',
      rememberMe: false,
    });
    runtime.render();
    expect(getContext(runtime).logoutStatus).toBe('idle');
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(false, { ...user, id: 'second-account' }),
    );
    await getContext(runtime).refreshUser();
    runtime.render();
    expect(getContext(runtime).userData?.id).toBe('second-account');
  });

  it('uses the server heartbeat when the user clicks Rester connecte', async () => {
    await mountAuthenticatedProvider();
    vi.mocked(fetch).mockClear();
    vi.mocked(fetch).mockResolvedValue(heartbeatResponse());

    vi.advanceTimersByTime(25 * 60_000);
    runtime.render();

    const button = findElementByText(runtime.output, 'Rester connecté');
    expect(button).toBeDefined();
    if (!button) throw new Error('Stay connected button was not rendered');

    const onClick = (button.props as { onClick: () => void }).onClick;
    onClick();
    await flushPromises();
    runtime.render();

    expect(fetch).toHaveBeenCalledWith('/api/auth/me', {
      cache: 'no-store',
      signal: expect.any(AbortSignal),
    });
    expect(getContext(runtime).showSessionWarning).toBe(false);
  });

  it('clears the user and redirects when the heartbeat returns 401', async () => {
    await mountAuthenticatedProvider();
    vi.mocked(fetch).mockClear();
    vi.mocked(fetch).mockResolvedValue(heartbeatResponse(401));

    await getContext(runtime).extendSession();
    runtime.render();

    expect(getContext(runtime).userData).toBeNull();
    expect(mocks.routerPush).toHaveBeenCalledWith('/login');
    expect(mocks.toastError).toHaveBeenCalledWith(
      'Impossible de prolonger la session',
    );
  });

  it('does not auto-logout a remember-me session after 30 minutes', async () => {
    await mountAuthenticatedProvider(true);

    vi.advanceTimersByTime(31 * 60_000);
    await flushPromises();

    expect(mocks.apiFetch).not.toHaveBeenCalled();
    expect(mocks.toastWarning).not.toHaveBeenCalled();
    expect(mocks.routerPush).not.toHaveBeenCalled();
  });

  it('resets the inactivity deadline when another tab publishes activity', async () => {
    await mountAuthenticatedProvider();

    vi.advanceTimersByTime(29 * 60_000);
    fakeWindow.emit('storage', {
      key: SESSION_ACTIVITY_STORAGE_KEY,
      newValue: Date.now().toString(),
    });

    vi.advanceTimersByTime(29 * 60_000);
    await flushPromises();
    expect(mocks.apiFetch).not.toHaveBeenCalled();
    expect(mocks.routerPush).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60_000);
    await flushPromises();

    expect(mocks.apiFetch).toHaveBeenCalledWith('/api/auth/logout', {
      method: 'POST',
      signal: expect.any(AbortSignal),
    });
    expect(mocks.routerReplace).toHaveBeenCalledWith('/login');
  });
});
