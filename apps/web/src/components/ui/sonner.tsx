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
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-medium',
          description: 'group-[.toast]:text-muted-foreground',
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-[var(--shadow-panel)]',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
