/* eslint-disable next-recommended/unnecessarily-client-declaration */

'use client';

import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import * as React from 'react';

import { cn } from '$utils/css.utils';

type ScrollAreaProps = React.ComponentPropsWithoutRef<
  typeof ScrollAreaPrimitive.Root
> & {
  onViewportScroll?: React.UIEventHandler<HTMLDivElement>;
  scrollbarClassName?: string;
  thumbClassName?: string;
  viewportClassName?: string;
  viewportRef?: React.Ref<HTMLDivElement>;
};

type ScrollBarProps = React.ComponentPropsWithoutRef<
  typeof ScrollAreaPrimitive.ScrollAreaScrollbar
> & {
  thumbClassName?: string;
};

function ScrollArea({
  children,
  className,
  onViewportScroll,
  scrollbarClassName,
  thumbClassName,
  viewportClassName,
  viewportRef,
  ...props
}: ScrollAreaProps): React.ReactNode {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn('relative overflow-hidden', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        ref={viewportRef}
        onScroll={onViewportScroll}
        className={cn('size-full rounded-[inherit]', viewportClassName)}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar
        className={scrollbarClassName}
        thumbClassName={thumbClassName}
      />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = 'vertical',
  thumbClassName,
  ...props
}: ScrollBarProps): React.ReactNode {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        'flex touch-none p-px transition-colors select-none',
        'data-[orientation=horizontal]:h-2.5 data-[orientation=horizontal]:flex-col',
        'data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2.5',
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className={cn(
          'bg-sidebar-border/70 hover:bg-sidebar-ring/75 relative flex-1 rounded-full transition-colors',
          'before:absolute before:top-1/2 before:left-1/2 before:size-full before:min-h-10 before:min-w-10 before:-translate-x-1/2 before:-translate-y-1/2',
          thumbClassName,
        )}
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar };
