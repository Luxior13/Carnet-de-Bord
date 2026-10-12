import React from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import LoginPage from "$app/login/page";
import { UserProvider } from "$context/UserContext";
import { MfaSetupDialog } from "$features/auth/components/MfaSetupDialog";
import { Button } from "$ui/button";
import { TooltipProvider } from "$ui/tooltip";
import { usePathname } from "./mocks";

const DialogFixture = () => {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  return (
    <main className="p-4">
      <Button ref={triggerRef} onClick={() => setOpen(true)}>
        Ouvrir la configuration fictive
      </Button>
      <MfaSetupDialog
        open={open}
        mode="activate"
        allowCancel={!(window as any).__auditOptions.mandatory}
        onCancel={() => setOpen(false)}
        onComplete={() => setOpen(false)}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }}
      />
    </main>
  );
};
const Fixture = () => {
  const pathname = usePathname();
  return (window as any).__auditOptions.dialog ? (
    <DialogFixture />
  ) : pathname === "/login" ? (
    <LoginPage />
  ) : (
    <main>
      <h1>Destination simulée</h1>
    </main>
  );
};
const fixture = (
  <TooltipProvider>
    <UserProvider>
      <Fixture />
    </UserProvider>
    <Toaster />
  </TooltipProvider>
);
const root = createRoot(document.getElementById("root")!);
(window as any).__auditUnmount = () => root.unmount();
root.render(
  (window as any).__auditOptions.strict ? (
    <React.StrictMode>{fixture}</React.StrictMode>
  ) : (
    fixture
  ),
);
