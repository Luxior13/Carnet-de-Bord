'use client';

import React, { type FC, type Ref } from 'react';

import { Input } from '$ui/input';
import { Label } from '$ui/label';

export type MfaCodeKind = 'recovery' | 'totp';

type MfaCodeInputProps = {
  autoFocus?: boolean;
  disabled?: boolean;
  error?: string | null;
  id: string;
  inputRef?: Ref<HTMLInputElement>;
  kind: MfaCodeKind;
  onChange: (value: string) => void;
  value: string;
};

export const normalizeMfaCode = (value: string, kind: MfaCodeKind): string => {
  if (kind === 'totp') return value.replace(/\D/g, '').slice(0, 6);

  const compactCode = value
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, '')
    .slice(0, 24);

  return compactCode.match(/.{1,4}/g)?.join('-') ?? compactCode;
};

export const isCompleteMfaCode = (value: string, kind: MfaCodeKind): boolean =>
  kind === 'totp'
    ? /^\d{6}$/.test(value)
    : /^[A-Z2-7]{24}$/.test(value.replace(/[\s-]/g, '').toUpperCase());

export const MfaCodeInput: FC<MfaCodeInputProps> = ({
  autoFocus = false,
  disabled = false,
  error,
  id,
  inputRef,
  kind,
  onChange,
  value,
}) => {
  const isRecoveryCode = kind === 'recovery';
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id} required>
        {isRecoveryCode ? 'Code de secours' : 'Code à 6 chiffres'}
      </Label>
      <Input
        aria-describedby={error ? `${descriptionId} ${errorId}` : descriptionId}
        aria-invalid={!!error}
        autoCapitalize="none"
        autoComplete={isRecoveryCode ? 'off' : 'one-time-code'}
        autoCorrect="off"
        autoFocus={autoFocus}
        className="font-mono text-base tracking-[0.25em]"
        disabled={disabled}
        id={id}
        inputMode={isRecoveryCode ? 'text' : 'numeric'}
        ref={inputRef}
        maxLength={isRecoveryCode ? 35 : 6}
        name={isRecoveryCode ? 'recovery-code' : 'one-time-code'}
        onChange={(event) =>
          onChange(normalizeMfaCode(event.target.value, kind))
        }
        placeholder={
          isRecoveryCode ? 'XXXX-XXXX-XXXX-XXXX-XXXX-XXXX' : '000000'
        }
        spellCheck={false}
        type="text"
        value={value}
      />
      <p className="text-muted-foreground text-xs leading-5" id={descriptionId}>
        {isRecoveryCode
          ? 'Le code comporte 24 caractères Base32 et ne peut être utilisé qu’une seule fois.'
          : 'Saisissez le code affiché dans votre application d’authentification.'}
      </p>
      {error && (
        <p className="text-destructive text-xs" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
