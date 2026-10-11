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
  usersNavigationHref,
} from './users-list-navigation';

const getNavigationAnchor = (
  target: Element | null,
  container: HTMLDivElement | null,
): HTMLAnchorElement | null => {
  const anchor = target?.closest<HTMLAnchorElement>('a[href]');
  if (
    !anchor ||
    !container?.contains(anchor) ||
    !anchor.getClientRects().length ||
    anchor.origin !== window.location.origin ||
    !(
      anchor.pathname.startsWith(`${PAGE_PATHS.users}/`) ||
      anchor.pathname === '/mon-compte'
    )
  )
    return null;

  return anchor;
};

export const useUsersListNavigation = ({
  href,
  ready,
  scope,
}: {
  href: string;
  ready: boolean;
  scope: string;
}): {
  cancelPageChange: () => void;
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
  const navigationHref = usersNavigationHref(href);
  const criteriaParams = new URLSearchParams(navigationHref.split('?')[1]);
  criteriaParams.delete('page');
  const criteriaKey = `${scope}:${criteriaParams.toString()}`;
  const previousCriteria = useRef(criteriaKey);

  const cancelPageChange = useCallback((): void => {
    pageChanged.current = false;
    pending.current = null;
  }, []);

  useEffect(() => {
    if (previousCriteria.current === criteriaKey) return;
    previousCriteria.current = criteriaKey;
    cancelPageChange();
    lastFocus.current = null;
  }, [cancelPageChange, criteriaKey]);

  useEffect(() => {
    pending.current = null;
    try {
      pending.current = readUsersNavigation(
        sessionStorage.getItem(USERS_NAVIGATION_STORAGE_KEY),
        scope,
        navigationHref,
      );
    } catch {
      /* Storage is optional. */
    }
  }, [navigationHref, scope]);

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
    const saveBeforeReload = (): void => {
      const container = containerRef.current;
      const focused = getNavigationAnchor(document.activeElement, container);
      const previous = Array.from(
        container?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? [],
      ).find((link) => link.getAttribute('href') === lastFocus.current);
      const anchor =
        focused ?? getNavigationAnchor(previous ?? null, container);
      save(anchor?.getAttribute('href') ?? null);
    };
    window.addEventListener('pagehide', saveBeforeReload);

    return (): void => window.removeEventListener('pagehide', saveBeforeReload);
  }, [save]);

  useEffect(() => {
    if (!ready || (!pending.current && !pageChanged.current)) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) return;
        const saved = pending.current;
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
          if (saved) {
            const stored = readUsersNavigation(
              sessionStorage.getItem(USERS_NAVIGATION_STORAGE_KEY),
              scope,
              navigationHref,
            );
            if (stored?.at === saved.at)
              sessionStorage.removeItem(USERS_NAVIGATION_STORAGE_KEY);
          }
        } catch {
          /* Optional storage. */
        }
      });
    });

    return (): void => cancelAnimationFrame(frame);
  }, [ready, navigationHref, scope]);

  const onClickCapture: MouseEventHandler<HTMLDivElement> = (event) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const anchor = getNavigationAnchor(
      event.target instanceof Element ? event.target : null,
      containerRef.current,
    );
    if (!anchor) return;
    lastFocus.current = anchor.getAttribute('href');
    save(lastFocus.current);
  };

  return {
    cancelPageChange,
    containerRef,
    onClickCapture,
    preparePageChange: (): void => {
      pageChanged.current = true;
    },
    resultsRef,
  };
};
