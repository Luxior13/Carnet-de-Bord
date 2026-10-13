import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, generateKeyPairSync } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { createDatabaseBackup } from "../../../../packages/database/scripts/database-backup.ts";
import {
  DATABASE_BACKUP_FORMAT_VERSION,
  DATABASE_BACKUP_TABLES,
} from "../../../../packages/database/scripts/database-backup-format.ts";

const envFile = process.env.AUDIT_ENV_FILE;
assert(envFile, "Private closure environment required");
const config = JSON.parse(
  fs.readFileSync(envFile, "utf8").replace(/^\uFEFF/, ""),
);
const sourceUrl = new URL(config.E2E_DATABASE_URL);
assert.equal(sourceUrl.hostname, "127.0.0.1");
assert.equal(sourceUrl.port, "54663");
assert.equal(sourceUrl.pathname, "/socle_e2e_test");
const targetUrl = new URL(sourceUrl);
targetUrl.pathname = "/socle_restore_test";
const source = new PrismaClient({ datasourceUrl: sourceUrl.toString() });
const target = new PrismaClient({ datasourceUrl: targetUrl.toString() });
const root = path.resolve(import.meta.dirname, "../../../..");
const privateDirectory = path.dirname(envFile);
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const signingEnvironment = {
  ...process.env,
  ...config,
  DATABASE_BACKUP_SIGNING_CURRENT_VERSION: "1",
  DATABASE_BACKUP_SIGNING_PRIVATE_KEY_V1: privateKey
    .export({ type: "pkcs8", format: "pem" })
    .toString(),
  DATABASE_BACKUP_SIGNING_PUBLIC_KEY_V1: publicKey
    .export({ type: "spki", format: "pem" })
    .toString(),
};
const restoreEnvironment: NodeJS.ProcessEnv = {
  ...signingEnvironment,
  DATABASE_URL: targetUrl.toString(),
};
for (const key of Object.keys(restoreEnvironment)) {
  if (/^DATABASE_BACKUP_SIGNING_PRIVATE_KEY_V\d+$/.test(key))
    restoreEnvironment[key] = "";
}
const results = {
  date: new Date().toISOString(),
  format: DATABASE_BACKUP_FORMAT_VERSION,
  expectedScenarios: 4,
  completed: false,
  scenarios: [] as object[],
};
const out = path.join(import.meta.dirname, "preuves");
fs.mkdirSync(out, { recursive: true });

async function fingerprint(client: PrismaClient) {
  const result: Record<string, { count: number; digest: string }> = {};
  for (const { tableName, cursorColumn } of DATABASE_BACKUP_TABLES) {
    // Both identifiers come exclusively from the repository's fixed allowlist.
    const rows = await client.$queryRawUnsafe<{ json: string }[]>(
      `SELECT row_to_json(t)::text AS json FROM "public"."${tableName}" t ORDER BY "${cursorColumn}"`,
    );
    const digest = createHash("sha256");
    for (const row of rows) digest.update(row.json).update("\n");
    result[tableName] = { count: rows.length, digest: digest.digest("hex") };
  }
  return result;
}

const countsOf = (values: Awaited<ReturnType<typeof fingerprint>>) =>
  Object.fromEntries(
    Object.entries(values).map(([name, value]) => [name, value.count]),
  );
const readCliSummary = (stdout: string) => {
  const line = stdout.split(/\r?\n/).find((line) => line.startsWith("{"));
  assert(line, "CLI must report its validated counts");
  return JSON.parse(line);
};
const assertExit = (
  result: ReturnType<typeof spawnSync>,
  status: number,
  message: string,
) => {
  assert.equal(
    result.error,
    undefined,
    message + ": subprocess failed to execute",
  );
  assert.equal(result.signal, null, message + ": subprocess was interrupted");
  assert.equal(result.status, status, message);
};

let phase = "Empty target and stable source prerequisites";
try {
  const before = await fingerprint(target);
  assert(
    Object.values(before).every((row) => row.count === 0),
    "Target must be empty",
  );
  const expected = await fingerprint(source);
  assert(
    expected.User.count > 0,
    "Source must contain the isolated real E2E fixture",
  );
  const backup = await createDatabaseBackup(source, signingEnvironment);
  fs.writeFileSync(
    path.join(privateDirectory, "closure-backup-paths.json"),
    JSON.stringify([
      backup.filePath,
      backup.checksumPath,
      backup.signaturePath,
    ]),
  );
  assert.deepEqual(
    await fingerprint(source),
    expected,
    "Source changed during the backup: stop all writers before retrying",
  );
  assert.deepEqual(
    backup.counts,
    countsOf(expected),
    "Backup must cover the exact source counts",
  );
  const invoke = (extra: string[], environment = restoreEnvironment) =>
    spawnSync(
      process.execPath,
      [
        path.join(root, "packages/database/scripts/restore-database.ts"),
        `--file=${backup.filePath}`,
        `--expected-backup-id=${backup.backupId}`,
        `--expected-sha256=${backup.sha256}`,
        ...extra,
      ],
      {
        cwd: root,
        env: environment,
        encoding: "utf8",
        timeout: 120000,
        windowsHide: true,
      },
    );

  phase = "Signed v9 dry run, public signing key only, no writes";
  const dry = invoke(["--dry-run"]);
  fs.writeFileSync(
    path.join(privateDirectory, "restore-dry-private.log"),
    dry.stdout + dry.stderr,
  );
  assertExit(dry, 0, "Signed backup dry run failed; inspect private log");
  const summary = readCliSummary(dry.stdout);
  assert.equal(summary.authenticatedBackupSigningKeyVersion, 1);
  assert.equal(summary.backupId, backup.backupId);
  assert.deepEqual(summary.counts, countsOf(expected));
  assert.deepEqual(await fingerprint(target), before);
  results.scenarios.push({
    name: "Signed v9 dry run, public signing key only, no writes",
    passed: true,
  });

  phase = "Missing verification key rejected before writing";
  const missingKeyEnvironment = {
    ...restoreEnvironment,
    DATABASE_BACKUP_SIGNING_PUBLIC_KEY_V1: "",
  };
  const rejected = invoke(["--dry-run"], missingKeyEnvironment);
  const rejectedOutput = rejected.stdout + rejected.stderr;
  fs.writeFileSync(
    path.join(privateDirectory, "restore-missing-key-private.log"),
    rejectedOutput,
  );
  assertExit(
    rejected,
    1,
    "Missing verification key must be refused; inspect private log",
  );
  const keyReason =
    "DATABASE_BACKUP_SIGNING_PUBLIC_KEY_V1 must contain a valid Ed25519 public key";
  assert(
    rejectedOutput.includes("error: " + keyReason),
    "Unexpected missing-key refusal reason; inspect private log",
  );
  assert.deepEqual(await fingerprint(target), before);
  results.scenarios.push({ name: phase, passed: true, reason: keyReason });

  phase =
    "Real signed restore, every table identical including encrypted values";
  const restored = invoke([
    "--confirm-empty-restore=RESTORE-INTO-EMPTY-DATABASE",
  ]);
  fs.writeFileSync(
    path.join(privateDirectory, "restore-private.log"),
    restored.stdout + restored.stderr,
  );
  assertExit(restored, 0, "Restore failed; inspect private log");
  assert.deepEqual(readCliSummary(restored.stdout), countsOf(expected));
  assert.deepEqual(await fingerprint(target), expected);
  results.scenarios.push({
    name: "Real signed restore, every table identical including encrypted values",
    passed: true,
    counts: Object.fromEntries(
      Object.entries(expected).map(([name, value]) => [name, value.count]),
    ),
  });

  phase = "Nonempty target rejected without overwriting";
  const again = invoke(["--confirm-empty-restore=RESTORE-INTO-EMPTY-DATABASE"]);
  const againOutput = again.stdout + again.stderr;
  fs.writeFileSync(
    path.join(privateDirectory, "restore-nonempty-private.log"),
    againOutput,
  );
  assertExit(again, 1, "Nonempty target must be refused; inspect private log");
  const nonemptyReason =
    "Restore target is not empty: " +
    DATABASE_BACKUP_TABLES.filter(
      ({ tableName }) => expected[tableName].count > 0,
    )
      .map(({ tableName }) => tableName)
      .join(", ");
  assert(
    againOutput.includes("error: " + nonemptyReason),
    "Unexpected nonempty refusal reason; inspect private log",
  );
  assert.deepEqual(await fingerprint(target), expected);
  results.scenarios.push({ name: phase, passed: true, reason: nonemptyReason });
  results.completed = true;
} catch (error) {
  fs.writeFileSync(
    path.join(privateDirectory, "restore-check-private.log"),
    error instanceof Error ? (error.stack ?? error.message) : String(error),
  );
  results.scenarios.push({ name: phase, passed: false });
  throw new Error(
    "Restoration control failed: " + phase + "; inspect the private logs",
  );
} finally {
  fs.writeFileSync(
    path.join(out, "restauration.json"),
    JSON.stringify(results, null, 2),
  );
  await Promise.all([source.$disconnect(), target.$disconnect()]);
}
console.log(`Restore closure: ${results.scenarios.length}/4 passed`);
