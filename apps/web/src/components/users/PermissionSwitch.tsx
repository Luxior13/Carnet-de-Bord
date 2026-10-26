'use client';

import React, { type FC, memo, useId } from 'react';

import {
  type PermissionChoiceState,
  type PermissionMutationDecision,
} from '$components/users/permission-editor-policy';
import { Switch } from '$ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';

type PermissionSwitchProps = {
  allowDecision: PermissionMutationDecision;
  denyDecision: PermissionMutationDecision;
  onChange: (state: PermissionChoiceState) => void;
  permissionLabel: string;
  state: PermissionChoiceState;
};

/**
 * On/off control of one permission. It replaced the « Autoriser / Refuser »
 * pair on 26 October 2026: the default state is neutral, not an alert colour.
 * A refused change keeps the control focusable and states why, by tooltip and
 * for assistive technologies.
 */
export const PermissionSwitch: FC<PermissionSwitchProps> = memo(
  ({ allowDecision, denyDecision, onChange, permissionLabel, state }) => {
    const descriptionId = useId();
    const checked = state === 'allow';
    const decision = checked ? denyDecision : allowDecision;

    if (decision.allowed)
      return (
        <Switch
          aria-label={permissionLabel}
          checked={checked}
          onCheckedChange={(next) => onChange(next ? 'allow' : 'deny')}
        />
      );

    const reason = decision.reason ?? 'Action non autorisée';

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            aria-checked={checked}
            aria-describedby={descriptionId}
            aria-disabled="true"
            aria-label={permissionLabel}
            className="inline-flex"
            role="switch"
            tabIndex={0}
          >
            <Switch aria-hidden checked={checked} disabled tabIndex={-1} />
          </span>
        </TooltipTrigger>
        <TooltipContent sideOffset={6}>{reason}</TooltipContent>
        <span className="sr-only" id={descriptionId}>
          {reason}
        </span>
      </Tooltip>
    );
  },
);

PermissionSwitch.displayName = 'PermissionSwitch';
