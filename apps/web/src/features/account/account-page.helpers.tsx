import { Shield, ShieldCheck, User } from 'lucide-react';
import Link from 'next/link';
import type { FC } from 'react';

import { PageDetailSkeleton } from '$components/layout/PageDetailSkeleton';
import { PageIdentityHero } from '$components/layout/PageIdentityHero';
import type { UserDetailSection } from '$components/users/user-detail/UserDetailNavigation';
import { UserAvatar } from '$components/users/UserAvatar';
import {
  formatUserIdentityLine,
  UserIdentityStatus,
} from '$components/users/UserIdentityStatus';
import { UserAccessBadge } from '$features/users/user-badges';
import type { UserType } from '$types/auth.types';
import { Button } from '$ui/button';

export type AccountSectionId = 'access' | 'profile' | 'security';

export const ACCOUNT_SECTIONS: Array<UserDetailSection<AccountSectionId>> = [
  {
    icon: <User className="h-4 w-4" />,
    id: 'profile',
    label: 'Profil',
  },
  {
    icon: <ShieldCheck className="h-4 w-4" />,
    id: 'security',
    label: 'Sécurité',
  },
  {
    icon: <Shield className="h-4 w-4" />,
    id: 'access',
    label: 'Accès',
  },
];

export const normalizeAccountSection = (
  value: string | null,
): AccountSectionId => {
  if (value === 'security') return 'security';
  if (value === 'access') return 'access';
  if (value === 'activity' || value === 'history') return 'profile';

  return 'profile';
};

export const buildAccountSectionHref = (
  pathname: string,
  currentQueryString: string,
  sectionId: AccountSectionId,
): string => {
  const nextParams = new URLSearchParams(currentQueryString);

  if (sectionId === 'profile') {
    nextParams.delete('section');
  } else {
    nextParams.set('section', sectionId);
  }

  const nextQueryString = nextParams.toString();

  return nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
};

const getAccountDisplayName = (userData: UserType): string =>
  [userData.firstName, userData.lastName].filter(Boolean).join(' ').trim() ||
  userData.loginName;

export const AccountHeader: FC<{ returnHref?: string; userData: UserType }> = ({
  returnHref,
  userData,
}) => (
  <PageIdentityHero
    compact
    eyebrow="Mon compte"
    title={getAccountDisplayName(userData)}
    description={formatUserIdentityLine(userData, userData.loginName)}
    icon={<UserAvatar user={userData} className="rounded-tile size-full" />}
    meta={<UserIdentityStatus user={userData} />}
    actions={
      <div className="flex flex-wrap items-center gap-3">
        <UserAccessBadge user={userData} />
        {returnHref && (
          <Button asChild variant="outline" size="sm">
            <Link href={returnHref}>Retour aux utilisateurs</Link>
          </Button>
        )}
      </div>
    }
  />
);

export const AccountPageContentSkeleton: FC = () => <PageDetailSkeleton />;
