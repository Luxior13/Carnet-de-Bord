'use client';

import { Check, RotateCcw, X } from 'lucide-react';
import React, { type FC, memo, useId } from 'react';

import {
  type PermissionChoiceState,
  type PermissionMutationDecision,
} from '$components/users/permission-editor-policy';
import { Button } from '$ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';
import { cn } from '$utils/css.utils';

type PermissionStatePickerProps = {
  allowDecision: PermissionMutationDecision;
  defaultState: PermissionChoiceState;
  denyDecision: PermissionMutationDecision;
  onChange: (state: PermissionChoiceState) => void;
  onReset: () => void;
  permissionLabel: string;
  resetDecision: PermissionMutationDecision;
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
  ({
    allowDecision,
    defaultState,
    denyDecision,
    onChange,
    onReset,
    permissionLabel,
    resetDecision,
    state,
  }) => {
    const controlDescriptionId = useId();
    const resetDescriptionId = useId();
    const resetDescription = resetDecision.allowed
      ? `Défaut du rôle : ${defaultState === 'allow' ? 'autorisé' : 'refusé'}`
      : (resetDecision.reason ?? 'Réinitialisation non autorisée');

    return (
      <div className="flex min-w-0 items-center gap-1.5">
        <div
          className="border-border/70 bg-surface-control grid min-w-0 flex-1 grid-cols-2 gap-1 rounded-lg border p-1 sm:min-w-[12.5rem] sm:flex-none"
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
                      onClick={() => onChange(option.value)}
                      className={cn(
                        'h-8 w-full rounded-md border px-2 text-xs font-medium',
                        getStateButtonClassName(option.value, state),
                      )}
                      aria-pressed={state === option.value}
                      aria-label={`${option.label} ${permissionLabel}`}
                    >
                      <OptionIcon className="size-3.5" />
                      <span className="ml-1 hidden sm:inline">
                        {option.label}
                      </span>
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
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              aria-describedby={
                resetDecision.allowed ? undefined : resetDescriptionId
              }
              aria-disabled={!resetDecision.allowed}
              aria-label={
                resetDecision.allowed
                  ? undefined
                  : `Revenir au rôle pour ${permissionLabel}`
              }
              className="shrink-0"
              role={resetDecision.allowed ? undefined : 'button'}
              tabIndex={resetDecision.allowed ? undefined : 0}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={!resetDecision.allowed}
                onClick={onReset}
                className="text-muted-foreground hover:text-foreground size-9"
                aria-label={`Revenir au rôle pour ${permissionLabel}`}
              >
                <RotateCcw className="size-3.5" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent sideOffset={6}>{resetDescription}</TooltipContent>
          {!resetDecision.allowed && (
            <span className="sr-only" id={resetDescriptionId}>
              {resetDescription}
            </span>
          )}
        </Tooltip>
      </div>
    );
  },
);

PermissionStatePicker.displayName = 'PermissionStatePicker';
