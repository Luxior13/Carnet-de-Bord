import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

import NewUserPage from '$app/systeme/utilisateurs/nouveau/page';
import { SectionActionBar } from '$components/layout/SectionActionBar';
import { UserDetailPage } from '$components/users/UserDetailPage';
import { AccountPageContent } from '$features/account/AccountPageContent';
import { PersonCreateForm } from '$features/persons/components/PersonCreateForm';
import { SystemSettingRow } from '$features/settings/SystemSettingRow';
import { Button } from '$ui/button';
import { Input } from '$ui/input';
import { TooltipProvider } from '$ui/tooltip';
import { target, usePathname } from './mocks';

function SettingFixture() {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('1095');
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<'none'|'ready'>('none');
  return <>
    <Button id="set-conflict" onClick={() => setConflict('ready')}>Simuler un conflit</Button>
    <SystemSettingRow canUpdate conflict={conflict} disabled={saving} draft={draft} isEditing={editing} isSaving={saving}
      setting={{ key: 'audit.retentionDays', value: 1095, version: 1, updatedAt: '2026-10-11T00:00:00.000Z' } as any}
      onChange={setDraft} onEdit={() => setEditing(true)} onCancel={() => { setEditing(false); setDraft('1095'); }}
      onSave={() => { (window as any).settingSaves = ((window as any).settingSaves || 0) + 1; setSaving(true); (window as any).finishSetting = () => setSaving(false); }}
      onKeepDraft={() => setConflict('none')} onReloadConflict={() => setConflict('ready')} onReset={() => { setConflict('none'); setDraft('1095'); }}
    />
  </>;
}

function StressFixture() {
  const [resolving, setResolving] = useState(false);
  return <>
    <p>Composant isolé, contenu long fictif.</p>
    <div style={{ height: 1100 }} />
    <Input aria-label="Dernier champ" defaultValue="Fictif" />
    <SectionActionBar conflict details={<p>{'VersionAncienne'.repeat(35)}</p>} onCancel={() => {}} isResolvingConflict={resolving}
      onResolveConflict={() => { setResolving(true); (window as any).finishRefresh = () => setResolving(false); }}
      saveLabel="Enregistrer les modifications de cette fiche et toutes ses informations associées" />
    <div style={{ height: 400 }} />
  </>;
}

function Fixture() {
  const pathname = usePathname();
  const content = pathname === '/mon-compte' ? <AccountPageContent />
    : pathname === '/systeme/utilisateurs/nouveau' ? <NewUserPage />
    : pathname.startsWith('/systeme/utilisateurs/') ? <UserDetailPage initialUser={target as any} userId={target.id} />
    : pathname === '/membres/repertoire/nouveau' ? <PersonCreateForm returnHref="/membres/repertoire" />
    : pathname === '/setting' ? <SettingFixture /> : <StressFixture />;
  return <TooltipProvider><main className="private-viewport mx-auto max-w-6xl p-4 sm:p-6">{content}</main></TooltipProvider>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
