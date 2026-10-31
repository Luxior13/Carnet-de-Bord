import React, { useSyncExternalStore } from "react";

// Session, router and shell of the activity journal bench (30 October 2026).
const actorEvent = "audit-journal-actor";
const navigationEvent = "audit-journal-navigation";
let actor = {
  id: "admin-1",
  firstName: "Camille",
  lastName: "Exemple",
  loginName: "camille.exemple",
  role: "ADMIN",
  isProtected: false,
  isActive: true,
  mustChangePassword: false,
  permissions: {},
  ...((window as any).__auditActor ?? {}),
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
  authorizationRevision: 0,
});
for (const method of ["pushState", "replaceState"] as const) {
  const original = history[method].bind(history);
  history[method] = (...args) => {
    original(...args);
    window.dispatchEvent(new Event(navigationEvent));
  };
}
const subscribe = (callback: () => void) => {
  window.addEventListener(navigationEvent, callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener(navigationEvent, callback);
    window.removeEventListener("popstate", callback);
  };
};
export const usePathname = () =>
  useSyncExternalStore(subscribe, () => location.pathname);
let lastSearch = "";
let lastParams = new URLSearchParams();
export const useSearchParams = () =>
  useSyncExternalStore(subscribe, () => {
    if (location.search !== lastSearch) {
      lastSearch = location.search;
      lastParams = new URLSearchParams(location.search);
    }
    return lastParams;
  });
export const Link = ({ children, href, onClick, ...props }: any) => (
  <a
    {...props}
    href={href}
    onClick={(event) => {
      onClick?.(event);
      if (event.defaultPrevented || event.button !== 0) return;
      event.preventDefault();
      history.pushState(null, "", href);
    }}
  >
    {children}
  </a>
);
export const AuthenticatedLayout = ({ children, breadcrumbs }: any) => (
  <div className="audit-shell">
    <nav aria-label="Fil d’Ariane simulé" className="flex gap-3 p-4 text-sm">
      {breadcrumbs?.map((item: any, index: number) => (
        <span key={index}>{item.label}</span>
      ))}
    </nav>
    <main className="private-viewport">{children}</main>
  </div>
);
