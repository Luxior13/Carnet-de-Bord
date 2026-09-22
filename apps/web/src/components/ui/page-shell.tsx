import React, { type ComponentProps, type FC } from 'react';

import { cn } from '$utils/css.utils';

type PageShellWidth = 'default' | 'full' | 'narrow' | 'wide';

type PageShellProps = ComponentProps<'div'> & {
  width?: PageShellWidth;
};

function getPageShellWidthClass(width: PageShellWidth): string {
  switch (width) {
    case 'default':
      return 'max-w-[var(--private-content-width)]';
    case 'full':
      return 'max-w-none';
    case 'narrow':
      return 'max-w-5xl';
    case 'wide':
      return 'max-w-[var(--private-content-width-wide)]';
  }
}

const PageShell: FC<PageShellProps> = ({
  className,
  width = 'default',
  ...props
}) => {
  return (
    <div
      className={cn(
        'relative z-10 mx-auto w-full px-[var(--private-content-padding)] py-5 sm:py-6',
        getPageShellWidthClass(width),
        className,
      )}
      {...props}
    />
  );
};

type PageCanvasProps = ComponentProps<'div'> & {
  contentClassName?: string;
};

const PageCanvas: FC<PageCanvasProps> = ({
  children,
  className,
  contentClassName,
  ...props
}) => {
  return (
    <div className={cn('relative z-10 min-w-0', className)} {...props}>
      <div className={cn('space-y-5 py-4 sm:py-5', contentClassName)}>
        {children}
      </div>
    </div>
  );
};

export { PageCanvas, PageShell };
