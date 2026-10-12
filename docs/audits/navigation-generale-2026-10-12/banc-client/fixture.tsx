import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import AuthenticatedLayout, {
  PersistentAuthenticatedShell,
} from "$components/AuthenticatedLayout";
import { UnsavedNavigationDialog } from "$components/layout/UnsavedNavigationDialog";
import { useUnsavedNavigationGuard } from "$hooks/useUnsavedNavigationGuard";
import { Input } from "$ui/input";
import { TooltipProvider } from "$ui/tooltip";
import { usePathname } from "./mocks";
const options = (window as any).__auditOptions ?? {};
function Page() {
  const pathname = usePathname();
  const [draft, setDraft] = useState("");
  const guard = useUnsavedNavigationGuard(Boolean(draft));
  const title =
    pathname === "/systeme/utilisateurs"
      ? "Utilisateurs"
      : pathname === "/systeme/parametres"
        ? "Paramètres"
        : pathname === "/membres/repertoire"
          ? "Répertoire"
          : pathname === "/mon-compte"
            ? "Mon compte"
            : pathname === "/login"
              ? "Connexion"
              : "Mon travail";
  const breadcrumbs = options.longBreadcrumb
    ? [
        { label: "Système aux responsabilités prolongées" },
        { label: "Utilisateurs", href: "/systeme/utilisateurs" },
        {
          label: "Groupe de travail fictif",
          href: "/systeme/utilisateurs?group=audit",
        },
        {
          label:
            "Nom de compte fictif particulièrement long pour vérifier la lisibilité sans débordement",
        },
      ]
    : [
        { label: pathname.startsWith("/membres") ? "Membres" : "Système" },
        { label: title },
      ];
  return (
    <AuthenticatedLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-4 p-5">
        <h1 tabIndex={-1}>Page simulée : {title}</h1>
        <label htmlFor="audit-draft">Brouillon fictif</label>
        <Input
          id="audit-draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <p>Aucune donnée métier n’est chargée ni enregistrée.</p>
      </div>
      <UnsavedNavigationDialog
        description="Le brouillon fictif n’est pas enregistré."
        open={guard.pendingNavigationHref !== null}
        onCancel={guard.cancelPendingNavigation}
        onConfirm={guard.confirmPendingNavigation}
        onCloseAutoFocus={guard.restoreFocus}
      />
    </AuthenticatedLayout>
  );
}
function Fixture() {
  const pathname = usePathname();
  return (
    <TooltipProvider>
      <PersistentAuthenticatedShell>
        <Page key={pathname} />
      </PersistentAuthenticatedShell>
    </TooltipProvider>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
