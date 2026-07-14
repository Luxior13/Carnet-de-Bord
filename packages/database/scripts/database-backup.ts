import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { PrismaClient } from '@prisma/client';

import { getPublicTables } from './database-tools';

type BackupResult = {
  counts: Record<string, number>;
  filePath: string;
};

export async function createDatabaseBackup(
  prisma: PrismaClient,
): Promise<BackupResult> {
  const tables = await getPublicTables(prisma);
  // Read rows without Prisma's generated scalar selection so this safety
  // backup also works immediately before a pending migration adds columns.
  // Optional MFA tables are absent on databases that have not applied the
  // TOTP migration yet.
  const [
    users,
    loginNameReservations,
    sessions,
    auditLogs,
    rateLimits,
    totpCredentials,
    mfaRecoveryCodes,
  ] = await Promise.all([
    tables.has('User')
      ? prisma.$queryRaw<Record<string, unknown>[]>`
          SELECT * FROM "public"."User" ORDER BY "id" ASC
        `
      : [],
    tables.has('LoginNameReservation')
      ? prisma.$queryRaw<Record<string, unknown>[]>`
          SELECT * FROM "public"."LoginNameReservation" ORDER BY "loginName" ASC
        `
      : [],
    tables.has('Session')
      ? prisma.$queryRaw<Record<string, unknown>[]>`
          SELECT * FROM "public"."Session" ORDER BY "id" ASC
        `
      : [],
    tables.has('AuditLog')
      ? prisma.$queryRaw<Record<string, unknown>[]>`
          SELECT * FROM "public"."AuditLog" ORDER BY "id" ASC
        `
      : [],
    tables.has('RateLimit')
      ? prisma.$queryRaw<Record<string, unknown>[]>`
          SELECT * FROM "public"."RateLimit" ORDER BY "id" ASC
        `
      : [],
    tables.has('TotpCredential')
      ? prisma.$queryRaw<Record<string, unknown>[]>`
          SELECT * FROM "public"."TotpCredential" ORDER BY "userId" ASC
        `
      : [],
    tables.has('MfaRecoveryCode')
      ? prisma.$queryRaw<Record<string, unknown>[]>`
          SELECT * FROM "public"."MfaRecoveryCode" ORDER BY "id" ASC
        `
      : [],
  ]);

  let staffProfiles: Record<string, unknown>[] = [];
  let staffProfileSource: 'ArchivedStaffProfile' | 'StaffProfile' | null = null;

  if (tables.has('ArchivedStaffProfile')) {
    staffProfileSource = 'ArchivedStaffProfile';
    staffProfiles = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "public"."ArchivedStaffProfile" ORDER BY "id" ASC`,
    );
  } else if (tables.has('StaffProfile')) {
    staffProfileSource = 'StaffProfile';
    staffProfiles = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "public"."StaffProfile" ORDER BY "id" ASC`,
    );
  }

  const workspaceRoot = resolve(import.meta.dirname, '..', '..', '..');
  const backupDirectory = resolve(
    workspaceRoot,
    '.codex-tmp',
    'database-backups',
  );
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = resolve(backupDirectory, `carnet-pro-${timestamp}.json`);
  const payload = {
    auditLogs,
    createdAt: new Date().toISOString(),
    loginNameReservations,
    mfaRecoveryCodes,
    rateLimits,
    sessions,
    staffProfiles,
    staffProfileSource,
    totpCredentials,
    users,
  };

  // Paths are generated exclusively from the repository root and an ISO timestamp.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await mkdir(backupDirectory, { recursive: true });
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await writeFile(
    filePath,
    JSON.stringify(
      payload,
      (_key, value: unknown) =>
        typeof value === 'bigint' ? value.toString() : value,
      2,
    ),
    {
      encoding: 'utf8',
      mode: 0o600,
    },
  );

  return {
    counts: {
      AuditLog: auditLogs.length,
      LoginNameReservation: loginNameReservations.length,
      MfaRecoveryCode: mfaRecoveryCodes.length,
      RateLimit: rateLimits.length,
      Session: sessions.length,
      StaffProfile: staffProfiles.length,
      TotpCredential: totpCredentials.length,
      User: users.length,
    },
    filePath,
  };
}
