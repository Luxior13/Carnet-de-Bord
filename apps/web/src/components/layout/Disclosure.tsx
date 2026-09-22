'use client';

import { ChevronDown } from 'lucide-react';
import React, { type FC, type ReactNode } from 'react';

import { Button } from '$ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '$ui/collapsible';
import { cn } from '$utils/css.utils';

type DisclosureProps = {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  label: string;
};

export const Disclosure: FC<DisclosureProps> = ({
  children,
  className,
  icon,
  label,
}) => (
  <Collapsible className={cn('group/disclosure', className)}>
    <CollapsibleTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="inline"
        className="text-muted-foreground hover:text-foreground min-h-8 gap-1.5 text-xs font-medium"
      >
        {icon}
        {label}
        <ChevronDown
          aria-hidden="true"
          className="size-3.5 transition-transform group-data-[state=open]/disclosure:rotate-180"
        />
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent>{children}</CollapsibleContent>
  </Collapsible>
);
