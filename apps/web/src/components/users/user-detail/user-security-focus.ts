/** Reveal the target under the section bar without moving unrelated controls. */
export const focusUserSecurityElement = (target: HTMLElement | null): void => {
  if (!target?.getClientRects().length) return;
  target.focus({ preventScroll: true });
  target.scrollIntoView({
    behavior: 'instant',
    block: 'nearest',
    inline: 'nearest',
  });
};
