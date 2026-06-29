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
        'border-sidebar-border/70 overflow-hidden rounded-xl border bg-[#182131] shadow-[0_18px_42px_-36px_rgba(0,0,0,0.96),inset_0_1px_0_rgba(255,255,255,0.035)]',
        className,
      )}
    >
      <div className="border-sidebar-border/65 flex flex-col gap-3 border-b bg-[#1f293b] p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="border-sidebar-ring/35 bg-sidebar-ring/15 text-sidebar-ring flex size-9 shrink-0 items-center justify-center rounded-lg border shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
            {icon}
          </span>
          <div className="min-w-0">
            <h3 className="text-sidebar-foreground text-sm font-semibold tracking-tight">
              {title}
            </h3>
            {description && (
              <p className="text-sidebar-foreground/58 mt-1 text-sm leading-6">
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
