import React, { useSyncExternalStore } from 'react';

const subscribe = (callback: () => void) => {
  window.addEventListener('audit-list-navigation', callback);
  return () => window.removeEventListener('audit-list-navigation', callback);
};
const snapshot = () => location.href;
const go = (href: string) => {
  history.pushState(null, '', href);
  window.dispatchEvent(new Event('audit-list-navigation'));
};
const router = { push: go, replace: go, refresh: () => {}, back: () => history.back() };
export const useRouter = () => router;
export const useSearchParams = () => new URL(useSyncExternalStore(subscribe, snapshot)).searchParams;
export const usePathname = () => new URL(useSyncExternalStore(subscribe, snapshot)).pathname;
export const Link = ({ children, href, prefetch, ...props }: any) => <a href={href} {...props}>{children}</a>;
