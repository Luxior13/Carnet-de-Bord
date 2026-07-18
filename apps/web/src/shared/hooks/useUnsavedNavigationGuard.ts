'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type UnsavedNavigationGuard = {
  cancelPendingNavigation: () => void;
  confirmPendingNavigation: () => void;
  pendingNavigationHref: string | null;
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

/** Protects dirty client-side forms from tab closure and internal links. */
export const useUnsavedNavigationGuard = (
  hasUnsavedChanges: boolean,
): UnsavedNavigationGuard => {
  const router = useRouter();
  const [pendingNavigationHref, setPendingNavigationHref] = useState<
    string | null
  >(null);

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
    if (!hasUnsavedChanges) return;
    const handleDocumentClick = (event: MouseEvent): void => {
      if (event.defaultPrevented || !isPlainLeftClick(event)) return;
      const anchor = getInternalAnchor(event.target);
      if (!anchor) return;
      const nextUrl = new URL(anchor.href);
      if (nextUrl.pathname === window.location.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingNavigationHref(
        `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`,
      );
    };
    document.addEventListener('click', handleDocumentClick, true);

    return (): void => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [hasUnsavedChanges]);

  const cancelPendingNavigation = useCallback((): void => {
    setPendingNavigationHref(null);
  }, []);
  const confirmPendingNavigation = useCallback((): void => {
    if (!pendingNavigationHref) return;
    const href = pendingNavigationHref;
    setPendingNavigationHref(null);
    router.push(href);
  }, [pendingNavigationHref, router]);

  return {
    cancelPendingNavigation,
    confirmPendingNavigation,
    pendingNavigationHref,
  };
};
