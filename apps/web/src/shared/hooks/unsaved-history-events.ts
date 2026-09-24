type HistoryListener = (event: Event) => void;

export function createHistoryEventDispatcher(target: EventTarget): {
  subscribe: (listener: HistoryListener) => () => void;
} {
  const listeners = new Set<HistoryListener>();
  target.addEventListener('popstate', (event) => {
    // A dialog opened over another dirty form owns the current decision.
    const activeListener = [...listeners].at(-1);
    activeListener?.(event);
  });

  return {
    subscribe: (listener) => {
      listeners.add(listener);

      return (): void => {
        listeners.delete(listener);
      };
    },
  };
}

let dispatcher: ReturnType<typeof createHistoryEventDispatcher> | undefined;

/** Install before hydration: a late Window capture listener is not sufficient
 * to prevent an earlier router listener from synchronously unmounting a form. */
export function initializeUnsavedHistoryEvents(): ReturnType<
  typeof createHistoryEventDispatcher
> {
  dispatcher ??= createHistoryEventDispatcher(window);

  return dispatcher;
}

export function subscribeToUnsavedHistoryEvents(
  listener: HistoryListener,
): () => void {
  return initializeUnsavedHistoryEvents().subscribe(listener);
}
