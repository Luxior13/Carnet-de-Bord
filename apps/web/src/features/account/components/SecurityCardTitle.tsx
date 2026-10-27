'use client';

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

/** Rubric title of the security cards, shared with the record sections. */
export { RubricTitle as SecurityCardTitle } from '$components/layout/RubricCard';
