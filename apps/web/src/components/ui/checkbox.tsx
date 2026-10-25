import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { CheckIcon, MinusIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '$utils/css.utils';

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>): React.ReactNode {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer border-border-control bg-input data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground focus-visible:border-ring focus-visible:ring-ring aria-invalid:border-destructive aria-invalid:ring-destructive/20 hover:border-ring/70 dark:aria-invalid:ring-destructive/40 rounded-option relative size-4 shrink-0 border shadow-none transition-[border-color,background-color,box-shadow] outline-none after:absolute after:-inset-3 after:content-[''] focus-visible:ring-[length:var(--ring-width)] disabled:cursor-not-allowed disabled:opacity-50 lg:after:inset-0",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="group/checkbox-indicator flex items-center justify-center text-current transition-none"
      >
        <CheckIcon
          aria-hidden="true"
          className="hidden size-3.5 group-data-[state=checked]/checkbox-indicator:block"
        />
        <MinusIcon
          aria-hidden="true"
          className="hidden size-3.5 group-data-[state=indeterminate]/checkbox-indicator:block"
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
