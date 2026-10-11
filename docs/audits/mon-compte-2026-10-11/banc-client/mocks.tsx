import React, { useSyncExternalStore } from "react";

const navigationEvent = "audit-creation-navigation";
const actorEvent = "audit-creation-actor";
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
const go = (href: string, replace = false) =>
  replace
    ? history.replaceState(null, "", href)
    : history.pushState(null, "", href);
const router = {
  push: (href: string) => go(href),
  replace: (href: string) => go(href, true),
  back: () => history.back(),
  refresh: () => {},
};
export const useRouter = () => router;
export const useSearchParams = () =>
  new URL(useSyncExternalStore(subscribe, () => location.href)).searchParams;
export const usePathname = () =>
  new URL(useSyncExternalStore(subscribe, () => location.href)).pathname;
const options = (window as any).__auditOptions ?? {};
let actor = {
  id: "audit-creator",
  firstName: "Camille",
  lastName: "Exemple",
  loginName: "camille.exemple",
  isProtected: !options.limited,
  role: options.limited ? "USER" : "ADMIN",
  isActive: true,
  mustChangePassword: false,
  mfaEnabledAt: "2026-09-01T12:00:00Z",
  updatedAt: "2026-10-11T12:00:00Z",
  createdAt: "2026-01-01T10:00:00Z",
  passwordChangedAt: "2026-09-01T10:00:00Z",
  contactEmail: "contact@example.test",
  failedLoginAttempts: 0,
  securityDetailsVisible: true,
  criticalAccessReady: true,
  permissions: options.noAccess
    ? {}
    : { "users:view": true, "users:create": true },
};
if (options.noAccess) actor.isProtected = false;
actor = { ...actor, ...options.actor };
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
  applyUserUpdate: (user: object) => (window as any).__auditSetActor(user),
  refreshUser: async () => {
    const response = await fetch("/api/auth/me");
    const data = await response.json();
    if (!response.ok || !data.success)
      throw new Error("Lecture simulée refusée");
    (window as any).__auditSetActor(data.data.user);
  },
});
export const AuthenticatedLayout = ({ children, breadcrumbs }: any) => (
  <div className="audit-shell">
    <nav
      aria-label="Fil d’Ariane simulé"
      className="flex min-w-0 gap-3 p-4 text-sm [&>*]:min-w-0 [&>*]:break-words"
    >
      {breadcrumbs?.map((item: any, index: number) =>
        item.href ? (
          <Link
            key={index}
            href={item.href}
            style={{ minWidth: 0, overflowWrap: "anywhere" }}
          >
            {item.label}
          </Link>
        ) : (
          <span key={index} style={{ minWidth: 0, overflowWrap: "anywhere" }}>
            {item.label}
          </span>
        ),
      )}
    </nav>
    <main className="private-viewport">{children}</main>
  </div>
);
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
