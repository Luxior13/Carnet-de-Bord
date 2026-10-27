/**
 * Display helpers shared by the session lists of a user record and of
 * Mon compte (owner decision of 27 October 2026: one session row).
 */

export type SessionAgent = {
  browser: string;
  device: string;
  isMobile: boolean;
  /** « Windows · Chrome », or « Appareil non identifié » without a user agent. */
  label: string;
};

export const describeUserAgent = (userAgent: string | null): SessionAgent => {
  if (!userAgent) {
    return {
      browser: 'Navigateur',
      device: 'Appareil',
      isMobile: false,
      label: 'Appareil non identifié',
    };
  }

  let device = 'Ordinateur';
  let isMobile = false;
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    device = 'iPhone/iPad';
    isMobile = true;
  } else if (userAgent.includes('Android')) {
    device = 'Android';
    isMobile = true;
  } else if (userAgent.includes('Windows')) device = 'Windows';
  else if (userAgent.includes('Mac')) device = 'Mac';
  else if (userAgent.includes('Linux')) device = 'Linux';

  let browser = 'Navigateur';
  if (userAgent.includes('Edg')) browser = 'Edge';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Safari')) browser = 'Safari';

  return { browser, device, isMobile, label: `${device} · ${browser}` };
};

const IPV6_GROUP = /^[0-9a-f]{1,4}$/;

/**
 * Short form of an IPv6 address (RFC 5952: lower case, leading zeros dropped,
 * longest run of zero groups as « :: »), for display only. IPv4, embedded
 * IPv4 and zoned addresses are shown as received.
 */
export const formatIpAddress = (ip: string): string => {
  const value = ip.trim();
  if (!value.includes(':') || value.includes('.') || value.includes('%'))
    return value;
  const halves = value.toLowerCase().split('::');
  if (halves.length > 2) return value;
  const [first = '', second = ''] = halves;
  const head = first ? first.split(':') : [];
  const tail = halves.length === 2 && second ? second.split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? head.length !== 8 : missing < 1) return value;
  const groups = [
    ...head,
    ...Array.from({ length: halves.length === 2 ? missing : 0 }, () => '0'),
    ...tail,
  ];
  if (!groups.every((group) => IPV6_GROUP.test(group))) return value;
  const words = groups.map((group) => group.replace(/^0+(?=.)/, ''));

  let bestStart = -1;
  let bestLength = 0;
  for (let index = 0; index < words.length;) {
    if (words.at(index) !== '0') {
      index += 1;
      continue;
    }
    let end = index;
    while (words.at(end) === '0') end += 1;
    if (end - index >= 2 && end - index > bestLength) {
      bestStart = index;
      bestLength = end - index;
    }
    index = end;
  }
  if (bestStart < 0) return words.join(':');

  return `${words.slice(0, bestStart).join(':')}::${words
    .slice(bestStart + bestLength)
    .join(':')}`;
};

const toValidDate = (date: Date | string | null): Date | null => {
  if (!date) return null;
  const parsed = new Date(date);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** « 11 oct. 2026, 12:00 ». */
export const formatSessionDateTime = (date: Date | string | null): string => {
  const parsed = toValidDate(date);
  if (!parsed) return 'Date inconnue';

  return parsed.toLocaleDateString('fr-FR', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/** Last activity: « à l’instant », « il y a 5 min » … then the date. */
export const formatSessionActivity = (date: Date | string | null): string => {
  const then = toValidDate(date);
  if (!then) return 'inconnue';
  const minutes = Math.floor((Date.now() - then.getTime()) / 60000);
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;

  return then.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};
