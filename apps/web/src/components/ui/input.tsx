import React, { type ComponentProps, type FC } from 'react';

import {
  type AuthenticationAutocompleteToken,
  isAuthenticationAutocompleteToken,
  passwordManagerIgnoreAttributes,
} from '$utils/autofill.utils';
import { cn } from '$utils/css.utils';

type InputProps = Omit<ComponentProps<'input'>, 'autoComplete'> & {
  autoComplete?: AuthenticationAutocompleteToken | 'off';
};

const Input: FC<InputProps> = ({ autoComplete, className, type, ...props }) => {
  // Checked at runtime too: any other value, even forced past TypeScript,
  // falls back to the site-wide ignore attributes.
  const autofill = isAuthenticationAutocompleteToken(autoComplete)
    ? { autoComplete }
    : passwordManagerIgnoreAttributes;

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-border-form bg-input text-foreground selection:bg-primary selection:text-primary-foreground file:text-foreground placeholder:text-muted-foreground font-form rounded-control flex h-10 w-full min-w-0 border px-[11px] py-1.5 text-[16px] leading-5 shadow-none transition-[background-color,border-color,color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 max-sm:h-11 lg:text-[13px]',
        'hover:enabled:not-focus:not-aria-invalid:border-border-strong hover:enabled:not-focus:bg-surface-control-hover focus:not-aria-invalid:border-primary focus:bg-surface-control-focus focus:ring-ring-form focus:ring-2',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
      {...autofill}
    />
  );
};

export { Input };
