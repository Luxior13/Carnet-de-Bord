import React, { useSyncExternalStore } from "react";
import { FEATURES } from "$constants/feature-registry.constants";
const options = (window as any).__auditOptions ?? {};
const navigationEvent = "audit-navigation",
  actorEvent = "audit-actor";
const subscribe = (callback: () => void) => {
  window.addEventListener(navigationEvent, callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener(navigationEvent, callback);
    window.removeEventListener("popstate", callback);
  };
};
for (const method of ["pushState", "replaceState"] as const) {
  const original = history[method].bind(history);
  history[method] = (...args) => {
    original(...args);
    window.dispatchEvent(new Event(navigationEvent));
  };
}
const go = (href: string, replace = false) => {
  (window as any).__auditNavigations.push(href);
  if (replace) history.replaceState(null, "", href);
  else history.pushState(null, "", href);
};
const router = {
  push: (href: string) => go(href),
  replace: (href: string) => go(href, true),
  back: () => history.back(),
  refresh: () => {},
};
(window as any).__auditNavigations = [];
(window as any).__auditLogoutCount = 0;
let logoutStatus = "idle";
let finishLogout: ((status: string) => void) | null = null;
(window as any).__auditFinishLogout = (status: string) =>
  finishLogout?.(status);
const setLogoutStatus = (status: string) => {
  logoutStatus = status;
  window.dispatchEvent(new Event("audit-logout"));
};
const logout = async () => {
  (window as any).__auditLogoutCount++;
  if (!options.controlLogout) {
    go("/login");
    return;
  }
  setLogoutStatus("pending");
  const result = await new Promise<string>((resolve) => {
    finishLogout = resolve;
  });
  finishLogout = null;
  setLogoutStatus(result);
  if (result === "confirmed" && !options.blockLogoutNavigation) go("/login");
};
export const useRouter = () => router;
export const usePathname = () =>
  new URL(useSyncExternalStore(subscribe, () => location.href)).pathname;
export const useSearchParams = () =>
  new URL(useSyncExternalStore(subscribe, () => location.href)).searchParams;
let actor = {
  id: "audit-actor",
  firstName: "Camille",
  lastName: "Exemple",
  loginName: "camille.audit",
  role: "ADMIN",
  isProtected: true,
  isActive: true,
  mfaEnabledAt: "2026-10-12T12:00:00.000Z",
  mustChangePassword: false,
  permissions: {},
  ...options.actor,
};
(window as any).__auditSetActor = (patch: object) => {
  actor = { ...actor, ...patch };
  window.dispatchEvent(new Event(actorEvent));
};
export const useUser = () => ({
  userData: useSyncExternalStore(
    (callback) => {
      window.addEventListener(actorEvent, callback);
      return () => window.removeEventListener(actorEvent, callback);
    },
    () => actor,
  ),
  isLoading: false,
  error: null,
  authorizationRevision: 0,
  logoutStatus: useSyncExternalStore(
    (callback) => {
      window.addEventListener("audit-logout", callback);
      return () => window.removeEventListener("audit-logout", callback);
    },
    () => logoutStatus,
  ),
  applyUserUpdate: () => {},
  refreshUser: async () => {},
  logout,
});
let availability = {
  featureAvailabilityLoaded: true,
  operationalFeatureIds: new Set(Object.values(FEATURES).map((f) => f.id)),
  navigableFeatureIds: new Set(Object.values(FEATURES).map((f) => f.id)),
};
(window as any).__auditSetFeatures = (ids: string[]) => {
  availability = {
    ...availability,
    navigableFeatureIds: new Set(ids),
    operationalFeatureIds: new Set(ids),
  };
  window.dispatchEvent(new Event("audit-features"));
};
export const useFeatureAvailability = () => ({
  ...useSyncExternalStore(
    (callback) => {
      window.addEventListener("audit-features", callback);
      return () => window.removeEventListener("audit-features", callback);
    },
    () => availability,
  ),
  refreshFeatureAvailability: async () => {},
});
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
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      event.preventDefault();
      go(href, replace);
    }}
  >
    {children}
  </a>
);
export const Image = ({ priority, fill, unoptimized, ...props }: any) => (
  <img {...props} />
);
export const ClosedDialog = () => null;
