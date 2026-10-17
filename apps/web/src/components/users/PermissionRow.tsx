'use client';

import { type UserRole } from '@repo/shared';
import { Info } from 'lucide-react';
import React, { type FC } from 'react';

import {
  getPermissionDisplayLabel,
  type PermissionItem,
} from '$constants/permissions.constants';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '$ui/collapsible';
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
    state: PermissionChoiceState | 'reset',
  ) => PermissionMutationDecision;
  hasCustomChoice: boolean;
  isPageAccess?: boolean;
  onChange: (key: string, state: PermissionChoiceState) => void;
  onReset: (key: string) => void;
  permission: PermissionItem;
  role: UserRole;
  state: ReturnType<typeof buildPermissionEditorState>;
};

export const PermissionRow: FC<PermissionRowProps> = ({
  accessKey,
  disabled,
  getDecision,
  hasCustomChoice,
  isPageAccess = false,
  onChange,
  onReset,
  permission,
  role,
  state,
}) => {
  const configured = state.configured.get(permission.key) ?? false;
  const usable = state.effective.get(permission.key) ?? false;
  const inherited = state.roleDefaults.get(permission.key) ?? false;
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
  const showStatus = isPageAccess || disabled || missing.length > 0;
  const Heading = isPageAccess ? 'h4' : 'h5';

  return (
    <Collapsible
      className={isPageAccess ? styles.pageAccess : styles.row}
      data-incomplete={missing.length > 0}
      data-permission={permission.key}
    >
      <div className={styles.rowSummary}>
        <div className={styles.rowHeading}>
          <Heading className="text-foreground min-w-0 text-sm font-medium">
            {permission.label}
          </Heading>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={styles.infoTrigger}
              aria-label={`Détails et héritage : ${permission.label}`}
            >
              <Info className="size-4" aria-hidden="true" />
            </Button>
          </CollapsibleTrigger>
        </div>
        <div className={styles.rowMeta}>
          <span>{hasCustomChoice ? 'Personnalisé' : 'Hérité du rôle'}</span>
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
                permission.risk === 'critical' ? 'text-destructive' : undefined
              }
            >
              <span aria-hidden="true">· </span>
              {permission.risk === 'critical' ? 'Critique' : 'Sensible'}
            </span>
          )}
        </div>
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
        {permission.grantable ? (
          disabled ? (
            <span className="text-muted-foreground text-xs">Lecture seule</span>
          ) : (
            <PermissionStatePicker
              allowDecision={getDecision(permission.key, 'allow')}
              defaultState={inherited ? 'allow' : 'deny'}
              denyDecision={getDecision(permission.key, 'deny')}
              permissionLabel={permission.label}
              resetDecision={
                hasCustomChoice
                  ? getDecision(permission.key, 'reset')
                  : {
                      allowed: false,
                      reason: 'Aucune exception à réinitialiser.',
                    }
              }
              state={configured ? 'allow' : 'deny'}
              onChange={(choice) => onChange(permission.key, choice)}
              onReset={() => onReset(permission.key)}
            />
          )
        ) : (
          <RoleBoundPermissionStatus isEnabled={usable} role={role} />
        )}
      </div>
      <CollapsibleContent className={styles.rowDetails}>
        {permission.risk !== 'critical' && <p>{permission.description}</p>}
        {isPageAccess && usable && (
          <p>
            Les actions ci-dessous restent soumises à leurs propres
            autorisations.
          </p>
        )}
        <dl className={styles.detailValues}>
          <div>
            <dt className="inline">Origine du réglage : </dt>
            <dd className="inline">
              {hasCustomChoice
                ? 'Exception personnalisée'
                : 'Valeur héritée du rôle'}
            </dd>
          </div>
          <div>
            <dt className="inline">Valeur du rôle : </dt>
            <dd className="inline">{inherited ? 'autorisée' : 'refusée'}</dd>
          </div>
          <div>
            <dt className="inline">Réglage choisi : </dt>
            <dd className="inline">{configured ? 'autorisé' : 'refusé'}</dd>
          </div>
          <div>
            <dt className="inline">Accès effectif : </dt>
            <dd className="inline">
              {usable ? 'utilisable' : 'non utilisable'}
            </dd>
          </div>
          {(permission.dependencies?.length ?? 0) > 0 && (
            <div>
              <dt className="inline">Autorisations requises : </dt>
              <dd className="inline">
                {permission.dependencies
                  ?.map(getPermissionDisplayLabel)
                  .join(', ')}
              </dd>
            </div>
          )}
        </dl>
      </CollapsibleContent>
    </Collapsible>
  );
};
