import React, { type ComponentProps, type FC } from 'react';

import { passwordManagerIgnoreAttributes } from '$utils/autofill.utils';
import { cn } from '$utils/css.utils';

type TextareaProps = Omit<ComponentProps<'textarea'>, 'autoComplete'> & {
  autoComplete?: 'off';
};

const Textarea: FC<TextareaProps> = ({ className, ...props }) => {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-border-form bg-input text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground font-form rounded-control flex min-h-20 w-full min-w-0 border px-[11px] py-2 text-[16px] leading-5 shadow-none transition-[background-color,border-color,color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 lg:text-[13px]',
        'hover:enabled:not-focus:not-aria-invalid:border-border-strong hover:enabled:not-focus:bg-surface-control-hover focus:not-aria-invalid:border-primary focus:bg-surface-control-focus focus:ring-ring-form focus:ring-2',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className,
      )}
      {...props}
      {...passwordManagerIgnoreAttributes}
    />
  );
};

export { Textarea };
