'use client';

import { CircleAlert, Loader2 } from 'lucide-react';
import React, { type FC, type FormEvent, useEffect, useState } from 'react';
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
import { Label } from '$ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';
import { Textarea } from '$ui/textarea';
import { ApiClientError } from '$utils/api.utils';

import { updatePartnerFollowUp } from '../partner.api';
import { PARTNER_FOLLOW_UP_EDIT_WINDOW_MINUTES } from '../partner.constants';
import type { PartnerDetail, PartnerFollowUp } from '../types/partner.types';

const getMutationErrorMessage = (error: unknown): string => {
  return error instanceof Error
    ? error.message
    : 'La note de suivi ne peut pas être modifiée.';
};

export const PartnerFollowUpEditor: FC<{
  canViewContacts: boolean;
  editableDeadlineMs: number;
  entry: PartnerFollowUp;
  onConflict: () => void;
  onOpenChange: (open: boolean) => void;
  onUpdated: (partner: PartnerDetail) => void;
  open: boolean;
  partner: PartnerDetail;
}> = ({
  canViewContacts,
  editableDeadlineMs,
  entry,
  onConflict,
  onOpenChange,
  onUpdated,
  open,
  partner,
}) => {
  const [text, setText] = useState(entry.text);
  const [partnerContactId, setPartnerContactId] = useState(
    entry.partnerContactId ?? '',
  );
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editWindowOpen, setEditWindowOpen] = useState(
    Date.now() < editableDeadlineMs,
  );
  const selectableContacts = partner.contacts.filter(
    (contact) =>
      contact.person &&
      (!contact.closedAt || contact.id === entry.partnerContactId),
  );
  const hasChanges =
    text.trim() !== entry.text ||
    (canViewContacts && partnerContactId !== (entry.partnerContactId ?? ''));

  useEffect((): (() => void) | undefined => {
    if (!open) return;

    setText(entry.text);
    setPartnerContactId(entry.partnerContactId ?? '');
    setErrorMessage(null);
  }, [entry, open]);

  useEffect((): (() => void) | undefined => {
    if (!open) return;

    const remainingMs = editableDeadlineMs - Date.now();
    setEditWindowOpen(remainingMs > 0);
    if (remainingMs <= 0) return;

    const timeout = window.setTimeout(() => {
      setEditWindowOpen(false);
      setErrorMessage(
        'Le délai de modification est terminé. Votre texte reste visible pour que vous puissiez le copier dans une nouvelle note.',
      );
    }, remainingMs);

    return () => window.clearTimeout(timeout);
  }, [editableDeadlineMs, open]);

  const setOpen = (nextOpen: boolean): void => {
    if (saving) return;
    onOpenChange(nextOpen);
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!editWindowOpen || Date.now() >= editableDeadlineMs) {
      setEditWindowOpen(false);
      setErrorMessage(
        'Le délai de modification est terminé. Ajoutez une nouvelle note pour apporter une correction.',
      );

      return;
    }
    if (!hasChanges) return;

    setSaving(true);
    setErrorMessage(null);
    try {
      const updated = await updatePartnerFollowUp(partner.id, entry.id, {
        entryVersion: entry.entryVersion,
        ...(canViewContacts
          ? { partnerContactId: partnerContactId || null }
          : {}),
        text,
      });
      onUpdated(updated);
      onOpenChange(false);
      toast.success('Note de suivi modifiée');
    } catch (error) {
      const message = getMutationErrorMessage(error);
      setErrorMessage(message);
      toast.error(message);
      if (error instanceof ApiClientError && error.status === 409) {
        onConflict();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent className="sm:max-w-2xl">
        <form autoComplete="off" onSubmit={(event) => void submit(event)}>
          <DialogHeader>
            <DialogTitle>Modifier la note de suivi</DialogTitle>
            <DialogDescription>
              Vous pouvez corriger votre note pendant{' '}
              {PARTNER_FOLLOW_UP_EDIT_WINDOW_MINUTES} minutes après son ajout.
              Sa date et l’action éventuellement liée restent inchangées.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {errorMessage && (
              <div
                className="border-warning/30 bg-warning/10 text-warning-foreground flex gap-2 rounded-lg border px-3 py-2.5 text-sm"
                role="alert"
              >
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                <p>{errorMessage}</p>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="partner-follow-up-edit-text">Note de suivi</Label>
              <Textarea
                autoComplete="off"
                autoFocus
                id="partner-follow-up-edit-text"
                maxLength={4000}
                onChange={(event) => setText(event.target.value)}
                readOnly={saving || !editWindowOpen}
                required
                rows={7}
                value={text}
              />
            </div>

            {canViewContacts && selectableContacts.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="partner-follow-up-edit-contact">
                  Contact concerné
                  <span className="text-muted-foreground font-normal">
                    {' '}
                    (facultatif)
                  </span>
                </Label>
                <Select
                  disabled={saving || !editWindowOpen}
                  onValueChange={(value) =>
                    setPartnerContactId(value === 'none' ? '' : value)
                  }
                  value={partnerContactId || 'none'}
                >
                  <SelectTrigger
                    className="w-full"
                    id="partner-follow-up-edit-contact"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun contact</SelectItem>
                    {selectableContacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.person?.displayName} · {contact.label}
                        {contact.closedAt ? ' (ancien contact)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              disabled={saving}
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              Fermer
            </Button>
            <Button
              disabled={
                saving || !editWindowOpen || !text.trim() || !hasChanges
              }
              type="submit"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
