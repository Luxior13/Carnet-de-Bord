import React, { useSyncExternalStore } from "react";

import {
  BreadcrumbIdentityProvider,
  BreadcrumbIdentitySlot,
} from "$components/layout/BreadcrumbIdentity";

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
  applyUserUpdate: () => {},
});
export const AuthenticatedLayout = ({ children, breadcrumbs }: any) => (
  // Same frame as the real layout since 26 October 2026: a 56 px header and
  // a #main-content area that scrolls inside a full-height shell.
  // The real header gives the current item the record identity slots.
  <BreadcrumbIdentityProvider>
  <div className="audit-shell flex flex-col overflow-hidden">
    <nav
      aria-label="Fil d’Ariane simulé"
      className="flex h-14 min-w-0 shrink-0 items-center gap-3 px-4 text-sm [&>*]:min-w-0 [&>*]:break-words"
    >
      {breadcrumbs?.map((item: any, index: number) =>
        // Like the real trail, the last item is the current page even with a URL.
        item.href && index < breadcrumbs.length - 1 ? (
          <Link
            key={index}
            href={item.href}
            style={{ minWidth: 0, overflowWrap: "anywhere" }}
          >
            {item.label}
          </Link>
        ) : index === breadcrumbs.length - 1 ? (
          <span
            data-slot="audit-breadcrumb-current"
            key={index}
            className="inline-flex min-w-0 items-center"
          >
            <BreadcrumbIdentitySlot kind="icon" />
            <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
              {item.label}
            </span>
            <BreadcrumbIdentitySlot kind="aside" />
          </span>
        ) : (
          <span key={index} style={{ minWidth: 0, overflowWrap: "anywhere" }}>
            {item.label}
          </span>
        ),
      )}
    </nav>
    <main
      className="private-viewport scrollbar-gutter-both-edges min-h-0 flex-1 overflow-y-auto"
      id="main-content"
    >
      {children}
    </main>
  </div>
  </BreadcrumbIdentityProvider>
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
