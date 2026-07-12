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
  const [users, sessions, auditLogs, rateLimits] = await Promise.all([
    prisma.user.findMany({ orderBy: { id: 'asc' } }),
    prisma.session.findMany({ orderBy: { id: 'asc' } }),
    prisma.auditLog.findMany({ orderBy: { id: 'asc' } }),
    prisma.rateLimit.findMany({ orderBy: { id: 'asc' } }),
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
    rateLimits,
    sessions,
    staffProfiles,
    staffProfileSource,
    users,
  };

  // Paths are generated exclusively from the repository root and an ISO timestamp.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await mkdir(backupDirectory, { recursive: true });
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await writeFile(filePath, JSON.stringify(payload, null, 2), {
    encoding: 'utf8',
    mode: 0o600,
  });

  return {
    counts: {
      AuditLog: auditLogs.length,
      RateLimit: rateLimits.length,
      Session: sessions.length,
      StaffProfile: staffProfiles.length,
      User: users.length,
    },
    filePath,
  };
}
