'use client';

import { Check, RefreshCw, Undo2 } from 'lucide-react';
import Link from 'next/link';
import React, { type FC, type ReactNode, useId } from 'react';

import { Button } from '$ui/button';
import { cn } from '$utils/css.utils';

import styles from './SectionActionBar.module.css';

type SectionActionBarProps = {
  cancelDisabled?: boolean;
  cancelHref?: string;
  className?: string;
  conflict?: boolean;
  details?: ReactNode;
  disabled?: boolean;
  extraActions?: ReactNode;
  hasChanges?: boolean;
  isResolvingConflict?: boolean;
  isSaving?: boolean;
  label?: string;
  onCancel?: () => void;
  onResolveConflict?: () => void;
  /**
   * `sticky` follows the page on a computer and stays in the flow on a phone;
   * `docked` also stays in view on a phone, for screens without typing.
   */
  placement?: 'docked' | 'inline' | 'sticky';
  saveAriaLabel?: string;
  saveDisabled?: boolean;
  saveDisabledReason?: string;
  saveLabel?: string;
  savingLabel?: string;
  /**
   * Message next to the actions. Omitted: the draft state. `null`: no message,
   * for a creation form where « unsaved changes » would be misleading.
   */
  status?: ReactNode;
} & (
  | { onSave: () => void; saveForm?: never; saveType?: 'button' }
  | { onSave?: never; saveForm?: string; saveType: 'submit' }
);

/** Shared presentation; validation, permissions and draft ownership stay in the form. */
export const SectionActionBar: FC<SectionActionBarProps> = ({
  cancelDisabled,
  cancelHref,
  className,
  conflict = false,
  details,
  disabled = false,
  extraActions,
  hasChanges = true,
  isResolvingConflict = false,
  isSaving = false,
  label = 'Actions du formulaire',
  onCancel,
  onResolveConflict,
  onSave,
  placement = 'sticky',
  saveAriaLabel,
  saveDisabled = false,
  saveDisabledReason,
  saveForm,
  saveLabel = 'Enregistrer',
  saveType = 'button',
  savingLabel = 'Enregistrement…',
  status,
}) => {
  const statusId = useId();
  const busy = isSaving || isResolvingConflict;
  const controlsDisabled = disabled || busy;
  const cannotSave =
    controlsDisabled || conflict || saveDisabled || !hasChanges;
  const cannotCancel = controlsDisabled || (cancelDisabled ?? !hasChanges);
  const cannotNavigate = controlsDisabled || cancelDisabled === true;
  const message = isResolvingConflict
    ? 'Actualisation de la version…'
    : isSaving
      ? savingLabel
      : conflict
        ? 'Vérifiez la version enregistrée avant de poursuivre. Votre saisie est conservée.'
        : status === null
          ? ''
          : (status ??
            (hasChanges
              ? 'Modifications non enregistrées'
              : 'Aucune modification en attente'));

  return (
    <div
      aria-label={label}
      className={cn(styles.bar, className)}
      data-dirty={hasChanges}
      data-placement={placement}
      data-slot="section-action-bar"
      role="group"
    >
      <div className={styles.body}>
        <div className={styles.summary}>
          <p
            className="text-muted-foreground text-xs leading-5"
            id={statusId}
            role="status"
          >
            {message}
          </p>
          {details}
          {saveDisabledReason && !busy && (
            <p
              className="text-warning text-xs leading-5"
              id={`${statusId}-reason`}
            >
              {saveDisabledReason}
            </p>
          )}
        </div>
        <div className={styles.actions}>
          {extraActions}
          {conflict && onResolveConflict && (
            <Button
              disabled={controlsDisabled}
              loading={isResolvingConflict}
              onClick={() => {
                if (!controlsDisabled) onResolveConflict();
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              {isResolvingConflict ? 'Actualisation…' : 'Actualiser la version'}
            </Button>
          )}
          {cancelHref ? (
            <Button asChild size="sm" variant="outline">
              <Link
                aria-disabled={cannotNavigate || undefined}
                className={
                  cannotNavigate ? 'pointer-events-none opacity-50' : undefined
                }
                href={cancelHref}
                onClick={(event) => {
                  if (cannotNavigate) event.preventDefault();
                }}
              >
                <Undo2 aria-hidden="true" className="size-4" />
                Annuler
              </Link>
            </Button>
          ) : onCancel ? (
            <Button
              disabled={cannotCancel}
              onClick={() => {
                if (!cannotCancel) onCancel();
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <Undo2 aria-hidden="true" className="size-4" />
              Annuler
            </Button>
          ) : null}
          <Button
            aria-label={saveAriaLabel}
            aria-describedby={
              saveDisabledReason && !busy
                ? `${statusId} ${statusId}-reason`
                : statusId
            }
            disabled={cannotSave}
            form={saveForm}
            loading={isSaving}
            onClick={
              onSave
                ? (): void => {
                    if (!cannotSave) onSave();
                  }
                : undefined
            }
            size="sm"
            type={saveType}
          >
            <Check aria-hidden="true" className="size-4" />
            {isSaving ? savingLabel : saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
