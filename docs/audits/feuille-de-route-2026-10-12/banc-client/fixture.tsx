import React from "react";
import { createRoot } from "react-dom/client";
import { RoadmapPage } from "$features/roadmap/RoadmapPage";
import {
  ROADMAP_AREAS,
  ROADMAP_ITEMS,
  ROADMAP_PHASES,
} from "$features/roadmap/roadmap.constants";
import { TooltipProvider } from "$ui/tooltip";

// Expose the real catalogue only to compare rendered IDs with filter semantics.
(window as any).__auditCatalogue = {
  items: ROADMAP_ITEMS,
  areas: ROADMAP_AREAS,
  phases: ROADMAP_PHASES,
};
const fixture = (
  <TooltipProvider>
    <RoadmapPage />
  </TooltipProvider>
);
createRoot(document.getElementById("root")!).render(
  (window as any).__auditOptions.strict ? (
    <React.StrictMode>{fixture}</React.StrictMode>
  ) : (
    fixture
  ),
);
