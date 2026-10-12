'use client';

import * as React from 'react';

import { MOBILE_MEDIA_QUERY } from './sidebar-context';

export function useSidebarResponsiveFocus(
  sidebarId: string,
  enabled: boolean,
): void {
  React.useEffect(() => {
    if (!enabled) return;
    const media = window.matchMedia(MOBILE_MEDIA_QUERY);
    let frame = 0;
    let lastFocus: {
      element: HTMLElement;
      href: string | null | undefined;
      label: string | null;
    } | null = null;
    const rememberFocus = (): void => {
      const sidebar = document.getElementById(sidebarId);
      const focused = document.activeElement;
      // A breakpoint can hide the focused node before matchMedia fires.
      // Keep its destination until an actual focus/pointer move leaves it.
      if (!(focused instanceof HTMLElement) || focused === document.body)
        return;
      const menu = focused.closest('[role="menu"]');
      const menuTrigger = menu?.id
        ? Array.from(
            sidebar?.querySelectorAll<HTMLElement>('[aria-controls]') ?? [],
          ).find((element) => element.getAttribute('aria-controls') === menu.id)
        : null;
      lastFocus =
        sidebar?.contains(focused) || menuTrigger
          ? {
              element: focused,
              href: focused.closest('a')?.getAttribute('href'),
              label: (menuTrigger ?? focused).getAttribute('aria-label'),
            }
          : null;
    };
    const clearRememberedFocus = (event: PointerEvent): void => {
      if (
        event.target instanceof Node &&
        lastFocus?.element.contains(event.target)
      )
        return;
      lastFocus = null;
    };
    const preserveNavigationFocus = (): void => {
      rememberFocus();
      if (!lastFocus) return;
      const { element: focused, href, label } = lastFocus;
      window.cancelAnimationFrame(frame);
      // Wait for both the responsive render and the closing Sheet focus scope.
      frame = window.requestAnimationFrame(() => {
        frame = window.requestAnimationFrame(() => {
          const current = document.activeElement;
          if (
            current instanceof HTMLElement &&
            current !== document.body &&
            current !== focused &&
            current.isConnected &&
            current.getClientRects().length > 0
          )
            return;
          const visible = (element: HTMLElement): boolean =>
            element.getClientRects().length > 0;
          const nextSidebar = document.getElementById(sidebarId);
          const destination = Array.from(
            nextSidebar?.querySelectorAll<HTMLElement>(
              'a[href],button[aria-label]',
            ) ?? [],
          ).find(
            (element) =>
              visible(element) &&
              (href
                ? element.getAttribute('href') === href
                : label && element.getAttribute('aria-label') === label),
          );
          const trigger = document.querySelector<HTMLElement>(
            '[data-sidebar="trigger"]',
          );
          const fallback =
            trigger && visible(trigger)
              ? trigger
              : nextSidebar?.querySelector<HTMLElement>(
                  'a[aria-current],a[href]',
                );
          (destination ?? fallback)?.focus({ preventScroll: true });
        });
      });
    };
    document.addEventListener('focusin', rememberFocus);
    document.addEventListener('pointerdown', clearRememberedFocus, true);
    media.addEventListener('change', preserveNavigationFocus);

    return (): void => {
      media.removeEventListener('change', preserveNavigationFocus);
      document.removeEventListener('focusin', rememberFocus);
      document.removeEventListener('pointerdown', clearRememberedFocus, true);
      window.cancelAnimationFrame(frame);
    };
  }, [enabled, sidebarId]);
}
