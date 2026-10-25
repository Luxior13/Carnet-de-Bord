import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { actor, target } from "./mocks";
import { Button } from "$ui/button";
import { TooltipProvider } from "$ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "$ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "$ui/alert-dialog";
import {
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "$ui/sidebar";
import { AdminStepUpDialog } from "$components/users/user-detail/AdminStepUpDialog";
import { AdminMfaResetDialog } from "$components/users/user-detail/AdminMfaResetDialog";
import { UserDetailPage } from "$components/users/UserDetailPage";
import { ChangePasswordDialog } from "$components/ChangePasswordDialog";
import { UnsavedNavigationDialog } from "$components/layout/UnsavedNavigationDialog";
import { EntityDangerZone } from "$components/layout/EntityDangerZone";
import { QuickNavigation } from "$components/layout/GlobalSearch";
import { ContactEmailDialog } from "$features/account/components/ContactEmailDialog";
import { SecuritySection } from "$features/account/components/SecuritySection";
import { MfaActionDialog } from "$features/auth/components/MfaActionDialog";
import { MfaSetupDialog } from "$features/auth/components/MfaSetupDialog";
import { PersonChildDialog } from "$features/persons/components/PersonChildDialog";
import { PersonCollectionsSection } from "$features/persons/components/PersonCollectionsSection";
import { SystemSettingsPage } from "$features/settings/SystemSettingsPage";
import { NAV_SPACES, getNavigationItemByHref } from "$constants/app.constants";
import { apiFetchJson, ApiClientError } from "$utils/api.utils";
const now = "2026-10-11T00:00:00.000Z";
const base = {
  createdAt: now,
  updatedAt: now,
  version: 1,
  label: "Personnel",
  isPrimary: true,
};
export const initialPerson = {
  id: "person-fixture",
  version: 1,
  createdAt: now,
  updatedAt: now,
  nickname: "Joueur Exemple",
  firstName: "Alex",
  lastName: "Exemple",
  birthDate: null,
  age: null,
  isAdult: null,
  lastChange: null,
  structureStatus: "IN_STRUCTURE",
  emails: [
    { ...base, id: "email-one", email: "premier@example.test" },
    {
      ...base,
      id: "email-two",
      email: "second@example.test",
      isPrimary: false,
    },
  ],
  phones: [
    { ...base, id: "phone-one", phone: "+33612345678", countryCode: "FR" },
  ],
  socialProfiles: [
    {
      ...base,
      id: "social-one",
      networkKey: "discord",
      identifier: "joueur.exemple",
      profileUrl: null,
    },
  ],
} as any;
function Fixture() {
  const scenario =
    new URLSearchParams(location.search).get("fixture") || "child-email";
  const [open, setOpen] = useState(false),
    [nested, setNested] = useState(false),
    [next, setNext] = useState(false);
  const [person, setPerson] = useState(initialPerson);
  const [targetId, setTargetId] = useState("audit-target");
  const [completions, setCompletions] = useState(0);
  const complete = async () => {
    setCompletions((x) => x + 1);
    setOpen(false);
  };
  const reload = async () => {
    const fresh = await apiFetchJson<any>("/fixture/person");
    setPerson(fresh);
    return fresh;
  };
  useEffect(() => {
    const f = () => setPerson({ ...person, version: person.version + 1 });
    const switchTarget = () => setTargetId("audit-replacement");
    window.addEventListener("audit-refresh", f);
    window.addEventListener("audit-target", switchTarget);
    return () => {
      window.removeEventListener("audit-refresh", f);
      window.removeEventListener("audit-target", switchTarget);
    };
  }, [person]);
  const opener = (
    <Button id="opener" onClick={() => setOpen(true)}>
      Ouvrir
    </Button>
  );
  let content: any;
  if (scenario.startsWith("child-")) {
    const kind = scenario.split("-")[1] as any;
    const collection =
      kind === "email"
        ? person.emails
        : kind === "phone"
          ? person.phones
          : person.socialProfiles;
    content = (
      <>
        {opener}
        <PersonChildDialog
          open={open}
          canEdit={!scenario.endsWith("readonly")}
          canViewProvenance={false}
          defaultPrimary={false}
          kind={kind}
          item={scenario.endsWith("new") ? null : collection[0]}
          person={person}
          onOpenChange={setOpen}
          onDelete={() => {}}
          onPersonChange={setPerson}
          onReload={reload}
        />
      </>
    );
  } else if (scenario === "collections")
    content = (
      <PersonCollectionsSection
        canUpdate
        canViewProvenance={false}
        duplicateMatches={[]}
        person={person}
        onChange={setPerson}
        onReload={reload}
      />
    );
  else if (scenario === "danger")
    content = (
      <EntityDangerZone
        description="Fiche fictive"
        dialogDescription="Supprimer définitivement cette fiche et ses coordonnées."
        dialogNotice="Aucune restauration possible."
        version={person.version}
        onDelete={async () => {
          await apiFetchJson("/fixture/delete", { method: "DELETE" });
        }}
        onDeleted={() => setCompletions((x) => x + 1)}
        onReloadVersion={async () => (await reload()).version}
      />
    );
  else if (scenario === "password" || scenario === "password-forced")
    content = (
      <>
        {opener}
        <ChangePasswordDialog
          open={open}
          onCancel={scenario === "password" ? () => setOpen(false) : undefined}
          onSuccess={() => void complete()}
        />
      </>
    );
  else if (scenario === "stepup")
    content = (
      <>
        {opener}
        <AdminStepUpDialog
          actorLoginName={actor.loginName}
          title="Confirmer votre identité"
          description="Autoriser la modification du compte fictif."
          proofKind="full"
          open={open}
          onCancel={() => setOpen(false)}
          onComplete={complete}
        />
      </>
    );
  else if (scenario === "reset-mfa")
    content = (
      <>
        {opener}
        <AdminMfaResetDialog
          actorLoginName={actor.loginName}
          targetUserId={targetId}
          targetLabel="Alex Exemple"
          open={open}
          onCancel={() => setOpen(false)}
          onComplete={complete}
        />
      </>
    );
  else if (scenario === "contact")
    content = (
      <>
        {opener}
        <ContactEmailDialog
          contactEmail="exemple@example.test"
          expectedUpdatedAt={actor.updatedAt}
          loginName={actor.loginName}
          onAccessDenied={async () => {}}
          onDirtyChange={() => {}}
          open={open}
          onCancel={() => setOpen(false)}
          onSuccess={async () => {}}
          restoreFocus={() => {}}
          userId={actor.id}
        />
      </>
    );
  else if (scenario === "codes")
    content = (
      <>
        {opener}
        <MfaActionDialog
          open={open}
          onCancel={() => setOpen(false)}
          onComplete={async () => {
            if ((window as any).auditFailFinish) throw new Error("simulated");
          }}
        />
      </>
    );
  else if (scenario.startsWith("setup"))
    content = (
      <>
        {opener}
        <MfaSetupDialog
          open={open}
          mode={scenario === "setup-replace" ? "replace" : "activate"}
          onCancel={() => setOpen(false)}
          onComplete={complete}
        />
      </>
    );
  else if (scenario === "unsaved")
    content = (
      <>
        {opener}
        <UnsavedNavigationDialog
          open={open}
          description="Vos modifications ne sont pas enregistrées."
          onCancel={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
        />
      </>
    );
  else if (scenario === "nested")
    content = (
      <>
        {opener}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogTitle>Premier dialogue</DialogTitle>
            <DialogDescription>Fenêtre de test.</DialogDescription>
            <input aria-label="Champ" autoFocus />
            <Button id="nested-opener" onClick={() => setNested(true)}>
              Confirmer
            </Button>
            <DialogClose asChild>
              <Button>Fermer</Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
        <AlertDialog open={nested} onOpenChange={setNested}>
          <AlertDialogContent>
            <AlertDialogTitle>Confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              Confirmation de test.
            </AlertDialogDescription>
            <AlertDialogCancel>Rester</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setNested(false);
                setOpen(false);
                setNext(true);
              }}
            >
              Continuer
            </AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
        <AdminStepUpDialog
          actorLoginName={actor.loginName}
          title="Confirmation suivante"
          description="Passage entre modales."
          open={next}
          onCancel={() => setNext(false)}
          onComplete={complete}
        />
      </>
    );
  else if (scenario === "search") content = <QuickNavigation />;
  else if (scenario === "sidebar")
    content = (
      <SidebarProvider>
        <SidebarTrigger />
        <Sidebar>
          <SidebarHeader>Navigation</SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>Accueil</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    );
  else if (scenario === "account-security")
    content = (
      <SecuritySection
        userData={actor as any}
        canViewSecurity
        canChangePassword
        canManageMfa
        canManageSessions
        onUpdate={async () => {}}
      />
    );
  else if (scenario === "user")
    content = <UserDetailPage initialUser={target as any} userId={target.id} />;
  else if (scenario === "settings")
    content = (
      <SystemSettingsPage
        item={getNavigationItemByHref("/systeme/parametres")!}
        space={
          NAV_SPACES.find((s) => s.id === "systeme") ||
          NAV_SPACES[NAV_SPACES.length - 1]!
        }
      />
    );
  return (
    <TooltipProvider>
      <div className="p-4">
        <a href="/destination" id="destination">
          Accueil
        </a>
        <output id="completions">{completions}</output>
        {content}
      </div>
      <Toaster />
    </TooltipProvider>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Fixture />
  </React.StrictMode>,
);
