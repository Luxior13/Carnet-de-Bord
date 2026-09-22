import React, { type ComponentProps, type FC, type ReactNode } from 'react';

import type { NavigationSpaceTone } from '$constants/navigation-theme.constants';
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
  return (
    <section
      data-slot="page-heading"
      data-tone={tone}
      className={cn('border-border-divider min-w-0 border-b pb-5', className)}
      {...props}
    >
      <div
        className={cn(
          'flex min-w-0 flex-col lg:flex-row lg:items-center lg:justify-between',
          compact ? 'gap-3' : 'gap-4',
        )}
      >
        <div
          className={cn(
            'flex min-w-0 flex-1 gap-3',
            compact ? 'items-center' : 'items-start',
          )}
        >
          {icon && (
            <ServiceIcon
              className={cn(
                'size-10 rounded-lg [&_svg]:size-5',
                !compact && 'mt-0.5',
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
                  'text-xl leading-7 font-semibold tracking-normal [overflow-wrap:anywhere] sm:text-2xl sm:leading-8',
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
              <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-6 [overflow-wrap:anywhere]">
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
