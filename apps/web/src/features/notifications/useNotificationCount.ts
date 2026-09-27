'use client';

import { useCallback, useSyncExternalStore } from 'react';

import {
  type NotificationCountPublisher,
  notificationCountStore,
} from './notification-count-store';

const getServerSnapshot = (): null => null;

export const useNotificationCount = (
  scope: string,
): readonly [number | null, NotificationCountPublisher] => {
  const subscribe = useCallback(
    (listener: () => void) => notificationCountStore.subscribe(scope, listener),
    [scope],
  );
  const getSnapshot = useCallback(
    () => notificationCountStore.get(scope),
    [scope],
  );
  const count = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const publish = useCallback(
    (value: number | ((current: number) => number), observedAt?: number) =>
      notificationCountStore.publish(scope, value, observedAt),
    [scope],
  );

  return [count, publish] as const;
};
