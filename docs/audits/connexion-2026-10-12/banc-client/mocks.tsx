import React, { useMemo, useSyncExternalStore } from "react";

const eventName = "audit-login-navigation";
const subscribe = (callback: () => void) => {
  window.addEventListener(eventName, callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener(eventName, callback);
    window.removeEventListener("popstate", callback);
  };
};
for (const method of ["pushState", "replaceState"] as const) {
  const original = history[method].bind(history);
  history[method] = (...args) => {
    original(...args);
    window.dispatchEvent(new Event(eventName));
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
export const Image = ({ priority, unoptimized, fill, ...props }: any) => (
  <img {...props} />
);
