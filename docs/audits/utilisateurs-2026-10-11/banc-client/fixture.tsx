import React from "react";
import { createRoot } from "react-dom/client";
import UsersAdministrationPage from "../../../../apps/web/src/app/systeme/utilisateurs/page";
import { TooltipProvider } from "$ui/tooltip";

createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <UsersAdministrationPage />
  </TooltipProvider>,
);
