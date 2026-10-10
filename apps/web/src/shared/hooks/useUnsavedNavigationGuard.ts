'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getGuardedNavigationRequest,
  GUARDED_NAVIGATION_REQUEST_EVENT,
  type GuardedNavigationAction,
} from '$utils/guarded-navigation.utils';

import { subscribeToUnsavedHistoryEvents } from './unsaved-history-events';
import {
  createUnsavedHistoryTraversalGuard,
  type UnsavedHistoryTraversalGuard,
} from './unsaved-navigation-history';

type UnsavedNavigationGuard = {
  cancelPendingNavigation: () => void;
  confirmPendingNavigation: () => void;
  pendingNavigationHref: string | null;
  requestNavigation: (href: string, action?: GuardedNavigationAction) => void;
  restoreFocus: (event: Event) => void;
};

const isPlainLeftClick = (event: MouseEvent): boolean =>
  event.button === 0 &&
  !event.metaKey &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.shiftKey;

const getInternalAnchor = (
  target: EventTarget | null,
): HTMLAnchorElement | null => {
  if (!(target instanceof Element)) return null;
  const anchor = target.closest<HTMLAnchorElement>('a[href]');
  if (!anchor || anchor.origin !== window.location.origin) return null;
  if (anchor.hasAttribute('download')) return null;
  const href = anchor.getAttribute('href');
  const anchorTarget = anchor.getAttribute('target');
  if (!href || (anchorTarget && anchorTarget !== '_self')) return null;
  if (
    href.startsWith('#') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  ) {
    return null;
  }

  return anchor;
};

const getCurrentRelativeHref = (): string =>
  `${window.location.pathname}${window.location.search}${window.location.hash}`;

/** Protects dirty forms from unloads, internal links and history traversal. */
export const useUnsavedNavigationGuard = (
  hasUnsavedChanges: boolean,
  onBeforeConfirmedNavigation?: () => void,
): UnsavedNavigationGuard => {
  const router = useRouter();
  const triggerRef = useRef<HTMLElement | null>(null);
  const beforeNavigateRef = useRef(onBeforeConfirmedNavigation);
  beforeNavigateRef.current = onBeforeConfirmedNavigation;
  const [pendingNavigationHref, setPendingNavigationHref] = useState<
    string | null
  >(null);
  const pendingNavigationKindRef = useRef<
    'action' | 'history' | 'router' | null
  >(null);
  const pendingNavigationActionRef = useRef<GuardedNavigationAction | null>(
    null,
  );
  const historyTraversalGuardRef = useRef<UnsavedHistoryTraversalGuard | null>(
    null,
  );

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return (): void => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (hasUnsavedChanges) return;
    historyTraversalGuardRef.current?.cancel();
    pendingNavigationKindRef.current = null;
    pendingNavigationActionRef.current = null;
    setPendingNavigationHref(null);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const historyTraversalGuard = createUnsavedHistoryTraversalGuard(
      {
        back: (): void => window.history.back(),
        getCurrentHref: getCurrentRelativeHref,
        getCurrentState: (): unknown => window.history.state,
        listen: subscribeToUnsavedHistoryEvents,
        pushEntry: (state, href): void => {
          window.history.pushState(state, '', href);
        },
      },
      (href) => {
        triggerRef.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        pendingNavigationKindRef.current = 'history';
        pendingNavigationActionRef.current = null;
        setPendingNavigationHref(href);
      },
    );

    historyTraversalGuardRef.current = historyTraversalGuard;

    return (): void => {
      historyTraversalGuard.dispose();
      if (historyTraversalGuardRef.current === historyTraversalGuard) {
        historyTraversalGuardRef.current = null;
      }
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleDocumentClick = (event: MouseEvent): void => {
      if (event.defaultPrevented || !isPlainLeftClick(event)) return;
      const anchor = getInternalAnchor(event.target);
      if (!anchor) return;
      const nextUrl = new URL(anchor.href);
      if (
        nextUrl.pathname === window.location.pathname &&
        nextUrl.search === window.location.search
      ) {
        return;
      }
      event.preventDefault();
      triggerRef.current = anchor;
      historyTraversalGuardRef.current?.cancel();
      pendingNavigationKindRef.current = 'router';
      pendingNavigationActionRef.current = null;
      setPendingNavigationHref(
        `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`,
      );
    };
    document.addEventListener('click', handleDocumentClick, true);

    return (): void => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleGuardedNavigationRequest = (event: Event): void => {
      if (event.defaultPrevented) return;
      const request = getGuardedNavigationRequest(event);
      if (!request) return;

      let nextUrl: URL;
      try {
        nextUrl = new URL(request.href, window.location.origin);
      } catch {
        return;
      }
      if (nextUrl.origin !== window.location.origin) return;

      const currentHref = getCurrentRelativeHref();
      const nextHref = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      if (nextHref === currentHref) return;

      event.preventDefault();
      triggerRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      historyTraversalGuardRef.current?.cancel();
      pendingNavigationKindRef.current = request.action ? 'action' : 'router';
      pendingNavigationActionRef.current = request.action ?? null;
      setPendingNavigationHref(nextHref);
    };

    window.addEventListener(
      GUARDED_NAVIGATION_REQUEST_EVENT,
      handleGuardedNavigationRequest,
    );

    return (): void => {
      window.removeEventListener(
        GUARDED_NAVIGATION_REQUEST_EVENT,
        handleGuardedNavigationRequest,
      );
    };
  }, [hasUnsavedChanges]);

  const cancelPendingNavigation = useCallback((): void => {
    historyTraversalGuardRef.current?.cancel();
    pendingNavigationKindRef.current = null;
    pendingNavigationActionRef.current = null;
    setPendingNavigationHref(null);
  }, []);
  const confirmPendingNavigation = useCallback((): void => {
    if (!pendingNavigationHref) return;
    const href = pendingNavigationHref;
    const navigationKind = pendingNavigationKindRef.current;
    const navigationAction = pendingNavigationActionRef.current;

    pendingNavigationKindRef.current = null;
    pendingNavigationActionRef.current = null;
    setPendingNavigationHref(null);
    beforeNavigateRef.current?.();
    if (
      navigationKind === 'history' &&
      historyTraversalGuardRef.current?.confirm()
    ) {
      return;
    }
    if (navigationKind === 'action' && navigationAction) {
      void navigationAction();

      return;
    }
    router.push(href);
  }, [pendingNavigationHref, router]);

  const requestNavigation = useCallback(
    (href: string, action?: GuardedNavigationAction): void => {
      if (!hasUnsavedChanges) {
        if (action) void action();
        else router.push(href);

        return;
      }
      triggerRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      historyTraversalGuardRef.current?.cancel();
      pendingNavigationKindRef.current = action ? 'action' : 'router';
      pendingNavigationActionRef.current = action ?? null;
      setPendingNavigationHref(href);
    },
    [hasUnsavedChanges, router],
  );
  const restoreFocus = useCallback((event: Event): void => {
    const trigger = triggerRef.current;
    if (trigger?.isConnected) {
      event.preventDefault();
      trigger.focus({ preventScroll: true });
    }
  }, []);

  return {
    cancelPendingNavigation,
    confirmPendingNavigation,
    pendingNavigationHref,
    requestNavigation,
    restoreFocus,
  };
};
