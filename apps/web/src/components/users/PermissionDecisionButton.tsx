'use client';

import React, { type ComponentProps, type FC, useId } from 'react';

import { type PermissionMutationDecision } from '$components/users/permission-editor-policy';
import { Button } from '$ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';
import { cn } from '$utils/css.utils';

type PermissionDecisionButtonProps = Pick<
  ComponentProps<typeof Button>,
  'children' | 'className' | 'onClick' | 'size' | 'variant'
> & {
  accessibleLabel: string;
  concealed?: boolean;
  decision: PermissionMutationDecision;
};

export const PermissionDecisionButton: FC<PermissionDecisionButtonProps> = ({
  accessibleLabel,
  children,
  className,
  concealed = false,
  decision,
  onClick,
  size,
  variant,
}) => {
  const descriptionId = useId();
  const description = decision.allowed
    ? 'Action autorisée'
    : (decision.reason ?? 'Action non autorisée');
  const exposeDisabledReason = !concealed && !decision.allowed;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-describedby={exposeDisabledReason ? descriptionId : undefined}
          aria-disabled={exposeDisabledReason || undefined}
          aria-hidden={concealed || undefined}
          aria-label={exposeDisabledReason ? accessibleLabel : undefined}
          className={cn('inline-flex', concealed && 'invisible')}
          role={exposeDisabledReason ? 'button' : undefined}
          tabIndex={exposeDisabledReason ? 0 : undefined}
        >
          <Button
            className={className}
            disabled={!decision.allowed}
            onClick={onClick}
            size={size}
            tabIndex={concealed ? -1 : undefined}
            type="button"
            variant={variant}
          >
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{description}</TooltipContent>
      {exposeDisabledReason && (
        <span className="sr-only" id={descriptionId}>
          {description}
        </span>
      )}
    </Tooltip>
  );
};
