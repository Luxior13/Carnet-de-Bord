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
import { Switch } from '$ui/switch';

import {
  PERSON_CONTACT_LABEL_SUGGESTIONS,
  PERSON_SOCIAL_LABEL_SUGGESTIONS,
  PERSON_SOCIAL_NETWORKS,
} from '../person.constants';
import type { PersonFieldHistoryTarget } from './PersonFieldHistoryPanel';
import { PersonSocialNetworkIcon } from './PersonSocialNetworkIcon';

export type EmailDraft = {
  email: string;
  isPrimary: boolean;
  label: string;
};

export type PhoneDraft = {
  countryCode: string;
  isPrimary: boolean;
  label: string;
  phone: string;
};

export type SocialDraft = {
  identifier: string;
  isPrimary: boolean;
  label: string;
  networkKey: string;
  profileUrl: string;
};

type FieldErrors = Record<string, string>;
type FieldHistories = Readonly<
  Partial<Record<string, PersonFieldHistoryTarget>>
>;
type OpenHistory = (target: PersonFieldHistoryTarget) => void;
type FieldsLayout = 'grid' | 'stacked';

const HistoryAction: FC<{
  activeFieldKey?: string;
  onOpen?: OpenHistory;
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

const COUNTRY_OPTIONS = [
  ['FR', 'France (+33)'],
  ['BE', 'Belgique (+32)'],
  ['CH', 'Suisse (+41)'],
  ['LU', 'Luxembourg (+352)'],
  ['DE', 'Allemagne (+49)'],
  ['ES', 'Espagne (+34)'],
  ['IT', 'Italie (+39)'],
  ['GB', 'Royaume-Uni (+44)'],
  ['CA', 'Canada (+1)'],
  ['US', 'États-Unis (+1)'],
] as const;

const FieldError: FC<{ id: string; message?: string }> = ({ id, message }) =>
  message ? (
    <p className="text-destructive text-xs" id={id} role="alert">
      {message}
    </p>
  ) : null;

const FieldWarning: FC<{ id: string; message?: string }> = ({ id, message }) =>
  message ? (
    <p className="text-warning text-xs" id={id} role="status">
      {message}
    </p>
  ) : null;

const fieldError = (
  errors: FieldErrors,
  keyPrefix: string,
  key: string,
): string | undefined => {
  const candidates = new Set([`${keyPrefix}${key}`, key]);

  return Object.entries(errors).find(([entryKey]) =>
    candidates.has(entryKey),
  )?.[1];
};

const LabelField: FC<{
  activeHistoryFieldKey?: string;
  disabled?: boolean;
  errors: FieldErrors;
  history?: PersonFieldHistoryTarget;
  idPrefix: string;
  keyPrefix?: string;
  listId: string;
  onChange: (value: string) => void;
  onHistoryOpen?: OpenHistory;
  suggestions: readonly string[];
  value: string;
}> = ({
  activeHistoryFieldKey,
  disabled,
  errors,
  history,
  idPrefix,
  keyPrefix = '',
  listId,
  onChange,
  onHistoryOpen,
  suggestions,
  value,
}) => {
  const error = fieldError(errors, keyPrefix, 'label');

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={`${idPrefix}-label`} required>
          Libellé
        </Label>
        <HistoryAction
          activeFieldKey={activeHistoryFieldKey}
          onOpen={onHistoryOpen}
          target={history}
        />
      </div>
      <Input
        aria-describedby={error ? `${idPrefix}-label-error` : undefined}
        aria-invalid={Boolean(error)}
        disabled={disabled}
        id={`${idPrefix}-label`}
        list={listId}
        maxLength={40}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Personnel"
        value={value}
      />
      <datalist id={listId}>
        {suggestions.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      <FieldError id={`${idPrefix}-label-error`} message={error} />
    </div>
  );
};

const PrimarySwitch: FC<{
  activeHistoryFieldKey?: string;
  checked: boolean;
  disabled?: boolean;
  history?: PersonFieldHistoryTarget;
  id: string;
  label: string;
  onChange: (checked: boolean) => void;
  onHistoryOpen?: OpenHistory;
}> = ({
  activeHistoryFieldKey,
  checked,
  disabled,
  history,
  id,
  label,
  onChange,
  onHistoryOpen,
}) => (
  <div className="border-border-default bg-surface-inset flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
    <Label className="leading-5" htmlFor={id}>
      {label}
    </Label>
    <div className="flex items-center gap-1">
      <HistoryAction
        activeFieldKey={activeHistoryFieldKey}
        onOpen={onHistoryOpen}
        target={history}
      />
      <Switch
        checked={checked}
        disabled={disabled}
        id={id}
        onCheckedChange={onChange}
      />
    </div>
  </div>
);

type EmailFieldsProps = {
  activeHistoryFieldKey?: string;
  disabled?: boolean;
  errors: FieldErrors;
  histories?: FieldHistories;
  idPrefix: string;
  keyPrefix?: string;
  layout?: FieldsLayout;
  onChange: (value: EmailDraft) => void;
  onHistoryOpen?: OpenHistory;
  showPrimarySwitch?: boolean;
  value: EmailDraft;
  warnings?: FieldErrors;
};

export const EmailFields: FC<EmailFieldsProps> = ({
  activeHistoryFieldKey,
  disabled,
  errors,
  histories,
  idPrefix,
  keyPrefix = '',
  layout = 'grid',
  onChange,
  onHistoryOpen,
  showPrimarySwitch = true,
  value,
  warnings = {},
}) => {
  const emailError = fieldError(errors, keyPrefix, 'email');
  const emailWarning = fieldError(warnings, keyPrefix, 'email');

  return (
    <div
      className={`grid gap-4 ${layout === 'grid' ? 'sm:grid-cols-2' : 'grid-cols-1'}`}
    >
      <div
        className={`space-y-1.5 ${layout === 'grid' ? 'sm:col-span-2' : ''}`}
      >
        <div className="flex items-center gap-1.5">
          <Label htmlFor={`${idPrefix}-email`} required>
            Email
          </Label>
          <HistoryAction
            activeFieldKey={activeHistoryFieldKey}
            onOpen={onHistoryOpen}
            target={histories?.email}
          />
        </div>
        <Input
          aria-describedby={
            emailError
              ? `${idPrefix}-email-error`
              : emailWarning
                ? `${idPrefix}-email-warning`
                : undefined
          }
          aria-invalid={Boolean(emailError)}
          autoComplete="email"
          disabled={disabled}
          id={`${idPrefix}-email`}
          maxLength={320}
          onChange={(event) =>
            onChange({ ...value, email: event.target.value })
          }
          placeholder="nom@exemple.fr"
          type="email"
          value={value.email}
        />
        <FieldError id={`${idPrefix}-email-error`} message={emailError} />
        <FieldWarning id={`${idPrefix}-email-warning`} message={emailWarning} />
      </div>
      <LabelField
        activeHistoryFieldKey={activeHistoryFieldKey}
        disabled={disabled}
        errors={errors}
        idPrefix={idPrefix}
        history={histories?.label}
        keyPrefix={keyPrefix}
        listId={`${idPrefix}-contact-labels`}
        onChange={(label) => onChange({ ...value, label })}
        onHistoryOpen={onHistoryOpen}
        suggestions={PERSON_CONTACT_LABEL_SUGGESTIONS}
        value={value.label}
      />
      {(showPrimarySwitch || histories?.isPrimary) && (
        <PrimarySwitch
          activeHistoryFieldKey={activeHistoryFieldKey}
          checked={value.isPrimary}
          disabled={disabled || !showPrimarySwitch}
          history={histories?.isPrimary}
          id={`${idPrefix}-primary`}
          label="Email principal"
          onChange={(isPrimary) => onChange({ ...value, isPrimary })}
          onHistoryOpen={onHistoryOpen}
        />
      )}
    </div>
  );
};

type PhoneFieldsProps = {
  activeHistoryFieldKey?: string;
  disabled?: boolean;
  errors: FieldErrors;
  histories?: FieldHistories;
  idPrefix: string;
  keyPrefix?: string;
  layout?: FieldsLayout;
  onChange: (value: PhoneDraft) => void;
  onHistoryOpen?: OpenHistory;
  showPrimarySwitch?: boolean;
  value: PhoneDraft;
  warnings?: FieldErrors;
};

export const PhoneFields: FC<PhoneFieldsProps> = ({
  activeHistoryFieldKey,
  disabled,
  errors,
  histories,
  idPrefix,
  keyPrefix = '',
  layout = 'grid',
  onChange,
  onHistoryOpen,
  showPrimarySwitch = true,
  value,
  warnings = {},
}) => {
  const phoneError = fieldError(errors, keyPrefix, 'phone');
  const phoneWarning = fieldError(warnings, keyPrefix, 'phone');
  const countryError = fieldError(errors, keyPrefix, 'countryCode');

  return (
    <div
      className={`grid gap-4 ${layout === 'grid' ? 'sm:grid-cols-2' : 'grid-cols-1'}`}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-country`} required>
          Pays
        </Label>
        <Select
          disabled={disabled}
          onValueChange={(countryCode) => onChange({ ...value, countryCode })}
          value={value.countryCode}
        >
          <SelectTrigger
            aria-describedby={
              countryError ? `${idPrefix}-country-error` : undefined
            }
            aria-invalid={Boolean(countryError)}
            id={`${idPrefix}-country`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_OPTIONS.map(([code, label]) => (
              <SelectItem key={code} value={code}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError id={`${idPrefix}-country-error`} message={countryError} />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label htmlFor={`${idPrefix}-phone`} required>
            Numéro
          </Label>
          <HistoryAction
            activeFieldKey={activeHistoryFieldKey}
            onOpen={onHistoryOpen}
            target={histories?.phone}
          />
        </div>
        <Input
          aria-describedby={
            phoneError
              ? `${idPrefix}-phone-error`
              : phoneWarning
                ? `${idPrefix}-phone-warning`
                : undefined
          }
          aria-invalid={Boolean(phoneError)}
          autoComplete="tel"
          disabled={disabled}
          id={`${idPrefix}-phone`}
          maxLength={40}
          onChange={(event) =>
            onChange({ ...value, phone: event.target.value })
          }
          placeholder="06 12 34 56 78"
          type="tel"
          value={value.phone}
        />
        <FieldError id={`${idPrefix}-phone-error`} message={phoneError} />
        <FieldWarning id={`${idPrefix}-phone-warning`} message={phoneWarning} />
      </div>
      <LabelField
        activeHistoryFieldKey={activeHistoryFieldKey}
        disabled={disabled}
        errors={errors}
        idPrefix={idPrefix}
        history={histories?.label}
        keyPrefix={keyPrefix}
        listId={`${idPrefix}-contact-labels`}
        onChange={(label) => onChange({ ...value, label })}
        onHistoryOpen={onHistoryOpen}
        suggestions={PERSON_CONTACT_LABEL_SUGGESTIONS}
        value={value.label}
      />
      {(showPrimarySwitch || histories?.isPrimary) && (
        <PrimarySwitch
          activeHistoryFieldKey={activeHistoryFieldKey}
          checked={value.isPrimary}
          disabled={disabled || !showPrimarySwitch}
          history={histories?.isPrimary}
          id={`${idPrefix}-primary`}
          label="Téléphone principal"
          onChange={(isPrimary) => onChange({ ...value, isPrimary })}
          onHistoryOpen={onHistoryOpen}
        />
      )}
    </div>
  );
};

type SocialFieldsProps = {
  activeHistoryFieldKey?: string;
  disabled?: boolean;
  errors: FieldErrors;
  histories?: FieldHistories;
  idPrefix: string;
  keyPrefix?: string;
  layout?: FieldsLayout;
  onChange: (value: SocialDraft) => void;
  onHistoryOpen?: OpenHistory;
  showPrimarySwitch?: boolean;
  value: SocialDraft;
  warnings?: FieldErrors;
};

export const SocialFields: FC<SocialFieldsProps> = ({
  activeHistoryFieldKey,
  disabled,
  errors,
  histories,
  idPrefix,
  keyPrefix = '',
  layout = 'grid',
  onChange,
  onHistoryOpen,
  showPrimarySwitch = true,
  value,
  warnings = {},
}) => {
  const networkError = fieldError(errors, keyPrefix, 'networkKey');
  const identifierError = fieldError(errors, keyPrefix, 'identifier');
  const identifierWarning = fieldError(warnings, keyPrefix, 'identifier');
  const urlError = fieldError(errors, keyPrefix, 'profileUrl');
  const urlWarning = fieldError(warnings, keyPrefix, 'profileUrl');

  return (
    <div
      className={`grid gap-4 ${layout === 'grid' ? 'sm:grid-cols-2' : 'grid-cols-1'}`}
    >
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label htmlFor={`${idPrefix}-network`} required>
            Réseau
          </Label>
          <HistoryAction
            activeFieldKey={activeHistoryFieldKey}
            onOpen={onHistoryOpen}
            target={histories?.networkKey}
          />
        </div>
        <Select
          disabled={disabled}
          onValueChange={(networkKey) => onChange({ ...value, networkKey })}
          value={value.networkKey}
        >
          <SelectTrigger
            aria-describedby={
              networkError ? `${idPrefix}-network-error` : undefined
            }
            aria-invalid={Boolean(networkError)}
            id={`${idPrefix}-network`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERSON_SOCIAL_NETWORKS.filter(
              (network) =>
                network.status === 'active' || network.key === value.networkKey,
            ).map((network) => (
              <SelectItem
                disabled={network.status === 'deprecated'}
                key={network.key}
                value={network.key}
              >
                <PersonSocialNetworkIcon
                  className="size-4 shrink-0"
                  networkKey={network.key}
                />
                <span>
                  {network.label}
                  {network.status === 'deprecated' ? ' (ancien)' : ''}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError id={`${idPrefix}-network-error`} message={networkError} />
      </div>
      <LabelField
        activeHistoryFieldKey={activeHistoryFieldKey}
        disabled={disabled}
        errors={errors}
        idPrefix={idPrefix}
        history={histories?.label}
        keyPrefix={keyPrefix}
        listId={`${idPrefix}-social-labels`}
        onChange={(label) => onChange({ ...value, label })}
        onHistoryOpen={onHistoryOpen}
        suggestions={PERSON_SOCIAL_LABEL_SUGGESTIONS}
        value={value.label}
      />
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label htmlFor={`${idPrefix}-identifier`}>Identifiant visible</Label>
          <HistoryAction
            activeFieldKey={activeHistoryFieldKey}
            onOpen={onHistoryOpen}
            target={histories?.identifier}
          />
        </div>
        <Input
          aria-describedby={
            identifierError
              ? `${idPrefix}-identifier-error`
              : identifierWarning
                ? `${idPrefix}-identifier-warning`
                : `${idPrefix}-identity-hint`
          }
          aria-invalid={Boolean(identifierError)}
          disabled={disabled}
          id={`${idPrefix}-identifier`}
          maxLength={100}
          onChange={(event) =>
            onChange({ ...value, identifier: event.target.value })
          }
          placeholder="@identifiant"
          value={value.identifier}
        />
        <FieldError
          id={`${idPrefix}-identifier-error`}
          message={identifierError}
        />
        <FieldWarning
          id={`${idPrefix}-identifier-warning`}
          message={identifierWarning}
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label htmlFor={`${idPrefix}-url`}>URL du profil</Label>
          <HistoryAction
            activeFieldKey={activeHistoryFieldKey}
            onOpen={onHistoryOpen}
            target={histories?.profileUrl}
          />
        </div>
        <Input
          aria-describedby={
            urlError
              ? `${idPrefix}-url-error`
              : urlWarning
                ? `${idPrefix}-url-warning`
                : `${idPrefix}-identity-hint`
          }
          aria-invalid={Boolean(urlError)}
          disabled={disabled}
          id={`${idPrefix}-url`}
          maxLength={2_048}
          onChange={(event) =>
            onChange({ ...value, profileUrl: event.target.value })
          }
          placeholder="https://…"
          type="url"
          value={value.profileUrl}
        />
        <FieldError id={`${idPrefix}-url-error`} message={urlError} />
        <FieldWarning id={`${idPrefix}-url-warning`} message={urlWarning} />
      </div>
      <p
        className={`text-muted-foreground text-xs ${layout === 'grid' ? 'sm:col-span-2' : ''}`}
        id={`${idPrefix}-identity-hint`}
      >
        Renseignez au moins un identifiant visible ou une URL de profil.
      </p>
      {(showPrimarySwitch || histories?.isPrimary) && (
        <div className={layout === 'grid' ? 'sm:col-span-2' : undefined}>
          <PrimarySwitch
            activeHistoryFieldKey={activeHistoryFieldKey}
            checked={value.isPrimary}
            disabled={disabled || !showPrimarySwitch}
            history={histories?.isPrimary}
            id={`${idPrefix}-primary`}
            label="Profil principal pour ce réseau"
            onChange={(isPrimary) => onChange({ ...value, isPrimary })}
            onHistoryOpen={onHistoryOpen}
          />
        </div>
      )}
    </div>
  );
};
