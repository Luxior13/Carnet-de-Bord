import React, { type ComponentProps, type FC, type ReactNode } from 'react';

import { Card, CardContent } from '$ui/card';
import { cn } from '$utils/css.utils';

type PageShellWidth = 'default' | 'full' | 'narrow' | 'wide';

type PageShellProps = ComponentProps<'div'> & {
  width?: PageShellWidth;
};

function getPageShellWidthClass(width: PageShellWidth): string {
  switch (width) {
    case 'default':
      return 'max-w-[var(--private-content-width)]';
    case 'full':
      return 'max-w-none';
    case 'narrow':
      return 'max-w-5xl';
    case 'wide':
      return 'max-w-[var(--private-content-width-wide)]';
  }
}

const PageShell: FC<PageShellProps> = ({
  className,
  width = 'default',
  ...props
}) => {
  return (
    <div
      className={cn(
        'relative z-10 mx-auto w-full px-[var(--private-content-padding)] py-5 sm:py-6',
        getPageShellWidthClass(width),
        className,
      )}
      {...props}
    />
  );
};

type PageCanvasProps = ComponentProps<'div'> & {
  contentClassName?: string;
};

const PageCanvas: FC<PageCanvasProps> = ({
  children,
  className,
  contentClassName,
  ...props
}) => {
  return (
    <div className={cn('relative z-10 min-w-0', className)} {...props}>
      <div className={cn('space-y-5 py-4 sm:py-5', contentClassName)}>
        {children}
      </div>
    </div>
  );
};

type PageHeaderProps = {
  actions?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  meta?: ReactNode;
  title: ReactNode;
};

const PageHeader: FC<PageHeaderProps> = ({
  actions,
  description,
  icon,
  meta,
  title,
}) => {
  return (
    <Card className="border-border-default bg-surface overflow-hidden rounded-xl py-0 shadow-[var(--shadow-panel)]">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {icon}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-normal sm:text-2xl">
              {title}
            </h1>
            {description && (
              <p className="text-muted-foreground mt-1 text-sm leading-6">
                {description}
              </p>
            )}
            {meta && <div className="mt-2 flex flex-wrap gap-1.5">{meta}</div>}
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </CardContent>
    </Card>
  );
};

export { PageCanvas, PageHeader, PageShell };
