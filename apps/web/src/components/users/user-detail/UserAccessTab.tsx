'use client';

import { UserRole } from '@repo/database';
import { Loader2, Save, Shield } from 'lucide-react';
import React, { type FC } from 'react';

import { PermissionsEditor } from '$components/users/PermissionsEditor';
import { type PermissionsData } from '$constants/permissions.constants';
import type { UserType } from '$types/auth.types';
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
  onSave: () => void;
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
  onSave,
  permissions,
  role,
  setPermissions,
  setRole,
  user,
}) => {
  return (
    <div>
      <Card className="border-sidebar-border/70 overflow-hidden rounded-xl py-0">
        <CardContent className="p-3 sm:p-4">
          <PermissionsEditor
            role={role}
            permissions={permissions}
            onChange={setPermissions}
            disabled={!canManagePermissions}
            headerControls={
              <div className="border-sidebar-border/70 flex items-center gap-2 rounded-lg border bg-[#111827] px-2 py-1">
                <span className="border-sidebar-ring/35 bg-sidebar-ring/15 text-sidebar-ring flex size-7 shrink-0 items-center justify-center rounded-md border">
                  <Shield className="size-3.5" />
                </span>
                <Label htmlFor="user-role" className="sr-only">
                  Rôle
                </Label>
                {user.isProtected ? (
                  <Input
                    id="user-role"
                    value="Superadmin"
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
        <CardFooter className="border-sidebar-border/65 justify-between gap-3 border-t bg-[#1f293b] p-4">
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
