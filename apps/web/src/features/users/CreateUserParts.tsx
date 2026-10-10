import { type UserRole } from '@repo/shared';
import React, { type FC, type ReactNode } from 'react';

import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { cn } from '$utils/css.utils';

type RoleOptionProps = {
  checked: boolean;
  description: string;
  label: string;
  onSelect: (value: UserRole) => void;
  value: UserRole;
};

export const RoleOption: FC<RoleOptionProps> = ({
  checked,
  description,
  label,
  onSelect,
  value,
}) => (
  <Label
    htmlFor={`newRole-${value}`}
    className={cn(
      'focus-within:ring-ring relative block cursor-pointer rounded-lg border p-3 transition-colors focus-within:ring-2',
      checked
        ? 'border-primary bg-primary/10'
        : 'border-border-control bg-input hover:bg-surface-control-hover',
    )}
  >
    <Input
      id={`newRole-${value}`}
      checked={checked}
      className="sr-only h-px w-px border-0 p-0 lg:h-px"
      name="newRole"
      onChange={() => onSelect(value)}
      type="radio"
      value={value}
    />
    <span className="text-foreground block text-sm font-medium">{label}</span>
    <span className="text-muted-foreground mt-0.5 block text-xs leading-5">
      {description}
    </span>
  </Label>
);

export const FormSectionTitle: FC<{ children: ReactNode; id: string }> = ({
  children,
  id,
}) => (
  <h3
    id={id}
    className="text-muted-foreground text-[11px] font-medium tracking-[0.08em] uppercase"
  >
    {children}
  </h3>
);
