import React, { useSyncExternalStore } from "react";
for (const method of ["pushState", "replaceState"] as const) {
  const original = history[method].bind(history);
  history[method] = (...args: any[]) => {
    original(...(args as [any, string, string?]));
    window.dispatchEvent(new Event("audit-nav"));
  };
}
export const actor = {
  id: "audit-root",
  loginName: "audit.root",
  firstName: "Camille",
  lastName: "Exemple",
  role: "SUPERADMIN",
  isProtected: true,
  permissions: {},
  isActive: true,
  mustChangePassword: false,
  mfaEnabled: true,
  contactEmail: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-10-11T00:00:00.000Z",
};
export const target = {
  ...actor,
  id: "audit-target",
  loginName: "compte.exemple",
  firstName: "Alex",
  lastName: "Exemple",
  role: "USER",
  isProtected: false,
  isActive: false,
  contactEmail: "exemple@example.test",
};
export const useUser = () => ({
  userData: actor,
  isLoading: false,
  refreshUser: async () => {},
  applyUserUpdate: () => {},
});
export const useFeatureAvailability = () => ({
  featureAvailabilityLoaded: true,
  navigableFeatureIds: new Set([
    "home",
    "account",
    "persons",
    "users",
    "system-settings",
    "roadmap",
  ]),
});
const subscribe = (f: () => void) => {
  window.addEventListener("audit-nav", f);
  return () => window.removeEventListener("audit-nav", f);
};
const snapshot = () => location.href;
export const usePathname = () =>
  new URL(useSyncExternalStore(subscribe, snapshot)).pathname;
export const useSearchParams = () =>
  new URL(useSyncExternalStore(subscribe, snapshot)).searchParams;
const go = (url: string) => {
  history.replaceState(null, "", url);
  window.dispatchEvent(new Event("audit-nav"));
};
export const useRouter = () => ({
  push: go,
  replace: go,
  refresh: () => {},
  back: () => history.back(),
});
export const AuthenticatedLayout = ({ children }: any) => (
  <main>{children}</main>
);
