'use client';

import { type UserRole } from '@repo/shared';
import React, { type FC } from 'react';

import { Disclosure } from '$components/layout/Disclosure';
import {
  getPermissionDisplayLabel,
  type PermissionItem,
} from '$constants/permissions.constants';
import { Badge } from '$ui/badge';
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
    ? 'Autorisé'
    : missing.length > 0
      ? pageBlocked
        ? 'Page inaccessible'
        : 'Prérequis manquant'
      : 'Refusé';

  return (
    <div
      className={styles.row}
      data-incomplete={missing.length > 0}
      data-permission={permission.key}
    >
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h5 className="text-foreground text-sm font-medium">
            {permission.label}
          </h5>
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
          {permission.risk !== 'default' && (
            <span
              className={cn(
                'text-xs',
                permission.risk === 'critical'
                  ? 'text-destructive'
                  : 'text-warning',
              )}
            >
              {permission.risk === 'critical' ? 'Critique' : 'Sensible'}
            </span>
          )}
        </div>
        <p className="text-muted-foreground text-xs leading-5">
          {permission.description}
        </p>
        <p className="text-muted-foreground text-xs">
          {hasCustomChoice
            ? 'Exception personnalisée'
            : 'Valeur héritée du rôle'}
        </p>
        {missing.length > 0 && (
          <p className="text-warning text-xs leading-5">
            Réglage autorisé, accès bloqué. À autoriser aussi :{' '}
            {missing.map(getPermissionDisplayLabel).join(', ')}.
          </p>
        )}
        <Disclosure label="Détails et héritage" className="max-w-full">
          <dl className="text-muted-foreground border-border-divider space-y-1 border-l pl-3 text-xs leading-5">
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
        </Disclosure>
      </div>
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
  );
};
