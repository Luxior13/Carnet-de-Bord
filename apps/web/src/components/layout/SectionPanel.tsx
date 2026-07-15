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
        'border-border/80 bg-surface overflow-hidden rounded-md border shadow-[var(--shadow-panel)]',
        className,
      )}
    >
      <div className="border-border/70 bg-surface-muted/75 flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="border-primary/30 bg-primary/10 text-primary-emphasis flex size-9 shrink-0 items-center justify-center rounded-md border">
            {icon}
          </span>
          <div className="min-w-0">
            <h3 className="text-foreground text-sm font-semibold tracking-normal">
              {title}
            </h3>
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
      <div className={cn('space-y-4 p-4', contentClassName)}>{children}</div>
    </section>
  );
};
