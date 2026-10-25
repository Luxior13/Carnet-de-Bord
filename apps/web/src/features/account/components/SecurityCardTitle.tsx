'use client';

import React, { type FC, type ReactNode } from 'react';

import { ServiceIcon } from '$ui/service-icon';

/** Focuses a security card heading without scrolling the page. */
export const focusSecurityHeading = (id: string): void => {
  const heading = document.getElementById(id);
  if (!heading?.getClientRects().length) return;
  heading.focus({ preventScroll: true });
  heading.scrollIntoView({
    behavior: 'instant',
    block: 'nearest',
    inline: 'nearest',
  });
};

export const SecurityCardTitle: FC<{
  children: ReactNode;
  icon: ReactNode;
  id: string;
}> = ({ children, icon, id }) => (
  <h3
    id={id}
    tabIndex={-1}
    className="text-foreground flex scroll-mt-16 items-center gap-2 text-sm font-semibold"
  >
    <ServiceIcon className="size-7">{icon}</ServiceIcon>
    {children}
  </h3>
);
