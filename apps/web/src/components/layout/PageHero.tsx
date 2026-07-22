import React, { type ComponentProps, type FC, type ReactNode } from 'react';

import {
  getNavigationSpaceToneClasses,
  type NavigationSpaceTone,
} from '$constants/navigation-theme.constants';
import { ServiceIcon } from '$ui/service-icon';
import { cn } from '$utils/css.utils';

type PageHeroProps = Omit<ComponentProps<'section'>, 'title'> & {
  actions?: ReactNode;
  compact?: boolean;
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
  compact = false,
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
      <div
        className={cn(
          'from-surface-panel-raised/50 via-surface-panel to-surface-panel flex flex-col bg-gradient-to-br lg:flex-row lg:items-center lg:justify-between',
          compact ? 'gap-3 p-3 sm:p-4' : 'gap-4 p-4 sm:p-5',
        )}
      >
        <div
          className={cn(
            'flex min-w-0 gap-3 sm:gap-4',
            compact ? 'items-center' : 'items-start',
          )}
        >
          {icon && (
            <ServiceIcon
              className={cn(
                'rounded-lg',
                compact ? 'size-10' : 'mt-0.5 size-11',
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
            <div
              className={cn(
                compact && 'flex flex-wrap items-center gap-x-3 gap-y-1',
              )}
            >
              <h1
                className={cn(
                  'font-semibold tracking-normal',
                  compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl',
                  eyebrow && 'mt-2',
                )}
              >
                {title}
              </h1>
              {compact && meta && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {meta}
                </div>
              )}
            </div>
            {description && (
              <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
                {description}
              </p>
            )}
            {!compact && meta && (
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
