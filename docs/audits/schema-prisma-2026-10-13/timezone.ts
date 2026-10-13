import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const work = fs.readFileSync(path.join(os.tmpdir(),'noctambule-schema-prisma-current.txt'),'utf8').replace(/^\uFEFF/,'').trim();
const config = JSON.parse(fs.readFileSync(path.join(work,'env.json'),'utf8').replace(/^\uFEFF/,''));
const url = new URL(config.DATABASE_URL);
assert.equal(url.hostname,'127.0.0.1'); assert.equal(url.port,'54664');
url.pathname = '/schema_clean_test';
const control = new PrismaClient({datasourceUrl:url.toString()});
let db: PrismaClient | undefined;
try {
  await control.$executeRawUnsafe(`ALTER DATABASE schema_clean_test SET timezone TO 'Europe/Paris'`);
  db = new PrismaClient({datasourceUrl:url.toString()});
  const session = await db.$queryRaw`SELECT current_setting('TimeZone') AS timezone, CURRENT_TIMESTAMP::text AS now`;
  const start = Date.now();
  const row = await db.rateLimit.create({data:{key:'schema:timezone-probe'}});
  const end = Date.now();
  const result = {date:new Date().toISOString(),databaseDefaultTimezone:'Europe/Paris',session,createdAt:row.createdAt.toISOString(),firstAttempt:row.firstAttempt.toISOString(),updatedAt:row.updatedAt.toISOString(),offsetMs:row.createdAt.getTime()-end,createdAtUsesUtcInstant:row.createdAt.getTime()>=start-1000&&row.createdAt.getTime()<=end+1000};
  fs.writeFileSync(path.join(import.meta.dirname,'preuves/fuseau.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
  await db.rateLimit.delete({where:{id:row.id}});
} finally {
  await control.$executeRawUnsafe(`ALTER DATABASE schema_clean_test RESET timezone`);
  await db?.$disconnect(); await control.$disconnect();
}
