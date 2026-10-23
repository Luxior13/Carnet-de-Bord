import React from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import NewPersonPage from "$app/membres/repertoire/nouveau/page";
import { TooltipProvider } from "$ui/tooltip";
import { Link, usePathname } from "./mocks";

function Fixture() {
  return (
    <TooltipProvider>
      {usePathname() === "/membres/repertoire/nouveau" ? (
        <NewPersonPage />
      ) : (
        <main>
          <h1>Destination simulée</h1>
          <Link href="/membres/repertoire/nouveau">
            Revenir au formulaire simulé
          </Link>
        </main>
      )}
      <Toaster />
    </TooltipProvider>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
