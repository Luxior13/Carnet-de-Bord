'use client';

import { Loader2 } from 'lucide-react';
import React, { type FC, useRef } from 'react';

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
  isSaving: boolean;
  onChange: (value: string) => void;
  onKeepDraft: () => void;
  onReloadConflict: () => void;
  onReset: () => void;
  onSave: () => void;
  setting: NormalizedSystemSettingItem;
};

const actionClass = 'h-11 rounded-[8px] px-3 lg:h-10';

export const SystemSettingRow: FC<SystemSettingRowProps> = ({
  canUpdate,
  conflict,
  disabled,
  draft,
  error,
  isSaving,
  onChange,
  onKeepDraft,
  onReloadConflict,
  onReset,
  onSave,
  setting,
}) => {
  const definition = getSystemSettingDefinition(setting.key);
  const inputRef = useRef<HTMLInputElement>(null);
  const resetDraft = (): void => {
    onReset();
    inputRef.current?.focus();
  };
  const presentation = getSettingPresentation(setting.key);
  const dirty = isSettingDraftChanged(draft, setting.value);
  const validation = getValidationMessage(setting.key, draft);
  const parsed = getDraftNumber(draft);
  const reducing =
    dirty &&
    parsed !== null &&
    !validation &&
    definition.passwordWhenDecreasing &&
    parsed < setting.value;
  const id = `system-setting-${setting.key.replaceAll('.', '-')}`;
  const fieldLabel =
    definition.unit === 'rows'
      ? 'Lignes par page'
      : `Durée de conservation — ${definition.label}`;

  return (
    <form
      aria-labelledby={`${id}-title`}
      className="p-4 @min-[40rem]/page:p-5"
      data-setting-key={setting.key}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (
          canUpdate &&
          dirty &&
          !disabled &&
          !validation &&
          conflict === 'none'
        )
          onSave();
      }}
    >
      <div className="grid min-w-0 gap-4 @min-[56rem]/page:grid-cols-[minmax(0,1fr)_19rem] @min-[56rem]/page:gap-8">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h3
              className="text-foreground text-sm font-semibold"
              id={`${id}-title`}
            >
              {definition.unit === 'rows'
                ? 'Lignes par page'
                : definition.label}
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
          <p className="text-muted-foreground text-xs leading-5">
            {dirty
              ? `Valeur appliquée : ${formatSettingValue(setting.value, definition.unit)}.`
              : setting.version === 0
                ? 'Jamais modifié.'
                : `Modifié le ${formatUpdatedAt(setting.updatedAt)}.`}
          </p>
        </div>
        {canUpdate ? (
          <div className="min-w-0 space-y-2">
            <Label className="sr-only" htmlFor={id}>
              {fieldLabel}
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                aria-describedby={`${id}-help ${id}-impact${validation ? ` ${id}-validation` : ''}`}
                aria-invalid={validation ? true : undefined}
                className="h-11 w-24 rounded-[8px] tabular-nums lg:h-10"
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
              <span className="text-muted-foreground text-sm">
                {definition.unit === 'days' ? 'jours' : 'lignes'}
              </span>
              <Button
                aria-label={`Enregistrer — ${definition.label}`}
                className={`${actionClass} ml-auto`}
                disabled={
                  disabled || !dirty || !!validation || conflict !== 'none'
                }
                type="submit"
              >
                {isSaving && (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                )}
                Enregistrer
              </Button>
            </div>
            <p
              className="text-muted-foreground text-xs leading-5"
              id={`${id}-help`}
            >
              {definition.min.toLocaleString('fr-FR')}–
              {definition.max.toLocaleString('fr-FR')}. Par défaut :{' '}
              {definition.defaultValue.toLocaleString('fr-FR')}.
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
            {(dirty || parsed !== definition.defaultValue) &&
              conflict === 'none' && (
                <div className="flex flex-wrap items-center gap-1">
                  {dirty && (
                    <Button
                      className={actionClass}
                      disabled={disabled}
                      onClick={resetDraft}
                      type="button"
                      variant="ghost"
                    >
                      Annuler
                    </Button>
                  )}
                  {parsed !== definition.defaultValue && (
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
                </div>
              )}
          </div>
        ) : (
          <p className="text-foreground text-lg font-semibold tabular-nums">
            {formatSettingValue(setting.value, definition.unit)}
          </p>
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
