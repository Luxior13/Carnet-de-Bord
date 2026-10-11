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
  capturePersonsNavigation,
  PERSONS_NAVIGATION_STORAGE_KEY,
  type PersonsNavigation,
  personsNavigationHref,
  readPersonsNavigation,
} from '../person-list-navigation';

type Options = {
  cursors: Map<number, string | undefined>;
  href: string;
  ready: boolean;
  restoreCursors: (cursors: Map<number, string | undefined>) => void;
  scope: string;
};

export const usePersonsListNavigation = ({
  cursors,
  href,
  ready,
  restoreCursors,
  scope,
}: Options): {
  cancelPageChange: () => void;
  containerRef: RefObject<HTMLDivElement | null>;
  onClickCapture: MouseEventHandler<HTMLDivElement>;
  preparePageChange: () => void;
  resultsRef: RefObject<HTMLDivElement | null>;
} => {
  const containerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const pending = useRef<PersonsNavigation | null>(null);
  const pageChanged = useRef(false);
  const navigationHref = personsNavigationHref(href);

  useEffect(() => {
    pending.current = null;
    try {
      const saved = readPersonsNavigation(
        sessionStorage.getItem(PERSONS_NAVIGATION_STORAGE_KEY),
        scope,
        navigationHref,
      );
      if (!saved) return;
      pending.current = saved;
      restoreCursors(
        new Map(
          saved.cursors.map(([index, cursor]) => [index, cursor ?? undefined]),
        ),
      );
    } catch {
      // Storage may be disabled; URL navigation and first-page recovery still work.
    }
  }, [navigationHref, restoreCursors, scope]);

  const save = useCallback(
    (focusHref: string | null): void => {
      if (!scope || !ready || !containerRef.current) return;
      const scroller = containerRef.current.closest('main');
      const state = capturePersonsNavigation(
        scope,
        href,
        cursors,
        scroller ? scroller.scrollTop : window.scrollY,
        focusHref,
      );
      try {
        sessionStorage.setItem(
          PERSONS_NAVIGATION_STORAGE_KEY,
          JSON.stringify(state),
        );
      } catch {
        // Full or unavailable storage must never prevent opening a person.
      }
    },
    [cursors, href, ready, scope],
  );

  useEffect(() => {
    const saveBeforeReload = (): void => save(null);
    window.addEventListener('pagehide', saveBeforeReload);

    return (): void => window.removeEventListener('pagehide', saveBeforeReload);
  }, [save]);

  useEffect(() => {
    if (!ready || (!pending.current && !pageChanged.current)) return;
    let frame = 0;
    // Restore only after the actual rows replace the loading placeholder and
    // after the router's own navigation scroll handling has completed.
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const saved = pending.current;
        const container = containerRef.current;
        if (!container) return;
        pending.current = null;
        if (saved) {
          try {
            const stored = readPersonsNavigation(
              sessionStorage.getItem(PERSONS_NAVIGATION_STORAGE_KEY),
              scope,
              navigationHref,
            );
            if (stored?.at === saved.at)
              sessionStorage.removeItem(PERSONS_NAVIGATION_STORAGE_KEY);
          } catch {
            // Restoring position must also work when storage becomes unavailable.
          }
        }
        const scroller = container.closest('main');
        if (pageChanged.current) {
          pageChanged.current = false;
          const results = resultsRef.current;
          if (!results) return;
          results.focus({ preventScroll: true });
          if (scroller)
            scroller.scrollTop +=
              results.getBoundingClientRect().top -
              scroller.getBoundingClientRect().top;
          else results.scrollIntoView({ behavior: 'instant', block: 'start' });

          return;
        }
        if (!saved) return;
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
      });
    });

    return (): void => cancelAnimationFrame(frame);
  }, [navigationHref, ready, scope]);

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
      !anchor.pathname.startsWith(`${PAGE_PATHS.persons}/`)
    )
      return;
    save(anchor.getAttribute('href'));
  };

  const cancelPageChange = useCallback((): void => {
    pageChanged.current = false;
    pending.current = null;
  }, []);

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
