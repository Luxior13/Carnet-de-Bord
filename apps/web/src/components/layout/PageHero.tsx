import React, { type ComponentProps, type FC, type ReactNode } from 'react';

import {
  getNavigationSpaceToneClasses,
  type NavigationSpaceTone,
} from '$constants/navigation-theme.constants';
import { cn } from '$utils/css.utils';

type PageHeroProps = Omit<ComponentProps<'section'>, 'title'> & {
  actions?: ReactNode;
  compact?: boolean;
  description?: ReactNode;
  eyebrow?: ReactNode;
  hasNavigation?: boolean;
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
  hasNavigation = false,
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
      data-slot="page-heading"
      data-tone={tone}
      className={cn(
        'border-border-default bg-surface-panel relative min-w-0 rounded-2xl border p-4 @min-[28rem]/page:p-5 @min-[44rem]/page:p-7',
        hasNavigation && 'pb-5 @min-[44rem]/page:pb-5',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-y-5 left-0 w-0.5 rounded-r-full @min-[44rem]/page:inset-y-7',
          toneClasses.accent,
        )}
      />
      <div className="flex min-w-0 flex-col gap-5 @min-[44rem]/page:flex-row @min-[44rem]/page:items-center @min-[44rem]/page:justify-between @min-[44rem]/page:gap-6">
        <div className="flex min-w-0 flex-1 items-start gap-3 @min-[44rem]/page:gap-4">
          {icon && (
            <div
              aria-hidden="true"
              className={cn(
                toneClasses.icon,
                'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border @min-[44rem]/page:size-14 [&>svg]:size-6 [&>svg]:stroke-[1.6]',
                iconClassName,
              )}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {eyebrow}
              </div>
            )}
            <div
              className={cn(
                'min-w-0',
                compact && 'flex flex-wrap items-center gap-x-3 gap-y-1',
              )}
            >
              <h1 className="text-foreground min-w-0 text-[1.625rem] leading-[2.125rem] font-semibold tracking-[-0.02em] [overflow-wrap:anywhere] @min-[44rem]/page:text-[2rem] @min-[44rem]/page:leading-10">
                {title}
              </h1>
              {compact && meta && (
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  {meta}
                </div>
              )}
            </div>
            {description && (
              <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-[1.375rem] [overflow-wrap:anywhere]">
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
          <div className="border-border-divider flex w-full min-w-0 shrink-0 flex-wrap items-center gap-2 border-t pt-4 @min-[44rem]/page:w-auto @min-[44rem]/page:max-w-[45%] @min-[44rem]/page:justify-end @min-[44rem]/page:border-t-0 @min-[44rem]/page:border-l @min-[44rem]/page:py-2 @min-[44rem]/page:pl-6 [&_[data-slot=button]]:h-auto [&_[data-slot=button]]:min-h-11 [&_[data-slot=button]]:max-w-full [&_[data-slot=button]]:px-4 [&_[data-slot=button]]:py-2 [&_[data-slot=button]]:whitespace-normal [&>div]:max-w-full">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
};
