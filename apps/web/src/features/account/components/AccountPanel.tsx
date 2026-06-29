import React, { type FC, type ReactNode } from 'react';

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
  return (
    <section
      className={cn(
        'border-sidebar-border/60 relative overflow-hidden rounded-xl border bg-[linear-gradient(180deg,rgba(14,20,31,0.88),rgba(10,15,23,0.94))] shadow-[0_20px_48px_-36px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm',
        className,
      )}
    >
      <div className="h-1 w-full bg-[linear-gradient(90deg,rgba(95,132,200,0.92),rgba(108,146,214,0.34),rgba(95,132,200,0.08))]" />
      <header className="border-sidebar-border/55 flex flex-col gap-3 border-b bg-[linear-gradient(180deg,rgba(95,132,200,0.13),rgba(95,132,200,0.035))] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="border-sidebar-ring/30 bg-sidebar-accent/35 text-sidebar-ring flex size-8 shrink-0 items-center justify-center rounded-md border shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="text-sidebar-foreground truncate text-sm font-semibold tracking-tight">
              {title}
            </h2>
            {description && (
              <p className="text-sidebar-foreground/68 mt-0.5 text-xs leading-5">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </header>
      <div className={cn('p-4 sm:p-5', contentClassName)}>{children}</div>
    </section>
  );
};
