import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import AuthenticatedLayout, {
  PersistentAuthenticatedShell,
} from "$components/AuthenticatedLayout";
import { PageSectionNavigation } from "$components/layout/PageSectionNavigation";
import { PageIdentityHero } from "$components/layout/PageIdentityHero";
import { UnsavedNavigationDialog } from "$components/layout/UnsavedNavigationDialog";
import { useUnsavedNavigationGuard } from "$hooks/useUnsavedNavigationGuard";
import { Input } from "$ui/input";
import { PageShell, PageCanvas } from "$ui/page-shell";
import { TooltipProvider } from "$ui/tooltip";
import { usePathname, useSearchParams } from "./mocks";

const options = (window as any).__auditOptions ?? {};
const sections = [
  { id: "identite", label: "Identité" },
  { id: "coordonnees", label: "Coordonnées" },
  ...Array.from({ length: options.manySections ? 6 : 0 }, (_, index) => ({
    id: "test-" + index,
    label: "Section fictive " + (index + 1),
  })),
];
function Page() {
  const pathname = usePathname(),
    params = useSearchParams();
  const requested = params.get("section");
  const active = sections.some((s) => s.id === requested)
    ? requested!
    : "identite";
  const [draft, setDraft] = useState("");
  const guard = useUnsavedNavigationGuard(Boolean(draft), () => setDraft(""));
  const sectionHref = (section: string) => pathname + "?section=" + section;
  (window as any).__auditNavigateSection = (
    section: string,
    replace = true,
  ) => {
    if (replace) history.replaceState(null, "", sectionHref(section));
    else history.pushState(null, "", sectionHref(section));
  };
  return (
    <AuthenticatedLayout
      breadcrumbs={[{ label: "Membres" }, { label: "Fiche fictive" }]}
    >
      <PageShell>
        <PageCanvas contentClassName="relative space-y-4">
          <PageIdentityHero
            title="Fiche fictive du banc de sections"
            description="Contenu long fabriqué pour mesurer le défilement ; aucune donnée métier."
          />
          <PageSectionNavigation
            activeSection={active}
            ariaLabel="Sections de la fiche fictive"
            dirtySections={draft ? ["identite"] : []}
            getSectionHref={sectionHref}
            replace
            sections={sections}
            onSectionChange={
              options.nativeLink
                ? undefined
                : (section) => {
                    if (section === active) return;
                    history.replaceState(null, "", sectionHref(section));
                  }
            }
          />
          <section aria-label={"Contenu " + active} data-audit-content={active}>
            <h2 id="audit-content-title" className="text-xl font-semibold">
              Début de la section {active}
            </h2>
            <label htmlFor="audit-draft">Brouillon fictif</label>
            <Input
              id="audit-draft"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            {Array.from(
              {
                length:
                  options.shortTarget && active === "coordonnees" ? 1 : 35,
              },
              (_, i) => (
                <p className="py-6" key={i}>
                  Ligne fictive {i + 1} de {active} — longueur volontaire pour
                  les mesures.
                </p>
              ),
            )}
          </section>
        </PageCanvas>
      </PageShell>
      <UnsavedNavigationDialog
        open={guard.pendingNavigationHref !== null}
        description="La saisie fictive sera perdue."
        onCancel={guard.cancelPendingNavigation}
        onConfirm={guard.confirmPendingNavigation}
        onCloseAutoFocus={guard.restoreFocus}
      />
    </AuthenticatedLayout>
  );
}
function Fixture() {
  return (
    <TooltipProvider>
      <PersistentAuthenticatedShell>
        <Page />
      </PersistentAuthenticatedShell>
    </TooltipProvider>
  );
}
createRoot(document.getElementById("root")!).render(
  options.strict ? (
    <React.StrictMode>
      <Fixture />
    </React.StrictMode>
  ) : (
    <Fixture />
  ),
);
