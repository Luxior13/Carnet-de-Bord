import React, { type ComponentProps, type FC } from 'react';

import { cn } from '$utils/css.utils';

type ServiceIconProps = ComponentProps<'div'>;

const ServiceIcon: FC<ServiceIconProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'border-sidebar-ring/35 bg-sidebar-ring/15 text-sidebar-ring flex size-10 shrink-0 items-center justify-center rounded-lg border shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]',
        className,
      )}
      {...props}
    />
  );
};

export { ServiceIcon };
