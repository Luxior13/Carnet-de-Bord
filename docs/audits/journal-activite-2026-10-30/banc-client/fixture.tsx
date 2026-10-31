import React from "react";
import { createRoot } from "react-dom/client";
import JournalPage from "$app/systeme/journal-activite/page";
import { TooltipProvider } from "$ui/tooltip";

createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <JournalPage />
  </TooltipProvider>,
);
