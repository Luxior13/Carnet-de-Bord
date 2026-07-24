'use client';

import { Loader2, Pencil } from 'lucide-react';
import React, { type FC, type FormEvent, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '$ui/button';
import { Card, CardContent } from '$ui/card';
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
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '$ui/select';

import { updatePartnerStatus } from '../partner.api';
import {
  PARTNER_STATUS_LABELS,
  PARTNER_STATUS_TRANSITIONS,
} from '../partner.constants';
import type { PartnerDetail, PartnerStatus } from '../types/partner.types';
import { PartnerStatusBadge } from './PartnerStatusBadge';

export const PartnerStatusControl: FC<{
  canManage: boolean;
  onChange: (partner: PartnerDetail) => void;
  partner: PartnerDetail;
}> = ({ canManage, onChange, partner }) => {
  const activePeriod = partner.periods.find((period) => !period.closedAt);
  const editablePeriod =
    activePeriod ??
    (partner.status === 'ENDED'
      ? partner.periods.find((period) => period.closedAt)
      : undefined);
  const [closingNote, setClosingNote] = useState(
    editablePeriod?.closingNote ?? '',
  );
  const [endedOn, setEndedOn] = useState(editablePeriod?.endedOn ?? '');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [startedOn, setStartedOn] = useState(editablePeriod?.startedOn ?? '');
  const [status, setStatus] = useState<PartnerStatus>(partner.status);
  const normalizedClosingNote = closingNote.trim();
  const isCorrection = status === partner.status;
  const hasChanges =
    !isCorrection ||
    (status === 'ACTIVE' && startedOn !== (editablePeriod?.startedOn ?? '')) ||
    (status === 'ENDED' &&
      (startedOn !== (editablePeriod?.startedOn ?? '') ||
        endedOn !== (editablePeriod?.endedOn ?? '') ||
        normalizedClosingNote !== (editablePeriod?.closingNote ?? '')));

  const openPeriodCorrection = (): void => {
    setStatus(partner.status);
    setStartedOn(editablePeriod?.startedOn ?? '');
    setEndedOn(editablePeriod?.endedOn ?? '');
    setClosingNote(editablePeriod?.closingNote ?? '');
    setOpen(true);
  };

  const openPeriodTransition = (nextStatus: PartnerStatus): void => {
    setStatus(nextStatus);
    setStartedOn(nextStatus === 'ENDED' ? (activePeriod?.startedOn ?? '') : '');
    setEndedOn('');
    setClosingNote('');
    setOpen(true);
  };

  const saveStatus = async (nextStatus: PartnerStatus): Promise<void> => {
    setSaving(true);
    try {
      const updated = await updatePartnerStatus(partner.id, {
        closingNote: null,
        endedOn: null,
        startedOn: null,
        status: nextStatus,
        version: partner.version,
      });
      onChange(updated);
      toast.success('Statut mis à jour');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Modification impossible',
      );
    } finally {
      setSaving(false);
    }
  };

  const selectStatus = (value: string): void => {
    if (value === 'edit-period') {
      openPeriodCorrection();

      return;
    }
    const nextStatus = value as PartnerStatus;
    if (nextStatus === partner.status) return;
    if (nextStatus === 'ACTIVE' || nextStatus === 'ENDED') {
      openPeriodTransition(nextStatus);

      return;
    }
    void saveStatus(nextStatus);
  };

  const submitPeriod = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (!hasChanges) return;
    setSaving(true);
    try {
      const updated = await updatePartnerStatus(partner.id, {
        closingNote: normalizedClosingNote || null,
        endedOn: endedOn || null,
        startedOn: startedOn || null,
        status,
        version: partner.version,
      });
      onChange(updated);
      setOpen(false);
      toast.success(isCorrection ? 'Période corrigée' : 'Statut mis à jour');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Modification impossible',
      );
    } finally {
      setSaving(false);
    }
  };

  const modalTitle = isCorrection
    ? 'Corriger la période'
    : status === 'ACTIVE'
      ? 'Activer la relation'
      : 'Terminer la relation';
  const modalDescription = isCorrection
    ? 'Corrigez les informations de la période. Chaque modification reste journalisée.'
    : status === 'ACTIVE'
      ? 'La nouvelle période sera ouverte. Sa date de début reste facultative.'
      : 'La période active sera clôturée. La date de fin et le motif restent facultatifs.';

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-sm font-medium">Statut de la relation</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Le statut reste également visible dans l’en-tête de la fiche.
            </p>
          </div>
          {canManage ? (
            <Select
              disabled={saving || open}
              onValueChange={selectStatus}
              value={partner.status}
            >
              <SelectTrigger
                aria-label="Statut de la relation"
                className="w-52"
              >
                <SelectValue />
                {saving && <Loader2 className="size-4 animate-spin" />}
              </SelectTrigger>
              <SelectContent>
                {PARTNER_STATUS_TRANSITIONS[partner.status].map((item) => (
                  <SelectItem key={item} value={item}>
                    {PARTNER_STATUS_LABELS[item]}
                  </SelectItem>
                ))}
                {(partner.status === 'ACTIVE' ||
                  partner.status === 'ENDED') && (
                  <>
                    <SelectSeparator />
                    <SelectItem value="edit-period">
                      <Pencil className="size-4" />
                      Corriger la période…
                    </SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          ) : (
            <PartnerStatusBadge status={partner.status} />
          )}
        </CardContent>
      </Card>

      <Dialog
        onOpenChange={(nextOpen) => {
          if (saving) return;
          setOpen(nextOpen);
          if (!nextOpen) setStatus(partner.status);
        }}
        open={open}
      >
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={(event) => void submitPeriod(event)}>
            <DialogHeader>
              <DialogTitle>{modalTitle}</DialogTitle>
              <DialogDescription>{modalDescription}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {(status === 'ACTIVE' || status === 'ENDED') && (
                <div className="grid gap-2">
                  <Label htmlFor="partner-status-started">
                    Début de période
                  </Label>
                  <Input
                    disabled={saving}
                    id="partner-status-started"
                    onChange={(event) => setStartedOn(event.target.value)}
                    type="date"
                    value={startedOn}
                  />
                </div>
              )}
              {status === 'ENDED' && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="partner-status-ended">Fin de période</Label>
                    <Input
                      disabled={saving}
                      id="partner-status-ended"
                      onChange={(event) => setEndedOn(event.target.value)}
                      type="date"
                      value={endedOn}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="partner-status-note">
                      Motif ou précision
                    </Label>
                    <Input
                      autoComplete="off"
                      disabled={saving}
                      id="partner-status-note"
                      maxLength={300}
                      onChange={(event) => setClosingNote(event.target.value)}
                      value={closingNote}
                    />
                  </div>
                </>
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
              <Button disabled={saving || !hasChanges} type="submit">
                {saving && <Loader2 className="size-4 animate-spin" />}
                {isCorrection ? 'Enregistrer' : 'Confirmer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
