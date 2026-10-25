import * as SelectPrimitive from '@radix-ui/react-select';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import React, { type ComponentProps, type FC } from 'react';

import { cn } from '$utils/css.utils';

import styles from './select.module.css';

type SelectVariant = 'default' | 'compact';

type SelectProps = ComponentProps<typeof SelectPrimitive.Root>;

const Select: FC<SelectProps> = ({ ...props }) => {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
};

type SelectValueProps = ComponentProps<typeof SelectPrimitive.Value>;

const SelectValue: FC<SelectValueProps> = ({ ...props }) => {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
};

type SelectTriggerProps = ComponentProps<typeof SelectPrimitive.Trigger> & {
  variant?: SelectVariant;
};

const SelectTrigger: FC<SelectTriggerProps> = ({
  children,
  className,
  variant = 'default',
  ...props
}) => {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "bg-input data-[placeholder]:text-muted-foreground data-[state=open]:bg-surface-control-focus data-[state=open]:aria-invalid:border-destructive aria-invalid:border-destructive aria-invalid:ring-destructive/20 hover:enabled:not-focus-visible:not-data-[state=open]:bg-surface-control-hover focus-visible:bg-surface-control-focus dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='text-'])]:text-muted-foreground flex w-fit items-center justify-between gap-2 border whitespace-nowrap shadow-none transition-[background-color,border-color,color,box-shadow] outline-none focus-visible:ring-[length:var(--ring-width)] disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 data-[state=open]:ring-[length:var(--ring-width)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        variant === 'compact'
          ? cn(
              'border-border-control focus-visible:border-ring ring-ring data-[state=open]:border-ring hover:enabled:border-ring/70 rounded-compact',
              styles.compactTrigger,
            )
          : 'border-border-form hover:enabled:not-focus-visible:not-data-[state=open]:not-aria-invalid:border-border-strong focus-visible:not-aria-invalid:border-primary data-[state=open]:not-aria-invalid:border-primary ring-ring-form font-form rounded-control h-10 px-[11px] py-1.5 text-[16px] leading-5 focus-visible:ring-2 data-[state=open]:ring-2 max-sm:h-11 lg:text-[13px]',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
};

type SelectContentProps = ComponentProps<typeof SelectPrimitive.Content> & {
  variant?: SelectVariant;
};

const SelectContent: FC<SelectContentProps> = ({
  children,
  className,
  position = 'popper',
  variant = 'default',
  ...props
}) => {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          'border-border-control bg-surface-floating text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 rounded-tile relative z-50 max-h-(--radix-select-content-available-height) max-w-[calc(100vw-2rem)] min-w-[8rem] overflow-x-hidden overflow-y-auto overscroll-contain border shadow-[var(--shadow-panel-strong)]',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          // Form styles stay utilities so a caller className can still override them.
          variant === 'compact'
            ? styles.compactContent
            : 'border-border-form font-form rounded-control p-1',
          className,
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            'flex h-auto flex-col gap-0.5 p-0',
            position === 'popper' &&
              'w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1',
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
};

type SelectItemProps = ComponentProps<typeof SelectPrimitive.Item>;

const SelectItem: FC<SelectItemProps> = ({ children, className, ...props }) => {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "data-[state=checked]:bg-surface-navigation-active data-[state=checked]:text-foreground focus:bg-surface-tile-hover focus:text-accent-foreground data-[state=checked]:focus:bg-surface-navigation-active [&_svg:not([class*='text-'])]:text-muted-foreground data-[disabled]:opacity-50[&_svg]:pointer-events-none rounded-option relative flex min-h-[34px] w-full cursor-default items-center gap-2 py-1.5 pr-7 pl-2 text-[12px] leading-5 outline-hidden select-none data-[disabled]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
};

type SelectScrollUpButtonProps = ComponentProps<
  typeof SelectPrimitive.ScrollUpButton
>;

const SelectScrollUpButton: FC<SelectScrollUpButtonProps> = ({
  className,
  ...props
}) => {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        'flex min-h-10 cursor-default items-center justify-center py-1 lg:min-h-0',
        className,
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
};

type SelectScrollDownButtonProps = ComponentProps<
  typeof SelectPrimitive.ScrollDownButton
>;

const SelectScrollDownButton: FC<SelectScrollDownButtonProps> = ({
  className,
  ...props
}) => {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        'flex min-h-10 cursor-default items-center justify-center py-1 lg:min-h-0',
        className,
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
};

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
