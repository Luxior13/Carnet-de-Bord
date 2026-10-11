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
        'border-border-control bg-input text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex min-h-20 w-full min-w-0 rounded-[6px] border px-3 py-2 text-base shadow-none transition-[background-color,border-color,color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 lg:text-sm',
        'hover:border-ring/70 hover:bg-surface-control-hover focus-visible:border-ring focus-visible:bg-surface-control-focus focus-visible:ring-ring focus-visible:ring-[length:var(--ring-width)]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className,
      )}
      {...props}
      {...passwordManagerIgnoreAttributes}
    />
  );
};

export { Textarea };
