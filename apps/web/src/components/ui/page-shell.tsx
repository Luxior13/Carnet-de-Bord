import React, { type ComponentProps, type FC } from 'react';

import { cn } from '$utils/css.utils';

type PageShellWidth =
  'default' | 'form' | 'full' | 'narrow' | 'reading' | 'wide';

type PageShellProps = ComponentProps<'div'> & {
  alignment?: 'screen' | 'available';
  width?: PageShellWidth;
};

function getPageShellWidthClass(width: PageShellWidth): string {
  switch (width) {
    case 'default':
      return '[--page-shell-max-width:var(--private-content-width)]';
    case 'full':
      return '[--page-shell-max-width:100%]';
    case 'form':
      return '[--page-shell-max-width:var(--private-content-width-form)]';
    case 'narrow':
      return '[--page-shell-max-width:64rem]';
    case 'reading':
      return '[--page-shell-max-width:var(--private-content-width-reading)]';
    case 'wide':
      return '[--page-shell-max-width:var(--private-content-width-wide)]';
  }
}

const PageShell: FC<PageShellProps> = ({
  alignment = 'screen',
  className,
  width = 'default',
  ...props
}) => {
  return (
    <div
      data-page-alignment={alignment}
      data-page-width={width}
      className={cn(
        '@container/page relative z-10 mx-auto w-full max-w-[var(--page-shell-max-width)] min-w-0 px-[var(--private-content-padding)]',
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
      <div className={cn('space-y-6 py-4 sm:py-6', contentClassName)}>
        {children}
      </div>
    </div>
  );
};

export { PageCanvas, PageShell };
