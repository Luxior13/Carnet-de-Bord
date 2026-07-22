type HistoryTraversalEvent = {
  stopImmediatePropagation: () => void;
};

export type HistoryTraversalPort = {
  back: () => void;
  getCurrentHref: () => string;
  getCurrentState: () => unknown;
  listen: (listener: (event: HistoryTraversalEvent) => void) => () => void;
  pushEntry: (state: unknown, href: string) => void;
};

export type UnsavedHistoryTraversalGuard = {
  cancel: () => void;
  confirm: () => boolean;
  dispose: () => void;
};

/**
 * Keeps a dirty single-page form mounted when a history traversal occurs.
 *
 * `popstate` cannot be cancelled. The guard therefore stops the router listener
 * synchronously and restores the protected entry by appending it immediately
 * after the requested destination. A confirmation can then replay the
 * traversal with one `back()` call; cancellation simply stays on the restored
 * entry. This direction-agnostic strategy handles both Back and Forward.
 */
export const createUnsavedHistoryTraversalGuard = (
  port: HistoryTraversalPort,
  onPendingNavigation: (href: string) => void,
): UnsavedHistoryTraversalGuard => {
  let guardedHref = port.getCurrentHref();
  let guardedState = port.getCurrentState();
  let allowNextTraversal = false;
  let disposed = false;
  let pendingTraversal = false;

  const stopListening = port.listen((event) => {
    if (allowNextTraversal) {
      allowNextTraversal = false;
      guardedHref = port.getCurrentHref();
      guardedState = port.getCurrentState();

      return;
    }

    const requestedHref = port.getCurrentHref();

    // At Window, a capture listener runs before Next.js' bubble listener. Do
    // not let the router unmount the dirty form while the decision is pending.
    event.stopImmediatePropagation();
    port.pushEntry(guardedState, guardedHref);
    pendingTraversal = true;
    onPendingNavigation(requestedHref);
  });

  return {
    cancel: (): void => {
      pendingTraversal = false;
    },
    confirm: (): boolean => {
      if (disposed || !pendingTraversal) return false;
      pendingTraversal = false;
      allowNextTraversal = true;
      port.back();

      return true;
    },
    dispose: (): void => {
      if (disposed) return;
      disposed = true;
      pendingTraversal = false;
      stopListening();
    },
  };
};
