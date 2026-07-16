import React, { type ComponentProps, type FC, type ReactNode } from 'react';

import {
  getNavigationSpaceToneClasses,
  type NavigationSpaceTone,
} from '$constants/navigation-theme.constants';
import { ServiceIcon } from '$ui/service-icon';
import { cn } from '$utils/css.utils';

type PageHeroProps = Omit<ComponentProps<'section'>, 'title'> & {
  actions?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  icon?: ReactNode;
  iconClassName?: string;
  meta?: ReactNode;
  title: ReactNode;
  tone?: NavigationSpaceTone;
};

export const PageHero: FC<PageHeroProps> = ({
  actions,
  className,
  description,
  eyebrow,
  icon,
  iconClassName,
  meta,
  title,
  tone = 'dashboard',
  ...props
}) => {
  const toneClasses = getNavigationSpaceToneClasses(tone);

  return (
    <section
      className={cn(
        toneClasses.hero,
        'border-border-default bg-surface-panel overflow-hidden rounded-xl border shadow-[var(--shadow-panel)]',
        className,
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className={cn('h-1 w-full', toneClasses.accent)}
      />
      <div className="from-surface-panel-raised/50 via-surface-panel to-surface-panel flex flex-col gap-4 bg-gradient-to-br p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          {icon && (
            <ServiceIcon
              className={cn(
                'mt-0.5 size-11 rounded-lg',
                toneClasses.icon,
                iconClassName,
              )}
            >
              {icon}
            </ServiceIcon>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <div className="flex flex-wrap items-center gap-2">{eyebrow}</div>
            )}
            <h1
              className={cn(
                'text-2xl font-semibold tracking-normal sm:text-3xl',
                eyebrow && 'mt-2',
              )}
            >
              {title}
            </h1>
            {description && (
              <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
                {description}
              </p>
            )}
            {meta && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {meta}
              </div>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex w-full shrink-0 flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
};
