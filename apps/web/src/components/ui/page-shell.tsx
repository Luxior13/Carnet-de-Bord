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
    <div className={cn('min-w-0', className)} {...props}>
      <div className={cn('space-y-5 py-4 sm:py-5 lg:py-6', contentClassName)}>
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
      <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex min-w-0 items-center gap-3">
          {icon}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">
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
