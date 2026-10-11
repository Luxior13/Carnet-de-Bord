import type { DependencyList, EffectCallback, SetStateAction } from 'react';

// A synchronous state-transition harness, not a React renderer. Browser benches
// separately verify rendering, effect scheduling, remounts and actual focus.
export class HookRuntime<Result> {
  private index = 0;
  private values = new Map<number, unknown>();
  private effects = new Map<
    number,
    { cleanup?: () => void; dependencies?: DependencyList }
  >();
  private callbacks = new Map<
    number,
    { callback: unknown; dependencies: DependencyList }
  >();
  private pendingEffects: Array<() => void> = [];

  constructor(private readonly controller: () => Result) {}

  render(): Result {
    this.index = 0;
    this.pendingEffects = [];
    const result = this.controller();
    for (const effect of this.pendingEffects) effect();

    return result;
  }

  unmount(): void {
    for (const effect of this.effects.values()) effect.cleanup?.();
  }

  useState<T>(initial: T | (() => T)): [T, (value: SetStateAction<T>) => void] {
    const index = this.index++;
    if (!this.values.has(index))
      this.values.set(
        index,
        typeof initial === 'function' ? (initial as () => T)() : initial,
      );

    return [
      this.values.get(index) as T,
      (value): void => {
        const next =
          typeof value === 'function'
            ? (value as (previous: T) => T)(this.values.get(index) as T)
            : value;
        this.values.set(index, next);
      },
    ];
  }

  useRef<T>(initial: T): { current: T } {
    const index = this.index++;
    if (!this.values.has(index)) this.values.set(index, { current: initial });

    return this.values.get(index) as { current: T };
  }

  useCallback<T extends (...args: never[]) => unknown>(
    callback: T,
    dependencies: DependencyList,
  ): T {
    const index = this.index++;
    const previous = this.callbacks.get(index);
    if (previous && sameDependencies(previous.dependencies, dependencies))
      return previous.callback as T;
    this.callbacks.set(index, { callback, dependencies });

    return callback;
  }

  useMemo<T>(factory: () => T, dependencies: DependencyList): T {
    const index = this.index++;
    const previous = this.callbacks.get(index);
    if (previous && sameDependencies(previous.dependencies, dependencies))
      return previous.callback as T;
    const value = factory();
    this.callbacks.set(index, { callback: value, dependencies });

    return value;
  }

  useEffect(effect: EffectCallback, dependencies?: DependencyList): void {
    const index = this.index++;
    const previous = this.effects.get(index);
    if (sameDependencies(previous?.dependencies, dependencies)) return;
    this.pendingEffects.push(() => {
      previous?.cleanup?.();
      this.effects.set(index, {
        cleanup: effect() || undefined,
        dependencies,
      });
    });
  }
}

const sameDependencies = (
  previous: DependencyList | undefined,
  next: DependencyList | undefined,
): boolean =>
  Boolean(
    previous &&
    next &&
    previous.length === next.length &&
    next.every((value, index) => Object.is(value, previous.at(index))),
  );
