type CountEntry = {
  count: number | null;
  listeners: Set<() => void>;
  observedAt: number;
};
export type NotificationCountPublisher = (
  value: number | ((current: number) => number),
  observedAt?: number,
) => void;
type NotificationCountStore = {
  get: (scope: string) => number | null;
  publish: (
    scope: string,
    ...args: Parameters<NotificationCountPublisher>
  ) => void;
  subscribe: (scope: string, listener: () => void) => () => void;
};

/** In-memory counters, isolated by account/authorization revision, never persisted. */
export const createNotificationCountStore = (): NotificationCountStore => {
  const entries = new Map<string, CountEntry>();

  return {
    get: (scope: string): number | null => entries.get(scope)?.count ?? null,
    publish: (
      scope: string,
      value: number | ((current: number) => number),
      observedAt = Date.now(),
    ): void => {
      const entry = entries.get(scope);
      // A late response must not recreate a previous account's state.
      if (!entry || observedAt < entry.observedAt) return;
      const count =
        typeof value === 'function' ? value(entry.count ?? 0) : value;
      if (!Number.isSafeInteger(count) || count < 0) return;
      entry.observedAt = observedAt;
      if (entry.count === count) return;
      entry.count = count;
      entry.listeners.forEach((listener) => listener());
    },
    subscribe: (scope: string, listener: () => void): (() => void) => {
      let entry = entries.get(scope);
      if (!entry) {
        entry = { count: null, listeners: new Set(), observedAt: 0 };
        entries.set(scope, entry);
      }
      entry.listeners.add(listener);

      return () => {
        entry.listeners.delete(listener);
        if (entry.listeners.size === 0 && entries.get(scope) === entry)
          entries.delete(scope);
      };
    },
  };
};

export const notificationCountStore = createNotificationCountStore();
