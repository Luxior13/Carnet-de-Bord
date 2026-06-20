'use client';

import { UserRole } from '@repo/database';
import { Loader2, Save, Shield } from 'lucide-react';
import React, { type FC } from 'react';

import { PermissionsEditor } from '$components/users/PermissionsEditor';
import type { PermissionsData } from '$constants/permissions.constants';
import type { UserType } from '$types/auth.types';
import { Button } from '$ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '$ui/card';
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
    <div className="space-y-4">
      <Card className="border-border/70 bg-card/70 overflow-hidden rounded-lg py-0">
        <CardHeader className="border-border/60 border-b p-4">
          <CardTitle className="text-foreground flex items-center gap-2 text-sm font-semibold">
            <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-md">
              <Shield className="size-3.5" />
            </span>
            Role
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
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
        </CardContent>
      </Card>
      <Card className="border-border/70 bg-card/70 overflow-hidden rounded-lg py-0">
        <CardContent className="p-4">
          <PermissionsEditor
            role={role}
            permissions={permissions}
            onChange={setPermissions}
            disabled={!canManagePermissions}
          />
        </CardContent>
        <CardFooter className="border-border/60 bg-background/20 justify-end border-t p-4">
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
        </CardFooter>
      </Card>
    </div>
  );
};
