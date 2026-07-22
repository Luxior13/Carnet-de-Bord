import { Buffer } from 'node:buffer';

export const DATABASE_BACKUP_FORMAT_VERSION = 5;
export const DATABASE_BACKUP_BATCH_SIZE = 500;
export const MAX_DATABASE_BACKUP_BYTES = 2 * 1024 * 1024 * 1024;
export const MAX_BACKUP_LINE_BYTES = 16 * 1024 * 1024;
export const MAX_RESTORE_BATCH_BYTES = 16 * 1024 * 1024;

export type BackupCursorKind = 'integer' | 'text';

export type BackupTableDefinition = {
  cursorColumn: string;
  cursorKind: BackupCursorKind;
  legacySourceTableName?: string;
  property: string;
  tableName: string;
};

// The order is part of the backup contract. Parent tables always precede the
// rows that reference them so restore can keep every foreign key enabled.
export const DATABASE_BACKUP_TABLES = [
  {
    cursorColumn: 'id',
    cursorKind: 'text',
    property: 'users',
    tableName: 'User',
  },
  {
    cursorColumn: 'loginName',
    cursorKind: 'text',
    property: 'loginNameReservations',
    tableName: 'LoginNameReservation',
  },
  {
    cursorColumn: 'id',
    cursorKind: 'text',
    property: 'sessions',
    tableName: 'Session',
  },
  {
    cursorColumn: 'userId',
    cursorKind: 'text',
    property: 'totpCredentials',
    tableName: 'TotpCredential',
  },
  {
    cursorColumn: 'userId',
    cursorKind: 'text',
    property: 'totpEnrollments',
    tableName: 'TotpEnrollment',
  },
  {
    cursorColumn: 'id',
    cursorKind: 'text',
    property: 'mfaRecoveryCodes',
    tableName: 'MfaRecoveryCode',
  },
  {
    cursorColumn: 'id',
    cursorKind: 'text',
    property: 'mfaLoginChallenges',
    tableName: 'MfaLoginChallenge',
  },
  {
    cursorColumn: 'id',
    cursorKind: 'text',
    property: 'notifications',
    tableName: 'Notification',
  },
  {
    cursorColumn: 'id',
    cursorKind: 'text',
    property: 'notificationRecipients',
    tableName: 'NotificationRecipient',
  },
  {
    cursorColumn: 'key',
    cursorKind: 'text',
    property: 'systemSettings',
    tableName: 'SystemSetting',
  },
  {
    cursorColumn: 'id',
    cursorKind: 'text',
    property: 'auditLogs',
    tableName: 'AuditLog',
  },
  {
    cursorColumn: 'version',
    cursorKind: 'integer',
    property: 'auditEncryptionKeyVersions',
    tableName: 'AuditEncryptionKeyVersion',
  },
  {
    cursorColumn: 'personId',
    cursorKind: 'text',
    property: 'personDeletionTombstones',
    tableName: 'PersonDeletionTombstone',
  },
  {
    cursorColumn: 'id',
    cursorKind: 'text',
    property: 'persons',
    tableName: 'Person',
  },
  {
    cursorColumn: 'id',
    cursorKind: 'text',
    property: 'personEmails',
    tableName: 'PersonEmail',
  },
  {
    cursorColumn: 'id',
    cursorKind: 'text',
    property: 'personPhones',
    tableName: 'PersonPhone',
  },
  {
    cursorColumn: 'id',
    cursorKind: 'text',
    property: 'personSocialProfiles',
    tableName: 'PersonSocialProfile',
  },
  {
    cursorColumn: 'id',
    cursorKind: 'text',
    property: 'auditFieldChanges',
    tableName: 'AuditFieldChange',
  },
  {
    cursorColumn: 'id',
    cursorKind: 'text',
    property: 'rateLimits',
    tableName: 'RateLimit',
  },
  {
    cursorColumn: 'id',
    cursorKind: 'text',
    legacySourceTableName: 'StaffProfile',
    property: 'staffProfiles',
    tableName: 'ArchivedStaffProfile',
  },
] as const satisfies readonly BackupTableDefinition[];

export type BackupTableProperty =
  (typeof DATABASE_BACKUP_TABLES)[number]['property'];

type BackupManifestBase = {
  createdAt: string;
  requiredAuditEncryptionKeyVersions: number[];
  tables: { property: string; tableName: string }[];
  type: 'manifest';
};

export type BackupManifest = BackupManifestBase & {
  backupId: string;
  formatVersion: typeof DATABASE_BACKUP_FORMAT_VERSION;
};

export type ValidatedBackupManifest = BackupManifest;

export type BackupFormatExpectation = 'current-signed';

export type BackupStreamSummary = {
  counts: Record<BackupTableProperty, number>;
  manifest: ValidatedBackupManifest;
};

export type ParsedBackupRecord =
  | {
      property: BackupTableProperty;
      type: 'row';
      value: Record<string, unknown>;
    }
  | { property: BackupTableProperty; type: 'tableEnd' }
  | { property: BackupTableProperty; type: 'tableStart' }
  | { type: 'footer' }
  | { type: 'manifest' };

type UnknownRecord = Record<string, unknown>;

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

const createEmptyCounts = (): Record<BackupTableProperty, number> =>
  Object.fromEntries(
    DATABASE_BACKUP_TABLES.map(({ property }) => [property, 0]),
  ) as Record<BackupTableProperty, number>;

const assertClosedKeys = (
  value: UnknownRecord,
  expectedKeys: readonly string[],
  context: string,
): void => {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();

  if (
    actual.length !== expected.length ||
    // Both arrays contain only own keys collected immediately above.
    // eslint-disable-next-line security/detect-object-injection
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error(`${context} has unknown or missing properties`);
  }
};

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const validateVersionList = (value: unknown, name: string): number[] => {
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array`);
  }

  const versions = value.map((version) => {
    if (!Number.isSafeInteger(version) || Number(version) < 1) {
      throw new Error(`${name} must contain positive safe integers`);
    }

    return Number(version);
  });

  if (
    versions.some(
      (version, index) => index > 0 && version <= (versions[index - 1] ?? 0),
    )
  ) {
    throw new Error(`${name} must be unique and sorted`);
  }

  return versions;
};

const validateManifest = (
  value: UnknownRecord,
  expectation: BackupFormatExpectation,
): ValidatedBackupManifest => {
  void expectation;
  assertClosedKeys(
    value,
    [
      'backupId',
      'createdAt',
      'formatVersion',
      'requiredAuditEncryptionKeyVersions',
      'tables',
      'type',
    ],
    'Backup manifest',
  );
  if (value.type !== 'manifest') {
    throw new Error('The first backup record must be the manifest');
  }
  if (value.formatVersion !== DATABASE_BACKUP_FORMAT_VERSION) {
    throw new Error(
      `Unsupported backup format ${String(value.formatVersion)}; expected ${String(DATABASE_BACKUP_FORMAT_VERSION)}`,
    );
  }
  if (
    typeof value.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    new Date(value.createdAt).toISOString() !== value.createdAt
  ) {
    throw new Error('Backup manifest createdAt is invalid');
  }
  if (
    typeof value.backupId !== 'string' ||
    !UUID_V4_PATTERN.test(value.backupId)
  ) {
    throw new Error('Backup manifest backupId is invalid');
  }
  if (
    !Array.isArray(value.tables) ||
    value.tables.length !== DATABASE_BACKUP_TABLES.length
  ) {
    throw new Error('Backup manifest table list is incomplete');
  }

  const tables = value.tables.map((table, index) => {
    if (!isRecord(table)) {
      throw new Error('Backup manifest table entry must be an object');
    }
    assertClosedKeys(table, ['property', 'tableName'], 'Manifest table entry');
    // The index comes from mapping the closed static table list.
    // eslint-disable-next-line security/detect-object-injection
    const expected = DATABASE_BACKUP_TABLES[index];
    if (
      !expected ||
      table.property !== expected.property ||
      table.tableName !== expected.tableName
    ) {
      throw new Error('Backup manifest tables are not in the expected order');
    }

    return { property: expected.property, tableName: expected.tableName };
  });
  const requiredAuditEncryptionKeyVersions = validateVersionList(
    value.requiredAuditEncryptionKeyVersions,
    'requiredAuditEncryptionKeyVersions',
  );
  const manifest: BackupManifestBase = {
    createdAt: value.createdAt,
    requiredAuditEncryptionKeyVersions,
    tables,
    type: 'manifest',
  };

  return {
    ...manifest,
    backupId: value.backupId,
    formatVersion: DATABASE_BACKUP_FORMAT_VERSION,
  };
};

export class BackupStreamValidator {
  readonly #counts = createEmptyCounts();
  readonly #formatExpectation: BackupFormatExpectation;
  #activeTable: BackupTableProperty | null = null;
  #footerSeen = false;
  #manifest: ValidatedBackupManifest | null = null;
  #nextTableIndex = 0;

  constructor(formatExpectation: BackupFormatExpectation = 'current-signed') {
    this.#formatExpectation = formatExpectation;
  }

  consume(line: string, lineNumber: number): ParsedBackupRecord {
    if (Buffer.byteLength(line, 'utf8') > MAX_BACKUP_LINE_BYTES) {
      throw new Error(
        `Backup line ${String(lineNumber)} exceeds the safe limit`,
      );
    }
    if (line.length === 0) {
      throw new Error(`Backup line ${String(lineNumber)} is empty`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(line) as unknown;
    } catch {
      throw new Error(`Backup line ${String(lineNumber)} is not valid JSON`);
    }
    if (!isRecord(parsed) || typeof parsed.type !== 'string') {
      throw new Error(`Backup line ${String(lineNumber)} must be a record`);
    }
    if (this.#footerSeen) {
      throw new Error('Backup contains records after its footer');
    }

    if (this.#manifest === null) {
      this.#manifest = validateManifest(parsed, this.#formatExpectation);

      return { type: 'manifest' };
    }

    if (parsed.type === 'tableStart') {
      assertClosedKeys(parsed, ['property', 'type'], 'tableStart record');
      if (this.#activeTable !== null) {
        throw new Error(
          'Backup starts a table before closing the previous one',
        );
      }
      const expected = DATABASE_BACKUP_TABLES[this.#nextTableIndex];
      if (!expected || parsed.property !== expected.property) {
        throw new Error('Backup table sections are missing or out of order');
      }
      this.#activeTable = expected.property;

      return { property: expected.property, type: 'tableStart' };
    }

    if (parsed.type === 'row') {
      assertClosedKeys(parsed, ['property', 'type', 'value'], 'row record');
      if (
        this.#activeTable === null ||
        parsed.property !== this.#activeTable ||
        !isRecord(parsed.value)
      ) {
        throw new Error('Backup row is outside its declared table section');
      }
      this.#counts[this.#activeTable] += 1;

      return {
        property: this.#activeTable,
        type: 'row',
        value: parsed.value,
      };
    }

    if (parsed.type === 'tableEnd') {
      assertClosedKeys(
        parsed,
        ['count', 'property', 'type'],
        'tableEnd record',
      );
      if (
        this.#activeTable === null ||
        parsed.property !== this.#activeTable ||
        !Number.isSafeInteger(parsed.count) ||
        Number(parsed.count) < 0 ||
        Number(parsed.count) !== this.#counts[this.#activeTable]
      ) {
        throw new Error('Backup table count or section boundary is invalid');
      }
      const property = this.#activeTable;
      this.#activeTable = null;
      this.#nextTableIndex += 1;

      return { property, type: 'tableEnd' };
    }

    if (parsed.type === 'footer') {
      assertClosedKeys(parsed, ['counts', 'type'], 'Backup footer');
      if (
        this.#activeTable !== null ||
        this.#nextTableIndex !== DATABASE_BACKUP_TABLES.length ||
        !isRecord(parsed.counts)
      ) {
        throw new Error('Backup footer appears before all table sections');
      }
      assertClosedKeys(
        parsed.counts,
        DATABASE_BACKUP_TABLES.map(({ property }) => property),
        'Backup footer counts',
      );
      for (const { property } of DATABASE_BACKUP_TABLES) {
        // Property names come from the closed static table contract.
        /* eslint-disable security/detect-object-injection */
        if (parsed.counts[property] !== this.#counts[property]) {
          throw new Error(`Backup footer count for ${property} is invalid`);
        }
        /* eslint-enable security/detect-object-injection */
      }
      this.#footerSeen = true;

      return { type: 'footer' };
    }

    throw new Error(`Unknown backup record type ${parsed.type}`);
  }

  finish(): BackupStreamSummary {
    if (
      this.#manifest === null ||
      !this.#footerSeen ||
      this.#activeTable !== null ||
      this.#nextTableIndex !== DATABASE_BACKUP_TABLES.length
    ) {
      throw new Error('Backup is truncated or incomplete');
    }

    return { counts: { ...this.#counts }, manifest: this.#manifest };
  }
}

export const stringifyBackupRecord = (value: unknown): string => {
  const serialized = JSON.stringify(
    value,
    function backupReplacer(key, nested) {
      // JSON.stringify supplies keys from the object currently being visited.
      // eslint-disable-next-line security/detect-object-injection
      const source = key === '' ? nested : (this as UnknownRecord)[key];

      if (typeof source === 'bigint') return source.toString();
      if (Buffer.isBuffer(source) || source instanceof Uint8Array) {
        return `\\x${Buffer.from(source).toString('hex')}`;
      }

      return nested;
    },
  );

  if (serialized === undefined) {
    throw new Error('Unable to serialize a database backup value');
  }

  return serialized;
};

export const tableDefinitionByProperty = (
  property: BackupTableProperty,
): (typeof DATABASE_BACKUP_TABLES)[number] => {
  const definition = DATABASE_BACKUP_TABLES.find(
    (candidate) => candidate.property === property,
  );
  if (!definition) throw new Error(`Unknown backup table ${property}`);

  return definition;
};
