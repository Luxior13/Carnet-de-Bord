import React from 'react';
import { useRouter } from '../../modales-2026-10-11/banc/mocks';
export { actor, target, useUser, usePathname, useSearchParams, useRouter } from '../../modales-2026-10-11/banc/mocks';

export const useFeatureAvailability = () => ({
  featureAvailabilityLoaded: true,
  navigableFeatureIds: new Set(['home', 'account', 'persons', 'users']),
  operationalFeatureIds: new Set(['home', 'account', 'persons', 'users']),
  refreshFeatureAvailability: async () => {},
});
export const AuthenticatedLayout = ({ children }: any) => <>{children}</>;
export function Link({ href, children, onClick, replace, ...props }: any) {
  const router = useRouter();
  return <a {...props} href={href} onClick={(event) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    router.replace(href);
  }}>{children}</a>;
}
