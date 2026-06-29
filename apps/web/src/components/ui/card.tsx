import React, { type ComponentProps, type FC } from 'react';

import { cn } from '$utils/css.utils';

type CardProps = ComponentProps<'div'>;

const Card: FC<CardProps> = ({ className, ...props }) => {
  return (
    <div
      data-slot="card"
      className={cn(
        'border-sidebar-border/70 bg-card text-card-foreground flex flex-col gap-0 overflow-hidden rounded-xl border py-0 shadow-[0_18px_42px_-36px_rgba(0,0,0,0.96),inset_0_1px_0_rgba(255,255,255,0.035)]',
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
        'border-sidebar-border/65 flex flex-col gap-1.5 border-b bg-[#1f293b] px-4 py-4 sm:px-5 sm:py-5',
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
      className={cn('text-sidebar-foreground/58 text-sm', className)}
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
        'border-sidebar-border/65 flex items-center border-t bg-[#1f293b] px-4 py-4 sm:px-5 sm:py-5',
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
