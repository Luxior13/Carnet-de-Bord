'use client';

import { createContext, useContext, useRef } from 'react';

export const ModalFocusContext = createContext<{
  current: HTMLElement | null;
} | null>(null);

// Capture ordinary buttons before the dialog mounts and autofocuses its fields.
export const useModalOpener = (
  open?: boolean,
): {
  capture: () => void;
  opener: { current: HTMLElement | null };
} => {
  const opener = useRef<HTMLElement | null>(null);
  const previousOpen = useRef(false);
  const capture = (): void => {
    opener.current =
      typeof document !== 'undefined' &&
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  };
  if (open && !previousOpen.current) capture();
  previousOpen.current = !!open;

  return { capture, opener };
};

export const useModalCloseFocus = (
  onCloseAutoFocus?: (event: Event) => void,
) => {
  const opener = useContext(ModalFocusContext);

  return (event: Event): void => {
    onCloseAutoFocus?.(event);
    if (event.defaultPrevented) return;
    const target = opener?.current;
    if (!target?.isConnected || !target.getClientRects().length) return;
    // A confirmation can hand over to another dialog instead of returning to the page.
    const activeDialog = document.activeElement?.closest(
      '[role="dialog"], [role="alertdialog"]',
    );
    if (
      activeDialog &&
      activeDialog !== event.target &&
      activeDialog.getAttribute('data-state') === 'open' &&
      !activeDialog.contains(target)
    ) {
      event.preventDefault();

      return;
    }
    if (target.matches(':disabled, [inert], [aria-hidden="true"]')) return;
    event.preventDefault();
    target.focus({ preventScroll: true });
  };
};
