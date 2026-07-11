import React, { type ComponentProps, type FC } from 'react';

import { cn } from '$utils/css.utils';

type TextareaProps = ComponentProps<'textarea'>;

const Textarea: FC<TextareaProps> = ({ className, ...props }) => {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-border/80 bg-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex min-h-[80px] w-full rounded-md border px-3 py-2 text-base shadow-none transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  );
};

export { Textarea };
