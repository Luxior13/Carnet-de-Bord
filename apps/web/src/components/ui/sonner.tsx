import React, { type FC } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster: FC<ToasterProps> = ({ ...props }) => {
  return (
    <Sonner
      position="bottom-right"
      offset={{ bottom: 24, right: 24 }}
      mobileOffset={{ bottom: 16, left: 16, right: 16 }}
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-medium',
          cancelButton:
            'group-[.toast]:border-border-default group-[.toast]:bg-surface-inset group-[.toast]:text-muted-foreground font-medium',
          description: 'group-[.toast]:text-muted-foreground',
          toast:
            'group toast group-[.toaster]:border-border-strong group-[.toaster]:bg-surface-floating group-[.toaster]:text-foreground group-[.toaster]:rounded-xl group-[.toaster]:shadow-[var(--shadow-panel-strong)]',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
