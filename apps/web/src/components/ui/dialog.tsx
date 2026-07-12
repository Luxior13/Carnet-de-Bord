import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '$utils/css.utils';

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>): React.ReactNode {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>): React.ReactNode {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>): React.ReactNode {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>): React.ReactNode {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>): React.ReactNode {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/68 duration-200',
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  centered = false,
  children,
  className,
  fullscreenOnMobile = false,
  hideCloseButton = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  centered?: boolean;
  fullscreenOnMobile?: boolean;
  hideCloseButton?: boolean;
}): React.ReactNode {
  return (
    <DialogPortal>
      <DialogOverlay />
      <div
        className={cn(
          'pointer-events-none fixed inset-0 z-50 flex justify-center',
          centered
            ? 'items-center p-4'
            : fullscreenOnMobile
              ? 'items-start overflow-y-auto p-0 sm:items-start sm:px-4 sm:pt-[7.5vh] sm:pb-4'
              : 'items-start overflow-y-auto px-4 pt-[7.5vh] pb-4',
        )}
      >
        <DialogPrimitive.Content
          className={cn(
            'border-border/80 bg-popover text-popover-foreground data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=open]:animate-in pointer-events-auto relative grid w-full max-w-lg border p-5 shadow-[var(--shadow-panel-strong)] duration-200 sm:rounded-md',
            className,
          )}
          {...props}
        >
          {children}
          {!hideCloseButton && (
            <DialogPrimitive.Close className="focus-visible:ring-ring focus-visible:ring-offset-background data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:bg-accent hover:text-accent-foreground absolute top-2 right-2 inline-flex size-10 items-center justify-center rounded-md opacity-70 transition-[background-color,color,opacity,box-shadow] hover:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none">
              <XIcon className="h-4 w-4" />
              <span className="sr-only">Fermer</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </div>
    </DialogPortal>
  );
}

function DialogHeader({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactNode {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactNode {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>): React.ReactNode {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        'text-lg leading-none font-semibold tracking-normal',
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>): React.ReactNode {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
