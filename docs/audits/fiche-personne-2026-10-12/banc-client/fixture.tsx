import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { TooltipProvider } from "$ui/tooltip";
import { PersonDetailPage } from "$features/persons/components/PersonDetailPage";
import { getSafePersonReturnHref } from "$features/persons/person.ui";
import { Link, usePathname, useSearchParams, getAuditActor } from "./mocks";
import { person } from "./data.cjs";
function Fixture() {
  const pathname = usePathname(),
    search = useSearchParams();
  const [initialPerson, setInitialPerson] = useState(() =>
    (window as any).__auditOptions?.ssr === false
      ? undefined
      : { ...person, ...(window as any).__auditOptions?.personPatch },
  );
  (window as any).__auditSetInitial = (patch: object) =>
    setInitialPerson((current) => ({ ...current, ...patch }));
  const [initialScope] = useState(() => getAuditActor().id);
  return (
    <TooltipProvider>
      <React.Suspense fallback={<p>Chargement simulé</p>}>
        {pathname.startsWith("/membres/repertoire/audit-person-") ? (
          <PersonDetailPage
            activeSection={
              search.get("section") === "coordonnees"
                ? "coordonnees"
                : "identite"
            }
            initialPerson={initialPerson}
            initialPersonScope={initialScope}
            personId={pathname.split("/").at(-1)!}
            returnHref={getSafePersonReturnHref(search.get("returnTo"))}
          />
        ) : (
          <main>
            <h1>Destination simulée</h1>
            <Link href="/membres/repertoire/audit-person-a">
              Revenir à la fiche simulée
            </Link>
          </main>
        )}
      </React.Suspense>
      <Toaster />
    </TooltipProvider>
  );
}
createRoot(document.getElementById("root")!).render(
  (window as any).__auditOptions?.strict ? (
    <React.StrictMode>
      <Fixture />
    </React.StrictMode>
  ) : (
    <Fixture />
  ),
);
