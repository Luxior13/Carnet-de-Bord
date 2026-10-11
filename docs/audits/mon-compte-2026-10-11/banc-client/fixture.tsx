import React from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { AccountPageContent } from "../../../../apps/web/src/features/account/AccountPageContent";
import { ChangePasswordDialog } from "../../../../apps/web/src/components/ChangePasswordDialog";
import { TooltipProvider } from "$ui/tooltip";
import { AuthenticatedLayout, usePathname } from "./mocks";
const Fixture = () =>
  usePathname() === "/mon-compte" ? (
    <AuthenticatedLayout breadcrumbs={[{ label: "Mon compte" }]}>
      <React.Suspense fallback={<p>Chargement…</p>}>
        <AccountPageContent />
      </React.Suspense>
      {(window as any).__auditOptions.forcedPassword && (
        <ChangePasswordDialog
          open
          onSuccess={() => {
            (window as any).__forcedSuccess = true;
          }}
        />
      )}
    </AuthenticatedLayout>
  ) : (
    <main>
      <h1>Destination simulée</h1>
    </main>
  );
createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <Fixture />
    <Toaster />
  </TooltipProvider>,
);
