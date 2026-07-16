import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import React, { type ComponentProps, type FC } from 'react';

import { cn } from '$utils/css.utils';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-lg border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow] aria-invalid:border-destructive aria-invalid:ring-destructive/20 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:aria-invalid:ring-destructive/40 [&.bg-destructive]:bg-destructive-fill [&.bg-destructive]:text-destructive-foreground [&.bg-destructive:hover]:bg-destructive-fill/90 [&>svg]:pointer-events-none [&>svg]:size-3 [&]:text-xs',
  {
    defaultVariants: {
      variant: 'default',
    },
    variants: {
      variant: {
        default:
          'border-primary/30 bg-primary/10 text-primary-emphasis [a&]:hover:border-primary/45 [a&]:hover:bg-primary/15',
        destructive:
          'border-transparent bg-destructive-fill text-destructive-foreground [a&]:hover:bg-destructive-fill/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
        info: 'border-transparent bg-info text-info-foreground [a&]:hover:bg-info/90',
        outline:
          'border-border-default text-foreground [a&]:hover:border-border-strong [a&]:hover:bg-surface-tile-hover [a&]:hover:text-accent-foreground',
        secondary:
          'border-border-subtle bg-surface-inset text-secondary-foreground [a&]:hover:border-border-default [a&]:hover:bg-surface-tile-hover',
        success:
          'border-transparent bg-success text-success-foreground [a&]:hover:bg-success/90',
        warning:
          'border-transparent bg-warning text-warning-foreground [a&]:hover:bg-warning/90',
      },
    },
  },
);

type BadgeProps = ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean };

const Badge: FC<BadgeProps> = ({
  asChild = false,
  className,
  variant,
  ...props
}) => {
  const Comp = asChild ? Slot : 'span';

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
};

export { Badge, badgeVariants };
