import React from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import AuthenticatedLayout, {
  PersistentAuthenticatedShell,
} from "$components/AuthenticatedLayout";
import { AccountPageContent } from "$features/account/AccountPageContent";
import { TooltipProvider } from "$ui/tooltip";

createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <PersistentAuthenticatedShell>
      <AuthenticatedLayout breadcrumbs={[{ label: "Mon compte" }]}>
        <React.Suspense fallback={<p>Chargement…</p>}>
          <AccountPageContent />
        </React.Suspense>
      </AuthenticatedLayout>
    </PersistentAuthenticatedShell>
    <Toaster />
  </TooltipProvider>,
);
