/**
 * Canonical timezone for civil business dates.
 *
 * Keep this browser-safe: forms and server-side presentation must derive the
 * same calendar day, independently from the device or server timezone.
 */
export const DEFAULT_APPLICATION_TIME_ZONE = 'Europe/Paris' as const;
