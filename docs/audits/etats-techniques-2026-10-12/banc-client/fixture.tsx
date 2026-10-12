import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import ErrorPage from "$app/error";
import NotFoundPage from "$app/not-found";
import Loading from "$app/loading";
import { PersistentAuthenticatedShell } from "$components/AuthenticatedLayout";

const options = (window as any).__auditOptions ?? {};
(window as any).__auditRefreshCount = 0;
(window as any).__auditResetCount = 0;
function Fixture() {
  const [kind, setKind] = useState(options.kind ?? "ready");
  const [generation, setGeneration] = useState(0);
  (window as any).__auditSetKind = setKind;
  const error = Object.assign(
    new Error("SECRET_FICTIF_NE_DOIT_PAS_ETRE_AFFICHE"),
    { digest: options.digest ?? "audit-reference-123" },
  );
  const reset = () => {
    (window as any).__auditResetCount += 1;
    if (options.retryFails) {
      setKind("loading");
      setTimeout(() => {
        setGeneration((v) => v + 1);
        setKind("error");
      }, 30);
    } else setKind("success");
  };
  return (
    <PersistentAuthenticatedShell>
      {kind === "error" ? (
        <ErrorPage key={generation} error={error} reset={reset} />
      ) : kind === "not-found" ? (
        <NotFoundPage />
      ) : kind === "loading" ? (
        <Loading />
      ) : kind === "success" ? (
        <h1 tabIndex={-1}>Page rétablie simulée</h1>
      ) : (
        <div className="p-4">
          <h1>Page fictive</h1>
          <button onClick={() => setKind("error")}>
            Déclencher l’erreur simulée
          </button>
        </div>
      )}
    </PersistentAuthenticatedShell>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
