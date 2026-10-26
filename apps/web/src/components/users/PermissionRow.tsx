'use client';

import { type UserRole } from '@repo/shared';
import { LockKeyhole } from 'lucide-react';
import React, { type FC } from 'react';

import {
  getPermissionDisplayLabel,
  hasCompleteAccessByRole,
  type PermissionItem,
} from '$constants/permissions.constants';
import { Button } from '$ui/button';
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

/** What the last change also did to other permissions, with its undo. */
type PermissionCascadeNotice = {
  message: string;
  onUndo: () => void;
};

type PermissionRowProps = {
  /** Access permission of the row's page; its absence dims the row. */
  accessKey?: string;
  cascade?: PermissionCascadeNotice | null;
  /** Differs from the saved value: marked until saved or cancelled. */
  changed?: boolean;
  disabled: boolean;
  getDecision: (
    key: string,
    state: PermissionChoiceState,
  ) => PermissionMutationDecision;
  /** Reason the page states once; rows sharing it keep only a lock. */
  isPageAccess?: boolean;
  onChange: (key: string, state: PermissionChoiceState) => void;
  permission: PermissionItem;
  role: UserRole;
  sharedBlockedReason?: string | null;
  state: ReturnType<typeof buildPermissionEditorState>;
};

/**
 * One permission on one line: label, details popover, « Critique » when it
 * applies, and its switch. Only the exception carries a risk label; the page
 * access row leads its page and explains what it unlocks.
 */
export const PermissionRow: FC<PermissionRowProps> = ({
  accessKey,
  cascade = null,
  changed = false,
  disabled,
  getDecision,
  isPageAccess = false,
  onChange,
  permission,
  role,
  sharedBlockedReason = null,
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
  // A blocked switch states why on the row, not only on hover (delegated
  // actors may see many of them, 26 October 2026).
  const toggleDecision =
    providedByRole || disabled
      ? null
      : getDecision(permission.key, configured ? 'deny' : 'allow');
  const blockedReason =
    toggleDecision && !toggleDecision.allowed
      ? (toggleDecision.reason ?? 'Action non autorisée')
      : null;

  return (
    <div
      className={isPageAccess ? styles.pageAccess : styles.row}
      data-blocked={pageBlocked}
      data-changed={changed}
      data-incomplete={missing.length > 0}
      data-permission={permission.key}
    >
      <div className={styles.rowSummary}>
        <div className={styles.rowHeading}>
          <Heading className="text-foreground min-w-0 text-sm font-semibold">
            {permission.label}
          </Heading>
          {changed && (
            <span
              aria-label="Modifiée, non enregistrée"
              className="bg-warning size-1.5 shrink-0 rounded-full"
              role="img"
            />
          )}
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
          {blockedReason && blockedReason === sharedBlockedReason && (
            // The reason is stated once above; the switch carries it too.
            <LockKeyhole
              aria-hidden="true"
              className="text-muted-foreground size-3.5 shrink-0"
            />
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
        {blockedReason && blockedReason !== sharedBlockedReason && (
          // Read once by screen readers: the switch already carries it.
          <p aria-hidden="true" className={styles.blockedReason}>
            <LockKeyhole className="size-3.5 shrink-0" />
            {blockedReason}
          </p>
        )}
        {cascade && (
          <p className={styles.cascadeNotice} role="status">
            <span>{cascade.message}</span>
            <Button
              className="h-auto px-1 py-0 text-xs"
              onClick={cascade.onUndo}
              size="sm"
              type="button"
              variant="link"
            >
              Annuler
            </Button>
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
