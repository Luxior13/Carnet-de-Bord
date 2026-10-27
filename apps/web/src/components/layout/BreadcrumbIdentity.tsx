'use client';

import React, {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

type SlotKind = 'aside' | 'icon';

type BreadcrumbIdentityContextValue = {
  register: Record<SlotKind, (element: HTMLElement | null) => void>;
  slots: Record<SlotKind, HTMLElement | null>;
};

const BreadcrumbIdentityContext =
  createContext<BreadcrumbIdentityContextValue | null>(null);

/** Shares the slots of the current breadcrumb item with the page below. */
export const BreadcrumbIdentityProvider = ({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element => {
  const [icon, setIcon] = useState<HTMLElement | null>(null);
  const [aside, setAside] = useState<HTMLElement | null>(null);
  const value = useMemo<BreadcrumbIdentityContextValue>(
    () => ({
      register: { aside: setAside, icon: setIcon },
      slots: { aside, icon },
    }),
    [aside, icon],
  );

  return (
    <BreadcrumbIdentityContext.Provider value={value}>
      {children}
    </BreadcrumbIdentityContext.Provider>
  );
};

/** Place of the avatar (before the name) or the short state (after it). */
export const BreadcrumbIdentitySlot = ({
  kind,
}: {
  kind: SlotKind;
}): React.JSX.Element | null => {
  const context = useContext(BreadcrumbIdentityContext);
  if (!context) return null;

  return (
    <span
      className={
        kind === 'icon'
          ? 'inline-flex shrink-0 empty:hidden'
          : 'hidden shrink-0 empty:hidden sm:inline-flex'
      }
      data-slot={`breadcrumb-identity-${kind}`}
      ref={kind === 'icon' ? context.register.icon : context.register.aside}
    />
  );
};

/**
 * Identity of the record in the current breadcrumb item (owner decision of
 * 27 October 2026), always shown while the record is open. The breadcrumb
 * already names the record; the avatar and the short state only repeat the
 * header, so they stay out of the accessibility tree.
 */
export const BreadcrumbIdentity = ({
  aside,
  icon,
}: {
  aside?: ReactNode;
  icon?: ReactNode;
}): React.JSX.Element | null => {
  const context = useContext(BreadcrumbIdentityContext);
  if (!context) return null;

  return (
    <>
      {icon &&
        context.slots.icon &&
        createPortal(
          <span
            aria-hidden="true"
            className="rounded-compact mr-1.5 inline-flex size-6 shrink-0 overflow-hidden sm:size-7"
          >
            {icon}
          </span>,
          context.slots.icon,
        )}
      {aside &&
        context.slots.aside &&
        createPortal(
          <span aria-hidden="true" className="ml-2 inline-flex shrink-0">
            {aside}
          </span>,
          context.slots.aside,
        )}
    </>
  );
};
