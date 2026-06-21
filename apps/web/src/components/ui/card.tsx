import React, { type ComponentProps, type FC } from 'react';

import { cn } from '$utils/css.utils';

type CardProps = ComponentProps<'div'>;

const Card: FC<CardProps> = ({ className, ...props }) => {
  return (
    <div
      data-slot="card"
      className={cn(
        'border-border/80 bg-card text-card-foreground flex flex-col gap-0 overflow-hidden rounded-lg border py-0 shadow-sm',
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
        'border-border/60 bg-accent flex flex-col gap-1.5 border-b p-4 sm:p-5',
        className,
      )}
      {...props}
    />
  );
};

const CardTitle: FC<CardProps> = ({ className, ...props }) => {
  return (
    <div
      data-slot="card-title"
      className={cn('leading-none font-semibold', className)}
      {...props}
    />
  );
};

const CardDescription: FC<CardProps> = ({ className, ...props }) => {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
};

const CardContent: FC<CardProps> = ({ className, ...props }) => {
  return (
    <div
      data-slot="card-content"
      className={cn('p-4 sm:p-5', className)}
      {...props}
    />
  );
};

const CardFooter: FC<CardProps> = ({ className, ...props }) => {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'border-border/60 bg-accent flex items-center border-t p-4 sm:p-5',
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
