import type { ComponentProps } from 'react';

type PasswordManagerIgnoreAttributes = Pick<
  ComponentProps<'input'>,
  'autoComplete'
> & {
  'data-1p-ignore': 'true';
  'data-bwignore': 'true';
  'data-form-type': 'other';
  'data-lpignore': 'true';
};

/**
 * Fields a password manager may fill: identifier, current and new password,
 * and the TOTP code (owner decision of 25 October 2026, REV-07). Every other
 * field keeps autofill off.
 */
export const AUTHENTICATION_AUTOCOMPLETE_TOKENS = [
  'current-password',
  'new-password',
  'one-time-code',
  'username',
] as const;

export type AuthenticationAutocompleteToken =
  (typeof AUTHENTICATION_AUTOCOMPLETE_TOKENS)[number];

export const isAuthenticationAutocompleteToken = (
  value: unknown,
): value is AuthenticationAutocompleteToken =>
  AUTHENTICATION_AUTOCOMPLETE_TOKENS.includes(
    value as AuthenticationAutocompleteToken,
  );

// Policy for every non-authentication field. These are hints to browsers and
// extensions; their own settings can take precedence.
export const passwordManagerIgnoreAttributes = {
  autoComplete: 'off',
  'data-1p-ignore': 'true',
  'data-bwignore': 'true',
  'data-form-type': 'other',
  'data-lpignore': 'true',
} as const satisfies PasswordManagerIgnoreAttributes;
