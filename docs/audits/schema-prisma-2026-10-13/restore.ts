import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createCipheriv, createHash, generateKeyPairSync, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { createDatabaseBackup } from '../../../packages/database/scripts/database-backup.ts';
import { DATABASE_BACKUP_TABLES } from '../../../packages/database/scripts/database-backup-format.ts';

const root = path.resolve(import.meta.dirname, '../../..');
const work = fs.readFileSync(path.join(os.tmpdir(), 'noctambule-schema-prisma-current.txt'), 'utf8').replace(/^\uFEFF/, '').trim();
const config = JSON.parse(fs.readFileSync(path.join(work, 'env.json'), 'utf8').replace(/^\uFEFF/, ''));
const sourceUrl = new URL(config.DATABASE_URL);
assert.equal(sourceUrl.hostname, '127.0.0.1');
assert.equal(sourceUrl.port, '54664');
assert.equal(sourceUrl.pathname, '/schema_review_test');
const targetUrl = new URL(sourceUrl); targetUrl.pathname = '/schema_restore_test';
const source = new PrismaClient({ datasourceUrl: sourceUrl.toString() });
const target = new PrismaClient({ datasourceUrl: targetUrl.toString() });
const cases: { name: string; passed: boolean }[] = [];
const out = path.join(import.meta.dirname, 'preuves/resultats-restauration.json');
let backupPaths: string[] = [];
let expectedCounts: Record<string, number> = {};

function encrypt(clear: string, key: string, aad: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key,'base64'),iv);
  cipher.setAAD(Buffer.from(aad,'utf8'));
  return { iv, ciphertext: Buffer.concat([cipher.update(clear,'utf8'),cipher.final()]), tag: cipher.getAuthTag() };
}
function seed(userId: string) {
  const e = encrypt('JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',config.MFA_ENCRYPTION_KEY_V1,`team-control:totp-secret:v1:${userId}`);
  return { secretCiphertext: e.ciphertext.toString('base64'), secretIv: e.iv.toString('base64'), secretAuthTag: e.tag.toString('base64'), secretKeyVersion: 1 };
}
async function fingerprint(db: PrismaClient) {
  const result: Record<string, { count: number; sha256: string }> = {};
  for (const {tableName,cursorColumn} of DATABASE_BACKUP_TABLES) {
    const rows = await db.$queryRawUnsafe<{json: string}[]>(`SELECT row_to_json(t)::text AS json FROM "public"."${tableName}" t ORDER BY "${cursorColumn}"`);
    const hash = createHash('sha256');
    for (const row of rows) hash.update(row.json).update('\n');
    result[tableName] = { count: rows.length, sha256: hash.digest('hex') };
  }
  return result;
}

try {
  assert.equal(await source.user.count(),0,'Use a newly migrated dedicated source');
  const before = await fingerprint(target);
  assert(Object.values(before).every(x=>x.count===0));
  const now = new Date();
  await source.$transaction(async tx => {
    await tx.systemSetting.update({where:{key:'audit.retentionDays'},data:{value:730}});
    await tx.user.create({data:{id:'schema-root',loginName:'schema.root',firstName:'Schema',lastName:'Root',passwordHash:'!synthetic-not-a-login',role:'ADMIN',isProtected:true,mfaEnabledAt:now}});
    await tx.loginNameReservation.create({data:{loginName:'schema.root',userId:'schema-root'}});
    await tx.session.create({data:{userId:'schema-root',token:createHash('sha256').update(randomBytes(32)).digest('hex'),expiresAt:new Date(Date.now()+3600000),idleExpiresAt:new Date(Date.now()+1800000),mfaVerifiedAt:now,mfaMethod:'TOTP'}});
    await tx.totpCredential.create({data:{userId:'schema-root',...seed('schema-root'),lastUsedTimeStep:192345678n,lastUsedAt:now}});
    await tx.totpEnrollment.create({data:{userId:'schema-root',...seed('schema-root'),expiresAt:new Date(Date.now()+600000)}});
    await tx.mfaRecoveryCode.create({data:{userId:'schema-root',codeHash:createHash('sha256').update(randomBytes(32)).digest('hex'),salt:randomBytes(16).toString('hex')}});
    await tx.mfaLoginChallenge.create({data:{userId:'schema-root',tokenHash:createHash('sha256').update(randomBytes(32)).digest('hex'),purpose:'LOGIN',securityVersion:0,credentialUpdatedAt:now,expiresAt:new Date(Date.now()+300000)}});
    await tx.person.create({data:{id:'schema-person',nickname:'Fixture',normalizedNickname:'fixture',sortName:'fixture',birthDate:new Date('2000-02-29T00:00:00.000Z')}});
    await tx.personEmail.create({data:{personId:'schema-person',email:'fixture@example.invalid',normalizedEmail:'fixture@example.invalid',label:'Contact',isPrimary:true}});
    await tx.personPhone.create({data:{personId:'schema-person',phone:'+33 6 00 00 00 00',normalizedPhone:'+33600000000',label:'Contact',isPrimary:true}});
    await tx.personSocialProfile.create({data:{personId:'schema-person',networkKey:'discord',identifier:'fixture',normalizedIdentifier:'fixture',label:'Contact',isPrimary:true}});
    await tx.personDeletionTombstone.create({data:{personId:'schema-deleted-person',deletionOperationId:'schema-deletion-operation'}});
    await tx.auditEncryptionKeyVersion.create({data:{version:1}});
    await tx.auditLog.create({data:{id:'schema-audit',userId:'schema-root',action:'PERSON_CREATE',category:'PERSON',stream:'IDENTITY',entityType:'PERSON',entityId:'schema-person',description:'Synthetic schema restore fixture',createdAt:now}});
    const aad = {auditLogId:'schema-audit',changeType:'CREATE',entityId:'schema-person',entityType:'PERSON',fieldKey:'birthDate',recordId:null,sectionKey:'identity'};
    const encrypted = encrypt(JSON.stringify({after:'2000-02-29',before:null}), config.AUDIT_ENCRYPTION_KEY_V1, JSON.stringify(aad));
    await tx.auditFieldChange.create({data:{...aad,changeType:'CREATE',valueMode:'ENCRYPTED',valuesCiphertext:encrypted.ciphertext,valuesIv:encrypted.iv,valuesAuthTag:encrypted.tag,valueKeyVersion:1,createdAt:now}});
    await tx.archivedStaffProfile.create({data:{id:'schema-archive',userId:'schema-root',displayName:'Synthetic archive',updatedAt:now}});
    await tx.rateLimit.create({data:{key:'schema:synthetic',count:1}});
    await tx.internalAnnouncement.create({data:{title:'Fixture',body:'Synthetic restoration fixture.',createdById:'schema-root',authorDisplayNameSnapshot:'Schema Root',authorLoginNameSnapshot:'schema.root'}});
  });
  const expected = await fingerprint(source);
  assert.equal(Object.keys(expected).length,19);
  assert(Object.values(expected).every(x=>x.count>0),'Every model must have a populated restoration fixture');
  expectedCounts = Object.fromEntries(Object.entries(expected).map(([key,value])=>[key,value.count]));
  const keys = generateKeyPairSync('ed25519');
  const signingEnv = {...process.env,...config,DATABASE_BACKUP_SIGNING_CURRENT_VERSION:'1',DATABASE_BACKUP_SIGNING_PRIVATE_KEY_V1:keys.privateKey.export({type:'pkcs8',format:'pem'}).toString(),DATABASE_BACKUP_SIGNING_PUBLIC_KEY_V1:keys.publicKey.export({type:'spki',format:'pem'}).toString()};
  const backup = await createDatabaseBackup(source,signingEnv);
  backupPaths = [backup.filePath,backup.checksumPath,backup.signaturePath];
  fs.writeFileSync(path.join(work,'backup-paths.json'),JSON.stringify(backupPaths));
  assert.deepEqual(await fingerprint(source),expected);
  const env: NodeJS.ProcessEnv = {...signingEnv,DATABASE_URL:targetUrl.toString()};
  for(const key of Object.keys(env)) if(/^DATABASE_BACKUP_SIGNING_PRIVATE_KEY_V\d+$/.test(key)) delete env[key];
  let sequence = 0;
  const invoke = (args: string[], changed: NodeJS.ProcessEnv = {}) => {
    const result = spawnSync(process.execPath,[path.join(root,'packages/database/scripts/restore-database.ts'),`--file=${backup.filePath}`,`--expected-backup-id=${backup.backupId}`,`--expected-sha256=${backup.sha256}`,...args],{cwd:root,env:{...env,...changed},encoding:'utf8',timeout:120000,windowsHide:true});
    fs.writeFileSync(path.join(work,`restore-${++sequence}.log`),result.stdout+result.stderr);
    assert.equal(result.error,undefined,'CLI failed; inspect private log');
    assert.equal(result.signal,null,'CLI interrupted; inspect private log');
    return result;
  };
  for (const [name,key,value] of [
    ['Missing MFA key','MFA_ENCRYPTION_KEY_V1',undefined],
    ['Wrong MFA key','MFA_ENCRYPTION_KEY_V1',randomBytes(32).toString('base64')],
    ['Missing audit key','AUDIT_ENCRYPTION_KEY_V1',undefined],
    ['Wrong audit key','AUDIT_ENCRYPTION_KEY_V1',randomBytes(32).toString('base64')],
  ]) {
    const result = invoke(['--confirm-empty-restore=RESTORE-INTO-EMPTY-DATABASE'],{[key!]:value});
    assert.equal(result.status,1,name+' must reject');
    assert(new RegExp(value === undefined ? key! : 'Encrypted backup value cannot be authenticated').test(result.stdout+result.stderr),'Expected cryptographic refusal');
    assert.deepEqual(await fingerprint(target),before,'Refused restoration must write nothing');
    cases.push({name:name+' rejected before writes',passed:true});
  }
  assert.equal(invoke(['--dry-run']).status,0,'Valid key dry run must succeed');
  assert.deepEqual(await fingerprint(target),before);
  cases.push({name:'Valid signed v9 dry run authenticates every ciphertext without writes',passed:true});
  assert.equal(invoke(['--confirm-empty-restore=RESTORE-INTO-EMPTY-DATABASE']).status,0,'Restore must succeed');
  assert.deepEqual(await fingerprint(target),expected);
  cases.push({name:'Valid signed v9 restore preserves every field in all 19 populated tables',passed:true});
  const repeat = invoke(['--confirm-empty-restore=RESTORE-INTO-EMPTY-DATABASE']);
  assert.equal(repeat.status,1);
  assert(/not empty/.test(repeat.stdout+repeat.stderr));
  assert.deepEqual(await fingerprint(target),expected);
  cases.push({name:'Nonempty target still refused without changes',passed:true});
  fs.writeFileSync(out,JSON.stringify({date:new Date().toISOString(),completed:true,format:9,tableCounts:expectedCounts,scenarios:cases},null,2)+'\n');
  console.log(JSON.stringify({completed:true,tables:Object.keys(expectedCounts).length,cases:cases.length}));
} catch(error) {
  fs.writeFileSync(out,JSON.stringify({date:new Date().toISOString(),completed:false,tableCounts:expectedCounts,scenarios:cases,error:String(error).replaceAll(sourceUrl.password,'[redacted]')},null,2)+'\n');
  throw error;
} finally { await source.$disconnect(); await target.$disconnect(); }
