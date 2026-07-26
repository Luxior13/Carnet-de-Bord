export type GuardedNavigationAction = () => Promise<void> | void;

export type GuardedNavigationRequest = {
  action?: GuardedNavigationAction;
  href: string;
};

export const GUARDED_NAVIGATION_REQUEST_EVENT =
  'team-control:guarded-navigation-request';

export function getGuardedNavigationRequest(
  event: Event,
): GuardedNavigationRequest | null {
  if (
    event.type !== GUARDED_NAVIGATION_REQUEST_EVENT ||
    !(event instanceof CustomEvent)
  ) {
    return null;
  }

  const detail = event.detail as Partial<GuardedNavigationRequest> | null;
  if (!detail || typeof detail.href !== 'string') return null;

  return {
    ...(typeof detail.action === 'function' ? { action: detail.action } : {}),
    href: detail.href,
  };
}

/**
 * Gives mounted dirty-form guards a chance to delay a client-side navigation
 * or navigation-like action. Returns true when the caller may proceed now.
 */
export function requestGuardedNavigation(
  href: string,
  action?: GuardedNavigationAction,
): boolean {
  if (typeof window === 'undefined') return true;

  return window.dispatchEvent(
    new CustomEvent<GuardedNavigationRequest>(
      GUARDED_NAVIGATION_REQUEST_EVENT,
      {
        cancelable: true,
        detail: { ...(action ? { action } : {}), href },
      },
    ),
  );
}
