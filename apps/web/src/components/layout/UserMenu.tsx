'use client';

import { LogOut, User, Users } from 'lucide-react';
import Link from 'next/link';
import React, { type FC } from 'react';

import { getAccessLabel } from '$constants/app.constants';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
import { Button } from '$ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '$ui/dropdown-menu';

export const UserMenu: FC = () => {
  const { logout, userData } = useUser();

  if (!userData) return null;

  const initials = `${userData.firstName.charAt(0)}${userData.lastName.charAt(0)}`;
  const canManageUsers =
    userData.isProtected ||
    hasPermission(userData.role, PERMISSIONS.USERS.VIEW, userData.permissions);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="bg-card/80 text-foreground hover:bg-accent hover:text-accent-foreground relative flex h-9 items-center gap-2 rounded-md border px-2"
        >
          <div className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full text-[11px] font-semibold">
            {initials}
          </div>
          <span className="hidden text-[13px] font-medium md:inline-block">
            {userData.firstName}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-foreground text-sm font-medium">
              {userData.firstName} {userData.lastName}
            </p>
            <p className="text-muted-foreground text-xs">{userData.email}</p>
            <p className="text-muted-foreground text-xs">
              {getAccessLabel(userData)}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="text-foreground">
          <Link href="/settings?tab=compte" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Mon compte
          </Link>
        </DropdownMenuItem>
        {canManageUsers && (
          <DropdownMenuItem asChild className="text-foreground">
            <Link
              href="/settings?tab=utilisateurs"
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Utilisateurs
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={logout}
          className="text-destructive flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Deconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
