'use client';

import { ArrowLeft, FileText, History, Key, Shield, User } from 'lucide-react';
import Link from 'next/link';
import React, { type FC } from 'react';

import { getAccessLabel } from '$constants/permissions.constants';
import type { UserType } from '$types/auth.types';
import {
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '$ui/sidebar';
import { cn } from '$utils/css.utils';

export type UserDetailSectionId =
  | 'resume'
  | 'profile'
  | 'access'
  | 'security'
  | 'history';

export type UserDetailSection = {
  icon: React.ReactNode;
  id: UserDetailSectionId;
  label: string;
};

export const USER_DETAIL_SECTIONS: UserDetailSection[] = [
  { icon: <FileText className="h-4 w-4" />, id: 'resume', label: 'Resume' },
  { icon: <User className="h-4 w-4" />, id: 'profile', label: 'Profil' },
  {
    icon: <Shield className="h-4 w-4" />,
    id: 'access',
    label: 'Acces',
  },
  { icon: <Key className="h-4 w-4" />, id: 'security', label: 'Securite' },
  { icon: <History className="h-4 w-4" />, id: 'history', label: 'Activite' },
];

export const normalizeUserDetailSection = (
  value: string | null,
): UserDetailSectionId => {
  if (value === 'profile' || value === 'edit') return 'profile';
  if (value === 'access' || value === 'permissions') return 'access';
  if (value === 'security') return 'security';
  if (value === 'history') return 'history';

  return 'resume';
};

export const getUserDetailSectionLabel = (
  sectionId: UserDetailSectionId,
): string => {
  return (
    USER_DETAIL_SECTIONS.find((section) => section.id === sectionId)?.label ||
    'Resume'
  );
};

type UserDetailSidebarPanelProps = {
  activeSection: UserDetailSectionId;
  onSectionChange: (sectionId: UserDetailSectionId) => void;
  user: UserType;
};

export const UserDetailSidebarPanel: FC<UserDetailSidebarPanelProps> = ({
  activeSection,
  onSectionChange,
  user,
}) => {
  const { setOpenMobile } = useSidebar();
  const accessLabel = getAccessLabel(user);
  const displayName = `${user.firstName} ${user.lastName}`;
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;

  const closeMobileSidebar = (): void => {
    setOpenMobile(false);
  };

  return (
    <>
      <SidebarGroupLabel>Fiche utilisateur</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link
              href="/administration/utilisateurs"
              onClick={closeMobileSidebar}
              title="Tous les utilisateurs"
            >
              <ArrowLeft className="size-4" />
              <span>Tous les utilisateurs</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive
            size="lg"
            className="data-[active=true]:bg-sidebar-accent/70"
          >
            <Link
              href={`/administration/utilisateurs/${user.id}`}
              onClick={closeMobileSidebar}
              title={displayName}
            >
              <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold">
                {initials}
              </div>
              <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate">{displayName}</span>
                  {user.isProtected && (
                    <Shield className="size-3 shrink-0 text-amber-500" />
                  )}
                </span>
                <span className="text-sidebar-foreground/65 mt-0.5 block truncate text-xs font-normal">
                  {user.isActive ? accessLabel : `${accessLabel} - Inactif`}
                </span>
              </span>
            </Link>
          </SidebarMenuButton>
          <SidebarMenuSub className="mt-1">
            {USER_DETAIL_SECTIONS.map((section) => (
              <SidebarMenuSubItem key={section.id}>
                <SidebarMenuSubButton
                  type="button"
                  isActive={activeSection === section.id}
                  onClick={() => {
                    onSectionChange(section.id);
                    closeMobileSidebar();
                  }}
                  aria-current={
                    activeSection === section.id ? 'page' : undefined
                  }
                  title={section.label}
                  className={cn(
                    activeSection === section.id &&
                      '[&>svg]:text-primary font-medium',
                  )}
                >
                  {section.icon}
                  <span>{section.label}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
};
