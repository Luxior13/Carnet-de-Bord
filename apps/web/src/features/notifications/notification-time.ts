const fullDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeStyle: 'short',
});
const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
});
const relativeFormatter = new Intl.RelativeTimeFormat('fr-FR', {
  numeric: 'auto',
  style: 'short',
});

export const formatNotificationTime = (
  value: string,
  now = Date.now(),
): {
  dateTime: string | undefined;
  full: string;
  label: string;
} => {
  const date = new Date(value);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) {
    return {
      dateTime: undefined,
      full: 'Date inconnue',
      label: 'Date inconnue',
    };
  }
  const age = Math.max(0, now - timestamp);
  const label =
    timestamp > now + 60_000 || age >= 7 * 86_400_000
      ? shortDateFormatter.format(date)
      : age < 60_000
        ? 'À l’instant'
        : age < 3_600_000
          ? relativeFormatter.format(-Math.floor(age / 60_000), 'minute')
          : age < 86_400_000
            ? relativeFormatter.format(-Math.floor(age / 3_600_000), 'hour')
            : relativeFormatter.format(-Math.floor(age / 86_400_000), 'day');

  return {
    dateTime: date.toISOString(),
    full: fullDateFormatter.format(date),
    label,
  };
};
