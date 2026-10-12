import React, { useMemo, useSyncExternalStore } from "react";

// Only Next's location subscription and authenticated shell are simulated.
// The product's usePageQuery and the browser's native history remain real.
const navigationEvent = "audit-roadmap-navigation";
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
export const useSearchParams = () => {
  const href = useSyncExternalStore(subscribe, () => location.href);
  return useMemo(() => new URL(href).searchParams, [href]);
};
export const usePathname = () =>
  new URL(useSyncExternalStore(subscribe, () => location.href)).pathname;
const router = {
  push: (href: string) => history.pushState(null, "", href),
  replace: (href: string) => history.replaceState(null, "", href),
  back: () => history.back(),
  refresh: () => {},
};
export const useRouter = () => router;
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
