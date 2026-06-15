import * as LabelPrimitive from '@radix-ui/react-label';
import React, { type ComponentProps, type FC } from 'react';

import { cn } from '$utils/css.utils';

type LabelProps = ComponentProps<typeof LabelPrimitive.Root> & {
  required?: boolean;
};

const Label: FC<LabelProps> = ({
  children,
  className,
  required = false,
  ...props
}) => {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <>
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
          <span className="sr-only">obligatoire</span>
        </>
      ) : null}
    </LabelPrimitive.Root>
  );
};

export { Label };
