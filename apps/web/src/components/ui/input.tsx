import React, { type ComponentProps, type FC } from 'react';

import { passwordManagerIgnoreAttributes } from '$utils/autofill.utils';
import { cn } from '$utils/css.utils';

type InputProps = Omit<ComponentProps<'input'>, 'autoComplete'> & {
  autoComplete?: 'off';
};

const Input: FC<InputProps> = ({ className, type, ...props }) => {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-border-form bg-input text-foreground selection:bg-primary selection:text-primary-foreground file:text-foreground placeholder:text-muted-foreground font-form flex h-10 w-full min-w-0 rounded-[8px] border px-[11px] py-1.5 text-[16px] leading-5 shadow-none transition-[background-color,border-color,color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 max-sm:h-11 lg:text-[13px]',
        'hover:enabled:not-focus:not-aria-invalid:border-border-strong hover:enabled:not-focus:bg-surface-control-hover focus:not-aria-invalid:border-primary focus:bg-surface-control-focus focus:ring-ring-form focus:ring-2',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
      {...passwordManagerIgnoreAttributes}
    />
  );
};

export { Input };
