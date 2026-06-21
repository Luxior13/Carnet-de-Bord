import React, { type ComponentProps, type FC } from 'react';

import { cn } from '$utils/css.utils';

type ServiceIconProps = ComponentProps<'div'>;

const ServiceIcon: FC<ServiceIconProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'bg-secondary text-primary flex size-10 shrink-0 items-center justify-center rounded-md',
        className,
      )}
      {...props}
    />
  );
};

export { ServiceIcon };
