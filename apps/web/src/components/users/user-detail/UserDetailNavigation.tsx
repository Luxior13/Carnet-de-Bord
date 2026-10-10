import { Key, Shield, User } from 'lucide-react';
import React from 'react';

import type { PageSection } from '$components/layout/PageSectionNavigation';

export type UserDetailSectionId =
  | 'profile'
  | 'access'
  | 'account'
  | 'security'
  // L'activité est retirée temporairement (2026-10-10) mais le type reste pour
  // le code dormant conservé en vue d'une restauration ultérieure.
  | 'history';

export type UserDetailSection<SectionId extends string = UserDetailSectionId> =
  PageSection<SectionId>;

export const USER_DETAIL_SECTIONS: UserDetailSection[] = [
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
];

export const normalizeUserDetailSection = (
  value: string | null,
): UserDetailSectionId => {
  if (value === 'profile' || value === 'edit') return 'profile';
  if (value === 'access' || value === 'permissions') return 'access';
  if (value === 'account' || value === 'personal-account') return 'account';
  if (value === 'security') return 'security';
  if (value === 'history') return 'profile';

  return 'profile';
};

export const getUserDetailSectionLabel = (
  sectionId: UserDetailSectionId,
): string => {
  if (sectionId === 'account') return 'Compte personnel';

  return (
    USER_DETAIL_SECTIONS.find((section) => section.id === sectionId)?.label ||
    'Profil'
  );
};
