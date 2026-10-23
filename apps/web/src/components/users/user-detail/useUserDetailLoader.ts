'use client';

import {
  type MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { UserType } from '$types/auth.types';

export type UserDetailLoader = {
  errorMessage: string | null;
  errorStatus: number | null;
  fetchUser: (options?: { background?: boolean }) => Promise<UserType | null>;
  isLoading: boolean;
};

/**
 * Reads the user record: first load, background refreshes, refusals that purge
 * the private snapshot, a 30 s bound, and the lifetime of the page. A refusal
 * calls `onUnavailable` before the body is parsed; a valid read `onLoaded`.
 * Both callbacks must be stable, or every render would read the record again.
 */
export const useUserDetailLoader = ({
  canViewUsers,
  initialUser,
  lifetime,
  mountedRef,
  onLoaded,
  onUnavailable,
  userId,
}: {
  canViewUsers: boolean;
  initialUser?: UserType;
  lifetime: MutableRefObject<AbortController>;
  mountedRef: MutableRefObject<boolean>;
  onLoaded: (user: UserType) => void;
  onUnavailable: () => void;
  userId: string;
}): UserDetailLoader => {
  const [isLoading, setIsLoading] = useState(!initialUser);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const userAbortControllerRef = useRef<AbortController | null>(null);

  const fetchUser = useCallback(
    async (
      options: { background?: boolean } = {},
    ): Promise<UserType | null> => {
      userAbortControllerRef.current?.abort();
      userAbortControllerRef.current = null;

      if (!canViewUsers) {
        setIsLoading(false);

        return null;
      }

      const controller = new AbortController();
      userAbortControllerRef.current = controller;
      const isBackgroundFetch = options.background === true;
      let unavailable = false;
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, 30_000);

      try {
        if (!isBackgroundFetch) {
          setIsLoading(true);
          setErrorMessage(null);
          setErrorStatus(null);
        }

        const response = await fetch(`/api/users/${userId}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (controller.signal.aborted) return null;
        unavailable = [401, 403, 404].includes(response.status);
        if (unavailable) {
          // Refusal bodies may be empty/HTML. Never retain a private snapshot
          // while waiting for a JSON parser that can fail.
          onUnavailable();
          setErrorStatus(response.status);
          setErrorMessage("Impossible de charger l'utilisateur");
        }
        const data = await response.json();

        if (controller.signal.aborted) return null;

        if (response.ok && data.success) {
          const loadedUser = data.data.user as UserType;
          if (loadedUser.id !== userId) throw new Error('Unexpected user');
          if (lifetime.current.signal.aborted)
            lifetime.current = new AbortController();
          setErrorStatus(null);
          setErrorMessage(null);
          onLoaded(loadedUser);

          return loadedUser;
        } else if (
          !isBackgroundFetch ||
          response.status === 401 ||
          response.status === 403 ||
          response.status === 404
        ) {
          setErrorStatus(response.status);
          setErrorMessage(
            data.error?.message || "Impossible de charger l'utilisateur",
          );
        }
      } catch {
        if (
          (controller.signal.aborted && !timedOut) ||
          userAbortControllerRef.current !== controller
        )
          return null;

        if (!isBackgroundFetch && !unavailable) {
          setErrorStatus(0);
          setErrorMessage("Impossible de charger l'utilisateur");
        }
      } finally {
        clearTimeout(timeout);
        if (userAbortControllerRef.current === controller) {
          userAbortControllerRef.current = null;
          setIsLoading(false);
        }
      }

      return null;
    },
    [canViewUsers, lifetime, onLoaded, onUnavailable, userId],
  );

  useEffect((): (() => void) => {
    mountedRef.current = true;
    if (lifetime.current.signal.aborted)
      lifetime.current = new AbortController();

    return (): void => {
      mountedRef.current = false;
      lifetime.current.abort();
      userAbortControllerRef.current?.abort();
      userAbortControllerRef.current = null;
    };
  }, [lifetime, mountedRef]);

  useEffect(() => {
    if (initialUser?.id === userId) return;
    void fetchUser();
  }, [fetchUser, initialUser?.id, userId]);

  return { errorMessage, errorStatus, fetchUser, isLoading };
};
