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

/** Bring the keyboard back to the sessions after a revocation dialog closes. */
export const focusSecuritySessionsHeading = (): void => {
  focusUserSecurityElement(
    document.getElementById('user-security-sessions-heading'),
  );
};
