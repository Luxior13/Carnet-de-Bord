import React from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { SystemSettingsPage } from "$features/settings/SystemSettingsPage";
import { AdminStepUpDialog } from "$components/users/user-detail/AdminStepUpDialog";
import { Button } from "$ui/button";
import { getNavigationItemByHref, NAV_SPACES } from "$constants/app.constants";
import { TooltipProvider } from "$ui/tooltip";
import { usePathname, Link } from "./mocks";
const StepUpFixture = () => {
  const [open, setOpen] = React.useState(false);
  return (
    <main>
      <Button onClick={() => setOpen(true)}>
        Confirmer une opération fictive
      </Button>
      <AdminStepUpDialog
        actorLoginName="camille.exemple"
        description="Vérification fictive du dialogue partagé"
        title="Preuve fictive"
        proofKind={(window as any).__auditOptions.stepUpKind}
        open={open}
        onCancel={() => setOpen(false)}
        onComplete={() => setOpen(false)}
      />
    </main>
  );
};
const Fixture = () =>
  (window as any).__auditOptions.stepUpKind ? (
    <StepUpFixture />
  ) : usePathname() === "/systeme/parametres" ? (
    <>
      <Link
        className="sr-only focus:not-sr-only"
        href="/destination"
        id="audit-leave"
      >
        Destination simulée
      </Link>
      <SystemSettingsPage
        item={getNavigationItemByHref("/systeme/parametres")!}
        space={NAV_SPACES.find((space) => space.href === "/systeme")!}
      />
    </>
  ) : (
    <main>
      <h1>Destination simulée</h1>
    </main>
  );
const fixture = (
  <TooltipProvider>
    <Fixture />
    <Toaster />
  </TooltipProvider>
);
createRoot(document.getElementById("root")!).render(
  (window as any).__auditOptions.strict ? (
    <React.StrictMode>{fixture}</React.StrictMode>
  ) : (
    fixture
  ),
);
