'use client';

import { UserRole } from '@repo/shared';
import { Crown, LogOut, ShieldAlert } from 'lucide-react';
import React, { type FC, useRef } from 'react';

import { Disclosure } from '$components/layout/Disclosure';
import { SectionActionBar } from '$components/layout/SectionActionBar';
import {
  type PermissionMutationPolicy,
  type PermissionMutationSummary,
} from '$components/users/permission-editor-policy';
import { PERMISSION_EDITOR_CATEGORIES } from '$components/users/permission-editor-view';
import { PermissionsEditor } from '$components/users/PermissionsEditor';
import {
  getPermissionDisplayLabel,
  hasPermission,
  type PermissionsData,
} from '$constants/permissions.constants';
import { UserAccessBadge } from '$features/users/user-badges';
import type { UserType } from '$types/auth.types';
import { Badge } from '$ui/badge';
import { Card, CardContent } from '$ui/card';
import { Label } from '$ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';

type UserAccessTabProps = {
  canChangePermission: PermissionMutationPolicy;
  canDelegatePermissions: boolean;
  canEditRole: boolean;
  canGrantPermissions: boolean;
  canManagePermissions: boolean;
  canRevokePermissions: boolean;
  canSave: boolean;
  hasChanges: boolean;
  isRefreshing?: boolean;
  isSaving: boolean;
  mutationSummary: PermissionMutationSummary | null;
  onCancel: () => void;
  onPermissionPageChange: (pageKey: string) => void;
  onSave: () => void;
  permissionPageKey: string;
  permissions: PermissionsData | null;
  role: UserRole;
  saveDisabledReason?: string;
  setPermissions: (permissions: PermissionsData | null) => void;
  setRole: (role: UserRole) => void;
  user: UserType;
};

const roleLabel = (role: UserRole): string =>
  role === UserRole.ADMIN ? 'Administrateur' : 'Utilisateur';

export const UserAccessTab: FC<UserAccessTabProps> = ({
  canChangePermission,
  canDelegatePermissions,
  canEditRole,
  canGrantPermissions,
  canManagePermissions,
  canRevokePermissions,
  canSave,
  hasChanges,
  isRefreshing = false,
  isSaving,
  mutationSummary,
  onCancel,
  onPermissionPageChange,
  onSave,
  permissionPageKey,
  permissions,
  role,
  saveDisabledReason,
  setPermissions,
  setRole,
  user,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const handleCancel = (): void => {
    onCancel();
    requestAnimationFrame(() => {
      const field = cardRef.current?.querySelector<HTMLElement>(
        '#user-role:not(:disabled), button[aria-pressed]:not(:disabled):not([aria-hidden="true"])',
      );
      const heading = cardRef.current?.querySelector<HTMLElement>('h3');
      if (field) field.focus();
      else if (heading) {
        heading.tabIndex = -1;
        heading.focus();
      }
    });
  };
  const mutationSummaryLabel = mutationSummary
    ? [
        mutationSummary.grantedCount > 0
          ? `${mutationSummary.grantedCount} attribution${mutationSummary.grantedCount > 1 ? 's' : ''}`
          : null,
        mutationSummary.revokedCount > 0
          ? `${mutationSummary.revokedCount} retrait${mutationSummary.revokedCount > 1 ? 's' : ''}`
          : null,
        mutationSummary.delegationChangeCount > 0
          ? `${mutationSummary.delegationChangeCount} changement${mutationSummary.delegationChangeCount > 1 ? 's' : ''} de délégation`
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';
  const changedKeys = mutationSummary
    ? [
        ...mutationSummary.grantedPermissionKeys,
        ...mutationSummary.revokedPermissionKeys,
        ...mutationSummary.delegationPermissionKeys,
      ]
    : [];

  if (user.isProtected) {
    return (
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start gap-3">
            <Crown className="text-muted-foreground mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">
                  Autorisations du super-administrateur
                </h3>
                <UserAccessBadge user={user} />
              </div>
              <p className="text-muted-foreground text-xs leading-5">
                Ce compte dispose automatiquement de toutes les autorisations.
                Ses accès sont protégés et ne peuvent pas être restreints.
              </p>
              <p className="text-muted-foreground text-xs">
                {
                  PERMISSION_EDITOR_CATEGORIES.filter(
                    (category) => category.scope === 'page',
                  ).length
                }{' '}
                pages administratives accessibles · Aucun réglage manuel
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-visible" aria-busy={isSaving} ref={cardRef}>
      <div className="border-border-divider space-y-2 border-b px-4 py-3">
        <p className="text-muted-foreground text-xs font-medium">
          Vos droits de gestion sur ce compte
        </p>
        <dl className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
          <div>
            <dt className="text-muted-foreground inline">Attribution : </dt>
            <dd className="inline">
              {canGrantPermissions ? 'autorisée' : 'interdite'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground inline">Retrait : </dt>
            <dd className="inline">
              {canRevokePermissions ? 'autorisé' : 'interdit'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground inline">
              Déléguer attribution/retrait :{' '}
            </dt>
            <dd className="inline">{canDelegatePermissions ? 'oui' : 'non'}</dd>
          </div>
        </dl>
        {(canGrantPermissions || canEditRole) &&
          user.criticalAccessReady !== true && (
            <p
              className="text-warning flex items-start gap-2 text-xs leading-5"
              role="note"
            >
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                La double authentification doit être activée par ce membre avant
                de lui accorder un rôle administrateur ou une autorisation
                critique.
              </span>
            </p>
          )}
      </div>
      <PermissionsEditor
        canChangePermission={canChangePermission}
        role={role}
        permissions={permissions}
        onChange={setPermissions}
        selectedPageKey={permissionPageKey}
        onSelectedPageChange={onPermissionPageChange}
        disabled={!canManagePermissions || isSaving}
        headerControls={
          <div className="w-full space-y-1.5 sm:w-52">
            <Label htmlFor="user-role">Rôle de base</Label>
            {canEditRole ? (
              <>
                <Select
                  value={role}
                  onValueChange={(value) => setRole(value as UserRole)}
                  disabled={isSaving}
                >
                  <SelectTrigger
                    id="user-role"
                    variant="compact"
                    className="w-full"
                    aria-describedby={
                      user.criticalAccessReady !== true
                        ? 'user-role-mfa-requirement'
                        : undefined
                    }
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent variant="compact">
                    <SelectItem value="USER">Utilisateur</SelectItem>
                    <SelectItem
                      disabled={user.criticalAccessReady !== true}
                      value="ADMIN"
                    >
                      Administrateur
                    </SelectItem>
                  </SelectContent>
                </Select>
                {user.criticalAccessReady !== true && (
                  <p
                    id="user-role-mfa-requirement"
                    className="text-muted-foreground text-xs leading-5"
                  >
                    Double authentification requise avant promotion.
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-1">
                <Badge id="user-role" variant="outline">
                  {roleLabel(role)}
                </Badge>
                <p className="text-muted-foreground text-xs leading-5">
                  Seul le super-administrateur peut changer le rôle.
                </p>
              </div>
            )}
          </div>
        }
      />
      {hasChanges && (
        <div className="border-border-divider space-y-2 border-t px-4 py-3">
          <Disclosure label="Voir les modifications avant enregistrement">
            <ul className="space-y-1 py-2 text-xs leading-5">
              {role !== user.role && (
                <li>
                  Rôle : {roleLabel(user.role)} → {roleLabel(role)}
                </li>
              )}
              {changedKeys.map((key) => (
                <li key={key}>
                  {getPermissionDisplayLabel(key)} :{' '}
                  {hasPermission(role, key, permissions)
                    ? 'autorisé'
                    : 'refusé'}
                </li>
              ))}
            </ul>
          </Disclosure>
        </div>
      )}
      {(canManagePermissions || canEditRole) && (
        <SectionActionBar
          hasChanges={hasChanges}
          isResolvingConflict={isRefreshing}
          isSaving={isSaving && !isRefreshing}
          label="Enregistrement des autorisations"
          onCancel={handleCancel}
          onSave={onSave}
          saveDisabled={!canSave}
          saveDisabledReason={!canSave ? saveDisabledReason : undefined}
          details={
            <>
              {hasChanges && mutationSummaryLabel && (
                <p className="text-foreground text-xs">
                  {mutationSummaryLabel}
                </p>
              )}
              {hasChanges && (
                <p className="text-warning flex items-start gap-1.5 text-xs leading-5">
                  <LogOut
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0"
                  />
                  <span>
                    Enregistrer déconnectera cet utilisateur de toutes ses
                    sessions.
                  </span>
                </p>
              )}
            </>
          }
        />
      )}
    </Card>
  );
};
