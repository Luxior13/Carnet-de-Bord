import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as React from 'react';

import { cn } from '$utils/css.utils';

type TabsListProps = React.ComponentProps<typeof TabsPrimitive.List>;

type ScrollableTabsListProps = TabsListProps & {
  viewportClassName?: string;
};

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>): React.JSX.Element {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  );
}

function TabsList({ className, ...props }: TabsListProps): React.JSX.Element {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'border-border-default bg-surface-inset text-muted-foreground inline-flex h-12 w-fit items-center justify-start gap-1 rounded-xl border p-1 shadow-none lg:h-10',
        className,
      )}
      {...props}
    />
  );
}

function ScrollableTabsList({
  className,
  viewportClassName,
  ...props
}: ScrollableTabsListProps): React.JSX.Element {
  return (
    <div
      data-slot="tabs-scroll-container"
      className={cn('-mx-1 overflow-x-auto px-1 pb-1', viewportClassName)}
    >
      <TabsList
        className={cn('w-max min-w-full sm:min-w-0', className)}
        {...props}
      />
    </div>
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>): React.JSX.Element {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "hover:bg-surface-tile-hover hover:text-foreground data-[state=active]:border-border-default data-[state=active]:bg-surface-panel-header data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/35 focus-visible:outline-ring inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow] duration-150 focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-none lg:h-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>): React.JSX.Element {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  );
}

export { ScrollableTabsList, Tabs, TabsContent, TabsList, TabsTrigger };
