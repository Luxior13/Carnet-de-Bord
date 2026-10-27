'use client';

import { AlertTriangle, History } from 'lucide-react';
import React, { type FC, useEffect, useRef } from 'react';

import { SectionActionBar } from '$components/layout/SectionActionBar';
import { getSystemSettingDefinition } from '$constants/system-setting-catalog.constants';
import { Button } from '$ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '$ui/card';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { ServiceIcon } from '$ui/service-icon';
import { cn } from '$utils/css.utils';

import {
  formatDaysAsYears,
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

const actionClass = 'h-11 rounded-control px-3 lg:h-10';
/** Same framed warning as the other forms (27 October 2026). */
const warningClass =
  'text-muted-foreground border-warning/25 bg-warning/10 flex w-fit max-w-prose items-start gap-2 rounded-md border px-3 py-2 text-xs leading-5';

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
            <ServiceIcon className="border-primary/30 bg-primary/10 text-primary-emphasis size-8">
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
            <p className={warningClass} role="alert">
              <AlertTriangle className="text-warning mt-0.5 size-3.5 shrink-0" />
              <span>
                <strong className="text-warning font-medium">
                  Valeur à réparer.
                </strong>{' '}
                Le nettoyage du journal est bloqué. La durée proposée ci-dessous
                est le défaut logiciel, pas une durée appliquée.
              </span>
            </p>
          )}
          {unconfirmed && (
            <p className={warningClass} role="status">
              <AlertTriangle className="text-warning mt-0.5 size-3.5 shrink-0" />
              <span>
                Le dernier enregistrement reste à vérifier. Vérifiez la valeur
                affichée avant une nouvelle modification.
              </span>
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
                {/* Usual durations in one click; the field keeps any value. */}
                <div
                  aria-label={`Durées courantes — ${definition.label}`}
                  className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap"
                  role="group"
                >
                  {presentation.presets.map((preset) => {
                    const selected = parsed === preset;

                    return (
                      <Button
                        aria-pressed={selected}
                        className={cn(
                          'rounded-control h-11 gap-1.5 px-3 lg:h-9',
                          selected &&
                            'border-primary bg-primary/15 text-foreground hover:bg-primary/20',
                        )}
                        disabled={disabled || conflict !== 'none'}
                        key={preset}
                        onClick={() => onChange(String(preset))}
                        type="button"
                        variant="outline"
                      >
                        {formatDaysAsYears(preset)}
                        {preset === definition.defaultValue && (
                          <span className="text-muted-foreground text-xs font-normal">
                            (défaut)
                          </span>
                        )}
                      </Button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Input
                    aria-describedby={`${id}-help ${id}-impact${validation ? ` ${id}-validation` : ''}${error ? ` ${id}-error` : ''}${conflict !== 'none' ? ` ${id}-conflict` : ''}`}
                    aria-invalid={validation ? true : undefined}
                    className="h-11 w-28 [appearance:textfield] text-center tabular-nums lg:h-10 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
                    {definition.unit === 'days' &&
                      parsed !== null &&
                      !validation && (
                        <span className="text-foreground">
                          {' '}
                          · soit {formatDaysAsYears(parsed)}
                        </span>
                      )}
                  </span>
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
              {!editing && (
                <span className="inline-block">
                  Défaut :{' '}
                  {formatSettingValue(definition.defaultValue, definition.unit)}
                  .
                </span>
              )}
            </p>
            {dirty && !setting.isStoredValueInvalid && (
              <p className="text-muted-foreground text-xs leading-5">
                {unconfirmed ? 'Dernière valeur connue' : 'Valeur appliquée'} :{' '}
                {formatSettingValue(setting.value, definition.unit)}.
              </p>
            )}
            <p
              className="text-muted-foreground max-w-prose text-xs leading-5"
              id={`${id}-impact`}
            >
              {presentation.impact}
            </p>
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
            <p className={warningClass} role="status">
              <AlertTriangle className="text-warning mt-0.5 size-3.5 shrink-0" />
              <span>
                {setting.isStoredValueInvalid ? 'Après réparation, les' : 'Les'}{' '}
                données dépassant {formatSettingValue(parsed, definition.unit)}{' '}
                pourront être supprimées au prochain nettoyage. Une confirmation
                sera demandée.
              </span>
            </p>
          )}
          {editing && conflict !== 'none' && (
            <div
              className="border-warning/40 rounded-control mt-4 space-y-2 border p-3"
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
        {setting.version > 0 && (
          <CardFooter className="px-4 py-3 sm:px-5 sm:py-3">
            <p className="text-muted-foreground text-xs leading-5">
              Dernière modification le {formatUpdatedAt(setting.updatedAt)}.
            </p>
          </CardFooter>
        )}
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
