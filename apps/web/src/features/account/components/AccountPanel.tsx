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
        'border-sidebar-border/70 relative overflow-hidden rounded-xl border bg-[#182131] shadow-[0_18px_42px_-36px_rgba(0,0,0,0.96),inset_0_1px_0_rgba(255,255,255,0.035)]',
        className,
      )}
    >
      <header className="border-sidebar-border/65 flex flex-col gap-3 border-b bg-[#1f293b] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="border-sidebar-ring/35 bg-sidebar-ring/15 text-sidebar-ring flex size-9 shrink-0 items-center justify-center rounded-lg border shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="text-sidebar-foreground truncate text-sm font-bold tracking-tight">
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
      </header>
      <div className={cn('bg-[#182131] p-4 sm:p-5', contentClassName)}>
        {children}
      </div>
    </section>
  );
};
