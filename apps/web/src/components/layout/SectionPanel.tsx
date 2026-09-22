import React, { type FC, type ReactNode } from 'react';

import { Card, CardContent, CardHeader } from '$ui/card';
import { ServiceIcon } from '$ui/service-icon';
import { cn } from '$utils/css.utils';

type SectionPanelProps = {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  description?: ReactNode;
  icon: ReactNode;
  title: ReactNode;
  titleAs?: 'h2' | 'h3';
  titleId?: string;
};

export const SectionPanel: FC<SectionPanelProps> = ({
  actions,
  children,
  className,
  contentClassName,
  description,
  icon,
  title,
  titleAs: Heading = 'h2',
  titleId,
}) => {
  return (
    <section aria-labelledby={titleId} className={cn('min-w-0', className)}>
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <ServiceIcon className="size-9">{icon}</ServiceIcon>
            <div className="min-w-0">
              <Heading
                id={titleId}
                className="text-foreground text-sm leading-6 font-semibold tracking-normal [overflow-wrap:anywhere]"
              >
                {title}
              </Heading>
              {description && (
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  {description}
                </p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
        </CardHeader>
        <CardContent className={cn('space-y-5 p-4 sm:p-5', contentClassName)}>
          {children}
        </CardContent>
      </Card>
    </section>
  );
};
