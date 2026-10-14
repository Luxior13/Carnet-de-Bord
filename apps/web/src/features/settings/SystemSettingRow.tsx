'use client';

import { History, Minus, Plus } from 'lucide-react';
import React, { type FC, useEffect, useRef } from 'react';

import { SectionActionBar } from '$components/layout/SectionActionBar';
import { getSystemSettingDefinition } from '$constants/system-setting-catalog.constants';
import { Button } from '$ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '$ui/card';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { ServiceIcon } from '$ui/service-icon';

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
  conflictReason?: 'concurrent' | 'unknown';
  disabled: boolean;
  draft: string;
  error?: string;
  isRefreshing?: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (value: string) => void;
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
  conflictReason = 'concurrent',
  disabled,
  draft,
  error,
  isRefreshing = false,
  isSaving,
  onCancel,
  onChange,
  onKeepDraft,
  onReloadConflict,
  onReset,
  onSave,
  setting,
}) => {
  const definition = getSystemSettingDefinition(setting.key);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasBusy = useRef(false);
  const editing = canUpdate;
  const busy = isSaving || isRefreshing;
  const unconfirmed =
    conflict === 'unavailable' && conflictReason === 'unknown';

  useEffect(() => {
    if (
      wasBusy.current &&
      !busy &&
      !disabled &&
      editing &&
      document.activeElement === document.body &&
      !document.querySelector(
        '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
      )
    ) {
      inputRef.current?.focus({ preventScroll: true });
    }
    wasBusy.current = busy;
  }, [busy, disabled, editing]);

  useEffect(() => {
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
  const draftChanged = isSettingDraftChanged(draft, setting.value);
  const dirty = draftChanged || (canUpdate && setting.isStoredValueInvalid);
  const showActions =
    editing && (dirty || conflict !== 'none' || busy || !!error);
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
    (setting.isStoredValueInvalid || parsed < setting.value);
  const id = `system-setting-${setting.key.replaceAll('.', '-')}`;

  return (
    <form
      autoComplete="off"
      aria-busy={busy || undefined}
      aria-labelledby={`${id}-title`}
      className="space-y-4"
      data-setting-key={setting.key}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (editing && dirty && !disabled && !validation && conflict === 'none')
          onSave();
      }}
    >
      <Card>
        <CardHeader className="p-3.5 sm:p-4">
          <div className="flex min-w-0 items-start gap-3">
            <ServiceIcon className="size-8">
              <History aria-hidden="true" className="size-4" />
            </ServiceIcon>
            <div className="min-w-0">
              <CardTitle id={`${id}-title`}>{presentation.title}</CardTitle>
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                {presentation.description}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-5">
          {setting.isStoredValueInvalid && (
            <p className="text-warning text-sm leading-6" role="alert">
              <strong className="font-medium">Valeur à réparer.</strong> Le
              nettoyage du journal est bloqué. La durée proposée ci-dessous est
              le défaut logiciel, pas une durée appliquée.
            </p>
          )}
          {unconfirmed && (
            <p className="text-warning text-sm leading-6" role="status">
              Le dernier enregistrement reste à vérifier. Vérifiez la valeur
              affichée avant une nouvelle modification.
            </p>
          )}
          <div className="space-y-2">
            {editing ? (
              <>
                <Label className="text-sm" htmlFor={id}>
                  {setting.isStoredValueInvalid
                    ? 'Durée proposée'
                    : 'Durée de conservation'}
                  <span className="sr-only"> — {definition.label}</span>
                </Label>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="flex w-full max-w-80 items-center gap-2">
                    <div className="flex min-w-0 flex-1 items-center">
                      <Button
                        aria-controls={id}
                        aria-label={`Diminuer d'un jour — ${definition.label}`}
                        className={`${stepButtonClass} rounded-l-[6px] rounded-r-none`}
                        disabled={!canStep || parsed === definition.min}
                        onClick={() => stepDuration(-1)}
                        size="icon"
                        type="button"
                        variant="outline"
                      >
                        <Minus aria-hidden="true" className="size-4" />
                      </Button>
                      <Input
                        aria-describedby={`${id}-help ${id}-impact${validation ? ` ${id}-validation` : ''}${error ? ` ${id}-error` : ''}${conflict !== 'none' ? ` ${id}-conflict` : ''}`}
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
                        aria-label={`Augmenter d'un jour — ${definition.label}`}
                        className={`${stepButtonClass} rounded-l-none rounded-r-[6px]`}
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
                  {conflict === 'none' &&
                    parsed !== definition.defaultValue && (
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
              </>
            ) : (
              <div>
                <p className="text-muted-foreground text-xs">
                  {setting.isStoredValueInvalid
                    ? 'Durée proposée'
                    : 'Durée appliquée'}
                </p>
                <p className="text-foreground text-xl font-semibold tabular-nums">
                  {formatSettingValue(setting.value, definition.unit)}
                </p>
              </div>
            )}
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
            {dirty && !setting.isStoredValueInvalid && (
              <p className="text-muted-foreground text-xs leading-5">
                {unconfirmed ? 'Dernière valeur connue' : 'Valeur appliquée'} :{' '}
                {formatSettingValue(setting.value, definition.unit)}.
              </p>
            )}
            {editing && validation && (
              <p
                className="text-destructive text-xs leading-5"
                id={`${id}-validation`}
                role="alert"
              >
                {validation}
              </p>
            )}
          </div>
          {reducing && parsed !== null && conflict === 'none' && (
            <p className="text-warning mt-3 text-sm leading-6" role="status">
              {setting.isStoredValueInvalid ? 'Après réparation, les' : 'Les'}{' '}
              données dépassant {formatSettingValue(parsed, definition.unit)}{' '}
              pourront être supprimées à la prochaine maintenance. Une
              confirmation sera demandée.
            </p>
          )}
          {editing && conflict !== 'none' && (
            <div
              className="border-warning/40 mt-4 space-y-2 rounded-[8px] border p-3"
              id={`${id}-conflict`}
              role="alert"
            >
              <p className="text-warning text-sm font-medium">
                {conflictReason === 'unknown'
                  ? 'Le résultat de l’enregistrement doit être vérifié.'
                  : 'Ce réglage a été modifié par un autre administrateur.'}
              </p>
              <p className="text-muted-foreground text-sm leading-6">
                {isRefreshing
                  ? 'Vérification de la valeur actuelle…'
                  : conflict === 'ready'
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
                    {isRefreshing
                      ? 'Vérification…'
                      : 'Vérifier la valeur actuelle'}
                  </Button>
                )}
              </div>
            </div>
          )}
          {editing && error && (
            <p
              className="text-destructive mt-3 text-sm leading-6"
              id={`${id}-error`}
              role="alert"
            >
              {error}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 px-4 py-3 sm:px-5 sm:py-3">
          <p
            className="text-muted-foreground text-xs leading-5"
            id={`${id}-impact`}
          >
            {presentation.impact}
          </p>
          {setting.version > 0 && (
            <p className="text-muted-foreground text-xs leading-5">
              Dernière modification le {formatUpdatedAt(setting.updatedAt)}.
            </p>
          )}
        </CardFooter>
      </Card>
      {showActions && (
        <SectionActionBar
          cancelDisabled={!draftChanged && conflict !== 'ready'}
          disabled={disabled}
          hasChanges={dirty}
          isSaving={isSaving}
          isResolvingConflict={isRefreshing}
          label={`Enregistrement — ${definition.label}`}
          onCancel={() => {
            onCancel();
            inputRef.current?.focus();
          }}
          placement="inline"
          saveAriaLabel={`Enregistrer — ${definition.label}`}
          saveDisabled={!!validation || conflict !== 'none'}
          saveDisabledReason={
            conflict !== 'none'
              ? 'Vérifiez la valeur actuelle avant d’enregistrer.'
              : undefined
          }
          saveType="submit"
          status={
            conflict !== 'none'
              ? 'Enregistrement suspendu'
              : setting.isStoredValueInvalid
                ? 'Réparation à enregistrer'
                : undefined
          }
        />
      )}
    </form>
  );
};
