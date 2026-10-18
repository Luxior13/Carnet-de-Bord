'use client';

import { type UserRole } from '@repo/shared';
import { Info } from 'lucide-react';
import React, { type FC } from 'react';

import {
  getPermissionDisplayLabel,
  hasCompleteAccessByRole,
  type PermissionItem,
} from '$constants/permissions.constants';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '$ui/popover';
import { cn } from '$utils/css.utils';

import {
  type PermissionChoiceState,
  type PermissionMutationDecision,
} from './permission-editor-policy';
import {
  buildPermissionEditorState,
  getMissingPermissionDependencies,
} from './permission-editor-view';
import styles from './PermissionsEditor.module.css';
import { PermissionStatePicker } from './PermissionStatePicker';
import { RoleBoundPermissionStatus } from './RoleBoundPermissionStatus';

type PermissionRowProps = {
  accessKey?: string;
  disabled: boolean;
  getDecision: (
    key: string,
    state: PermissionChoiceState,
  ) => PermissionMutationDecision;
  isPageAccess?: boolean;
  onChange: (key: string, state: PermissionChoiceState) => void;
  permission: PermissionItem;
  role: UserRole;
  state: ReturnType<typeof buildPermissionEditorState>;
};

export const PermissionRow: FC<PermissionRowProps> = ({
  accessKey,
  disabled,
  getDecision,
  isPageAccess = false,
  onChange,
  permission,
  role,
  state,
}) => {
  const configured = state.configured.get(permission.key) ?? false;
  const usable = state.effective.get(permission.key) ?? false;
  const providedByRole = !permission.grantable || hasCompleteAccessByRole(role);
  const missing = getMissingPermissionDependencies(
    permission,
    state.configured,
    state.effective,
  );
  const pageBlocked = accessKey !== undefined && missing.includes(accessKey);
  const status = usable
    ? isPageAccess
      ? 'Page accessible'
      : 'Autorisé'
    : missing.length > 0
      ? pageBlocked
        ? 'Page inaccessible'
        : 'Prérequis manquant'
      : isPageAccess
        ? 'Page inaccessible'
        : 'Refusé';
  const showStatus =
    isPageAccess || (disabled && !providedByRole) || missing.length > 0;
  const showMeta = showStatus || permission.risk !== 'default';
  const dependencies = permission.dependencies ?? [];
  const Heading = isPageAccess ? 'h4' : 'h5';

  return (
    <div
      className={isPageAccess ? styles.pageAccess : styles.row}
      data-incomplete={missing.length > 0}
      data-permission={permission.key}
    >
      <div className={styles.rowSummary}>
        <div className={styles.rowHeading}>
          <Heading className="text-foreground min-w-0 text-sm font-semibold">
            {permission.label}
          </Heading>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={styles.infoTrigger}
                aria-label={`Détails : ${permission.label}`}
              >
                <Info className="size-4" aria-hidden="true" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              aria-label={`Détails : ${permission.label}`}
              className="w-80 space-y-3 p-3 text-xs leading-5"
              collisionPadding={12}
            >
              <p className="text-foreground text-sm font-semibold">
                {permission.label}
              </p>
              <p className="text-muted-foreground">{permission.description}</p>
              {isPageAccess && usable && (
                <p className="text-muted-foreground">
                  Les actions de cette page restent soumises à leurs propres
                  autorisations.
                </p>
              )}
              {dependencies.length > 0 && (
                <p className={styles.popoverFootnote}>
                  <span className="text-muted-foreground">Prérequis : </span>
                  {dependencies.map(getPermissionDisplayLabel).join(', ')}
                </p>
              )}
            </PopoverContent>
          </Popover>
        </div>
        {showMeta && (
          <div className={styles.rowMeta}>
            {showStatus && (
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  usable
                    ? 'border-success/35 text-success'
                    : missing.length
                      ? 'border-warning/40 text-warning'
                      : 'text-muted-foreground',
                )}
              >
                {status}
              </Badge>
            )}
            {permission.risk !== 'default' && (
              <span
                className={
                  permission.risk === 'critical'
                    ? 'text-destructive'
                    : undefined
                }
              >
                {permission.risk === 'critical' ? 'Critique' : 'Sensible'}
              </span>
            )}
          </div>
        )}
        {permission.risk === 'critical' && (
          <p className="text-muted-foreground text-xs leading-5">
            {permission.description}
          </p>
        )}
        {isPageAccess && !usable && (
          <p className="text-muted-foreground text-xs leading-5">
            Les actions de cette page restent bloquées sans cet accès.
          </p>
        )}
        {missing.length > 0 && (
          <p className="text-warning text-xs leading-5">
            Réglage autorisé, accès bloqué. À autoriser aussi :{' '}
            {missing.map(getPermissionDisplayLabel).join(', ')}.
          </p>
        )}
      </div>
      <div className={styles.rowControls}>
        {providedByRole ? (
          <RoleBoundPermissionStatus isEnabled={usable} role={role} />
        ) : disabled ? (
          <span className="text-muted-foreground text-xs">Lecture seule</span>
        ) : (
          <PermissionStatePicker
            allowDecision={getDecision(permission.key, 'allow')}
            denyDecision={getDecision(permission.key, 'deny')}
            permissionLabel={permission.label}
            state={configured ? 'allow' : 'deny'}
            onChange={(choice) => onChange(permission.key, choice)}
          />
        )}
      </div>
    </div>
  );
};
