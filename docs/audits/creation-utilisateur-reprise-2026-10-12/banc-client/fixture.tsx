import React from "react";
import { createRoot } from "react-dom/client";
import { PersistentAuthenticatedShell } from "$components/AuthenticatedLayout";
import NewUserPage from "../../../../apps/web/src/app/systeme/utilisateurs/nouveau/page";
import { TooltipProvider } from "$ui/tooltip";

createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <PersistentAuthenticatedShell>
      <NewUserPage />
    </PersistentAuthenticatedShell>
  </TooltipProvider>,
);
