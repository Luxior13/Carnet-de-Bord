import React, { type ComponentProps, type FC, type ReactNode } from 'react';

import { Card, CardContent } from '$ui/card';
import { cn } from '$utils/css.utils';

type PageShellProps = ComponentProps<'div'>;

const PageShell: FC<PageShellProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8',
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
    <div className={cn('relative min-w-0', className)} {...props}>
      <div
        aria-hidden
        className="border-border/70 bg-popover pointer-events-none absolute inset-y-0 -right-3 -left-3 z-0 min-h-[calc(100svh-3.5rem)] border-x border-y-0 sm:-right-6 sm:-left-6 md:min-h-[calc(100svh-4.5rem)] lg:-right-8 lg:-left-8"
      />
      <div
        className={cn(
          'relative z-10 space-y-6 py-4 sm:py-5 lg:py-6',
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
};

type PageHeaderProps = {
  actions?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
};

const PageHeader: FC<PageHeaderProps> = ({
  actions,
  description,
  icon,
  title,
}) => {
  return (
    <Card className="overflow-hidden py-0">
      <div className="bg-primary h-1 w-full" />
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {icon}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-muted-foreground mt-1 text-sm">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </CardContent>
    </Card>
  );
};

export { PageCanvas, PageHeader, PageShell };
