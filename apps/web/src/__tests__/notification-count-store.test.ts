import { describe, expect, it, vi } from 'vitest';

import { createNotificationCountStore } from '$features/notifications/notification-count-store';

describe('shared notification counter', () => {
  it('shares a confirmed count without mixing accounts or authorization revisions', () => {
    const store = createNotificationCountStore();
    const first = vi.fn();
    const second = vi.fn();
    store.subscribe('alice:1', first);
    store.subscribe('alice:1', second);
    store.subscribe('bob:1', vi.fn());
    store.subscribe('alice:2', vi.fn());
    store.publish('alice:1', 7, 100);
    expect(store.get('alice:1')).toBe(7);
    expect(store.get('bob:1')).toBeNull();
    expect(store.get('alice:2')).toBeNull();
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it('ignores a late response that predates a successful read action', () => {
    const store = createNotificationCountStore();
    store.subscribe('alice:1', vi.fn());
    store.publish('alice:1', 4, 100);
    store.publish('alice:1', (count) => count - 1, 200);
    store.publish('alice:1', 4, 150);
    expect(store.get('alice:1')).toBe(3);
    store.publish('alice:1', 5, 250);
    expect(store.get('alice:1')).toBe(5);
  });

  it('retains the count while another view is subscribed, then releases it', () => {
    const store = createNotificationCountStore();
    const leaveHeader = store.subscribe('alice:1', vi.fn());
    const leaveInbox = store.subscribe('alice:1', vi.fn());
    store.publish('alice:1', 2, 100);
    leaveInbox();
    expect(store.get('alice:1')).toBe(2);
    leaveHeader();
    expect(store.get('alice:1')).toBeNull();
    store.publish('alice:1', 10, 200);
    expect(store.get('alice:1')).toBeNull();
  });

  it('does not notify subscribers for unchanged or invalid values', () => {
    const store = createNotificationCountStore();
    const listener = vi.fn();
    store.subscribe('alice:1', listener);
    store.publish('alice:1', 0, 100);
    store.publish('alice:1', 0, 200);
    for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY, 1.2]) {
      store.publish('alice:1', value, 300);
    }
    expect(store.get('alice:1')).toBe(0);
    expect(listener).toHaveBeenCalledOnce();
  });
});
