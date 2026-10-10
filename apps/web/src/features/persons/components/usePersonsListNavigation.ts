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
  containerRef: RefObject<HTMLDivElement | null>;
  onClickCapture: MouseEventHandler<HTMLDivElement>;
} => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pending = useRef<PersonsNavigation | null>(null);

  useEffect(() => {
    pending.current = null;
    try {
      const saved = readPersonsNavigation(
        sessionStorage.getItem(PERSONS_NAVIGATION_STORAGE_KEY),
        scope,
        href,
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
  }, [href, restoreCursors, scope]);

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
    if (!ready || !pending.current) return;
    let frame = 0;
    // Restore only after the actual rows replace the loading placeholder and
    // after the router's own navigation scroll handling has completed.
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const saved = pending.current;
        const container = containerRef.current;
        if (!saved || !container) return;
        pending.current = null;
        const scroller = container.closest('main');
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
  }, [href, ready]);

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

  return { containerRef, onClickCapture };
};
