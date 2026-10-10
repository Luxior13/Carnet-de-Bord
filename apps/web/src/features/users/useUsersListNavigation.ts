'use client';

import {
  type MouseEventHandler,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
} from 'react';

import { PAGE_PATHS } from '$constants/routes.constants';

import {
  captureUsersNavigation,
  readUsersNavigation,
  USERS_NAVIGATION_STORAGE_KEY,
  type UsersNavigation,
} from './users-list-navigation';

export const useUsersListNavigation = ({
  href,
  ready,
  scope,
}: {
  href: string;
  ready: boolean;
  scope: string;
}): {
  containerRef: RefObject<HTMLDivElement | null>;
  onClickCapture: MouseEventHandler<HTMLDivElement>;
  preparePageChange: () => void;
  resultsRef: RefObject<HTMLDivElement | null>;
} => {
  const containerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const pending = useRef<UsersNavigation | null>(null);
  const pageChanged = useRef(false);
  const lastFocus = useRef<string | null>(null);
  useEffect(() => {
    pending.current = null;
    try {
      pending.current = readUsersNavigation(
        sessionStorage.getItem(USERS_NAVIGATION_STORAGE_KEY),
        scope,
        href,
      );
    } catch {
      /* Storage is optional. */
    }
  }, [href, scope]);

  const save = useCallback(
    (focusHref: string | null): void => {
      if (!scope || !ready || !containerRef.current) return;
      const scroller = containerRef.current.closest('main');
      try {
        sessionStorage.setItem(
          USERS_NAVIGATION_STORAGE_KEY,
          JSON.stringify(
            captureUsersNavigation(
              scope,
              href,
              scroller ? scroller.scrollTop : window.scrollY,
              focusHref,
            ),
          ),
        );
      } catch {
        /* Storage must not prevent navigation. */
      }
    },
    [scope, ready, href],
  );
  useEffect(() => {
    const saveBeforeReload = (): void => save(lastFocus.current);
    window.addEventListener('pagehide', saveBeforeReload);

    return (): void => window.removeEventListener('pagehide', saveBeforeReload);
  }, [save]);

  useEffect(() => {
    if (!ready || (!pending.current && !pageChanged.current)) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) return;
        const scroller = container.closest('main');
        if (pageChanged.current) {
          pending.current = null;
          pageChanged.current = false;
          const results = resultsRef.current;
          if (!results) return;
          results.focus({ preventScroll: true });
          if (scroller)
            scroller.scrollTop +=
              results.getBoundingClientRect().top -
              scroller.getBoundingClientRect().top;
          else results.scrollIntoView({ behavior: 'instant', block: 'start' });
        } else if (pending.current) {
          const saved = pending.current;
          pending.current = null;
          if (scroller) scroller.scrollTop = saved.scrollTop;
          else window.scrollTo({ behavior: 'instant', top: saved.scrollTop });
          const origin = Array.from(
            container.querySelectorAll<HTMLAnchorElement>('a[href]'),
          ).find(
            (link) =>
              link.getAttribute('href') === saved.focusHref &&
              link.getClientRects().length > 0,
          );
          origin?.focus({ preventScroll: true });
        }
        try {
          sessionStorage.removeItem(USERS_NAVIGATION_STORAGE_KEY);
        } catch {
          /* Optional storage. */
        }
      });
    });

    return (): void => cancelAnimationFrame(frame);
  }, [ready, href]);

  const onClickCapture: MouseEventHandler<HTMLDivElement> = (event) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const anchor =
      event.target instanceof Element ? event.target.closest('a') : null;
    if (
      !anchor ||
      anchor.origin !== window.location.origin ||
      !(
        anchor.pathname.startsWith(PAGE_PATHS.users + '/') ||
        anchor.pathname === '/mon-compte'
      )
    )
      return;
    lastFocus.current = anchor.getAttribute('href');
    save(lastFocus.current);
  };

  return {
    containerRef,
    onClickCapture,
    preparePageChange: (): void => {
      pageChanged.current = true;
    },
    resultsRef,
  };
};
