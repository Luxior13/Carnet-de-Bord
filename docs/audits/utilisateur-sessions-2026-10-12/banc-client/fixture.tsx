import React from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { PersistentAuthenticatedShell } from "$components/AuthenticatedLayout";
import { UserDetailPage } from "$components/users/UserDetailPage";
import { getUserDetailScope } from "$features/users/user-detail-scope";
import { TooltipProvider } from "$ui/tooltip";
import { useUser } from "./mocks";

function Fixture() {
  const { userData } = useUser();
  const initialRef = React.useRef({
    user: (window as any).__auditOptions.initialUser,
    scope: getUserDetailScope(userData as any),
  });
  return (
    <React.Suspense fallback={<p>Chargement des composants réels…</p>}>
      <UserDetailPage
        userId="audit-target"
        initialUser={initialRef.current.user}
        initialScope={initialRef.current.scope}
      />
    </React.Suspense>
  );
}
createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <PersistentAuthenticatedShell>
      <Fixture />
    </PersistentAuthenticatedShell>
    <Toaster />
  </TooltipProvider>,
);
