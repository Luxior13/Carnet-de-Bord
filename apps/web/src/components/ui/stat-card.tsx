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
  iconColor = 'text-primary',
  title,
  trend,
  value,
}) => {
  return (
    <Card className={cn('card-hover', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm font-medium">{title}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{value}</span>
              {trend && (
                <span
                  className={cn(
                    'text-xs font-medium',
                    trend.isPositive ? 'text-green-500' : 'text-red-500',
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
          <div
            className={cn(
              'bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg',
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
