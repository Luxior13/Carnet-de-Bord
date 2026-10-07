import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentProps, type FC } from 'react';

import { cn } from '$utils/css.utils';

type CardProps = ComponentProps<'div'>;

const Card: FC<
  CardProps & { as?: 'article' | 'div' | 'section'; asChild?: boolean }
> = ({ as = 'div', asChild = false, className, ...props }) => {
  const Component = asChild ? Slot : as;

  return (
    <Component
      data-slot="card"
      className={cn(
        'border-border-default bg-surface text-card-foreground flex flex-col gap-0 overflow-hidden rounded-lg border py-0 shadow-[var(--shadow-panel)]',
        className,
      )}
      {...props}
    />
  );
};

const CardHeader: FC<CardProps> = ({ className, ...props }) => {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'border-border-divider bg-surface-panel-header flex flex-col gap-1.5 border-b px-4 py-3.5 sm:px-5 sm:py-4',
        className,
      )}
      {...props}
    />
  );
};

type CardTitleProps = ComponentProps<'h2'> & {
  as?: 'h1' | 'h2' | 'h3' | 'h4';
};

const CardTitle: FC<CardTitleProps> = ({
  as: Heading = 'h2',
  className,
  ...props
}) => {
  return (
    <Heading
      data-slot="card-title"
      className={cn(
        'text-sm leading-5 font-semibold tracking-normal [overflow-wrap:anywhere]',
        className,
      )}
      {...props}
    />
  );
};

const CardDescription: FC<CardProps> = ({ className, ...props }) => {
  return (
    <div
      data-slot="card-description"
      className={cn(
        'text-muted-foreground text-sm leading-6 [overflow-wrap:anywhere]',
        className,
      )}
      {...props}
    />
  );
};

const CardContent: FC<CardProps> = ({ className, ...props }) => {
  return (
    <div data-slot="card-content" className={cn('p-5', className)} {...props} />
  );
};

const CardFooter: FC<CardProps> = ({ className, ...props }) => {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'border-border-divider bg-surface-inset flex items-center border-t px-4 py-3.5 sm:px-5 sm:py-4',
        className,
      )}
      {...props}
    />
  );
};

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
