import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Save } from 'lucide-react';

import { Button } from '$ui/button';
import { Checkbox } from '$ui/checkbox';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '$ui/command';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '$ui/select';
import { Switch } from '$ui/switch';
import { Textarea } from '$ui/textarea';

function Fixture() {
  const [actions, setActions] = useState(0);
  const [submits, setSubmits] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saves, setSaves] = useState(0);
  const [choice, setChoice] = useState('');
  const [command, setCommand] = useState('');
  return (
    <main className="mx-auto grid max-w-4xl gap-6 p-6">
      <h1 className="text-xl">Contrôle isolé des champs et actions</h1>
      <form autoComplete="off" className="grid gap-4" onSubmit={event => { event.preventDefault(); setSubmits(value => value + 1); }}>
        <div className="grid gap-2"><Label htmlFor="text">Nom fictif</Label><Input id="text" /></div>
        <div className="grid gap-2"><Label htmlFor="notes">Notes fictives</Label><Textarea id="notes" /></div>
        <div className="flex items-center gap-3"><Checkbox id="mixed" defaultChecked="indeterminate" /><Label htmlFor="mixed">Sélection partielle</Label></div>
        <div className="flex items-center gap-3"><Checkbox id="disabled-checkbox" disabled /><Label htmlFor="disabled-checkbox">Case désactivée</Label></div>
        <div className="flex items-center gap-3"><Switch id="switch" /><Label htmlFor="switch">Activer l'option</Label></div>
        <div className="flex items-center gap-3"><Switch id="disabled-switch" disabled /><Label htmlFor="disabled-switch">Option désactivée</Label></div>
        <div className="grid gap-2"><Label htmlFor="choice">Statut fictif</Label><Select value={choice} onValueChange={setChoice}><SelectTrigger id="choice" variant="compact" className="w-full"><SelectValue placeholder="Choisir" /></SelectTrigger><SelectContent variant="compact"><SelectItem value="alpha">Alpha</SelectItem><SelectItem disabled value="unavailable">Indisponible</SelectItem><SelectItem value="beta">Beta</SelectItem></SelectContent></Select></div>
        <div className="grid gap-2"><Label htmlFor="disabled-select">Choix indisponible</Label><Select disabled><SelectTrigger id="disabled-select"><SelectValue placeholder="Indisponible" /></SelectTrigger><SelectContent><SelectItem value="alpha">Alpha</SelectItem></SelectContent></Select></div>
        <div className="flex flex-wrap gap-2"><Button id="action" onClick={() => setActions(value => value + 1)}>Action simple</Button><Button type="submit" id="submit">Valider</Button><Button id="save" loading={loading} onClick={() => { setLoading(true); setSaves(value => value + 1); }}><Save aria-hidden="true" />Enregistrer</Button><Button id="finish" onClick={() => setLoading(false)}>Terminer l'attente</Button><Button asChild><a href="#summary">Voir le bilan</a></Button></div>
        <output id="summary">Actions {actions} ; validations {submits} ; enregistrements {saves} ; statut {choice || 'aucun'}</output>
      </form>
      <section aria-label="Commandes"><Command><CommandInput placeholder="Rechercher une commande" aria-label="Rechercher une commande" /><CommandList><CommandEmpty>Aucun résultat</CommandEmpty><CommandItem value="alpha" onSelect={() => setCommand('alpha')}>Alpha</CommandItem><CommandItem disabled value="indisponible">Indisponible</CommandItem><CommandItem value="beta" onSelect={() => setCommand('beta')}>Beta</CommandItem></CommandList></Command><p id="command-result">Commande : {command || 'aucune'}</p></section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Fixture />);
