import React from "react";
import { createRoot } from "react-dom/client";
import NewUserPage from "../../../../apps/web/src/app/systeme/utilisateurs/nouveau/page";
import { TooltipProvider } from "$ui/tooltip";
import { usePathname } from "./mocks";

const Fixture = () =>
  usePathname() === "/systeme/utilisateurs/nouveau" ? (
    <NewUserPage />
  ) : (
    <main>
      <h1>Destination simulée</h1>
    </main>
  );
createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <Fixture />
  </TooltipProvider>,
);
