'use client';

import { CalendarDays, Loader2, Pencil } from 'lucide-react';
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

import { updatePartnerStatus } from '../partner.api';
import { PARTNER_STATUS_TRANSITIONS } from '../partner.constants';
import {
  formatPartnerCivilDate,
  getRelationshipStatusDescription,
} from '../partner-timeline.ui';
import type { PartnerDetail, PartnerStatus } from '../types/partner.types';
import { PartnerStatusBadge } from './PartnerStatusBadge';

const getTransitionLabel = (
  currentStatus: PartnerStatus,
  nextStatus: PartnerStatus,
): string => {
  if (nextStatus === 'ACTIVE') return 'Activer la relation';
  if (nextStatus === 'ENDED') return 'Terminer la relation';
  if (nextStatus === 'CLOSED') return 'Classer sans suite';
  if (nextStatus === 'DISCUSSION') {
    return currentStatus === 'PROSPECT'
      ? 'Commencer les échanges'
      : 'Reprendre les échanges';
  }

  return 'Revenir au statut prospect';
};

export const PartnerStatusControl: FC<{
  canManage: boolean;
  onChange: (partner: PartnerDetail) => void;
  onTimelineRefresh?: () => Promise<void>;
  partner: PartnerDetail;
}> = ({ canManage, onChange, onTimelineRefresh, partner }) => {
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
  const nextStatuses = (
    PARTNER_STATUS_TRANSITIONS[partner.status] as readonly PartnerStatus[]
  ).filter((item) => item !== partner.status);
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
      try {
        await onTimelineRefresh?.();
      } catch {
        toast.warning(
          'Le statut est enregistré, mais le fil n’a pas pu être actualisé.',
        );
      }
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
      try {
        await onTimelineRefresh?.();
      } catch {
        toast.warning(
          'La modification est enregistrée, mais le fil n’a pas pu être actualisé.',
        );
      }
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
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="bg-surface-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
              <CalendarDays className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">Relation</p>
                <PartnerStatusBadge status={partner.status} />
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                {getRelationshipStatusDescription(partner)}
              </p>
              {editablePeriod?.closingNote && partner.status === 'ENDED' && (
                <p className="text-muted-foreground mt-1 text-xs">
                  Précision : {editablePeriod.closingNote}
                </p>
              )}
            </div>
          </div>
          {canManage && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {editablePeriod && (
                <Button
                  disabled={saving || open}
                  onClick={openPeriodCorrection}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Pencil className="size-4" />
                  Corriger les dates
                </Button>
              )}
              {nextStatuses.map((nextStatus) => (
                <Button
                  disabled={saving || open}
                  key={nextStatus}
                  onClick={() => selectStatus(nextStatus)}
                  size="sm"
                  type="button"
                  variant={
                    nextStatus === 'CLOSED' || nextStatus === 'ENDED'
                      ? 'outline'
                      : 'default'
                  }
                >
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {getTransitionLabel(partner.status, nextStatus)}
                </Button>
              ))}
            </div>
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
          <form
            autoComplete="off"
            onSubmit={(event) => void submitPeriod(event)}
          >
            <DialogHeader>
              <DialogTitle>{modalTitle}</DialogTitle>
              <DialogDescription>{modalDescription}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {(status === 'ACTIVE' || status === 'ENDED') && (
                <div className="grid gap-2">
                  {status === 'ENDED' && !isCorrection ? (
                    <>
                      <Label>Début de période</Label>
                      <div className="bg-surface-muted rounded-lg border px-3 py-2 text-sm">
                        {startedOn
                          ? formatPartnerCivilDate(startedOn)
                          : 'Date de début non renseignée'}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Utilisez « Corriger les dates » si ce début est
                        incorrect.
                      </p>
                    </>
                  ) : (
                    <>
                      <Label htmlFor="partner-status-started">
                        Début de période
                      </Label>
                      <Input
                        autoComplete="off"
                        disabled={saving}
                        id="partner-status-started"
                        onChange={(event) => setStartedOn(event.target.value)}
                        type="date"
                        value={startedOn}
                      />
                      {startedOn && (
                        <p className="text-muted-foreground text-xs">
                          {formatPartnerCivilDate(startedOn)}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
              {status === 'ENDED' && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="partner-status-ended">Fin de période</Label>
                    <Input
                      autoComplete="off"
                      disabled={saving}
                      id="partner-status-ended"
                      onChange={(event) => setEndedOn(event.target.value)}
                      type="date"
                      value={endedOn}
                    />
                    {endedOn && (
                      <p className="text-muted-foreground text-xs">
                        {formatPartnerCivilDate(endedOn)}
                      </p>
                    )}
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
