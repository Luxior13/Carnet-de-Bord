'use client';

import { type RefObject, useLayoutEffect, useState } from 'react';

// Owner decision of 26 October 2026: on a computer the Autorisations card
// fills the screen and each column scrolls on its own, laptops included (a
// 1 366 × 650 viewport scrolled with a 700 px threshold, owner report).
const MIN_VIEWPORT_WIDTH = 1024;
/** Two columns, like the editor's own container query. */
const MIN_CARD_WIDTH = 44 * 16;
/** Header (about 60 px) and at least about five rows in each column. */
const MIN_WORKSPACE_HEIGHT = 300;

const getScroller = (element: HTMLElement): HTMLElement =>
  element.closest<HTMLElement>('#main-content') ?? document.documentElement;

/**
 * Height that lets `ref` end exactly where the scroll area ends, keeping the
 * content below it (page padding) in view, so the page itself no longer
 * scrolls. `null` when the screen is too small: the caller keeps its normal
 * layout.
 */
export const useWorkspaceHeight = (
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
): number | null => {
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!enabled || !element) {
      setHeight(null);

      return undefined;
    }
    const scroller = getScroller(element);
    const isDocument = scroller === document.documentElement;
    const contentRoots = (): Element[] =>
      Array.from(
        isDocument ? document.body.children : scroller.children,
      ).filter((child) => getComputedStyle(child).position !== 'fixed');

    const measure = (): void => {
      if (
        window.innerWidth < MIN_VIEWPORT_WIDTH ||
        element.clientWidth < MIN_CARD_WIDTH
      ) {
        setHeight(null);

        return;
      }
      const rect = element.getBoundingClientRect();
      const scrollerTop = isDocument ? 0 : scroller.getBoundingClientRect().top;
      const visibleHeight = isDocument
        ? window.innerHeight
        : scroller.clientHeight;
      const scrollTop = isDocument ? window.scrollY : scroller.scrollTop;
      const contentBottom = Math.max(
        rect.bottom,
        ...contentRoots().map((child) => child.getBoundingClientRect().bottom),
      );
      const topInContent = rect.top - scrollerTop + scrollTop;
      const available = Math.floor(
        visibleHeight - topInContent - (contentBottom - rect.bottom),
      );
      setHeight(available >= MIN_WORKSPACE_HEIGHT ? available : null);
    };

    measure();
    // Notices or a wrapping header above the card change the room left.
    const observer = new ResizeObserver(measure);
    for (const root of contentRoots()) observer.observe(root);
    window.addEventListener('resize', measure);

    return (): void => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [enabled, ref]);

  return height;
};
