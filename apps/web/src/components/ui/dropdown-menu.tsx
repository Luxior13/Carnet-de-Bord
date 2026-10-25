import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import * as React from 'react';
import { type FC } from 'react';

import { cn } from '$utils/css.utils';

type DropdownMenuProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.Root
>;

const DropdownMenu: FC<DropdownMenuProps> = ({ ...props }) => {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
};

type DropdownMenuTriggerProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.Trigger
>;

const DropdownMenuTrigger: FC<DropdownMenuTriggerProps> = ({ ...props }) => {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  );
};

type DropdownMenuContentProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.Content
>;

const DropdownMenuContent: FC<DropdownMenuContentProps> = ({
  className,
  sideOffset = 4,
  ...props
}) => {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          'border-border-control bg-surface-floating text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=top]:slide-in-from-bottom-2 data-[side=right]:slide-in-from-left-2 rounded-tile z-50 max-h-(--radix-dropdown-menu-content-available-height) max-w-[calc(100vw-2rem)] min-w-[8rem] overflow-x-hidden overflow-y-auto border p-2 shadow-[var(--shadow-panel-strong)]',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
};

type DropdownMenuGroupProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.Group
>;

const DropdownMenuGroup: FC<DropdownMenuGroupProps> = ({ ...props }) => {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  );
};

type DropdownMenuItemProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.Item
> & {
  inset?: boolean;
  variant?: 'default' | 'destructive';
};

const DropdownMenuItem: FC<DropdownMenuItemProps> = ({
  className,
  inset,
  variant = 'default',
  ...props
}) => {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "focus:bg-surface-tile-hover focus:text-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground rounded-option relative flex min-h-10 cursor-default items-center gap-2 px-2 py-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 lg:min-h-0 lg:py-1.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
};

type DropdownMenuLabelProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.Label
> & {
  inset?: boolean;
};

const DropdownMenuLabel: FC<DropdownMenuLabelProps> = ({
  className,
  inset,
  ...props
}) => {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        'px-2 py-1.5 text-sm font-medium data-[inset]:pl-8',
        className,
      )}
      {...props}
    />
  );
};

type DropdownMenuSeparatorProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.Separator
>;

const DropdownMenuSeparator: FC<DropdownMenuSeparatorProps> = ({
  className,
  ...props
}) => {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn('bg-border-divider mx-2 my-1 h-px', className)}
      {...props}
    />
  );
};

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
};
