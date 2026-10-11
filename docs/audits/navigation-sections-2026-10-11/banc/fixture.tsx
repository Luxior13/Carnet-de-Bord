import React from 'react';
import { createRoot } from 'react-dom/client';
import { User, Shield, Key, AtSign, History } from 'lucide-react';
import { AccountPageContent } from '$features/account/AccountPageContent';
import { UserDetailPage } from '$components/users/UserDetailPage';
import { PersonDetailPage } from '$features/persons/components/PersonDetailPage';
import { PageSectionNavigation } from '$components/layout/PageSectionNavigation';
import { Button } from '$ui/button';
import { TooltipProvider } from '$ui/tooltip';
import { usePathname, useSearchParams, useRouter, target } from './mocks';

const now = '2026-10-11T00:00:00.000Z';
export const person = {
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
  let content;
  if (pathname === '/mon-compte') content = <AccountPageContent />;
  else if (pathname.startsWith('/systeme/utilisateurs')) content = <UserDetailPage initialUser={target as any} userId={target.id} />;
  else if (pathname.startsWith('/membres/repertoire')) content = <PersonDetailPage initialPerson={person} personId={person.id} returnHref="/membres/repertoire" activeSection={active === 'coordonnees' ? 'coordonnees' : 'identite'} />;
  else content = <>
    <div className="flex flex-wrap gap-2 pb-4">
      <Button id="before" onClick={() => {}}>Avant la navigation</Button>
      <Button id="short" onClick={() => router.replace('/stress?short=1')}>Réduire les sections</Button>
    </div>
    <PageSectionNavigation
      activeSection={active} ariaLabel="Navigation témoin"
      dirtySections={query.has('clean') ? [] : ['profile']}
      getSectionHref={(id) => `/stress?section=${id}`}
      onSectionChange={(id) => {
        (window as any).sectionChanges = ((window as any).sectionChanges || 0) + 1;
        router.replace(`/stress?section=${id}`);
      }}
      sections={query.has('short') ? sections.slice(0, 1) : sections}
    />
    <p id="current" className="p-4">Section : {active}</p>
    <Button id="after">Après la navigation</Button>
    <div style={{ height: 1800 }} />
  </>;
  return <TooltipProvider><main className="private-viewport mx-auto max-w-6xl p-4 sm:p-6">{content}</main></TooltipProvider>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
