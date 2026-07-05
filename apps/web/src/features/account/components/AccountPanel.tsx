'use client';

import React, { type FC, type ReactNode, useId } from 'react';

import { Card, CardContent, CardHeader } from '$ui/card';
import { cn } from '$utils/css.utils';

type AccountPanelProps = {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  description?: ReactNode;
  icon: ReactNode;
  title: ReactNode;
};

export const AccountPanel: FC<AccountPanelProps> = ({
  actions,
  children,
  className,
  contentClassName,
  description,
  icon,
  title,
}) => {
  const titleId = useId();

  return (
    <section className={cn('relative', className)} aria-labelledby={titleId}>
      <Card className="border-sidebar-border/70 bg-surface">
        <CardHeader className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="border-sidebar-ring/35 bg-sidebar-ring/15 text-sidebar-ring flex size-9 shrink-0 items-center justify-center rounded-lg border shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
              {icon}
            </span>
            <div className="min-w-0">
              <h2
                id={titleId}
                className="text-sidebar-foreground truncate text-sm font-bold tracking-tight"
              >
                {title}
              </h2>
              {description && (
                <p className="text-sidebar-foreground/58 mt-0.5 truncate text-xs leading-5">
                  {description}
                </p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </CardHeader>
        <CardContent className={cn('bg-surface p-4 sm:p-5', contentClassName)}>
          {children}
        </CardContent>
      </Card>
    </section>
  );
};
