import React, { type FC } from 'react';

import { Input } from '$ui/input';
import { Label } from '$ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';
import { cn } from '$utils/css.utils';

import {
  PERSON_STRUCTURE_STATUS_LABELS,
  PERSON_STRUCTURE_STATUSES,
} from '../person.constants';
import type { PersonStructureStatus } from '../types/person.types';

export type PersonIdentityFormValue = {
  birthDate: string;
  firstName: string;
  lastName: string;
  nickname: string;
  structureStatus: PersonStructureStatus;
};

type PersonIdentityFieldsProps = {
  disabled?: boolean;
  errors: Record<string, string>;
  idPrefix: string;
  /**
   * Record view (27 October 2026): `names` (pseudo, first and last name) and
   * `situation` (birth date, structure status) go in their own rubric cards.
   */
  onChange: <TKey extends keyof PersonIdentityFormValue>(
    key: TKey,
    value: PersonIdentityFormValue[TKey],
  ) => void;
  part?: 'all' | 'names' | 'situation';
  showBirthDate?: boolean;
  value: PersonIdentityFormValue;
  variant?: 'default' | 'quiet';
};

const FieldLabel: FC<{
  htmlFor: string;
  label: string;
}> = ({ htmlFor, label }) => (
  <div className="flex min-h-6 items-center gap-1.5">
    <Label htmlFor={htmlFor}>{label}</Label>
  </div>
);

const FieldError: FC<{ id: string; message?: string }> = ({ id, message }) =>
  message ? (
    <p className="text-destructive text-xs" id={id} role="alert">
      {message}
    </p>
  ) : null;

export const PersonIdentityFields: FC<PersonIdentityFieldsProps> = ({
  disabled = false,
  errors,
  idPrefix,
  onChange,
  part = 'all',
  showBirthDate = true,
  value,
  variant = 'default',
}) => {
  const quiet = variant === 'quiet';
  const field = (
    key: keyof PersonIdentityFormValue,
  ): {
    describedBy: string | undefined;
    error: string | undefined;
    id: string;
  } => {
    const id = `${idPrefix}-${key}`;
    const error = Object.entries(errors).find(
      ([entryKey]) => entryKey === key,
    )?.[1];

    return { describedBy: error ? `${id}-error` : undefined, error, id };
  };
  const nickname = field('nickname');
  const firstName = field('firstName');
  const lastName = field('lastName');
  const birthDate = field('birthDate');
  const structureStatus = field('structureStatus');
  const showNames = part !== 'situation';
  const showSituation = part !== 'names';

  return (
    <div
      className={cn(
        'grid min-w-0 gap-4 sm:grid-cols-2',
        part === 'names' && 'lg:grid-cols-3',
      )}
    >
      {showNames && (
        <>
          <div
            className={cn(
              'min-w-0 space-y-1.5 sm:col-span-2',
              part === 'names' && 'lg:col-span-1',
            )}
          >
            <FieldLabel htmlFor={nickname.id} label="Pseudo principal" />
            <Input
              aria-describedby={
                nickname.describedBy ??
                (!quiet ? `${nickname.id}-hint` : undefined)
              }
              aria-invalid={Boolean(nickname.error)}
              disabled={disabled}
              id={nickname.id}
              maxLength={80}
              onChange={(event) => onChange('nickname', event.target.value)}
              placeholder="Pseudo principal ou habituel"
              value={value.nickname}
            />
            <FieldError id={`${nickname.id}-error`} message={nickname.error} />
            {!quiet && !nickname.error && (
              <p
                className="text-muted-foreground text-xs"
                id={`${nickname.id}-hint`}
              >
                Renseignez un pseudo, ou le prénom et le nom ci-dessous.
              </p>
            )}
          </div>
          <div className="min-w-0 space-y-1.5">
            <FieldLabel htmlFor={firstName.id} label="Prénom" />
            <Input
              aria-describedby={firstName.describedBy}
              aria-invalid={Boolean(firstName.error)}
              disabled={disabled}
              id={firstName.id}
              maxLength={100}
              onChange={(event) => onChange('firstName', event.target.value)}
              placeholder={quiet ? 'Non renseigné' : undefined}
              value={value.firstName}
            />
            <FieldError
              id={`${firstName.id}-error`}
              message={firstName.error}
            />
          </div>
          <div className="min-w-0 space-y-1.5">
            <FieldLabel htmlFor={lastName.id} label="Nom" />
            <Input
              aria-describedby={lastName.describedBy}
              aria-invalid={Boolean(lastName.error)}
              disabled={disabled}
              id={lastName.id}
              maxLength={100}
              onChange={(event) => onChange('lastName', event.target.value)}
              placeholder={quiet ? 'Non renseigné' : undefined}
              value={value.lastName}
            />
            <FieldError id={`${lastName.id}-error`} message={lastName.error} />
          </div>
        </>
      )}
      {showSituation && showBirthDate && (
        <div className="min-w-0 space-y-1.5">
          <FieldLabel htmlFor={birthDate.id} label="Date de naissance" />
          <Input
            aria-describedby={
              birthDate.describedBy ??
              (!quiet ? `${birthDate.id}-hint` : undefined)
            }
            aria-invalid={Boolean(birthDate.error)}
            disabled={disabled}
            id={birthDate.id}
            onChange={(event) => onChange('birthDate', event.target.value)}
            type="date"
            value={value.birthDate}
          />
          <FieldError id={`${birthDate.id}-error`} message={birthDate.error} />
          {!quiet && !birthDate.error && (
            <p
              className="text-muted-foreground text-xs"
              id={`${birthDate.id}-hint`}
            >
              Facultative, utile pour l&apos;âge légal et les anniversaires.
            </p>
          )}
        </div>
      )}
      {showSituation && (
        <div
          className={cn(
            'min-w-0 space-y-1.5',
            !showBirthDate && 'sm:col-span-2 sm:max-w-sm',
          )}
        >
          <FieldLabel
            htmlFor={structureStatus.id}
            label="Statut dans la structure"
          />
          <Select
            disabled={disabled}
            onValueChange={(nextValue) =>
              onChange('structureStatus', nextValue as PersonStructureStatus)
            }
            value={value.structureStatus}
          >
            <SelectTrigger
              aria-describedby={structureStatus.describedBy}
              aria-invalid={Boolean(structureStatus.error)}
              className="w-full min-w-0"
              id={structureStatus.id}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERSON_STRUCTURE_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status === 'IN_STRUCTURE'
                    ? PERSON_STRUCTURE_STATUS_LABELS.IN_STRUCTURE
                    : PERSON_STRUCTURE_STATUS_LABELS.OUTSIDE_STRUCTURE}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError
            id={`${structureStatus.id}-error`}
            message={structureStatus.error}
          />
        </div>
      )}
    </div>
  );
};
