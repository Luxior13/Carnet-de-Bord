'use client';

import { CalendarDays, Check, Loader2, Pencil } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';
import { cn } from '$utils/css.utils';

import { updatePartnerStatus } from '../partner.api';
import {
  PARTNER_STATUS_LABELS,
  PARTNER_STATUS_TRANSITIONS,
  PARTNER_STATUSES,
} from '../partner.constants';
import {
  formatPartnerCivilDate,
  getPartnerTodayCivilDate,
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

const getUnavailableTransitionReason = (
  currentStatus: PartnerStatus,
  nextStatus: PartnerStatus,
): string => {
  if (currentStatus === 'ACTIVE') {
    return 'Terminez d’abord la relation active.';
  }
  if (nextStatus === 'PROSPECT') {
    return 'Le statut Prospect correspond au début du cycle.';
  }
  if (currentStatus === 'PROSPECT') {
    return nextStatus === 'ENDED'
      ? 'Passez d’abord à En discussion, puis activez la relation.'
      : 'Passez d’abord à En discussion.';
  }
  if (currentStatus === 'CLOSED' || currentStatus === 'ENDED') {
    if (nextStatus === 'ENDED') {
      return 'Reprenez les échanges, activez la relation, puis terminez-la.';
    }
    if (nextStatus === 'ACTIVE') {
      return 'Reprenez d’abord les échanges, puis activez la relation.';
    }

    return 'Reprenez d’abord les échanges en passant à En discussion.';
  }
  if (nextStatus === 'ENDED') {
    return 'Activez d’abord la relation.';
  }

  return 'Reprenez d’abord les échanges en passant à En discussion.';
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
  const [savingStatus, setSavingStatus] = useState<PartnerStatus | null>(null);
  const [startedOn, setStartedOn] = useState(editablePeriod?.startedOn ?? '');
  const [status, setStatus] = useState<PartnerStatus>(partner.status);
  const saving = savingStatus !== null;
  const normalizedClosingNote = closingNote.trim();
  const isCorrection = status === partner.status;
  const allowedStatuses = PARTNER_STATUS_TRANSITIONS[
    partner.status
  ] as readonly PartnerStatus[];
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
    const today = getPartnerTodayCivilDate();
    setStatus(nextStatus);
    setStartedOn(
      nextStatus === 'ENDED' ? (activePeriod?.startedOn ?? '') : today,
    );
    setEndedOn(nextStatus === 'ENDED' ? today : '');
    setClosingNote('');
    setOpen(true);
  };

  const saveStatus = async (nextStatus: PartnerStatus): Promise<void> => {
    setSavingStatus(nextStatus);
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
      setSavingStatus(null);
    }
  };

  const selectStatus = (nextStatus: PartnerStatus): void => {
    if (nextStatus === partner.status) return;
    if (!allowedStatuses.includes(nextStatus)) return;
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
    setSavingStatus(status);
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
      setSavingStatus(null);
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
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="bg-surface-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                <CalendarDays className="size-4" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">Relation</p>
                  {!canManage && <PartnerStatusBadge status={partner.status} />}
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
            {canManage && editablePeriod && (
              <Button
                className="self-start"
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
          </div>
          {canManage && (
            <div
              aria-label="Statut de la relation"
              className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5"
              role="group"
            >
              {PARTNER_STATUSES.map((nextStatus) => {
                const isCurrent = nextStatus === partner.status;
                const isAllowed =
                  isCurrent || allowedStatuses.includes(nextStatus);
                // nextStatus comes from the closed PARTNER_STATUSES catalogue.
                // eslint-disable-next-line security/detect-object-injection
                const label = PARTNER_STATUS_LABELS[nextStatus];
                const help = isCurrent
                  ? 'Statut actuel'
                  : isAllowed
                    ? getTransitionLabel(partner.status, nextStatus)
                    : getUnavailableTransitionReason(
                        partner.status,
                        nextStatus,
                      );

                return (
                  <Tooltip key={nextStatus}>
                    <TooltipTrigger asChild>
                      <span
                        aria-current={isCurrent || undefined}
                        aria-disabled={!isAllowed || isCurrent || undefined}
                        aria-label={
                          !isAllowed || isCurrent
                            ? `${label} — ${help}`
                            : undefined
                        }
                        className={cn(
                          'flex min-w-0',
                          nextStatus === 'CLOSED' && 'col-span-2 md:col-span-1',
                          isCurrent && 'cursor-default',
                          !isCurrent && !isAllowed && 'cursor-not-allowed',
                        )}
                        role={!isAllowed || isCurrent ? 'button' : undefined}
                        tabIndex={!isAllowed || isCurrent ? 0 : undefined}
                      >
                        <Button
                          aria-pressed={isCurrent}
                          className={cn(
                            'min-h-10 w-full px-2 whitespace-normal',
                            isCurrent &&
                              'border-primary/40 bg-primary/15 text-primary-emphasis disabled:opacity-100',
                            !isCurrent &&
                              !isAllowed &&
                              'border-dashed disabled:opacity-100',
                          )}
                          disabled={saving || open || isCurrent || !isAllowed}
                          onClick={() => selectStatus(nextStatus)}
                          size="sm"
                          tabIndex={!isAllowed || isCurrent ? -1 : undefined}
                          type="button"
                          variant={isCurrent ? 'secondary' : 'outline'}
                        >
                          {savingStatus === nextStatus ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            isCurrent && <Check className="size-4" />
                          )}
                          {label}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{help}</TooltipContent>
                  </Tooltip>
                );
              })}
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
