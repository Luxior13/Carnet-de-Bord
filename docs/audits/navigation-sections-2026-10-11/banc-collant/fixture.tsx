import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { User, Shield, Key, AtSign, History } from 'lucide-react';
import { AccountPageContent } from '$features/account/AccountPageContent';
import { UserDetailPage } from '$components/users/UserDetailPage';
import { PersonDetailPage } from '$features/persons/components/PersonDetailPage';
import { PageSectionNavigation } from '$components/layout/PageSectionNavigation';
import { Header } from '$components/layout/Header';
import { Button } from '$ui/button';
import { SidebarProvider } from '$ui/sidebar';
import { TooltipProvider } from '$ui/tooltip';
import { usePathname, useSearchParams, useRouter, target } from './mocks';

const now = '2026-10-11T00:00:00.000Z';
const person = {
  id: 'audit-person', version: 1, nickname: 'Joueur Exemple', firstName: 'Camille', lastName: 'Exemple',
  birthDate: null, age: null, isAdult: null, lastChange: null, structureStatus: 'IN_STRUCTURE',
  createdAt: now, updatedAt: now, emails: [], phones: [], socialProfiles: [],
} as any;
const sections = [
  { id: 'profile', label: 'Profil', icon: <User /> },
  { id: 'access', label: 'Autorisations', icon: <Shield /> },
  { id: 'security', label: 'Sécurité', icon: <Key /> },
  { id: 'contact', label: 'Coordonnées', icon: <AtSign /> },
  { id: 'history', label: 'Historique des modifications', icon: <History /> },
];
function Fixture() {
  const pathname = usePathname();
  const query = useSearchParams();
  const router = useRouter();
  const active = query.get('section') || 'profile';
  const [showSections, setShowSections] = useState(!query.has('empty'));
  let content;
  if (pathname === '/mon-compte') content = <AccountPageContent />;
  else if (pathname.startsWith('/systeme/utilisateurs')) content = <UserDetailPage initialUser={target as any} userId={target.id} />;
  else if (pathname.startsWith('/membres/repertoire')) content = <PersonDetailPage initialPerson={person} personId={person.id} returnHref="/membres/repertoire" activeSection={active === 'coordonnees' ? 'coordonnees' : 'identite'} />;
  else content = <>
    <div style={{ height: query.has('tall') ? 1200 : 180 }}>
      Sections fictives pour contrôler le débordement
      {query.has('empty') && <Button id="show-sections" onClick={() => setShowSections(true)}>Afficher les sections</Button>}
    </div>
    <PageSectionNavigation activeSection={active} ariaLabel="Navigation témoin" dirtySections={['profile']}
      getSectionHref={(id) => `/stress?section=${id}`} onSectionChange={(id) => router.replace(`/stress?section=${id}`)} sections={showSections ? sections : []} />
    <Button id="after">Après la navigation</Button>
    <div style={{ height: 1500 }} />
  </>;
  const label = pathname === '/mon-compte' ? 'Mon compte' : pathname.startsWith('/systeme') ? 'Utilisateur fictif' : pathname.startsWith('/membres') ? 'Fiche fictive' : 'Navigation témoin';
  return <TooltipProvider><SidebarProvider defaultOpen={false} style={{ height: '100dvh', minHeight: 0 }}>
    <div className="private-viewport bg-surface-canvas relative isolate" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100%', minWidth: 0 }}>
      <Header breadcrumbs={[{ label }]} />
      <main id="main-content" tabIndex={-1} className="relative z-10 scrollbar-gutter-both-edges" style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
        <div id="fixture-content" className="mx-auto max-w-6xl p-4 sm:p-6">
          {content}
          <div id="layout-probe" aria-hidden="true" style={{ height: 1600 }} />
        </div>
      </main>
    </div>
  </SidebarProvider></TooltipProvider>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
