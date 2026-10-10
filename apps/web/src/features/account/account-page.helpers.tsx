import { ShieldCheck, User } from 'lucide-react';
import Link from 'next/link';
import type { FC } from 'react';

import { PageDetailSkeleton } from '$components/layout/PageDetailSkeleton';
import { PageIdentityHero } from '$components/layout/PageIdentityHero';
import type { UserDetailSection } from '$components/users/user-detail/UserDetailNavigation';
import { UserAvatar } from '$components/users/UserAvatar';
import { UserAccessBadge } from '$features/users/user-badges';
import type { UserType } from '$types/auth.types';
import { Button } from '$ui/button';
import type { GuardedNavigationAction } from '$utils/guarded-navigation.utils';

export type AccountSectionId = 'activity' | 'profile' | 'security';

export type AccountPendingNavigation =
  | {
      action?: GuardedNavigationAction;
      href: string;
      kind: 'href';
    }
  | {
      href: string;
      kind: 'section';
    };

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
];

export const normalizeAccountSection = (
  value: string | null,
): AccountSectionId => {
  if (value === 'security') return 'security';
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

export const isPlainLeftClick = (event: MouseEvent): boolean =>
  event.button === 0 &&
  !event.metaKey &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.shiftKey;

export const findAnchorElement = (
  target: EventTarget | null,
): HTMLAnchorElement | null => {
  if (!(target instanceof Element)) return null;

  return target.closest('a[href]');
};

export const isInternalNavigationLink = (
  anchor: HTMLAnchorElement,
): boolean => {
  const target = anchor.getAttribute('target');
  const href = anchor.getAttribute('href');

  if (!href) return false;
  if (target && target !== '_self') return false;
  if (
    href.startsWith('#') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  ) {
    return false;
  }

  return anchor.origin === window.location.origin;
};

const getAccountDisplayName = (userData: UserType): string =>
  `${userData.firstName} ${userData.lastName}`.trim() || userData.loginName;

export const AccountHeader: FC<{ returnHref?: string; userData: UserType }> = ({
  returnHref,
  userData,
}) => (
  <PageIdentityHero
    compact
    eyebrow="Mon compte"
    title={getAccountDisplayName(userData)}
    description={`Identifiant : ${userData.loginName}`}
    icon={<UserAvatar user={userData} className="size-full rounded-[7px]" />}
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
