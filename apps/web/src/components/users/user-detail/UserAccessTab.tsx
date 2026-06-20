'use client';

import { UserRole } from '@repo/database';
import { Loader2, Save, Shield } from 'lucide-react';
import React, { type FC } from 'react';

import { PermissionsEditor } from '$components/users/PermissionsEditor';
import type { PermissionsData } from '$constants/permissions.constants';
import type { UserType } from '$types/auth.types';
import { Button } from '$ui/button';
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
  isSaving: boolean;
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
  isSaving,
  onSave,
  permissions,
  role,
  setPermissions,
  setRole,
  user,
}) => {
  return (
    <div className="space-y-6">
      <section className="border-border bg-card/70 rounded-lg border p-4 shadow-sm">
        <div className="space-y-4">
          <h3 className="text-foreground flex items-center gap-2 text-sm font-medium">
            <span className="bg-primary/20 text-primary flex h-6 w-6 items-center justify-center rounded-md">
              <Shield className="h-3.5 w-3.5" />
            </span>
            Role
          </h3>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs" required>
              Role administratif
            </Label>
            {user.isProtected ? (
              <Input
                value="Superadmin"
                disabled
                className="border-border bg-card"
              />
            ) : (
              <Select
                value={role}
                onValueChange={(value) => setRole(value as UserRole)}
                disabled={!canEditRole}
              >
                <SelectTrigger className="border-border bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Utilisateur</SelectItem>
                  <SelectItem value="ADMIN">Administrateur</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </section>
      <section className="border-border bg-card/70 rounded-lg border p-4 shadow-sm">
        <PermissionsEditor
          role={role}
          permissions={permissions}
          onChange={setPermissions}
          disabled={!canManagePermissions}
        />
      </section>
      <div className="flex justify-end">
        <Button
          onClick={onSave}
          disabled={isSaving || (!canEditRole && !canManagePermissions)}
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
    </div>
  );
};
