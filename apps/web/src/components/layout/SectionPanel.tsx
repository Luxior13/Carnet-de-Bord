import React, { type FC, type ReactNode } from 'react';

import { cn } from '$utils/css.utils';

type SectionPanelProps = {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  description?: ReactNode;
  icon: ReactNode;
  title: ReactNode;
};

export const SectionPanel: FC<SectionPanelProps> = ({
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
        'border-sidebar-border/70 overflow-hidden rounded-xl border bg-[linear-gradient(180deg,rgba(18,23,30,0.88),rgba(25,33,50,0.92))] shadow-[inset_0_0_0_1px_rgba(108,146,214,0.06)]',
        className,
      )}
    >
      <div className="border-sidebar-border/60 flex flex-col gap-3 border-b bg-[linear-gradient(180deg,rgba(95,132,200,0.06),rgba(95,132,200,0))] p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="border-sidebar-ring/20 text-sidebar-ring bg-sidebar-accent/20 flex size-9 shrink-0 items-center justify-center rounded-lg border">
            {icon}
          </span>
          <div className="min-w-0">
            <h3 className="text-sidebar-foreground text-sm font-semibold tracking-tight">
              {title}
            </h3>
            {description && (
              <p className="text-sidebar-foreground/65 mt-1 text-sm leading-6">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
      <div className={cn('space-y-4 p-4 sm:p-5', contentClassName)}>
        {children}
      </div>
    </section>
  );
};
