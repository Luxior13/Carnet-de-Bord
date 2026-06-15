import React, { type ComponentProps, type FC } from 'react';

import { cn } from '$utils/css.utils';

type PageShellProps = ComponentProps<'div'>;

const PageShell: FC<PageShellProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8',
        className,
      )}
      {...props}
    />
  );
};

export { PageShell };
