import React from "react";
import { createRoot } from "react-dom/client";
import { PersonsPageClient } from "$features/persons/components/PersonsPageClient";
import { readPersonsListLocation } from "$features/persons/person-list-state";
import { TooltipProvider } from "$ui/tooltip";
import { response } from "./data.cjs";

const options = (window as any).__auditOptions ?? {};
const params = new URLSearchParams(location.search);
const initialState = options.initial
  ? {
      data: response(params, options.mode),
      request: readPersonsListLocation(params).request,
      scope: "audit-directory-user",
    }
  : undefined;
createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <PersonsPageClient initialState={initialState} />
  </TooltipProvider>,
);
