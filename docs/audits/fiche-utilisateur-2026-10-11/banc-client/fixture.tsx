import React from "react";
import { createRoot } from "react-dom/client";
import { UserDetailPage } from "../../../../apps/web/src/components/users/UserDetailPage";
import { TooltipProvider } from "$ui/tooltip";
import { getUserDetailScope } from "$features/users/user-detail-scope";
import { usePathname, useUser } from "./mocks";

const Fixture = () => {
  const { userData } = useUser();
  const initialRef = React.useRef(
    (window as any).__auditOptions.initialUser
      ? {
          user: (window as any).__auditOptions.initialUser,
          scope: getUserDetailScope(userData as any),
        }
      : null,
  );
  return usePathname() === "/systeme/utilisateurs/audit-target" ? (
    <React.Suspense fallback={<p>Chargement des composants réels…</p>}>
      <UserDetailPage
        userId="audit-target"
        initialUser={initialRef.current?.user}
        initialScope={initialRef.current?.scope}
      />
    </React.Suspense>
  ) : (
    <main>
      <h1>Destination simulée</h1>
    </main>
  );
};
createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <Fixture />
  </TooltipProvider>,
);
