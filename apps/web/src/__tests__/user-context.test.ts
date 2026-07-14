import type {
  DependencyList,
  Dispatch,
  EffectCallback,
  ReactElement,
  SetStateAction,
} from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserType } from '$types/auth.types';

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
  useRouter: (): { push: typeof mocks.routerPush } => ({
    push: mocks.routerPush,
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
  extendSession: () => Promise<void>;
  showSessionWarning: boolean;
  userData: UserType | null;
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
  mustChangePassword: false,
  passwordChangedAt: NOW,
  permissions: null,
  role: 'USER',
} as UserType;

const jsonResponse = (rememberMe: boolean): Response =>
  ({
    json: vi.fn().mockResolvedValue({
      data: {
        session: {
          expiresAt: new Date(NOW.getTime() + 86_400_000).toISOString(),
          idleExpiresAt: new Date(NOW.getTime() + 1_800_000).toISOString(),
          lastSeenAt: NOW.toISOString(),
          rememberMe,
        },
        user,
      },
      success: true,
    }),
    ok: true,
    status: 200,
  }) as unknown as Response;

const heartbeatResponse = (status = 200): Response =>
  ({ ok: status >= 200 && status < 300, status }) as Response;

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

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.clearAllMocks();

    fakeWindow = new FakeWindow();
    runtime = new HookRuntime();
    mocks.runtime = runtime;
    vi.stubGlobal('window', fakeWindow as unknown as Window);
    vi.stubGlobal('fetch', vi.fn());
    mocks.apiFetch.mockResolvedValue({ ok: true });
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
    });

    vi.advanceTimersByTime(15_000);
    fakeWindow.emit('touchstart');
    await flushPromises();
    expect(fetch).toHaveBeenCalledTimes(1);
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
    });
    expect(mocks.routerPush).toHaveBeenCalledWith('/login');
  });
});
