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

export const passwordManagerIgnoreAttributes = {
  autoComplete: 'off',
  'data-1p-ignore': 'true',
  'data-bwignore': 'true',
  'data-form-type': 'other',
  'data-lpignore': 'true',
} satisfies PasswordManagerIgnoreAttributes;
