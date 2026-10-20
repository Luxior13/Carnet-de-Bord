'use client';

import React, { type FC } from 'react';

import { UserStatusBadge } from '$features/users/user-badges';
import type { UserType } from '$types/auth.types';
import directoryStyles from '$ui/directory.module.css';
import { StatusBadge } from '$ui/status-badge';
import { cn } from '$utils/css.utils';

import {
  buildPermissionEditorState,
  countUsablePermissions,
} from './permission-editor-view';
import styles from './UserOverviewCard.module.css';

const formatDetailDate = (value: Date | string | undefined): string => {
  const date = value instanceof Date ? value : value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const UserOverviewCard: FC<{
  canViewAccess?: boolean;
  user: UserType;
}> = ({ canViewAccess, user }) => {
  const permissions = canViewAccess
    ? countUsablePermissions(
        buildPermissionEditorState(user.role, user.permissions).effective,
      )
    : null;
  const usableCount = user.isProtected
    ? permissions?.total
    : permissions?.ready;

  return (
    <aside
      aria-label="Vue d'ensemble"
      className={cn(directoryStyles.overviewCard, 'min-w-0')}
    >
      <h2
        className={cn(
          directoryStyles.overviewHeader,
          'border-border-divider border-b px-4 py-2 text-sm font-semibold',
        )}
      >
        Vue d&apos;ensemble
      </h2>
      <div
        className={cn(
          styles.values,
          user.isProtected && styles.withProtection,
          canViewAccess !== undefined && styles.withAccess,
        )}
      >
        <div className={styles.value}>
          <span className="text-muted-foreground text-xs">État</span>
          <UserStatusBadge isActive={user.isActive} />
        </div>
        {user.isProtected && (
          <div className={styles.value}>
            <span className="text-muted-foreground text-xs">Protection</span>
            <StatusBadge tone="warning">Compte racine</StatusBadge>
          </div>
        )}
        <div className={styles.value}>
          <span className="text-muted-foreground text-xs">Mot de passe</span>
          <StatusBadge
            tone={
              user.securityDetailsVisible === false
                ? 'muted'
                : user.mustChangePassword
                  ? 'warning'
                  : 'success'
            }
          >
            {user.securityDetailsVisible === false
              ? 'Masqué'
              : user.mustChangePassword
                ? 'À changer'
                : 'À jour'}
          </StatusBadge>
        </div>
        <div className={styles.value}>
          <span className="text-muted-foreground text-xs">
            Double authentification
          </span>
          <StatusBadge
            tone={
              user.securityDetailsVisible === false
                ? 'muted'
                : user.mfaEnabledAt
                  ? 'success'
                  : 'warning'
            }
          >
            {user.securityDetailsVisible === false
              ? 'Masquée'
              : user.mfaEnabledAt
                ? 'Activée'
                : 'À configurer'}
          </StatusBadge>
        </div>
        {canViewAccess !== undefined && (
          <div className={styles.value}>
            <span className="text-muted-foreground text-xs">Autorisations</span>
            <span className="text-foreground text-xs tabular-nums">
              {permissions ? (
                <>
                  <span aria-hidden="true">
                    {usableCount} / {permissions.total}
                  </span>
                  <span className="sr-only">
                    {usableCount} autorisations administratives utilisables sur{' '}
                    {permissions.total}
                  </span>
                </>
              ) : (
                'Masquées'
              )}
            </span>
          </div>
        )}
        <div className={styles.value}>
          <span className="text-muted-foreground text-xs">Créé le</span>
          <span className="text-foreground text-xs tabular-nums">
            {formatDetailDate(user.createdAt)}
          </span>
        </div>
        <div className={styles.value}>
          <span className="text-muted-foreground text-xs">
            Dernière modification
          </span>
          <span className="text-foreground text-xs tabular-nums">
            {formatDetailDate(user.updatedAt)}
          </span>
        </div>
      </div>
    </aside>
  );
};
