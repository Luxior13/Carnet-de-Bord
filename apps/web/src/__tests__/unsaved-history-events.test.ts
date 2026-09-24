import { describe, expect, it, vi } from 'vitest';

import { createHistoryEventDispatcher } from '$hooks/unsaved-history-events';

describe('early history interception', () => {
  it('blocks a router registered before the form becomes dirty, then releases it on cleanup', () => {
    const target = new EventTarget();
    const dispatcher = createHistoryEventDispatcher(target);
    const router = vi.fn();
    target.addEventListener('popstate', router);
    target.dispatchEvent(new Event('popstate'));
    expect(router).toHaveBeenCalledTimes(1);

    const guard = vi.fn((event: Event) => event.stopImmediatePropagation());
    const unsubscribe = dispatcher.subscribe(guard);
    target.dispatchEvent(new Event('popstate'));
    expect(guard).toHaveBeenCalledTimes(1);
    expect(router).toHaveBeenCalledTimes(1);

    unsubscribe();
    target.dispatchEvent(new Event('popstate'));
    expect(router).toHaveBeenCalledTimes(2);
  });

  it('allows an explicitly confirmed traversal to reach the router', () => {
    const target = new EventTarget();
    const dispatcher = createHistoryEventDispatcher(target);
    const router = vi.fn();
    target.addEventListener('popstate', router);
    let confirmed = false;
    dispatcher.subscribe((event) => {
      if (!confirmed) event.stopImmediatePropagation();
    });
    target.dispatchEvent(new Event('popstate'));
    expect(router).not.toHaveBeenCalled();
    confirmed = true;
    target.dispatchEvent(new Event('popstate'));
    expect(router).toHaveBeenCalledTimes(1);
  });

  it('returns control to the underlying form after a nested draft closes', () => {
    const target = new EventTarget();
    const dispatcher = createHistoryEventDispatcher(target);
    const form = vi.fn();
    const dialog = vi.fn();
    dispatcher.subscribe(form);
    const close = dispatcher.subscribe(dialog);
    target.dispatchEvent(new Event('popstate'));
    expect(dialog).toHaveBeenCalledTimes(1);
    expect(form).not.toHaveBeenCalled();
    close();
    target.dispatchEvent(new Event('popstate'));
    expect(form).toHaveBeenCalledTimes(1);
  });
});
