'use client';

import { UserRole } from '@repo/database';
import {
  Crown,
  Loader2,
  LockKeyhole,
  LogOut,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import React, { type FC } from 'react';

import { PermissionsEditor } from '$components/users/PermissionsEditor';
import {
  getAccessLabel,
  getAllPermissionKeys,
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
    const totalPermissions = getAllPermissionKeys().length;

    return (
      <Card className="border-border/60 overflow-hidden rounded-lg py-0">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="border-warning/35 bg-warning/10 text-warning flex size-11 shrink-0 items-center justify-center rounded-lg border">
                <Crown className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-foreground font-semibold">
                    Autorisations du super-administrateur
                  </h3>
                  <Badge
                    variant="outline"
                    className="border-warning/40 text-warning"
                  >
                    {getAccessLabel(user)}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 max-w-3xl text-sm leading-6">
                  Ce compte est protégé par le système. Il dispose déjà de
                  toutes les autorisations et elles ne se gèrent pas
                  manuellement.
                </p>
              </div>
            </div>
            <div className="border-border/60 bg-surface-control flex items-center gap-2 rounded-lg border px-2 py-1">
              <span className="border-primary/35 bg-primary/15 text-primary-emphasis flex size-7 shrink-0 items-center justify-center rounded-md border">
                <Shield className="size-3.5" />
              </span>
              <Input
                value="Super-administrateur"
                disabled
                className="border-border bg-surface-control h-8 min-w-0"
              />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="border-border/60 bg-surface-muted flex min-w-0 items-center gap-3 rounded-lg border p-3">
              <ShieldCheck className="text-success size-5 shrink-0" />
              <div className="min-w-0">
                <p className="text-foreground text-sm font-semibold">
                  Toutes les pages
                </p>
                <p className="text-muted-foreground text-xs">
                  {PERMISSION_CATEGORIES.length} pages administratives
                </p>
              </div>
            </div>
            <div className="border-border/60 bg-surface-muted flex min-w-0 items-center gap-3 rounded-lg border p-3">
              <Crown className="text-warning size-5 shrink-0" />
              <div className="min-w-0">
                <p className="text-foreground text-sm font-semibold">
                  {totalPermissions} autorisations actives
                </p>
                <p className="text-muted-foreground text-xs">
                  Accordées automatiquement
                </p>
              </div>
            </div>
            <div className="border-border/60 bg-surface-muted flex min-w-0 items-center gap-3 rounded-lg border p-3">
              <LockKeyhole className="text-primary-emphasis size-5 shrink-0" />
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
      <Card className="border-border/60 overflow-visible rounded-lg py-0">
        <CardContent className="space-y-3 p-2.5 sm:p-3">
          {canManagePermissions &&
            user.securityDetailsVisible !== false &&
            user.mfaEnabledAt === null && (
              <div
                className="border-warning/30 bg-warning/10 text-muted-foreground flex items-start gap-2.5 rounded-lg border p-3 text-sm leading-5"
                role="note"
              >
                <ShieldAlert className="text-warning mt-0.5 size-4 shrink-0" />
                <p>
                  La double authentification doit être activée par ce membre
                  avant de lui accorder un rôle administrateur ou une
                  autorisation critique.
                </p>
              </div>
            )}
          <PermissionsEditor
            role={role}
            permissions={permissions}
            onChange={setPermissions}
            selectedPageKey={permissionPageKey}
            onSelectedPageChange={onPermissionPageChange}
            disabled={!canManagePermissions}
            headerControls={
              <div className="border-border/60 bg-surface-control flex items-center gap-2 rounded-lg border px-2 py-1">
                <span className="border-primary/35 bg-primary/15 text-primary-emphasis flex size-7 shrink-0 items-center justify-center rounded-md border">
                  <Shield className="size-3.5" />
                </span>
                <Label
                  htmlFor="user-role"
                  className="text-muted-foreground text-xs whitespace-nowrap"
                >
                  Rôle de base
                </Label>
                {user.isProtected ? (
                  <Input
                    id="user-role"
                    value="Super-administrateur"
                    disabled
                    className="border-border bg-surface-control h-8 min-w-0"
                  />
                ) : (
                  <div className="space-y-1">
                    <Select
                      value={role}
                      onValueChange={(value) => setRole(value as UserRole)}
                      disabled={!canEditRole}
                    >
                      <SelectTrigger
                        id="user-role"
                        aria-describedby={
                          canEditRole && user.mfaEnabledAt === null
                            ? 'user-role-mfa-requirement'
                            : undefined
                        }
                        className="border-border bg-surface-control h-8 min-w-36"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER">Utilisateur</SelectItem>
                        <SelectItem
                          disabled={user.mfaEnabledAt === null}
                          value="ADMIN"
                        >
                          Administrateur
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {canEditRole && user.mfaEnabledAt === null && (
                      <p
                        className="text-warning max-w-56 text-xs leading-4"
                        id="user-role-mfa-requirement"
                      >
                        Double authentification requise avant promotion.
                      </p>
                    )}
                  </div>
                )}
              </div>
            }
          />
        </CardContent>
        <CardFooter className="border-border/60 bg-surface-muted/95 sticky bottom-3 z-20 flex-col items-stretch justify-between gap-3 rounded-b-lg border-t p-3 shadow-[var(--shadow-panel)] backdrop-blur sm:flex-row sm:items-center">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">
              {hasChanges ? 'Modifications non enregistrées' : 'À jour'}
            </p>
            {hasChanges && (
              <p className="text-warning flex items-center gap-1.5 text-xs">
                <LogOut className="size-3.5 shrink-0" />
                Enregistrer déconnectera cet utilisateur de toutes ses sessions.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
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
