'use client';

import { UserRole } from '@repo/shared';
import { Crown, LockKeyhole, ShieldAlert } from 'lucide-react';
import React, { type FC, useEffect, useRef } from 'react';

import { SectionActionBar } from '$components/layout/SectionActionBar';
import { AuthorizationsHeader } from '$components/users/AuthorizationsHeader';
import {
  type PermissionMutationPolicy,
  type PermissionMutationSummary,
} from '$components/users/permission-editor-policy';
import { PERMISSION_EDITOR_CATEGORIES } from '$components/users/permission-editor-view';
import { PermissionsEditor } from '$components/users/PermissionsEditor';
import { type PermissionsData } from '$constants/permissions.constants';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';

import { useWorkspaceHeight } from './useWorkspaceHeight';

type UserAccessTabProps = {
  canChangePermission: PermissionMutationPolicy;
  canEditRole: boolean;
  canGrantPermissions: boolean;
  canManagePermissions: boolean;
  canSave: boolean;
  hasChanges: boolean;
  isRefreshing?: boolean;
  isSaving: boolean;
  mutationSummary: PermissionMutationSummary | null;
  onCancel: () => void;
  onPermissionPageChange: (pageKey: string) => void;
  onSave: () => void;
  permissionPageKey: string;
  /** The URL names a page: a narrow screen opens it instead of the list. */
  permissionPageRequested?: boolean;
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
  canEditRole,
  canGrantPermissions,
  canManagePermissions,
  canSave,
  hasChanges,
  isRefreshing = false,
  isSaving,
  mutationSummary,
  onCancel,
  onPermissionPageChange,
  onSave,
  permissionPageKey,
  permissionPageRequested = false,
  permissions,
  role,
  saveDisabledReason,
  setPermissions,
  setRole,
  user,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  // On a computer the card fills the screen and each column scrolls on its
  // own; the save bar is docked at the bottom of the card (26 October 2026).
  const workspaceHeight = useWorkspaceHeight(cardRef, !user.isProtected);
  const workspace = workspaceHeight !== null;
  // The docked save bar shortens the columns when it appears: keep the
  // control just used in view instead of letting it slip under the bar.
  useEffect(() => {
    if (!workspace || !hasChanges) return;
    const frame = requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && cardRef.current?.contains(active))
        (active.closest('[data-permission]') ?? active).scrollIntoView({
          block: 'nearest',
        });
    });

    return (): void => cancelAnimationFrame(frame);
  }, [hasChanges, workspace]);
  const showMfaNotice =
    (canGrantPermissions || canEditRole) && user.criticalAccessReady !== true;
  const handleCancel = (): void => {
    onCancel();
    requestAnimationFrame(() => {
      // First visible control: on a narrow screen the page list or the
      // page is hidden, and focus must not land on a hidden switch.
      const field = Array.from(
        cardRef.current?.querySelectorAll<HTMLElement>(
          '#user-role:not(:disabled), button[role="switch"]:not(:disabled):not([aria-hidden="true"])',
        ) ?? [],
      ).find((element) => element.offsetParent !== null);
      const heading = cardRef.current?.querySelector<HTMLElement>('h3');
      if (field) field.focus();
      else if (heading) {
        heading.tabIndex = -1;
        heading.focus();
      }
    });
  };
  // The save bar states the change; the detailed list was removed on
  // 26 October 2026 (owner: « ça sert à rien »).
  const mutationSummaryLabel = mutationSummary
    ? [
        role !== user.role ? 'rôle modifié' : null,
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

  if (user.isProtected) {
    return (
      <Card id="user-access-panel">
        <AuthorizationsHeader />
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start gap-3">
            <Crown className="text-muted-foreground mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">
                  Autorisations du superadmin
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
    <Card
      className={
        workspace ? 'flex flex-col overflow-hidden' : 'overflow-visible'
      }
      aria-busy={isSaving}
      data-workspace={workspace}
      id="user-access-panel"
      ref={cardRef}
      style={workspace ? { height: workspaceHeight } : undefined}
    >
      <PermissionsEditor
        canChangePermission={canChangePermission}
        role={role}
        permissions={permissions}
        onChange={setPermissions}
        selectedPageKey={permissionPageKey}
        onSelectedPageChange={onPermissionPageChange}
        openPageOnNarrow={permissionPageRequested}
        workspace={workspace}
        disabled={!canManagePermissions || isSaving}
        roleControl={
          <>
            <Label htmlFor="user-role">Rôle</Label>
            {canEditRole ? (
              <Select
                value={role}
                onValueChange={(value) => setRole(value as UserRole)}
                disabled={isSaving}
              >
                <SelectTrigger
                  id="user-role"
                  className="w-48 max-w-full min-w-0"
                  variant="compact"
                  aria-describedby={
                    showMfaNotice ? 'user-role-mfa-requirement' : undefined
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
            ) : (
              <div className="flex min-h-9 items-center gap-1.5">
                <Badge
                  aria-describedby="user-role-locked-reason"
                  id="user-role"
                  variant="outline"
                >
                  {roleLabel(role)}
                </Badge>
                {/* Reason on hover or focus, and read by screen readers. */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      aria-label="Rôle verrouillé"
                      className="text-muted-foreground inline-flex size-7 items-center justify-center"
                      role="img"
                      tabIndex={0}
                    >
                      <LockKeyhole aria-hidden="true" className="size-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6}>
                    Seul le superadmin peut changer le rôle.
                  </TooltipContent>
                </Tooltip>
                <span className="sr-only" id="user-role-locked-reason">
                  Seul le superadmin peut changer le rôle.
                </span>
              </div>
            )}
          </>
        }
        roleNotice={
          showMfaNotice && (
            <span
              className="text-warning inline-flex items-start gap-1.5"
              id="user-role-mfa-requirement"
              role="note"
            >
              <ShieldAlert
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0"
              />
              Double authentification non activée : rôle Administrateur et
              autorisations critiques indisponibles.
            </span>
          )
        }
      />
      {hasChanges && (canManagePermissions || canEditRole) && (
        <div className={workspace ? 'shrink-0 p-3 pt-0' : undefined}>
          <SectionActionBar
            placement={workspace ? 'inline' : 'sticky'}
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
              </>
            }
          />
        </div>
      )}
    </Card>
  );
};
