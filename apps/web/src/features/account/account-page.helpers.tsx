import { Activity, ShieldCheck, User } from 'lucide-react';
import type { FC } from 'react';

import { PageHero } from '$components/layout/PageHero';
import type { UserDetailSection } from '$components/users/user-detail/UserDetailNavigation';
import { UserAvatar } from '$components/users/UserAvatar';
import { getAccessLabel } from '$constants/permissions.constants';
import type { UserType } from '$types/auth.types';
import { Badge } from '$ui/badge';
import { Skeleton } from '$ui/skeleton';
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
  {
    icon: <Activity className="h-4 w-4" />,
    id: 'activity',
    label: 'Activité',
  },
];

export const normalizeAccountSection = (
  value: string | null,
): AccountSectionId => {
  if (value === 'security') return 'security';
  if (value === 'activity' || value === 'history') return 'activity';

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

export const AccountHeader: FC<{ userData: UserType }> = ({ userData }) => (
  <PageHero
    title={getAccountDisplayName(userData)}
    description={`Identifiant de connexion : ${userData.loginName}`}
    eyebrow={
      <span className="text-muted-foreground text-xs font-medium">
        Mon compte
      </span>
    }
    meta={
      <>
        <Badge variant="secondary">{getAccessLabel(userData)}</Badge>
        {userData.isProtected && <Badge variant="warning">Compte racine</Badge>}
      </>
    }
    icon={<UserAvatar user={userData} className="size-full rounded-md" />}
    iconClassName="overflow-hidden p-0"
    tone="dashboard"
  />
);

export const AccountPageContentSkeleton: FC = () => (
  <div className="space-y-5" role="status" aria-label="Chargement">
    <Skeleton className="h-28 rounded-md" />
    <Skeleton className="h-12 rounded-md 2xl:hidden" />
    <Skeleton className="h-[32rem] rounded-md" />
  </div>
);
