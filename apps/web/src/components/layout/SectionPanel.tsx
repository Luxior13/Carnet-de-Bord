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
        'border-border/70 bg-card overflow-hidden rounded-lg border shadow-none',
        className,
      )}
    >
      <div className="border-border/60 flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
            {icon}
          </span>
          <div className="min-w-0">
            <h3 className="text-foreground text-sm font-semibold">{title}</h3>
            {description && (
              <p className="text-muted-foreground mt-1 text-sm leading-6">
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
