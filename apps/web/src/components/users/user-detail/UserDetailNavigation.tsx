import { FileText, History, Key, Shield, User } from 'lucide-react';
import React from 'react';

export type UserDetailSectionId =
  'resume' | 'profile' | 'access' | 'account' | 'security' | 'history';

export type UserDetailSection<SectionId extends string = UserDetailSectionId> =
  {
    icon: React.ReactNode;
    id: SectionId;
    label: string;
  };

export const USER_DETAIL_SECTIONS: UserDetailSection[] = [
  {
    icon: <FileText className="h-4 w-4" />,
    id: 'resume',
    label: 'R\u00e9sum\u00e9',
  },
  { icon: <User className="h-4 w-4" />, id: 'profile', label: 'Profil' },
  {
    icon: <Shield className="h-4 w-4" />,
    id: 'access',
    label: 'Autorisations',
  },
  {
    icon: <Key className="h-4 w-4" />,
    id: 'security',
    label: 'S\u00e9curit\u00e9',
  },
  {
    icon: <History className="h-4 w-4" />,
    id: 'history',
    label: 'Activit\u00e9',
  },
];

export const normalizeUserDetailSection = (
  value: string | null,
): UserDetailSectionId => {
  if (value === 'profile' || value === 'edit') return 'profile';
  if (value === 'access' || value === 'permissions') return 'access';
  if (value === 'account' || value === 'personal-account') return 'account';
  if (value === 'security') return 'security';
  if (value === 'history') return 'history';

  return 'resume';
};

export const getUserDetailSectionLabel = (
  sectionId: UserDetailSectionId,
): string => {
  if (sectionId === 'account') return 'Compte personnel';

  return (
    USER_DETAIL_SECTIONS.find((section) => section.id === sectionId)?.label ||
    'R\u00e9sum\u00e9'
  );
};
