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

// Site-wide policy, including authentication. These are hints to browsers and
// extensions; their own settings can take precedence.
export const passwordManagerIgnoreAttributes = {
  autoComplete: 'off',
  'data-1p-ignore': 'true',
  'data-bwignore': 'true',
  'data-form-type': 'other',
  'data-lpignore': 'true',
} as const satisfies PasswordManagerIgnoreAttributes;
