'use client';

import { type UserRole } from '@repo/shared';
import React, { type FC } from 'react';

import {
  getPermissionDisplayLabel,
  hasCompleteAccessByRole,
  type PermissionItem,
} from '$constants/permissions.constants';
import { StatusBadge } from '$ui/status-badge';

import {
  type PermissionChoiceState,
  type PermissionMutationDecision,
} from './permission-editor-policy';
import {
  buildPermissionEditorState,
  getMissingPermissionDependencies,
} from './permission-editor-view';
import { PermissionInfoButton } from './PermissionInfoButton';
import styles from './PermissionsEditor.module.css';
import { PermissionSwitch } from './PermissionSwitch';
import { RoleBoundPermissionStatus } from './RoleBoundPermissionStatus';

type PermissionRowProps = {
  /** Access permission of the row's page; its absence dims the row. */
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

/**
 * One permission on one line: label, details popover, « Critique » when it
 * applies, and its switch. Only the exception carries a risk label; the page
 * access row leads its page and explains what it unlocks.
 */
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
  const pageBlocked =
    !isPageAccess &&
    accessKey !== undefined &&
    accessKey !== permission.key &&
    !(state.effective.get(accessKey) ?? false);
  const dependencies = permission.dependencies ?? [];
  const Heading = isPageAccess ? 'h4' : 'h5';

  return (
    <div
      className={isPageAccess ? styles.pageAccess : styles.row}
      data-blocked={pageBlocked}
      data-incomplete={missing.length > 0}
      data-permission={permission.key}
    >
      <div className={styles.rowSummary}>
        <div className={styles.rowHeading}>
          <Heading className="text-foreground min-w-0 text-sm font-semibold">
            {permission.label}
          </Heading>
          <PermissionInfoButton
            description={permission.description}
            footnote={
              dependencies.length > 0 && (
                <>
                  <span className="text-muted-foreground">Prérequis : </span>
                  {dependencies.map(getPermissionDisplayLabel).join(', ')}
                </>
              )
            }
            label={permission.label}
          />
          {permission.risk === 'critical' && (
            <StatusBadge tone="danger">Critique</StatusBadge>
          )}
        </div>
        {isPageAccess && (
          <p className="text-muted-foreground text-xs leading-5">
            {usable
              ? 'Page accessible. Chaque action ci-dessous reste soumise à sa propre autorisation.'
              : 'Sans cet accès, les actions de cette page restent bloquées.'}
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
          // Read-only: the state stays readable without an inert control.
          <StatusBadge tone={configured ? 'success' : 'muted'}>
            {configured ? 'Accordée' : 'Non accordée'}
          </StatusBadge>
        ) : (
          <PermissionSwitch
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
