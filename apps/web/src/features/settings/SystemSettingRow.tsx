'use client';

import { Loader2, Minus, Plus } from 'lucide-react';
import React, { type FC, useEffect, useRef } from 'react';

import { getSystemSettingDefinition } from '$constants/system-setting-catalog.constants';
import { Button } from '$ui/button';
import { Input } from '$ui/input';
import { Label } from '$ui/label';

import {
  formatSettingValue,
  formatUpdatedAt,
  getDraftNumber,
  getSettingPresentation,
  getValidationMessage,
  isSettingDraftChanged,
  type NormalizedSystemSettingItem,
} from './system-settings-page.helpers';

type SystemSettingRowProps = {
  canUpdate: boolean;
  conflict: 'none' | 'ready' | 'unavailable';
  disabled: boolean;
  draft: string;
  error?: string;
  isEditing: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (value: string) => void;
  onEdit: () => void;
  onKeepDraft: () => void;
  onReloadConflict: () => void;
  onReset: () => void;
  onSave: () => void;
  setting: NormalizedSystemSettingItem;
};

const actionClass = 'h-11 rounded-[8px] px-3 lg:h-10';
const stepButtonClass =
  'border-border-control bg-input size-11 focus-visible:relative focus-visible:z-10 lg:size-10';

export const SystemSettingRow: FC<SystemSettingRowProps> = ({
  canUpdate,
  conflict,
  disabled,
  draft,
  error,
  isEditing,
  isSaving,
  onCancel,
  onChange,
  onEdit,
  onKeepDraft,
  onReloadConflict,
  onReset,
  onSave,
  setting,
}) => {
  const definition = getSystemSettingDefinition(setting.key);
  const inputRef = useRef<HTMLInputElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  const editing = canUpdate && isEditing;
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else if (wasEditing.current && document.activeElement === document.body) {
      editButtonRef.current?.focus();
    }
    wasEditing.current = editing;
    if (!editing) return;

    const input = inputRef.current;
    const preventWheelStep = (event: WheelEvent): void => {
      if (
        document.activeElement === input &&
        !event.ctrlKey &&
        !event.metaKey &&
        event.cancelable
      )
        event.preventDefault();
    };
    // Protect the focused duration without blurring it or blocking browser zoom.
    input?.addEventListener('wheel', preventWheelStep, { passive: false });

    return (): void => input?.removeEventListener('wheel', preventWheelStep);
  }, [editing]);
  const resetDraft = (): void => {
    onReset();
    inputRef.current?.focus();
  };
  const presentation = getSettingPresentation(setting.key);
  const dirty = isSettingDraftChanged(draft, setting.value);
  const validation = getValidationMessage(setting.key, draft);
  const parsed = getDraftNumber(draft);
  const canStep = !disabled && parsed !== null && !validation;
  const stepDuration = (direction: -1 | 1): void => {
    if (!canStep || parsed === null) return;
    onChange(
      String(
        Math.min(definition.max, Math.max(definition.min, parsed + direction)),
      ),
    );
    inputRef.current?.focus();
  };
  const reducing =
    dirty &&
    parsed !== null &&
    !validation &&
    definition.passwordWhenDecreasing &&
    parsed < setting.value;
  const id = `system-setting-${setting.key.replaceAll('.', '-')}`;

  return (
    <form
      aria-labelledby={`${id}-title`}
      className="p-4 @min-[40rem]/page:p-5"
      data-setting-key={setting.key}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (editing && dirty && !disabled && !validation && conflict === 'none')
          onSave();
      }}
    >
      <div className="grid min-w-0 gap-4 @min-[56rem]/page:grid-cols-[minmax(0,1fr)_16rem] @min-[56rem]/page:gap-8">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h3
              className="text-foreground text-sm font-semibold"
              id={`${id}-title`}
            >
              {definition.label}
            </h3>
            {dirty ? (
              <span className="text-warning border-warning/40 rounded-[4px] border px-1.5 text-xs leading-5">
                Non enregistré
              </span>
            ) : (
              <span className="text-muted-foreground text-xs">
                {setting.value === definition.defaultValue
                  ? 'Valeur par défaut'
                  : 'Personnalisée'}
              </span>
            )}
          </div>
          <p
            className="text-muted-foreground max-w-2xl text-sm leading-6"
            id={`${id}-impact`}
          >
            {presentation.impact}
          </p>
          {(dirty || setting.version > 0) && (
            <p className="text-muted-foreground text-xs leading-5">
              {dirty
                ? `Valeur appliquée : ${formatSettingValue(setting.value, definition.unit)}.`
                : `Modifié le ${formatUpdatedAt(setting.updatedAt)}.`}
            </p>
          )}
        </div>
        {editing ? (
          <div className="w-full max-w-64 min-w-0 space-y-2">
            <Label
              className="text-muted-foreground text-xs leading-5"
              htmlFor={id}
            >
              Durée de conservation
              <span className="sr-only"> — {definition.label}</span>
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center">
                <Button
                  aria-controls={id}
                  aria-label={`Diminuer d’un jour — ${definition.label}`}
                  className={`${stepButtonClass} rounded-l-[8px] rounded-r-none`}
                  disabled={!canStep || parsed === definition.min}
                  onClick={() => stepDuration(-1)}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <Minus aria-hidden="true" className="size-4" />
                </Button>
                <Input
                  aria-describedby={`${id}-help ${id}-impact${validation ? ` ${id}-validation` : ''}`}
                  aria-invalid={validation ? true : undefined}
                  className="h-11 min-w-0 flex-1 [appearance:textfield] rounded-none border-x-0 px-2 text-center tabular-nums focus-visible:relative focus-visible:z-10 lg:h-10 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  disabled={disabled}
                  id={id}
                  inputMode="numeric"
                  max={definition.max}
                  min={definition.min}
                  onChange={(event) => onChange(event.target.value)}
                  required
                  ref={inputRef}
                  step={1}
                  type="number"
                  value={draft}
                />
                <Button
                  aria-controls={id}
                  aria-label={`Augmenter d’un jour — ${definition.label}`}
                  className={`${stepButtonClass} rounded-l-none rounded-r-[8px]`}
                  disabled={!canStep || parsed === definition.max}
                  onClick={() => stepDuration(1)}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <Plus aria-hidden="true" className="size-4" />
                </Button>
              </div>
              <span className="text-muted-foreground text-sm">
                {definition.unit === 'days' ? 'jours' : 'lignes'}
              </span>
            </div>
            <p
              className="text-muted-foreground text-xs leading-5"
              id={`${id}-help`}
            >
              Entre {definition.min.toLocaleString('fr-FR')} et{' '}
              {formatSettingValue(definition.max, definition.unit)}.{' '}
              <span className="inline-block">
                Défaut :{' '}
                {formatSettingValue(definition.defaultValue, definition.unit)}.
              </span>
            </p>
            {validation && (
              <p
                className="text-destructive text-xs leading-5"
                id={`${id}-validation`}
                role="alert"
              >
                {validation}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-end gap-2">
              {conflict === 'none' && parsed !== definition.defaultValue && (
                <Button
                  aria-label={`Rétablir la valeur par défaut — ${definition.label}`}
                  className={actionClass}
                  disabled={disabled}
                  onClick={() => {
                    onChange(String(definition.defaultValue));
                    inputRef.current?.focus();
                  }}
                  type="button"
                  variant="ghost"
                >
                  Rétablir le défaut
                </Button>
              )}
              <div className="ml-auto flex shrink-0 items-center gap-2">
                {conflict === 'none' && (
                  <Button
                    className={actionClass}
                    disabled={disabled}
                    onClick={onCancel}
                    type="button"
                    variant="ghost"
                  >
                    Annuler
                  </Button>
                )}
                <Button
                  aria-label={`Enregistrer — ${definition.label}`}
                  className={actionClass}
                  disabled={
                    disabled || !dirty || !!validation || conflict !== 'none'
                  }
                  type="submit"
                >
                  {isSaving && (
                    <Loader2
                      aria-hidden="true"
                      className="size-4 animate-spin"
                    />
                  )}
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex w-full max-w-64 min-w-0 flex-wrap items-center justify-between gap-3 self-start">
            <div>
              <p className="text-muted-foreground text-xs leading-5">
                Durée appliquée
              </p>
              <p className="text-foreground text-xl font-semibold tabular-nums">
                {formatSettingValue(setting.value, definition.unit)}
              </p>
            </div>
            {canUpdate && (
              <Button
                aria-label={`Modifier — ${definition.label}`}
                className={actionClass}
                disabled={disabled}
                onClick={onEdit}
                ref={editButtonRef}
                type="button"
                variant="outline"
              >
                Modifier
              </Button>
            )}
          </div>
        )}
      </div>
      {reducing && parsed !== null && conflict === 'none' && (
        <p className="text-warning mt-3 text-sm leading-6" role="status">
          Les données dépassant {formatSettingValue(parsed, definition.unit)}{' '}
          pourront être supprimées à la prochaine maintenance. Une confirmation
          sera demandée.
        </p>
      )}
      {conflict !== 'none' && (
        <div
          className="border-warning/40 mt-4 space-y-2 rounded-[8px] border p-3"
          role="alert"
        >
          <p className="text-warning text-sm font-medium">
            Ce réglage a été modifié par un autre administrateur.
          </p>
          <p className="text-muted-foreground text-sm leading-6">
            {conflict === 'ready'
              ? `Valeur actuelle : ${formatSettingValue(setting.value, definition.unit)}. Vérifiez votre saisie avant de l’enregistrer.`
              : 'Impossible de récupérer la valeur actuelle. Réessayez pour résoudre le conflit.'}{' '}
            Vos saisies ont été conservées.
          </p>
          <div className="flex flex-wrap gap-2">
            {conflict === 'ready' ? (
              <>
                <Button
                  className={`${actionClass} h-auto min-h-11 whitespace-normal lg:h-auto lg:min-h-10`}
                  disabled={disabled}
                  onClick={resetDraft}
                  type="button"
                  variant="outline"
                >
                  Utiliser la valeur actuelle
                </Button>
                <Button
                  className={`${actionClass} h-auto min-h-11 whitespace-normal lg:h-auto lg:min-h-10`}
                  disabled={disabled}
                  onClick={() => {
                    onKeepDraft();
                    inputRef.current?.focus();
                  }}
                  type="button"
                  variant="outline"
                >
                  Conserver ma saisie
                </Button>
              </>
            ) : (
              <Button
                className={`${actionClass} h-auto min-h-11 whitespace-normal lg:h-auto lg:min-h-10`}
                disabled={disabled}
                onClick={onReloadConflict}
                type="button"
                variant="outline"
              >
                Vérifier la valeur actuelle
              </Button>
            )}
          </div>
        </div>
      )}
      {error && (
        <p className="text-destructive mt-3 text-sm leading-6" role="alert">
          {error}
        </p>
      )}
    </form>
  );
};
