import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as React from 'react';

import { cn } from '$utils/css.utils';

type TabsListProps = React.ComponentProps<typeof TabsPrimitive.List> & {
  variant?: 'default' | 'line';
};

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

function TabsList({
  className,
  variant = 'default',
  ...props
}: TabsListProps): React.JSX.Element {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(
        'group/tabs-list text-muted-foreground inline-flex w-fit items-center justify-start gap-1 shadow-none',
        variant === 'line'
          ? 'border-border-divider h-12 rounded-none border-b bg-transparent p-0'
          : 'border-border-default bg-surface-inset h-12 rounded-xl border p-1 lg:h-10',
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
        "hover:bg-surface-navigation-hover hover:text-foreground data-[state=active]:border-border-default data-[state=active]:bg-surface-navigation-active data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/35 focus-visible:outline-ring inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow] duration-150 focus-visible:ring-[var(--ring-width)] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-none lg:h-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        'group-data-[variant=line]/tabs-list:data-[state=active]:border-primary group-data-[variant=line]/tabs-list:h-12 group-data-[variant=line]/tabs-list:flex-none group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:border-0 group-data-[variant=line]/tabs-list:border-b-2 group-data-[variant=line]/tabs-list:focus-visible:ring-inset group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent',
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
