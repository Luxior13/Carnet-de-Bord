import React, { type FC } from 'react';

import { cn } from '$utils/css.utils';

type SkeletonProps = React.ComponentProps<'div'>;

const Skeleton: FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      data-slot="skeleton"
      className={cn('bg-secondary animate-pulse rounded-md', className)}
      {...props}
    />
  );
};

export { Skeleton };
