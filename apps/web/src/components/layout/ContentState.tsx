import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import React, { type ComponentProps, type FC, type ReactNode } from 'react';

import { Alert, AlertDescription, AlertTitle } from '$ui/alert';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '$ui/empty';
import { cn } from '$utils/css.utils';

type ContentStateKind = 'empty' | 'error' | 'loading' | 'warning';
type ContentStateLayout = 'compact' | 'panel';

type ContentStateProps = Omit<ComponentProps<'div'>, 'title'> & {
  action?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  kind?: ContentStateKind;
  layout?: ContentStateLayout;
  title: ReactNode;
};

const getToneClasses = (kind: ContentStateKind): string => {
  if (kind === 'error') {
    return 'border-destructive/35 bg-destructive/10 text-destructive';
  }

  if (kind === 'warning') {
    return 'border-warning/35 bg-warning/10 text-warning';
  }

  return 'border-border/65 bg-surface-muted/45 text-foreground';
};

const getDefaultIcon = (kind: ContentStateKind): ReactNode => {
  if (kind === 'loading') {
    return <Loader2 className="size-4 animate-spin" />;
  }

  if (kind === 'error' || kind === 'warning') {
    return <AlertTriangle className="size-4" />;
  }

  return <Inbox className="size-4" />;
};

export const ContentState: FC<ContentStateProps> = ({
  action,
  className,
  description,
  icon,
  kind = 'empty',
  layout = 'compact',
  title,
  ...props
}) => {
  const role =
    kind === 'error' ? 'alert' : kind === 'loading' ? 'status' : undefined;

  if (layout === 'panel') {
    return (
      <Empty
        role={role}
        aria-live={kind === 'loading' ? 'polite' : undefined}
        className={cn('min-h-44 border', getToneClasses(kind), className)}
        {...props}
      >
        <EmptyHeader>
          <EmptyMedia
            variant="icon"
            className="bg-surface-inset text-current"
            aria-hidden="true"
          >
            {icon ?? getDefaultIcon(kind)}
          </EmptyMedia>
          <EmptyTitle>{title}</EmptyTitle>
          {description && <EmptyDescription>{description}</EmptyDescription>}
        </EmptyHeader>
        {action && <EmptyContent>{action}</EmptyContent>}
      </Empty>
    );
  }

  return (
    <Alert
      aria-live={kind === 'loading' ? 'polite' : undefined}
      className={cn(getToneClasses(kind), className)}
      role={role}
      {...props}
    >
      {icon ?? getDefaultIcon(kind)}
      <AlertTitle>{title}</AlertTitle>
      {description && <AlertDescription>{description}</AlertDescription>}
      {action && <div className="col-start-2 mt-3">{action}</div>}
    </Alert>
  );
};
