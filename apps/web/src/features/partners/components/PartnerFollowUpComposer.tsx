'use client';

import { Loader2, Plus, X } from 'lucide-react';
import React, { type FC, type FormEvent, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '$ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '$ui/dialog';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';
import { Textarea } from '$ui/textarea';

import { addPartnerFollowUp } from '../partner.api';
import type { PartnerDetail } from '../types/partner.types';

export const PartnerFollowUpComposer: FC<{
  onCreated: (partner: PartnerDetail) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  partner: PartnerDetail;
}> = ({ onCreated, onOpenChange, open, partner }) => {
  const [text, setText] = useState('');
  const [hasAction, setHasAction] = useState(false);
  const [actionDescription, setActionDescription] = useState('');
  const [partnerContactId, setPartnerContactId] = useState('');
  const [dueOn, setDueOn] = useState('');
  const [saving, setSaving] = useState(false);
  const selectableContacts = partner.contacts.filter(
    (contact) => !contact.closedAt && contact.person,
  );

  const reset = (): void => {
    setText('');
    setHasAction(false);
    setActionDescription('');
    setPartnerContactId('');
    setDueOn('');
  };

  const setOpen = (nextOpen: boolean): void => {
    if (saving) return;
    onOpenChange(nextOpen);
    if (!nextOpen) reset();
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await addPartnerFollowUp(partner.id, {
        action: hasAction
          ? { description: actionDescription, dueOn: dueOn || null }
          : null,
        partnerContactId: partnerContactId || null,
        text,
        version: partner.version,
      });
      onCreated(updated);
      reset();
      onOpenChange(false);
      toast.success('Note de suivi ajoutée');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Ajout du suivi impossible',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent className="sm:max-w-2xl">
        <form autoComplete="off" onSubmit={(event) => void submit(event)}>
          <DialogHeader>
            <DialogTitle>Ajouter une note de suivi</DialogTitle>
            <DialogDescription>
              Partagez l’information nécessaire pour que les autres utilisateurs
              comprennent la situation et la prochaine étape.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="partner-follow-up-text">Note de suivi</Label>
              <Textarea
                autoComplete="off"
                autoFocus
                disabled={saving}
                id="partner-follow-up-text"
                maxLength={4000}
                onChange={(event) => setText(event.target.value)}
                placeholder="Ex. Proposition envoyée, retour attendu la semaine prochaine…"
                required
                rows={6}
                value={text}
              />
            </div>
            {selectableContacts.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="partner-follow-up-contact">
                  Interlocuteur concerné
                  <span className="text-muted-foreground font-normal">
                    {' '}
                    (facultatif)
                  </span>
                </Label>
                <Select
                  disabled={saving}
                  onValueChange={(value) =>
                    setPartnerContactId(value === 'none' ? '' : value)
                  }
                  value={partnerContactId || 'none'}
                >
                  <SelectTrigger
                    className="w-full"
                    id="partner-follow-up-contact"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun interlocuteur</SelectItem>
                    {selectableContacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.person?.displayName} · {contact.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {hasAction ? (
              <div className="bg-surface-muted grid gap-3 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Action à prévoir</p>
                  <Button
                    aria-label="Retirer l’action à prévoir"
                    disabled={saving}
                    onClick={() => {
                      setHasAction(false);
                      setActionDescription('');
                      setDueOn('');
                    }}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
                  <div className="grid gap-2">
                    <Label htmlFor="partner-follow-up-action">Action</Label>
                    <Input
                      autoComplete="off"
                      disabled={saving}
                      id="partner-follow-up-action"
                      maxLength={300}
                      onChange={(event) =>
                        setActionDescription(event.target.value)
                      }
                      placeholder="Action à réaliser"
                      required
                      value={actionDescription}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="partner-follow-up-due">Échéance</Label>
                    <Input
                      autoComplete="off"
                      disabled={saving}
                      id="partner-follow-up-due"
                      onChange={(event) => setDueOn(event.target.value)}
                      type="date"
                      value={dueOn}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <Button
                className="w-fit"
                disabled={saving}
                onClick={() => setHasAction(true)}
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus className="size-4" />
                Ajouter une action à prévoir
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button
              disabled={saving}
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              Annuler
            </Button>
            <Button
              disabled={
                saving ||
                !text.trim() ||
                (hasAction && !actionDescription.trim())
              }
              type="submit"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Ajouter au fil
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
