import 'server-only';

import type { Prisma } from '@prisma/client';

import { prisma } from '$server/prisma';

type SettingWriteClient = Pick<Prisma.TransactionClient, 'systemSetting'>;

export class SystemSettingConflictError extends Error {
  constructor() {
    super('System setting changed concurrently');
    this.name = 'SystemSettingConflictError';
  }
}

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
}> =>
  client.systemSetting.create({
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

  return setting;
};
