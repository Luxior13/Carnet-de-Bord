import React, { type FC, type ReactNode } from 'react';

import { Card, CardContent, CardHeader } from '$ui/card';
import { ServiceIcon } from '$ui/service-icon';
import { cn } from '$utils/css.utils';

/**
 * Title of a rubric inside a record section (owner decision of 27 October
 * 2026): a tinted icon tile and the name, on the header band of its card.
 */
export const RubricTitle: FC<{
  children: ReactNode;
  icon: ReactNode;
  id: string;
}> = ({ children, icon, id }) => (
  <h3
    id={id}
    tabIndex={-1}
    className="text-foreground flex scroll-mt-16 items-center gap-2 text-sm font-semibold"
  >
    <ServiceIcon className="border-primary/30 bg-primary/10 text-primary-emphasis size-7 [&_svg]:size-3.5">
      {icon}
    </ServiceIcon>
    {children}
  </h3>
);

/**
 * One card per rubric of a record section, its name on a header band. The
 * section itself keeps a screen-reader title: rubrics never repeat the tab.
 */
export const RubricCard: FC<{
  aside?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
  icon: ReactNode;
  id: string;
  title: ReactNode;
}> = ({ aside, children, contentClassName, icon, id, title }) => (
  <Card aria-labelledby={id} as="section">
    <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 p-3.5 sm:p-4">
      <RubricTitle icon={icon} id={id}>
        {title}
      </RubricTitle>
      {aside}
    </CardHeader>
    <CardContent className={cn('p-4 sm:p-5', contentClassName)}>
      {children}
    </CardContent>
  </Card>
);
