'use client';

import { UserRole } from '@repo/database';
import {
  Crown,
  Loader2,
  LockKeyhole,
  Save,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import React, { type FC } from 'react';

import { PermissionsEditor } from '$components/users/PermissionsEditor';
import {
  getAccessLabel,
  PERMISSION_CATEGORIES,
  type PermissionsData,
} from '$constants/permissions.constants';
import type { UserType } from '$types/auth.types';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Card, CardContent, CardFooter } from '$ui/card';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';

type UserAccessTabProps = {
  canEditRole: boolean;
  canManagePermissions: boolean;
  canSave: boolean;
  hasChanges: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onPermissionPageChange: (pageKey: string) => void;
  onSave: () => void;
  permissionPageKey: string;
  permissions: PermissionsData | null;
  role: UserRole;
  setPermissions: (permissions: PermissionsData | null) => void;
  setRole: (role: UserRole) => void;
  user: UserType;
};

export const UserAccessTab: FC<UserAccessTabProps> = ({
  canEditRole,
  canManagePermissions,
  canSave,
  hasChanges,
  isSaving,
  onCancel,
  onPermissionPageChange,
  onSave,
  permissionPageKey,
  permissions,
  role,
  setPermissions,
  setRole,
  user,
}) => {
  if (user.isProtected) {
    const totalPermissions = PERMISSION_CATEGORIES.reduce(
      (total, category) => total + category.permissions.length,
      0,
    );

    return (
      <Card className="border-sidebar-border/60 overflow-hidden rounded-lg py-0">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-amber-500/35 bg-amber-500/10 text-amber-300">
                <Crown className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-foreground font-semibold">
                    Accès super-administrateur
                  </h3>
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 text-amber-300"
                  >
                    {getAccessLabel(user)}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 max-w-3xl text-sm leading-6">
                  Ce compte est protégé par le système. Il dispose déjà de tous
                  les accès et ses permissions ne se gèrent pas manuellement.
                </p>
              </div>
            </div>
            <div className="border-sidebar-border/60 bg-surface-control flex items-center gap-2 rounded-lg border px-2 py-1">
              <span className="border-sidebar-ring/35 bg-sidebar-ring/15 text-sidebar-ring flex size-7 shrink-0 items-center justify-center rounded-md border">
                <Shield className="size-3.5" />
              </span>
              <Input
                value="Super-administrateur"
                disabled
                className="border-border bg-popover h-8 min-w-0"
              />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="border-sidebar-border/60 bg-surface-muted flex min-w-0 items-center gap-3 rounded-lg border p-3">
              <ShieldCheck className="text-chart-3 size-5 shrink-0" />
              <div className="min-w-0">
                <p className="text-foreground text-sm font-semibold">
                  Toutes les pages
                </p>
                <p className="text-muted-foreground text-xs">
                  {PERMISSION_CATEGORIES.length} espaces accessibles
                </p>
              </div>
            </div>
            <div className="border-sidebar-border/60 bg-surface-muted flex min-w-0 items-center gap-3 rounded-lg border p-3">
              <Crown className="size-5 shrink-0 text-amber-300" />
              <div className="min-w-0">
                <p className="text-foreground text-sm font-semibold">
                  {totalPermissions} permissions
                </p>
                <p className="text-muted-foreground text-xs">
                  Accordées automatiquement
                </p>
              </div>
            </div>
            <div className="border-sidebar-border/60 bg-surface-muted flex min-w-0 items-center gap-3 rounded-lg border p-3">
              <LockKeyhole className="text-primary size-5 shrink-0" />
              <div className="min-w-0">
                <p className="text-foreground text-sm font-semibold">
                  Non modifiable
                </p>
                <p className="text-muted-foreground text-xs">
                  Protégé contre les restrictions
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <Card className="border-sidebar-border/60 overflow-visible rounded-lg py-0">
        <CardContent className="p-2.5 sm:p-3">
          <PermissionsEditor
            role={role}
            permissions={permissions}
            onChange={setPermissions}
            selectedPageKey={permissionPageKey}
            onSelectedPageChange={onPermissionPageChange}
            disabled={!canManagePermissions}
            headerControls={
              <div className="border-sidebar-border/60 bg-surface-control flex items-center gap-2 rounded-lg border px-2 py-1">
                <span className="border-sidebar-ring/35 bg-sidebar-ring/15 text-sidebar-ring flex size-7 shrink-0 items-center justify-center rounded-md border">
                  <Shield className="size-3.5" />
                </span>
                <Label htmlFor="user-role" className="sr-only">
                  Rôle
                </Label>
                {user.isProtected ? (
                  <Input
                    id="user-role"
                    value="Super-administrateur"
                    disabled
                    className="border-border bg-popover h-8 min-w-0"
                  />
                ) : (
                  <Select
                    value={role}
                    onValueChange={(value) => setRole(value as UserRole)}
                    disabled={!canEditRole}
                  >
                    <SelectTrigger
                      id="user-role"
                      className="border-border bg-popover h-8 min-w-36"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">Utilisateur</SelectItem>
                      <SelectItem value="ADMIN">Administrateur</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            }
          />
        </CardContent>
        <CardFooter className="border-sidebar-border/60 bg-surface-muted/95 sticky bottom-3 z-20 justify-between gap-3 rounded-b-lg border-t p-3 shadow-[var(--shadow-panel)] backdrop-blur">
          <p className="text-muted-foreground text-xs">
            {hasChanges ? 'Modifications non enregistrées' : 'À jour'}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={!hasChanges || isSaving}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={onSave}
              disabled={isSaving || !canSave}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSaving ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <Save size={16} className="mr-2" />
              )}
              Enregistrer
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
