import React, { type ComponentProps, type FC } from 'react';

import { cn } from '$utils/css.utils';

type ServiceIconProps = ComponentProps<'div'>;

const ServiceIcon: FC<ServiceIconProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'border-sidebar-ring/30 bg-sidebar-ring/10 text-sidebar-ring flex size-10 shrink-0 items-center justify-center rounded-md border',
        className,
      )}
      {...props}
    />
  );
};

export { ServiceIcon };
