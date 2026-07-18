import 'server-only';

import type { Prisma } from '@prisma/client';

import {
  isSystemSettingKey,
  SYSTEM_SETTING_DEFINITIONS,
  type SystemSettingKey,
} from '$constants/system-settings.constants';
import { logger } from '$server/logger';
import { prisma } from '$server/prisma';

type SettingWriteClient = Pick<Prisma.TransactionClient, 'systemSetting'>;
type SettingReadClient = Pick<Prisma.TransactionClient, 'systemSetting'>;
const SYSTEM_SETTING_CACHE_TTL_MS = 30_000;
const settingCache = new Map<
  SystemSettingKey,
  { expiresAt: number; value: unknown }
>();

export type SystemSettingValue<TKey extends SystemSettingKey> =
  (typeof SYSTEM_SETTING_DEFINITIONS)[TKey]['defaultValue'];

export class SystemSettingConflictError extends Error {
  constructor() {
    super('System setting changed concurrently');
    this.name = 'SystemSettingConflictError';
  }
}

/**
 * Reads a setting through the closed catalog and validates stored JSON again
 * before it can influence runtime behavior. A damaged or manually edited row
 * therefore fails safe to the reviewed default instead of widening limits or
 * producing destructive retention cutoffs.
 */
export const getSystemSettingValue = async <TKey extends SystemSettingKey>(
  key: TKey,
  client: SettingReadClient = prisma,
): Promise<SystemSettingValue<TKey>> => {
  // TKey comes from the closed SystemSettingKey union.
  // eslint-disable-next-line security/detect-object-injection
  const definition = SYSTEM_SETTING_DEFINITIONS[key];
  const canUseCache = client === prisma && process.env.NODE_ENV !== 'test';
  const cached = canUseCache ? settingCache.get(key) : undefined;
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as SystemSettingValue<TKey>;
  }

  const setting = await client.systemSetting.findUnique({
    select: { value: true },
    where: { key },
  });
  const parsed = definition.schema.safeParse(setting?.value);

  const value = parsed.success ? parsed.data : definition.defaultValue;
  if (setting) {
    if (!parsed.success) {
      logger.warn('Invalid stored system setting; using reviewed default', {
        action: 'SYSTEM_SETTING_READ',
        metadata: { key },
      });
    }
  }
  if (canUseCache) {
    settingCache.set(key, {
      expiresAt: Date.now() + SYSTEM_SETTING_CACHE_TTL_MS,
      value,
    });
  }

  return value as SystemSettingValue<TKey>;
};

export const createSystemSetting = async (
  input: {
    description: string;
    key: string;
    updatedById: string;
    value: Prisma.InputJsonValue;
  },
  client: SettingWriteClient = prisma,
): Promise<{
  description: string | null;
  key: string;
  updatedAt: Date;
  value: Prisma.JsonValue;
  version: number;
}> => {
  const setting = await client.systemSetting.create({
    data: {
      description: input.description,
      key: input.key,
      updatedById: input.updatedById,
      value: input.value,
    },
    select: {
      description: true,
      key: true,
      updatedAt: true,
      value: true,
      version: true,
    },
  });
  if (isSystemSettingKey(input.key)) settingCache.delete(input.key);

  return setting;
};

export const updateSystemSetting = async (
  input: {
    description?: string | null;
    expectedVersion: number;
    key: string;
    updatedById: string;
    value: Prisma.InputJsonValue;
  },
  client: SettingWriteClient = prisma,
): Promise<{
  description: string | null;
  key: string;
  updatedAt: Date;
  value: Prisma.JsonValue;
  version: number;
}> => {
  const result = await client.systemSetting.updateMany({
    data: {
      ...(input.description === undefined
        ? {}
        : { description: input.description }),
      updatedById: input.updatedById,
      value: input.value,
      version: { increment: 1 },
    },
    where: { key: input.key, version: input.expectedVersion },
  });

  if (result.count !== 1) throw new SystemSettingConflictError();

  const setting = await client.systemSetting.findUnique({
    select: {
      description: true,
      key: true,
      updatedAt: true,
      value: true,
      version: true,
    },
    where: { key: input.key },
  });

  if (!setting) throw new SystemSettingConflictError();
  if (isSystemSettingKey(input.key)) settingCache.delete(input.key);

  return setting;
};
