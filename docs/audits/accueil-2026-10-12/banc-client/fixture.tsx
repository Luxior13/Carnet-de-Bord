import React from "react";
import { createRoot } from "react-dom/client";
import HomePage from "$app/page";
import { TooltipProvider } from "$ui/tooltip";
import { usePathname, Link } from "./mocks";

const root = createRoot(document.getElementById("root")!);
const Fixture = () =>
  usePathname() === "/" ? (
    <HomePage />
  ) : (
    <main>
      <h1>Destination simulée</h1>
      <Link href="/">Revenir à l’accueil simulé</Link>
    </main>
  );
root.render(
  <TooltipProvider>
    <Fixture />
  </TooltipProvider>,
);
