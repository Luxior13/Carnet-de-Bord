import React, { type ComponentProps, type FC } from 'react';

import { cn } from '$utils/css.utils';

type TextareaProps = ComponentProps<'textarea'>;

const Textarea: FC<TextareaProps> = ({ className, ...props }) => {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-border-control bg-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex min-h-[80px] w-full rounded-lg border px-3 py-2 text-base shadow-none transition-[background-color,border-color,color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 lg:text-sm',
        'hover:border-ring/70 hover:bg-surface-control-hover focus-visible:border-ring focus-visible:bg-surface-control-focus focus-visible:ring-ring/35 focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  );
};

export { Textarea };
