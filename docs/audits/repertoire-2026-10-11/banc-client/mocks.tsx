import React, { useSyncExternalStore } from "react";

const subscribe = (callback: () => void) => {
  window.addEventListener("audit-directory-navigation", callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener("audit-directory-navigation", callback);
    window.removeEventListener("popstate", callback);
  };
};
const snapshot = () => location.href;
const go = (href: string, replace = false) => {
  if ((window as any).__auditHoldNavigation) {
    (window as any).__auditPendingNavigation = { href, replace };
    return;
  }
  if (replace) history.replaceState(null, "", href);
  else history.pushState(null, "", href);
  window.dispatchEvent(new Event("audit-directory-navigation"));
};
(window as any).__auditReleaseNavigation = () => {
  const pending = (window as any).__auditPendingNavigation;
  (window as any).__auditHoldNavigation = false;
  delete (window as any).__auditPendingNavigation;
  if (pending) go(pending.href, pending.replace);
};
const router = {
  push: (href: string) => go(href),
  replace: (href: string) => go(href, true),
  back: () => history.back(),
  refresh: () => {},
};
export const useRouter = () => router;
export const useSearchParams = () =>
  new URL(useSyncExternalStore(subscribe, snapshot)).searchParams;
export const usePathname = () =>
  new URL(useSyncExternalStore(subscribe, snapshot)).pathname;
const actor = {
  id: "audit-directory-user",
  firstName: "Camille",
  lastName: "Exemple",
  loginName: "audit.exemple",
  isProtected: true,
  role: "ADMIN",
  permissions: {},
  isActive: true,
};
export const useUser = () => ({
  userData: (window as any).__auditOptions?.noAccess
    ? { ...actor, isProtected: false, role: "USER", permissions: {} }
    : (window as any).__auditOptions?.readOnly
      ? {
          ...actor,
          isProtected: false,
          role: "USER",
          permissions: { "persons:view": true },
        }
      : actor,
  isLoading: false,
  authorizationRevision: 0,
});
export const useFeatureAvailability = () => ({
  featureAvailabilityLoaded: !(window as any).__auditOptions?.featureLoading,
  operationalFeatureIds: new Set(
    (window as any).__auditOptions?.featureUnavailable ? [] : ["persons"],
  ),
  refreshFeatureAvailability: async () => {},
});
export const AuthenticatedLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => <div className="private-viewport audit-shell">{children}</div>;
export const Link = ({
  children,
  href,
  replace,
  scroll,
  prefetch,
  onClick,
  ...props
}: any) => (
  <a
    {...props}
    href={href}
    onClick={(event) => {
      onClick?.(event);
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.metaKey
      )
        return;
      event.preventDefault();
      go(href, replace);
    }}
  >
    {children}
  </a>
);
