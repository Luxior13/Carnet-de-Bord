'use client';

import { useRouter } from 'next/navigation';
import {
  type MouseEvent,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';

import { requestGuardedNavigation } from '$utils/guarded-navigation.utils';

export function getSectionScrollContainer(
  element: HTMLElement,
): HTMLElement | null {
  let parent = element.parentElement;
  while (
    parent &&
    parent !== document.body &&
    parent !== document.documentElement
  ) {
    if (
      /^(?:auto|scroll|hidden|overlay)$/.test(
        getComputedStyle(parent).overflowY,
      )
    )
      return parent;
    parent = parent.parentElement;
  }

  return null;
}

type SectionNavigationOptions<SectionId extends string> = {
  activeLinkRef: RefObject<HTMLAnchorElement | null>;
  activeSection: SectionId;
  contentStartRef: RefObject<HTMLSpanElement | null>;
  getSectionHref: (section: SectionId) => string;
  navigationRef: RefObject<HTMLElement | null>;
  onSectionChange?: (section: SectionId, href: string) => void;
  replace: boolean;
};

/** A section change owns its scroll only after the draft guard accepted it. */
export function useSectionNavigation<SectionId extends string>({
  activeLinkRef,
  activeSection,
  contentStartRef,
  getSectionHref,
  navigationRef,
  onSectionChange,
  replace,
}: SectionNavigationOptions<SectionId>): (
  event: MouseEvent<HTMLAnchorElement>,
  section: SectionId,
) => void {
  const router = useRouter();
  const pendingRef = useRef<{
    origin: HTMLAnchorElement;
    section: SectionId;
  } | null>(null);

  useEffect(() => {
    // History and a later user interaction supersede an unfinished transition.
    const cancel = (): void => {
      pendingRef.current = null;
    };
    window.addEventListener('popstate', cancel);
    document.addEventListener('pointerdown', cancel, true);
    document.addEventListener('keydown', cancel, true);
    document.addEventListener('wheel', cancel, { passive: true });

    return (): void => {
      window.removeEventListener('popstate', cancel);
      document.removeEventListener('pointerdown', cancel, true);
      document.removeEventListener('keydown', cancel, true);
      document.removeEventListener('wheel', cancel);
    };
  }, []);

  useLayoutEffect(() => {
    const pending = pendingRef.current;
    if (!pending || pending.section !== activeSection) return;
    const frame = window.requestAnimationFrame(() => {
      if (pendingRef.current !== pending) return;
      pendingRef.current = null;
      const navigation = navigationRef.current;
      const start = contentStartRef.current;
      if (!navigation || !start) return;
      const scrollContainer = getSectionScrollContainer(navigation);
      const top = scrollContainer
        ? scrollContainer.getBoundingClientRect().top +
          scrollContainer.clientTop
        : 0;
      const bottom =
        top + (scrollContainer?.clientHeight ?? window.innerHeight);
      const bar = navigation.getBoundingClientRect();
      const contentTop = start.getBoundingClientRect().top;
      if (contentTop < bar.bottom - 1 || contentTop >= bottom) {
        const gap =
          Number.parseFloat(getComputedStyle(navigation).marginBottom) || 0;
        const stickyTop =
          Number.parseFloat(getComputedStyle(navigation).top) || 0;
        const delta = contentTop - (top + stickyTop + bar.height + gap);
        if (scrollContainer)
          scrollContainer.scrollBy({ behavior: 'instant', top: delta });
        else window.scrollBy({ behavior: 'instant', top: delta });
      }
      const focused = document.activeElement;
      if (
        focused === document.body ||
        focused === pending.origin ||
        navigation.contains(focused)
      ) {
        activeLinkRef.current?.focus({ preventScroll: true });
      }
    });

    return (): void => window.cancelAnimationFrame(frame);
  }, [activeLinkRef, activeSection, contentStartRef, navigationRef]);

  return (event, section): void => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    )
      return;
    event.preventDefault();
    if (section === activeSection) return;
    const href = getSectionHref(section);
    const origin = event.currentTarget;
    origin.focus({ preventScroll: true });
    const navigate = (): void => {
      pendingRef.current = { origin, section };
      if (onSectionChange) onSectionChange(section, href);
      else router[replace ? 'replace' : 'push'](href, { scroll: false });
    };
    if (requestGuardedNavigation(href, navigate)) navigate();
  };
}
