import React from "react";

const options = (window as any).__auditOptions ?? {};
export const useUser = () => ({
  userData:
    options.sessionLoading || options.sessionError
      ? null
      : {
          id: "audit-user",
          firstName: "Camille",
          lastName: "Exemple",
          role: "ADMIN",
          isProtected: true,
          permissions: {},
          mfaEnabledAt: "2026-10-12T12:00:00.000Z",
          mustChangePassword: false,
        },
  isLoading: Boolean(options.sessionLoading),
  error: options.sessionError ? "Session fictive indisponible" : null,
  applyUserUpdate: () => {},
  refreshUser: async () => {
    (window as any).__auditRefreshCount += 1;
  },
});
export const usePathname = () => (options.public ? "/login" : "/audit-etat");
export const useRouter = () => ({
  push: (href: string) => {
    (window as any).__auditDestination = href;
  },
  refresh: () => {},
});
export const Link = ({ href, children, onClick, ...props }: any) => (
  <a
    {...props}
    href={href}
    onClick={(event) => {
      onClick?.(event);
      if (!event.defaultPrevented) {
        event.preventDefault();
        (window as any).__auditDestination = href;
      }
    }}
  >
    {children}
  </a>
);
export const Header = () => (
  <header className="h-14 shrink-0 border-b" aria-label="En-tête simulé" />
);
export const Sidebar = () => (
  <aside
    className="hidden w-60 shrink-0 lg:block"
    aria-label="Navigation simulée"
  />
);
export const ClosedDialog = () => null;
