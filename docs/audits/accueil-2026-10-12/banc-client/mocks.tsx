import React, { useSyncExternalStore } from "react";

const actorEvent = "audit-home-actor";
const navigationEvent = "audit-home-navigation";
let actor = {
  id: "audit-home-user",
  firstName: "Camille",
  lastName: "Exemple",
  loginName: "camille.exemple",
  role: "USER",
  isProtected: false,
  isActive: true,
  mustChangePassword: false,
  permissions: {},
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
export const usePathname = () =>
  useSyncExternalStore(
    (callback) => {
      window.addEventListener(navigationEvent, callback);
      window.addEventListener("popstate", callback);
      return () => {
        window.removeEventListener(navigationEvent, callback);
        window.removeEventListener("popstate", callback);
      };
    },
    () => location.pathname,
  );
export const Link = ({ children, href, onClick, ...props }: any) => (
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
