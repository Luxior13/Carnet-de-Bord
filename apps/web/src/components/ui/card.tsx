import React, { type ComponentProps, type FC } from 'react';

import { cn } from '$utils/css.utils';

type CardProps = ComponentProps<'div'>;

const Card: FC<CardProps> = ({ className, ...props }) => {
  return (
    <div
      data-slot="card"
      className={cn(
        'bg-card/80 text-card-foreground flex flex-col gap-6 rounded-lg border py-6 shadow-sm',
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
      className={cn('flex flex-col gap-1.5 px-6', className)}
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
      className={cn('px-6', className)}
      {...props}
    />
  );
};

const CardFooter: FC<CardProps> = ({ className, ...props }) => {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center px-6', className)}
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
