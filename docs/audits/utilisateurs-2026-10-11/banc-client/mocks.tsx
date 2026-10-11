import React, { useSyncExternalStore } from "react";

const eventName = "audit-users-navigation";
const subscribe = (callback: () => void) => {
  window.addEventListener(eventName, callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener(eventName, callback);
    window.removeEventListener("popstate", callback);
  };
};
const snapshot = () => location.href;
for (const method of ["pushState", "replaceState"] as const) {
  const native = history[method].bind(history);
  history[method] = (...args) => {
    native(...args);
    window.dispatchEvent(new Event(eventName));
  };
}
const go = (href: string, replace = false) =>
  replace
    ? history.replaceState(null, "", href)
    : history.pushState(null, "", href);
export const useRouter = () => ({
  push: (href: string) => go(href),
  replace: (href: string) => go(href, true),
  back: () => history.back(),
  refresh: () => {},
});
export const useSearchParams = () =>
  new URL(useSyncExternalStore(subscribe, snapshot)).searchParams;
export const usePathname = () =>
  new URL(useSyncExternalStore(subscribe, snapshot)).pathname;
const options = (window as any).__auditOptions ?? {};
const actor = {
  id: "audit-users-viewer",
  firstName: "Camille",
  lastName: "Exemple",
  loginName: "camille.exemple",
  isProtected: false,
  role: "USER",
  isActive: true,
  permissions: options.noAccess
    ? {}
    : {
        "users:view": true,
        ...(!options.readOnly ? { "users:create": true } : {}),
        ...(options.columns !== "base" && options.columns !== "security"
          ? { "users:view_contact": true }
          : {}),
        ...(options.columns !== "base" && options.columns !== "contact"
          ? { "users:view_security": true }
          : {}),
      },
};
export const useUser = () => ({
  userData: actor,
  isLoading: false,
  authorizationRevision: 0,
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
