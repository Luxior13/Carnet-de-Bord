import { describe, expect, it, vi } from 'vitest';

import {
  createUnsavedHistoryTraversalGuard,
  type HistoryTraversalPort,
} from '../shared/hooks/unsaved-navigation-history';

type FakePopStateEvent = {
  propagationStopped: boolean;
  stopImmediatePropagation: () => void;
};

type FakeHarness = {
  back: ReturnType<typeof vi.fn>;
  getCurrentHref: () => string;
  hasListener: () => boolean;
  port: HistoryTraversalPort;
  pushedEntries: { href: string; state: unknown }[];
  routerPopStateListener: ReturnType<typeof vi.fn>;
  traverse: (href: string, state: unknown) => FakePopStateEvent;
};

const createHarness = (): FakeHarness => {
  let currentHref = '/vie-interne/repertoire/abc?section=identite#coordonnees';
  let currentState: unknown = { __NA: true, tree: 'person' };
  let listener: ((event: FakePopStateEvent) => void) | null = null;
  const routerPopStateListener = vi.fn();
  const back = vi.fn();
  const pushedEntries: { href: string; state: unknown }[] = [];

  const port: HistoryTraversalPort = {
    back,
    getCurrentHref: () => currentHref,
    getCurrentState: () => currentState,
    listen: (nextListener) => {
      listener = nextListener;

      return (): void => {
        if (listener === nextListener) listener = null;
      };
    },
    pushEntry: (state, href) => {
      currentHref = href;
      currentState = state;
      pushedEntries.push({ href, state });
    },
  };

  const traverse = (href: string, state: unknown): FakePopStateEvent => {
    currentHref = href;
    currentState = state;
    const event: FakePopStateEvent = {
      propagationStopped: false,
      stopImmediatePropagation() {
        this.propagationStopped = true;
      },
    };

    listener?.(event);
    if (!event.propagationStopped) routerPopStateListener(href);

    return event;
  };

  return {
    back,
    getCurrentHref: () => currentHref,
    hasListener: () => listener !== null,
    port,
    pushedEntries,
    routerPopStateListener,
    traverse,
  };
};

describe('unsaved history traversal guard', () => {
  it.each([
    ['/vie-interne/repertoire', 'Précédent'],
    ['/vie-interne/repertoire/abc?section=notes', 'Suivant'],
  ])(
    'restores the dirty entry before the router handles %s (%s)',
    (requestedHref) => {
      const harness = createHarness();
      const onPendingNavigation = vi.fn();

      createUnsavedHistoryTraversalGuard(harness.port, onPendingNavigation);
      const event = harness.traverse(requestedHref, {
        __NA: true,
        tree: 'destination',
      });

      expect(event.propagationStopped).toBe(true);
      expect(harness.routerPopStateListener).not.toHaveBeenCalled();
      expect(harness.getCurrentHref()).toBe(
        '/vie-interne/repertoire/abc?section=identite#coordonnees',
      );
      expect(harness.pushedEntries).toEqual([
        {
          href: '/vie-interne/repertoire/abc?section=identite#coordonnees',
          state: { __NA: true, tree: 'person' },
        },
      ]);
      expect(onPendingNavigation).toHaveBeenCalledOnce();
      expect(onPendingNavigation).toHaveBeenCalledWith(requestedHref);
    },
  );

  it('keeps the restored form on cancel and can ask again', () => {
    const harness = createHarness();
    const onPendingNavigation = vi.fn();
    const guard = createUnsavedHistoryTraversalGuard(
      harness.port,
      onPendingNavigation,
    );

    harness.traverse('/vie-interne/repertoire', { tree: 'list' });
    guard.cancel();

    expect(harness.back).not.toHaveBeenCalled();
    expect(harness.getCurrentHref()).toContain('/vie-interne/repertoire/abc');

    harness.traverse('/tableau-de-bord', { tree: 'dashboard' });
    expect(onPendingNavigation).toHaveBeenCalledTimes(2);
    expect(harness.pushedEntries).toHaveLength(2);
  });

  it('replays exactly one traversal after confirmation', () => {
    const harness = createHarness();
    const guard = createUnsavedHistoryTraversalGuard(harness.port, vi.fn());

    harness.traverse('/vie-interne/repertoire', { tree: 'list' });

    expect(guard.confirm()).toBe(true);
    expect(harness.back).toHaveBeenCalledOnce();

    const replayedEvent = harness.traverse('/vie-interne/repertoire', {
      tree: 'list',
    });

    expect(replayedEvent.propagationStopped).toBe(false);
    expect(harness.routerPopStateListener).toHaveBeenCalledOnce();
    expect(guard.confirm()).toBe(false);
    expect(harness.back).toHaveBeenCalledOnce();

    harness.traverse('/tableau-de-bord', { tree: 'dashboard' });
    expect(harness.pushedEntries.at(-1)).toEqual({
      href: '/vie-interne/repertoire',
      state: { tree: 'list' },
    });
  });

  it('removes its listener once and never navigates after disposal', () => {
    const harness = createHarness();
    const guard = createUnsavedHistoryTraversalGuard(harness.port, vi.fn());

    expect(harness.hasListener()).toBe(true);
    guard.dispose();
    guard.dispose();
    expect(harness.hasListener()).toBe(false);

    const event = harness.traverse('/vie-interne/repertoire', {
      tree: 'list',
    });

    expect(event.propagationStopped).toBe(false);
    expect(harness.routerPopStateListener).toHaveBeenCalledOnce();
    expect(guard.confirm()).toBe(false);
    expect(harness.back).not.toHaveBeenCalled();
  });
});
