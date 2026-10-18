'use client';

import { Check, X } from 'lucide-react';
import React, { type FC, memo, useId } from 'react';

import {
  type PermissionChoiceState,
  type PermissionMutationDecision,
} from '$components/users/permission-editor-policy';
import { Button } from '$ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';
import { cn } from '$utils/css.utils';

import styles from './PermissionsEditor.module.css';

type PermissionStatePickerProps = {
  allowDecision: PermissionMutationDecision;
  denyDecision: PermissionMutationDecision;
  onChange: (state: PermissionChoiceState) => void;
  permissionLabel: string;
  state: PermissionChoiceState;
};

const OPTIONS = [
  { icon: Check, label: 'Autoriser', value: 'allow' },
  { icon: X, label: 'Refuser', value: 'deny' },
] as const;

const getStateButtonClassName = (
  option: PermissionChoiceState,
  currentState: PermissionChoiceState,
): string => {
  if (option !== currentState) {
    return 'border-transparent text-muted-foreground hover:bg-accent/70 hover:text-foreground';
  }

  return option === 'allow'
    ? 'border-success/35 bg-success/15 text-success hover:bg-success/20 hover:text-success'
    : 'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive';
};

export const PermissionStatePicker: FC<PermissionStatePickerProps> = memo(
  ({ allowDecision, denyDecision, onChange, permissionLabel, state }) => {
    const controlDescriptionId = useId();

    return (
      <div
        className={styles.choices}
        role="group"
        aria-label={`Choix de l’autorisation ${permissionLabel}`}
      >
        {OPTIONS.map((option) => {
          const OptionIcon = option.icon;
          const decision =
            option.value === 'allow' ? allowDecision : denyDecision;
          const description = decision.allowed
            ? option.label
            : (decision.reason ?? 'Action non autorisée');
          const descriptionId = `${controlDescriptionId}-${option.value}`;

          return (
            <Tooltip key={option.value}>
              <TooltipTrigger asChild>
                <span
                  aria-describedby={
                    decision.allowed ? undefined : descriptionId
                  }
                  aria-disabled={!decision.allowed}
                  aria-pressed={
                    decision.allowed ? undefined : state === option.value
                  }
                  aria-label={
                    decision.allowed
                      ? undefined
                      : `${option.label} ${permissionLabel}`
                  }
                  className="min-w-0"
                  role={decision.allowed ? undefined : 'button'}
                  tabIndex={decision.allowed ? undefined : 0}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!decision.allowed}
                    aria-hidden={!decision.allowed || undefined}
                    onClick={() => onChange(option.value)}
                    className={cn(
                      styles.choiceButton,
                      getStateButtonClassName(option.value, state),
                    )}
                    aria-pressed={state === option.value}
                    aria-label={`${option.label} ${permissionLabel}`}
                  >
                    <OptionIcon className="size-3.5" />
                    <span className="ml-1">{option.label}</span>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>{description}</TooltipContent>
              {!decision.allowed && (
                <span className="sr-only" id={descriptionId}>
                  {description}
                </span>
              )}
            </Tooltip>
          );
        })}
      </div>
    );
  },
);

PermissionStatePicker.displayName = 'PermissionStatePicker';
