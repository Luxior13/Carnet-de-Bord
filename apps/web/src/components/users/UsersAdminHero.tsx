import React, { type FC, type ReactNode } from 'react';

import { getNavigationSpaceToneClasses } from '$constants/navigation-theme.constants';
import { Badge } from '$ui/badge';
import { ServiceIcon } from '$ui/service-icon';
import { cn } from '$utils/css.utils';

type UsersAdminHeroProps = {
  actions?: ReactNode;
  description: ReactNode;
  icon: ReactNode;
  iconClassName?: string;
  meta?: ReactNode;
  title: ReactNode;
};

export const UsersAdminHero: FC<UsersAdminHeroProps> = ({
  actions,
  description,
  icon,
  iconClassName,
  meta,
  title,
}) => {
  const tone = getNavigationSpaceToneClasses('system');

  return (
    <section
      className={cn(
        'overflow-hidden rounded-md border shadow-[var(--shadow-panel)]',
        tone.hero,
      )}
    >
      <div className={cn('h-1 w-full', tone.accent)} />
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <ServiceIcon
            className={cn('mt-0.5 size-11', tone.icon, iconClassName)}
          >
            {icon}
          </ServiceIcon>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={tone.soft}>
                Système
              </Badge>
              {meta}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal sm:text-3xl">
              {title}
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
              {description}
            </p>
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
};
