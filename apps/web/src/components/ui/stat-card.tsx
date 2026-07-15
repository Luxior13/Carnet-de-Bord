import { type LucideIcon } from 'lucide-react';
import React, { type FC, type ReactNode } from 'react';

import { Card, CardContent } from '$ui/card';
import { cn } from '$utils/css.utils';

type StatCardProps = {
  className?: string;
  description?: string;
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  trend?: {
    isPositive: boolean;
    value: string;
  };
  value: ReactNode;
};

export const StatCard: FC<StatCardProps> = ({
  className,
  description,
  icon: Icon,
  iconColor = 'text-sidebar-ring',
  title,
  trend,
  value,
}) => {
  return (
    <Card
      className={cn(
        'border-border/80 bg-surface overflow-hidden rounded-md border',
        className,
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sidebar-foreground/65 text-sm font-medium">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-sidebar-foreground text-2xl font-bold tracking-normal">
                {value}
              </span>
              {trend && (
                <span
                  className={cn(
                    'text-xs font-medium',
                    trend.isPositive ? 'text-success' : 'text-destructive',
                  )}
                >
                  {trend.isPositive ? '+' : ''}
                  {trend.value}
                </span>
              )}
            </div>
            {description && (
              <p className="text-sidebar-foreground/55 text-xs">
                {description}
              </p>
            )}
          </div>
          <div
            className={cn(
              'border-sidebar-ring/30 bg-sidebar-ring/10 text-sidebar-ring flex h-10 w-10 items-center justify-center rounded-md border',
              iconColor.includes('text-') ? '' : iconColor,
            )}
          >
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
