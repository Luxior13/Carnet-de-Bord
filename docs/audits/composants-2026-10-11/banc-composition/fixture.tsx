import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Inbox } from 'lucide-react';

import { ContentState } from '$components/layout/ContentState';
import { Disclosure } from '$components/layout/Disclosure';
import { EntityDangerZone } from '$components/layout/EntityDangerZone';
import { PageIdentityHero } from '$components/layout/PageIdentityHero';
import { PageHero } from '$components/layout/PageHero';
import { PageDetailSkeleton } from '$components/layout/PageDetailSkeleton';
import { SectionPanel } from '$components/layout/SectionPanel';
import { PersonIdentitySection } from '$features/persons/components/PersonIdentitySection';
import { PersonDetailPage } from '$features/persons/components/PersonDetailPage';
import { getPerson } from '$features/persons/person.api';
import type { PersonDetail } from '$features/persons/types/person.types';
import { Button } from '$ui/button';
import { Card } from '$ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '$ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogTrigger } from '$ui/alert-dialog';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '$ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '$ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '$ui/dropdown-menu';
import { ApiClientError } from '$utils/api.utils';

const longName = 'Alexandre' + 'x'.repeat(72);
const longDescription = 'https://exemple.invalid/' + 'description'.repeat(20);
const auditPerson: PersonDetail = { id: 'person-one', version: 1, nickname: 'Pseudo initial', firstName: 'Camille', lastName: 'Exemple', birthDate: null, age: null, isAdult: null, lastChange: null, structureStatus: 'IN_STRUCTURE', createdAt: '2026-10-11T00:00:00.000Z', updatedAt: '2026-10-11T00:00:00.000Z', emails: [], phones: [], socialProfiles: [] };

function Identity() {
  const [person, setPerson] = useState(auditPerson);
  const [canUpdate, setCanUpdate] = useState(true);
  const [shown, setShown] = useState(true);
  const state = window as unknown as { replaceIdentity: (patch: Partial<PersonDetail>) => void; unmountIdentity: () => void; revokeIdentity: () => void; identityUpdates: number };
  state.identityUpdates ??= 0;
  state.replaceIdentity = patch => setPerson(current => ({...current, ...patch}));
  state.unmountIdentity = () => setShown(false);
  state.revokeIdentity = () => setCanUpdate(false);
  const switchPerson = () => setPerson({...auditPerson, id: 'person-two', nickname: 'Autre fiche'});
  return <>
    <Button onClick={switchPerson}>Changer de fiche</Button>
    {location.pathname === '/person-page' ? <PersonDetailPage activeSection="identite" initialPerson={person} personId={person.id} returnHref="/membres/repertoire" /> : shown && <>
      <Card><PersonIdentitySection key={person.id} canUpdate={canUpdate} canViewProvenance={false} person={person} onChange={fresh => {state.identityUpdates += 1; setPerson(fresh);}} onReload={async () => {const fresh = await getPerson(person.id); setPerson(fresh); return fresh;}} /></Card>
      <div className="contents" id="person-record-action-bar" />
    </>}
  </>;
}

function Layout() {
  const isState = location.pathname === '/states';
  if (isState) return <>
    <ContentState title={longName} description={longDescription} kind="error" />
    <ContentState title={longName} description={longDescription} layout="panel" action={<Button>Réessayer</Button>} />
    <ContentState title="Chargement" kind="loading" />
    <PageDetailSkeleton />
  </>;
  return <>
    <PageIdentityHero compact icon={<Inbox />} title={longName} eyebrow="Compte exemple" description={longDescription} actions={<Button>Une action dont le libellé nécessite plusieurs mots supplémentaires</Button>} />
    <PageHero compact icon={<Inbox />} title={longName} description={longDescription} actions={<Button>Une action dont le libellé nécessite plusieurs mots supplémentaires</Button>} />
    <SectionPanel title={longName} titleId="section-example" icon={<Inbox />} description={longDescription}><p>Contenu de la section</p></SectionPanel>
  </>;
}

function Overlays() {
  const [plainOpen, setPlainOpen] = useState(false);
  const [selection, setSelection] = useState('Aucune');
  return <>
    <Button onClick={() => setPlainOpen(true)}>Ouvrir sans Trigger</Button>
    <Dialog open={plainOpen} onOpenChange={setPlainOpen}><DialogContent><DialogHeader><DialogTitle>Fenêtre contrôlée</DialogTitle><DialogDescription>Le retour du focus revient au bouton ordinaire.</DialogDescription></DialogHeader><Button onClick={() => setPlainOpen(false)}>Valider la fenêtre</Button></DialogContent></Dialog>
    <Dialog><DialogTrigger asChild><Button>Ouvrir la fenêtre</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Fenêtre de démonstration</DialogTitle><DialogDescription>{longDescription}</DialogDescription></DialogHeader><Disclosure label="Afficher les détails"><p>Détails supplémentaires</p></Disclosure><Button>Action de la fenêtre</Button></DialogContent></Dialog>
    <AlertDialog><AlertDialogTrigger asChild><Button>Ouvrir la confirmation</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmer la modification ?</AlertDialogTitle><AlertDialogDescription>{longDescription}</AlertDialogDescription></AlertDialogHeader><AlertDialogCancel>Annuler la confirmation</AlertDialogCancel></AlertDialogContent></AlertDialog>
    <Sheet><SheetTrigger asChild><Button>Ouvrir le volet</Button></SheetTrigger><SheetContent><SheetTitle>Volet de démonstration</SheetTitle><SheetDescription>{longDescription}</SheetDescription><Button>Action du volet</Button></SheetContent></Sheet>
    <Popover><PopoverTrigger asChild><Button>Ouvrir le panneau</Button></PopoverTrigger><PopoverContent><p>{longDescription}</p><Button>Action du panneau</Button></PopoverContent></Popover>
    <DropdownMenu><DropdownMenuTrigger asChild><Button>Ouvrir le menu</Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onSelect={() => setSelection('Première')}>Première action</DropdownMenuItem><DropdownMenuItem disabled>Action indisponible</DropdownMenuItem><DropdownMenuItem onSelect={() => setSelection('Dernière')}>Dernière action</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
    <p id="selection">{selection}</p>
  </>;
}

function Danger() {
  const [deleted, setDeleted] = useState(false);
  const state = window as unknown as { deletionCalls: { version: number; key: string }[]; reloadCalls: number; finishReload?: (version: number) => void };
  state.deletionCalls ??= [];
  state.reloadCalls ??= 0;
  return deleted ? <p>Fiche supprimée</p> : <EntityDangerZone description="Une fiche fictive utilisée pour ce contrôle." dialogDescription="La suppression est définitive." dialogNotice="Les données associées seront supprimées." version={1}
    onDelete={async (version, key) => {
      state.deletionCalls.push({version, key});
      if (version === 1) throw new ApiClientError({code: 'CONFLICT', message: 'Version périmée', status: 409, requestId: null, retryAfter: null});
    }}
    onReloadVersion={() => { state.reloadCalls += 1; return new Promise(resolve => {state.finishReload = resolve;}); }}
    onDeleted={() => setDeleted(true)} />;
}

createRoot(document.getElementById('root')!).render(<main className="space-y-4 p-4" style={{maxWidth: 1024, margin: '0 auto', containerType: 'inline-size', containerName: 'page', fontFamily: 'Arial, sans-serif'}}>{location.pathname.startsWith('/person-') ? <Identity /> : location.pathname === '/overlays' ? <Overlays /> : location.pathname === '/danger' ? <Danger /> : <Layout />}</main>);
