import 'server-only';

export type PersonReadinessStatus = 'not_configured' | 'ready';

export const isPersonEnvironmentConfigured = (
  requiredAuditKeyVersions: readonly number[],
): boolean => {
  const currentAuditKeyVersion = Number.parseInt(
    process.env.AUDIT_ENCRYPTION_CURRENT_VERSION ?? '',
    10,
  );
  const hasValidAuditKey = (version: number): boolean => {
    const rawKey = process.env[`AUDIT_ENCRYPTION_KEY_V${version}`];
    if (!rawKey) return false;
    try {
      return Buffer.from(rawKey, 'base64').byteLength === 32;
    } catch {
      return false;
    }
  };

  return (
    Number.isSafeInteger(currentAuditKeyVersion) &&
    currentAuditKeyVersion > 0 &&
    hasValidAuditKey(currentAuditKeyVersion) &&
    requiredAuditKeyVersions.every(hasValidAuditKey)
  );
};

export const isPersonReady = (status: PersonReadinessStatus): boolean =>
  status === 'ready';
