import type { UserType } from '$types/auth.types';

export const getAccountScope = (user: UserType): string =>
  JSON.stringify([
    user.id,
    user.role,
    user.isProtected === true,
    Object.entries(user.permissions ?? {}).sort(([first], [second]) =>
      first.localeCompare(second),
    ),
    user.mustChangePassword === true,
  ]);

export type AccountProfileDraft = {
  base: UserType;
  firstName: string;
  lastName: string;
};

export const createAccountProfileDraft = (
  base: UserType,
): AccountProfileDraft => ({
  base,
  firstName: base.firstName,
  lastName: base.lastName ?? '',
});

export const isOlderAccountSnapshot = (
  next: UserType,
  current: UserType,
): boolean =>
  !!next.updatedAt &&
  !!current.updatedAt &&
  new Date(next.updatedAt).getTime() < new Date(current.updatedAt).getTime();

export const mergeAccountProfileDraft = (
  current: AccountProfileDraft,
  next: UserType,
): AccountProfileDraft => {
  if (current.base.id !== next.id) return createAccountProfileDraft(next);
  if (isOlderAccountSnapshot(next, current.base)) return current;

  return {
    base: next,
    firstName:
      current.firstName.trim() === current.base.firstName
        ? next.firstName
        : current.firstName,
    lastName:
      current.lastName.trim() === (current.base.lastName ?? '')
        ? (next.lastName ?? '')
        : current.lastName,
  };
};

/** Check the fields used by personal forms before applying a server snapshot. */
export const isAccountFormSnapshot = (
  value: unknown,
  userId: string,
): value is UserType & { updatedAt: NonNullable<UserType['updatedAt']> } => {
  if (!value || typeof value !== 'object') return false;
  const user = value as Partial<UserType>;

  return (
    user.id === userId &&
    typeof user.firstName === 'string' &&
    (user.lastName == null || typeof user.lastName === 'string') &&
    (user.contactEmail === null || typeof user.contactEmail === 'string') &&
    !!user.updatedAt &&
    Number.isFinite(new Date(user.updatedAt).getTime())
  );
};

const formatAccountDate = (date: Date | string | null): string => {
  if (!date) return 'Jamais';

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return 'Jamais';

  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsedDate);
};

export const formatRelativeAccountTime = (
  date: Date | string | null,
): string => {
  if (!date) return 'Jamais';

  const now = new Date();
  const then = new Date(date);
  if (Number.isNaN(then.getTime())) return 'Jamais';

  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;

  return formatAccountDate(date);
};

export const parseUserAgent = (
  userAgent: string | null,
): { browser: string; device: string } => {
  if (!userAgent) return { browser: 'Inconnu', device: 'Inconnu' };

  let device = 'Ordinateur';
  let browser = 'Navigateur';

  if (userAgent.includes('iPhone') || userAgent.includes('iPad'))
    device = 'iPhone/iPad';
  else if (userAgent.includes('Android')) device = 'Android';
  else if (userAgent.includes('Windows')) device = 'Windows';
  else if (userAgent.includes('Mac')) device = 'Mac';
  else if (userAgent.includes('Linux')) device = 'Linux';

  if (userAgent.includes('Edg') || userAgent.includes('Edge')) browser = 'Edge';
  else if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome'))
    browser = 'Safari';

  return { browser, device };
};
