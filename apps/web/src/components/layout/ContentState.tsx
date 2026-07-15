import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import React, { type ComponentProps, type FC, type ReactNode } from 'react';

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
  const isPanel = layout === 'panel';

  return (
    <div
      aria-live={kind === 'loading' ? 'polite' : undefined}
      className={cn(
        'rounded-lg border',
        getToneClasses(kind),
        isPanel
          ? 'flex min-h-44 flex-col items-center justify-center p-6 text-center'
          : 'flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      role={
        kind === 'error' ? 'alert' : kind === 'loading' ? 'status' : undefined
      }
      {...props}
    >
      <div
        className={cn(
          'flex min-w-0',
          isPanel ? 'flex-col items-center' : 'items-start gap-3',
        )}
      >
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-md border border-current/25 bg-current/10',
            isPanel ? 'size-12' : 'size-9',
          )}
        >
          {icon ?? getDefaultIcon(kind)}
        </span>
        <div className={cn('min-w-0', isPanel ? 'mt-3' : 'pt-0.5')}>
          <p className="text-sm font-semibold">{title}</p>
          {description && (
            <div className="text-muted-foreground mt-1 text-sm leading-5">
              {description}
            </div>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
