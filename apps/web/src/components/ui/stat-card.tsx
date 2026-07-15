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
  iconColor = 'text-muted-foreground',
  title,
  trend,
  value,
}) => {
  return (
    <Card
      className={cn(
        'border-border/45 bg-surface-muted overflow-hidden rounded-md shadow-none',
        className,
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm font-medium">{title}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-foreground text-2xl font-bold tracking-normal">
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
              <p className="text-muted-foreground text-xs">{description}</p>
            )}
          </div>
          <div className="border-border/50 bg-surface-raised text-muted-foreground flex h-10 w-10 items-center justify-center rounded-md border">
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
