import type { DependencyList, EffectCallback, SetStateAction } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useUserMutationFeedback as createFeedbackController } from '$components/users/user-detail/UserMutationFeedback';

import { HookRuntime } from './helpers/hook-runtime';

type Controller = ReturnType<typeof createFeedbackController>;
const mocks = vi.hoisted(() => ({
  runtime: null as HookRuntime<Controller> | null,
}));
const runtime = (): HookRuntime<Controller> => {
  if (!mocks.runtime) throw new Error('Missing hook runtime');

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

const frame = vi.fn(() => 0);
const deferred = (): {
  promise: Promise<boolean>;
  resolve: (value: boolean) => void;
} => {
  let resolve!: (value: boolean) => void;
  const promise = new Promise<boolean>((onResolve) => {
    resolve = onResolve;
  });

  return { promise, resolve };
};
const conflict = (): Controller => {
  runtime()
    .render()
    .report('profile', 'Une modification concurrente existe.', 409);

  return runtime().render();
};

beforeEach(() => {
  mocks.runtime = new HookRuntime(createFeedbackController);
  frame.mockClear();
  vi.stubGlobal('requestAnimationFrame', frame);
});
afterEach(() => {
  runtime().unmount();
  vi.unstubAllGlobals();
});

describe('user detail conflict refresh', () => {
  it('locks simultaneous refresh calls from the same rendered handler and clears the conflict after success', async () => {
    const result = deferred();
    const load = vi.fn(() => result.promise);
    const controller = conflict();
    const first = controller.refresh(load);
    const second = controller.refresh(load);
    expect(load).toHaveBeenCalledTimes(1);
    expect(runtime().render().isRefreshing).toBe(true);
    expect(runtime().render().start()).toBe(false);

    result.resolve(true);
    await Promise.all([first, second]);
    const done = runtime().render();
    expect(done.isRefreshing).toBe(false);
    expect(done.feedback).toBeNull();
    expect(done.start()).toBe(true);
  });

  it('does not update local feedback or schedule focus when a refresh completes after unmount', async () => {
    const result = deferred();
    const controller = conflict();
    const pending = controller.refresh(() => result.promise);
    const beforeUnmount = runtime().render();
    frame.mockClear();
    runtime().unmount();
    result.resolve(true);
    await pending;

    // Inspect stored slots without mounting effects again; the browser bench
    // additionally exercises actual account changes and unmounted React trees.
    const afterUnmount = runtime().render();
    expect(afterUnmount.feedback).toEqual(beforeUnmount.feedback);
    expect(afterUnmount.isRefreshing).toBe(beforeUnmount.isRefreshing);
    expect(frame).not.toHaveBeenCalled();
  });
});
