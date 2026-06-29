import React, { type ComponentProps, type FC, type ReactNode } from 'react';

import { Card, CardContent } from '$ui/card';
import { cn } from '$utils/css.utils';

type PageShellProps = ComponentProps<'div'>;

const PageShell: FC<PageShellProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'relative z-10 mx-auto w-full max-w-[var(--public-column-width)] px-4 py-6 sm:px-6 lg:px-8',
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
      <div className={cn('space-y-6 py-4 sm:py-5 lg:py-6', contentClassName)}>
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
    <Card className="overflow-hidden rounded-xl py-0 shadow-none">
      <div className="h-1.5 w-full bg-[linear-gradient(90deg,rgba(95,132,200,0.95),rgba(108,146,214,0.45),rgba(95,132,200,0.18))]" />
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          {icon}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
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
