import { History } from 'lucide-react';
import React, { type FC } from 'react';

import { Button } from '$ui/button';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';

import {
  PERSON_STRUCTURE_STATUS_LABELS,
  PERSON_STRUCTURE_STATUSES,
} from '../person.constants';
import type { PersonStructureStatus } from '../types/person.types';
import type { PersonFieldHistoryTarget } from './PersonFieldHistoryPanel';

export type PersonIdentityFormValue = {
  birthDate: string;
  firstName: string;
  lastName: string;
  nickname: string;
  structureStatus: PersonStructureStatus;
};

type PersonIdentityFieldsProps = {
  activeHistoryFieldKey?: string;
  disabled?: boolean;
  errors: Record<string, string>;
  histories?: Readonly<
    Partial<Record<keyof PersonIdentityFormValue, PersonFieldHistoryTarget>>
  >;
  idPrefix: string;
  onChange: <TKey extends keyof PersonIdentityFormValue>(
    key: TKey,
    value: PersonIdentityFormValue[TKey],
  ) => void;
  onHistoryOpen?: (target: PersonFieldHistoryTarget) => void;
  value: PersonIdentityFormValue;
};

const HistoryAction: FC<{
  activeFieldKey?: string;
  onOpen?: (target: PersonFieldHistoryTarget) => void;
  target?: PersonFieldHistoryTarget;
}> = ({ activeFieldKey, onOpen, target }) =>
  target && onOpen ? (
    <Button
      aria-label={`Afficher l'historique : ${target.label}`}
      aria-pressed={activeFieldKey === target.fieldKey}
      className="size-6 shrink-0"
      onClick={() => onOpen(target)}
      size="icon"
      type="button"
      variant={activeFieldKey === target.fieldKey ? 'secondary' : 'ghost'}
    >
      <History className="size-3.5" />
    </Button>
  ) : null;

const FieldLabel: FC<{
  activeHistoryFieldKey?: string;
  history?: PersonFieldHistoryTarget;
  htmlFor: string;
  label: string;
  onHistoryOpen?: (target: PersonFieldHistoryTarget) => void;
}> = ({ activeHistoryFieldKey, history, htmlFor, label, onHistoryOpen }) => (
  <div className="flex items-center gap-1.5">
    <Label htmlFor={htmlFor}>{label}</Label>
    <HistoryAction
      activeFieldKey={activeHistoryFieldKey}
      onOpen={onHistoryOpen}
      target={history}
    />
  </div>
);

const FieldError: FC<{ id: string; message?: string }> = ({ id, message }) =>
  message ? (
    <p className="text-destructive text-xs" id={id} role="alert">
      {message}
    </p>
  ) : null;

export const PersonIdentityFields: FC<PersonIdentityFieldsProps> = ({
  activeHistoryFieldKey,
  disabled = false,
  errors,
  histories,
  idPrefix,
  onChange,
  onHistoryOpen,
  value,
}) => {
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

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <FieldLabel
          activeHistoryFieldKey={activeHistoryFieldKey}
          history={histories?.nickname}
          htmlFor={nickname.id}
          label="Pseudo principal"
          onHistoryOpen={onHistoryOpen}
        />
        <Input
          aria-describedby={nickname.describedBy ?? `${nickname.id}-hint`}
          aria-invalid={Boolean(nickname.error)}
          disabled={disabled}
          id={nickname.id}
          maxLength={80}
          onChange={(event) => onChange('nickname', event.target.value)}
          placeholder="Pseudo utilisé dans la structure"
          value={value.nickname}
        />
        <FieldError id={`${nickname.id}-error`} message={nickname.error} />
        {!nickname.error && (
          <p
            className="text-muted-foreground text-xs"
            id={`${nickname.id}-hint`}
          >
            Renseignez un pseudo, ou le prénom et le nom ci-dessous.
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <FieldLabel
          activeHistoryFieldKey={activeHistoryFieldKey}
          history={histories?.firstName}
          htmlFor={firstName.id}
          label="Prénom"
          onHistoryOpen={onHistoryOpen}
        />
        <Input
          aria-describedby={firstName.describedBy}
          aria-invalid={Boolean(firstName.error)}
          disabled={disabled}
          id={firstName.id}
          maxLength={100}
          onChange={(event) => onChange('firstName', event.target.value)}
          value={value.firstName}
        />
        <FieldError id={`${firstName.id}-error`} message={firstName.error} />
      </div>
      <div className="space-y-1.5">
        <FieldLabel
          activeHistoryFieldKey={activeHistoryFieldKey}
          history={histories?.lastName}
          htmlFor={lastName.id}
          label="Nom"
          onHistoryOpen={onHistoryOpen}
        />
        <Input
          aria-describedby={lastName.describedBy}
          aria-invalid={Boolean(lastName.error)}
          disabled={disabled}
          id={lastName.id}
          maxLength={100}
          onChange={(event) => onChange('lastName', event.target.value)}
          value={value.lastName}
        />
        <FieldError id={`${lastName.id}-error`} message={lastName.error} />
      </div>
      <div className="space-y-1.5">
        <FieldLabel
          activeHistoryFieldKey={activeHistoryFieldKey}
          history={histories?.birthDate}
          htmlFor={birthDate.id}
          label="Date de naissance"
          onHistoryOpen={onHistoryOpen}
        />
        <Input
          aria-describedby={birthDate.describedBy ?? `${birthDate.id}-hint`}
          aria-invalid={Boolean(birthDate.error)}
          disabled={disabled}
          id={birthDate.id}
          onChange={(event) => onChange('birthDate', event.target.value)}
          type="date"
          value={value.birthDate}
        />
        <FieldError id={`${birthDate.id}-error`} message={birthDate.error} />
        {!birthDate.error && (
          <p
            className="text-muted-foreground text-xs"
            id={`${birthDate.id}-hint`}
          >
            Facultative, utile pour l&apos;âge légal et les anniversaires.
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <FieldLabel
          activeHistoryFieldKey={activeHistoryFieldKey}
          history={histories?.structureStatus}
          htmlFor={structureStatus.id}
          label="Statut dans la structure"
          onHistoryOpen={onHistoryOpen}
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
    </div>
  );
};
