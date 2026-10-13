import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const root = path.resolve(import.meta.dirname, '../../..');
const work = fs.readFileSync(path.join(os.tmpdir(), 'noctambule-schema-prisma-current.txt'), 'utf8').replace(/^\uFEFF/, '').trim();
const config = JSON.parse(fs.readFileSync(path.join(work, 'env.json'), 'utf8').replace(/^\uFEFF/, ''));
const source = new URL(config.DATABASE_URL);
assert.equal(source.hostname, '127.0.0.1');
assert.equal(source.port, '54664');
assert.equal(source.pathname, '/schema_review_test');
const schema = path.join(root, 'packages/database/prisma/schema.prisma');
const migration = '20261013120000_system_setting_positive_version';
const evidence = path.join(import.meta.dirname, 'preuves');
fs.mkdirSync(evidence, { recursive: true });
const write = (name: string, value: unknown) => fs.writeFileSync(path.join(evidence, name), JSON.stringify(value, (_, value) => typeof value === 'bigint' ? value.toString() : value, 2) + '\n');
const url = (name: string) => { assert(/^schema_(review|invalid|clean|restore|shadow)_test$/.test(name)); const value = new URL(source); value.pathname = '/' + name; return value.toString(); };
const clients: PrismaClient[] = [];
const client = (name: string) => { const value = new PrismaClient({ datasourceUrl: url(name) }); clients.push(value); return value; };
const cases: { name: string; passed: boolean }[] = [];
let sequence = 0;
function prisma(database: string, args: string[], expected = 0) {
  const result = spawnSync('node', [path.join(root, 'node_modules/prisma/build/index.js'), ...args], { cwd: work, env: { ...process.env, ...config, DATABASE_URL: url(database), CHECKPOINT_DISABLE: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1' }, encoding: 'utf8', timeout: 120000, windowsHide: true });
  fs.writeFileSync(path.join(work, `prisma-${++sequence}.log`), (result.stdout ?? '') + (result.stderr ?? ''));
  assert.equal(result.error, undefined, 'Prisma subprocess failed; inspect private log');
  assert.equal(result.status, expected, 'Unexpected Prisma result; inspect private log');
  return result.stdout + result.stderr;
}
const deploy = (database: string, schemaPath = schema, expected = 0) => prisma(database, ['migrate','deploy','--schema',schemaPath], expected);

async function catalogue(db: PrismaClient) {
  const queries = {
    columns: `SELECT table_name, ordinal_position, column_name, data_type, udt_name, character_maximum_length, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name <> '_prisma_migrations' ORDER BY table_name, ordinal_position`,
    constraints: `SELECT c.relname AS table_name, con.conname AS name, con.contype AS type, con.condeferrable AS deferrable, con.condeferred AS deferred, con.convalidated AS validated, pg_get_constraintdef(con.oid) AS definition FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname <> '_prisma_migrations' ORDER BY c.relname, con.conname`,
    indexes: `SELECT c.relname AS table_name, ci.relname AS name, i.indisvalid AS valid, i.indisunique AS unique_index, pg_get_indexdef(i.indexrelid) AS definition, pg_get_expr(i.indpred,i.indrelid) AS predicate FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_class ci ON ci.oid=i.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname <> '_prisma_migrations' ORDER BY c.relname,ci.relname`,
    triggers: `SELECT c.relname AS table_name, t.tgname AS name, t.tgenabled AS enabled, pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname`,
    functions: `SELECT p.proname AS name, pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e') ORDER BY p.proname`,
    enums: `SELECT t.typname AS name, e.enumlabel AS value, e.enumsortorder AS position FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' ORDER BY t.typname,e.enumsortorder`,
    extensions: `SELECT extname,extversion FROM pg_extension ORDER BY extname`,
  };
  const result: Record<string, any[]> = {};
  for (const [name, query] of Object.entries(queries)) result[name] = await db.$queryRawUnsafe<any[]>(query);
  return result;
}

try {
  const oldSchema = path.join(work, 'previous/schema.prisma');
  deploy('schema_review_test', oldSchema);
  deploy('schema_invalid_test', oldSchema);
  const upgraded = client('schema_review_test');
  const invalid = client('schema_invalid_test');
  const previous = await catalogue(upgraded);
  write('catalogue-avant.json', previous);
  await upgraded.systemSetting.create({ data: { key: 'audit.retentionDays', value: 365, description: 'Synthetic preserved setting', version: 3 } });
  const settingBefore = await upgraded.systemSetting.findUniqueOrThrow({ where: { key: 'audit.retentionDays' } });
  await invalid.systemSetting.create({ data: { key: 'audit.retentionDays', value: 365, version: 0 } });
  cases.push({ name: 'Previous schema accepts invalid stored version 0 (defect reproduced)', passed: true });
  const failure = deploy('schema_invalid_test', schema, 1);
  assert(failure.includes('SystemSetting_version_check'));
  assert.equal((await invalid.systemSetting.findUniqueOrThrow({ where: { key: 'audit.retentionDays' } })).version, 0);
  assert.equal((await invalid.$queryRaw<any[]>`SELECT conname FROM pg_constraint WHERE conname='SystemSetting_version_check'`).length, 0);
  cases.push({ name: 'Upgrade rejects invalid old data atomically without rewriting it', passed: true });
  // Explicit repair of the synthetic fixture only; production migration performs none.
  await invalid.systemSetting.update({ where: { key: 'audit.retentionDays' }, data: { version: 1 } });
  prisma('schema_invalid_test', ['migrate','resolve','--rolled-back',migration,'--schema',schema]);
  deploy('schema_invalid_test');
  cases.push({ name: 'After explicit fixture repair, rolled-back migration can be retried', passed: true });
  deploy('schema_review_test');
  assert.deepEqual(await upgraded.systemSetting.findUniqueOrThrow({ where: { key: 'audit.retentionDays' } }), settingBefore);
  cases.push({ name: 'Upgrade preserves every field and timestamp of an existing valid setting', passed: true });
  for (const version of [0, -1]) {
    await assert.rejects(upgraded.systemSetting.create({ data: { key: 'invalid-' + version, value: 365, version } }), error => String(error).includes('SystemSetting_version_check'));
    await assert.rejects(upgraded.systemSetting.update({ where: { key: 'audit.retentionDays' }, data: { version } }), error => String(error).includes('SystemSetting_version_check'));
    cases.push({ name: `INSERT and UPDATE reject setting version ${version}`, passed: true });
  }
  const next = await upgraded.systemSetting.update({ where: { key: 'audit.retentionDays', version: 3 }, data: { value: 180, version: { increment: 1 } } });
  assert.equal(next.version, 4);
  await assert.rejects(upgraded.systemSetting.update({ where: { key: 'audit.retentionDays', version: 3 }, data: { value: 365, version: { increment: 1 } } }));
  cases.push({ name: 'Positive version update succeeds; stale version still conflicts', passed: true });
  deploy('schema_clean_test');
  deploy('schema_restore_test');
  const clean = client('schema_clean_test');
  const after = await catalogue(upgraded);
  const fresh = await catalogue(clean);
  assert.deepEqual(after, fresh);
  cases.push({ name: 'Fresh migration chain and populated upgrade produce identical SQL catalogues', passed: true });
  const withoutNewCheck = { ...after, constraints: after.constraints.filter(c => c.name !== 'SystemSetting_version_check') };
  assert.deepEqual(withoutNewCheck, previous);
  cases.push({ name: 'Only SQL catalogue change is the positive SystemSetting version check', passed: true });
  write('catalogue-apres.json', after);
  const drift = prisma('schema_review_test', ['migrate','diff','--from-schema-datasource',schema,'--to-schema-datamodel',schema,'--script','--exit-code'], 2);
  fs.writeFileSync(path.join(evidence, 'diff-prisma.sql'), drift);
  const dropped = [...drift.matchAll(/DROP INDEX "([^"]+)"/g)].map(m => m[1]).sort();
  const prefix = after.indexes.filter(i => i.name.endsWith('_prefix_idx'));
  assert.equal(prefix.length, 6);
  assert.deepEqual(dropped, prefix.filter(i => i.table_name === 'Person').map(i => i.name).sort());
  assert.deepEqual([...drift.matchAll(/CREATE INDEX "([^"]+)"/g)].map(m => m[1]).sort(), prefix.map(i => i.name).sort());
  assert(prefix.every(i => i.definition.includes('varchar_pattern_ops') && i.valid));
  assert.equal((drift.match(/CREATE INDEX/g) ?? []).length, 6);
  assert(!/ALTER TABLE|CREATE TABLE|DROP TABLE|ALTER TYPE/.test(drift));
  cases.push({ name: 'Schema/database diff contains only the six documented varchar_pattern_ops introspection artifacts', passed: true });
  const chainDiff = prisma('schema_review_test', ['migrate','diff','--from-migrations',path.join(root,'packages/database/prisma/migrations'),'--to-schema-datasource',schema,'--shadow-database-url',url('schema_shadow_test'),'--script','--exit-code']);
  fs.writeFileSync(path.join(evidence,'diff-migrations.sql'), chainDiff);
  cases.push({ name: 'Replayed migration chain has no Prisma drift against upgraded database', passed: true });
  prisma('schema_review_test', ['validate','--schema',schema]);
  cases.push({ name: 'Prisma 6.19.3 schema validation succeeds', passed: true });
  const migrations = await upgraded.$queryRaw<any[]>`SELECT migration_name, checksum, finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back FROM _prisma_migrations ORDER BY migration_name`;
  for (const entry of migrations) {
    assert(entry.finished && !entry.rolled_back);
    assert.equal(entry.checksum, createHash('sha256').update(fs.readFileSync(path.join(root,'packages/database/prisma/migrations',entry.migration_name,'migration.sql'))).digest('hex'));
  }
  write('resultats-schema.json', { date: new Date().toISOString(), completed: true, prisma: '6.19.3', server: await upgraded.$queryRaw`SELECT version()`, schemaSha256: createHash('sha256').update(fs.readFileSync(schema)).digest('hex'), schemaLines: fs.readFileSync(schema,'utf8').trimEnd().split(/\r?\n/).length, migrationCount: migrations.length, counts: Object.fromEntries(Object.entries(after).map(([key, values]) => [key, values.length])), migrations, scenarios: cases });
  console.log(JSON.stringify({ completed: true, migrations: migrations.length, cases: cases.length, counts: Object.fromEntries(Object.entries(after).map(([key, values]) => [key, values.length])) }));
} catch (error) {
  write('resultats-schema.json', { date: new Date().toISOString(), completed: false, scenarios: cases, error: String(error).replaceAll(source.password, '[redacted]') });
  throw error;
} finally {
  await Promise.all(clients.map(db => db.$disconnect()));
}
