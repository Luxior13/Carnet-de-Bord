import 'server-only';

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

import type { Prisma } from '@prisma/client';
import {
  AuditAction,
  AuditCategory,
  AuditOutcome,
  AuditSeverity,
  AuditStream,
} from '@repo/database';

import { FEATURES } from '$constants/feature-registry.constants';
import { env } from '$env';
import {
  AUDIT_EVENT_VERSION,
  getAuditEventClassification,
} from '$server/audit-event';
import { getAuditRequestContext } from '$server/auth';
import type { UserType } from '$types/auth.types';

import { PERSON_AUDIT_KEYS } from '../person.constants';
import { personErrors } from './person-errors';

const AUDIT_VALUE_MAX_BYTES = 8 * 1024;
const AES_GCM_IV_BYTES = 12;
const AES_GCM_TAG_BYTES = 16;

export type PersonAuditChange = Readonly<{
  after: unknown | null;
  before: unknown | null;
  changeType: 'CREATE' | 'DELETE' | 'UPDATE';
  fieldKey: string;
  recordId?: string | null;
  sectionKey: string;
  sensitive: boolean;
}>;

type PersonAuditInput = Readonly<{
  action: 'PERSON_CREATE' | 'PERSON_DELETE' | 'PERSON_UPDATE';
  actor: Pick<UserType, 'firstName' | 'id' | 'lastName' | 'loginName'> & {
    persistedUserId?: string | null;
    role: UserType['role'] | null;
  };
  changes?: readonly PersonAuditChange[];
  description: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  outcome?: 'FAILURE' | 'NEUTRAL' | 'SUCCESS';
}>;

type EncryptedValues = Readonly<{
  authTag: Buffer;
  ciphertext: Buffer;
  iv: Buffer;
  keyVersion: number;
}>;

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }

  return value;
};

const serializeCanonical = (value: unknown): string =>
  JSON.stringify(canonicalize(value));

const decodeBase64AesKey = (rawKey: string | undefined): Buffer | null => {
  if (!rawKey) return null;
  const decoded = Buffer.from(rawKey, 'base64');

  return decoded.byteLength === 32 ? decoded : null;
};

const getAuditKey = (version: number): Buffer | null =>
  decodeBase64AesKey(process.env[`AUDIT_ENCRYPTION_KEY_V${version}`]);

export const getCurrentAuditEncryptionVersion = (): number | null =>
  env.AUDIT_ENCRYPTION_CURRENT_VERSION ?? null;

export const assertPersonAuditConfigured = (): void => {
  getCurrentAuditKey();
};

const getCurrentAuditKey = (): { key: Buffer; version: number } => {
  const version = getCurrentAuditEncryptionVersion();
  const key = version ? getAuditKey(version) : null;
  if (!version || !key) throw personErrors.featureNotConfigured();

  return { key, version };
};

const buildAuthenticatedData = (input: {
  auditLogId: string;
  changeType: string;
  entityId: string;
  entityType: 'PERSON';
  fieldKey: string;
  recordId: string | null;
  sectionKey: string;
}): Buffer => Buffer.from(serializeCanonical(input), 'utf8');

const encryptAuditValues = (
  input: Pick<
    PersonAuditChange,
    'after' | 'before' | 'changeType' | 'fieldKey' | 'sectionKey'
  > & { auditLogId: string; entityId: string; recordId: string | null },
): EncryptedValues => {
  const plaintext = Buffer.from(
    serializeCanonical({ after: input.after, before: input.before }),
    'utf8',
  );
  if (plaintext.byteLength > AUDIT_VALUE_MAX_BYTES) {
    throw new RangeError('Audit field value exceeds the 8 KiB limit');
  }

  const { key, version } = getCurrentAuditKey();
  const iv = randomBytes(AES_GCM_IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(
    buildAuthenticatedData({
      auditLogId: input.auditLogId,
      changeType: input.changeType,
      entityId: input.entityId,
      entityType: 'PERSON',
      fieldKey: input.fieldKey,
      recordId: input.recordId,
      sectionKey: input.sectionKey,
    }),
  );
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return {
    authTag: cipher.getAuthTag(),
    ciphertext,
    iv,
    keyVersion: version,
  };
};

const parseStoredValue = (value: string | null): unknown | null => {
  if (value === null) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
};

export const decryptPersonAuditValues = (input: {
  auditLogId: string;
  changeType: string;
  entityId: string;
  fieldKey: string;
  recordId: string | null;
  sectionKey: string;
  valueKeyVersion: number;
  valuesAuthTag: Uint8Array;
  valuesCiphertext: Uint8Array;
  valuesIv: Uint8Array;
}): { after: unknown | null; before: unknown | null } => {
  const key = getAuditKey(input.valueKeyVersion);
  if (!key) throw personErrors.featureNotConfigured();
  if (
    input.valuesIv.byteLength !== AES_GCM_IV_BYTES ||
    input.valuesAuthTag.byteLength !== AES_GCM_TAG_BYTES
  ) {
    throw new Error('Invalid encrypted audit value envelope');
  }

  const decipher = createDecipheriv('aes-256-gcm', key, input.valuesIv);
  decipher.setAAD(
    buildAuthenticatedData({
      auditLogId: input.auditLogId,
      changeType: input.changeType,
      entityId: input.entityId,
      entityType: 'PERSON',
      fieldKey: input.fieldKey,
      recordId: input.recordId,
      sectionKey: input.sectionKey,
    }),
  );
  decipher.setAuthTag(Buffer.from(input.valuesAuthTag));
  const plaintext = Buffer.concat([
    decipher.update(input.valuesCiphertext),
    decipher.final(),
  ]).toString('utf8');
  const parsed = JSON.parse(plaintext) as {
    after?: unknown;
    before?: unknown;
  };

  return {
    after: parsed.after ?? null,
    before: parsed.before ?? null,
  };
};

export const decodePlainPersonAuditValues = (input: {
  afterValue: string | null;
  beforeValue: string | null;
}): { after: unknown | null; before: unknown | null } => ({
  after: parseStoredValue(input.afterValue),
  before: parseStoredValue(input.beforeValue),
});

const getActorDisplayName = (
  actor: Pick<UserType, 'firstName' | 'lastName' | 'loginName'>,
): string =>
  `${actor.firstName.trim()} ${actor.lastName.trim()}`.trim() ||
  actor.loginName;

export const createPersonAudit = async (
  transaction: Prisma.TransactionClient,
  input: PersonAuditInput,
): Promise<{ createdAt: Date; id: string }> => {
  const requestContext = await getAuditRequestContext().catch(() => ({
    ipAddress: null,
    requestId: null,
    userAgent: null,
  }));
  const classification = getAuditEventClassification(AuditAction[input.action]);
  const createdAt = new Date();
  const auditLog = await transaction.auditLog.create({
    data: {
      action: AuditAction[input.action],
      actorDisplayNameSnapshot: getActorDisplayName(input.actor),
      actorLoginNameSnapshot: input.actor.loginName,
      actorRoleSnapshot: input.actor.role,
      category: AuditCategory.PERSON,
      createdAt,
      description: input.description,
      entityId: input.entityId,
      entityType: PERSON_AUDIT_KEYS.entityType,
      eventKind: classification.eventKind,
      eventVersion: AUDIT_EVENT_VERSION,
      ipAddress: requestContext.ipAddress,
      metadata: {
        ...FEATURES.persons.audit,
        ...(input.metadata ?? {}),
      } as Prisma.InputJsonValue,
      outcome: input.outcome
        ? AuditOutcome[input.outcome]
        : classification.outcome,
      pageKey: FEATURES.persons.audit.pageKey,
      poleKey: FEATURES.persons.audit.poleKey,
      requestId: requestContext.requestId,
      severity:
        input.action === 'PERSON_DELETE'
          ? AuditSeverity.CRITICAL
          : classification.severity,
      stream: AuditStream.IDENTITY,
      userAgent: requestContext.userAgent,
      userId:
        input.actor.persistedUserId === undefined
          ? input.actor.id
          : input.actor.persistedUserId,
    },
    select: { createdAt: true, id: true },
  });

  const changes = input.changes ?? [];
  const encryptedChanges = changes.map((change) => ({
    change,
    encrypted: change.sensitive
      ? encryptAuditValues({
          ...change,
          auditLogId: auditLog.id,
          entityId: input.entityId,
          recordId: change.recordId ?? null,
        })
      : null,
  }));
  const encryptedKeyVersions = [
    ...new Set(
      encryptedChanges.flatMap(({ encrypted }) =>
        encrypted ? [encrypted.keyVersion] : [],
      ),
    ),
  ];
  for (const version of encryptedKeyVersions) {
    await transaction.auditEncryptionKeyVersion.upsert({
      create: { version },
      update: {},
      where: { version },
    });
  }

  if (encryptedChanges.length > 0) {
    await transaction.auditFieldChange.createMany({
      data: encryptedChanges.map(({ change, encrypted }) => ({
        afterValue:
          encrypted || change.after === null
            ? null
            : serializeCanonical(change.after).slice(0, 512),
        auditLogId: auditLog.id,
        beforeValue:
          encrypted || change.before === null
            ? null
            : serializeCanonical(change.before).slice(0, 512),
        changeType: change.changeType,
        createdAt: auditLog.createdAt,
        entityId: input.entityId,
        entityType: PERSON_AUDIT_KEYS.entityType,
        fieldKey: change.fieldKey,
        recordId: change.recordId ?? null,
        sectionKey: change.sectionKey,
        valueKeyVersion: encrypted?.keyVersion ?? null,
        valueMode: encrypted ? 'ENCRYPTED' : 'PLAIN',
        valuesAuthTag: encrypted ? Uint8Array.from(encrypted.authTag) : null,
        valuesCiphertext: encrypted
          ? Uint8Array.from(encrypted.ciphertext)
          : null,
        valuesIv: encrypted ? Uint8Array.from(encrypted.iv) : null,
      })),
    });
  }

  return auditLog;
};

export const hashAuditValue = (value: unknown): string =>
  createHash('sha256').update(serializeCanonical(value), 'utf8').digest('hex');
