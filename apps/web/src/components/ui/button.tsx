import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import React, { type ComponentProps, type FC } from 'react';

import { cn } from '$utils/css.utils';

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent text-sm font-medium transition-[background-color,border-color,color,box-shadow] outline-none disabled:pointer-events-none disabled:opacity-50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        icon: 'size-9',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
      },
      variant: {
        default:
          'border-primary/80 bg-primary text-primary-foreground shadow-none hover:bg-primary/90',
        destructive:
          'border-destructive/80 bg-destructive text-white shadow-none hover:bg-destructive/90 focus-visible:ring-destructive/25 dark:focus-visible:ring-destructive/35',
        ghost:
          'text-muted-foreground hover:border-border/70 hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        outline:
          'border-border/80 bg-surface-control text-foreground shadow-none hover:border-ring/35 hover:bg-accent hover:text-accent-foreground',
        secondary:
          'border-border/70 bg-secondary text-secondary-foreground shadow-none hover:border-ring/25 hover:bg-secondary/80',
      },
    },
  },
);

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

const Button: FC<ButtonProps> = ({
  asChild = false,
  className,
  size,
  variant,
  ...props
}) => {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      className={cn(
        buttonVariants({
          className,
          size,
          variant,
        }),
      )}
      {...props}
    />
  );
};

export { Button, buttonVariants };
