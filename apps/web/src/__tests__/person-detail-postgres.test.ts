import { createHash, randomUUID } from 'node:crypto';

import { type Prisma, PrismaClient, type User } from '@prisma/client';
import { NextRequest } from 'next/server';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  DELETE as deleteEmail,
  PATCH as updateEmail,
} from '$app/api/personnes/[id]/emails/[emailId]/route';
import { POST as addEmail } from '$app/api/personnes/[id]/emails/route';
import {
  DELETE as deleteSocial,
  PATCH as updateSocial,
} from '$app/api/personnes/[id]/reseaux-sociaux/[profileId]/route';
import { POST as addSocial } from '$app/api/personnes/[id]/reseaux-sociaux/route';
import { DELETE, GET, PATCH } from '$app/api/personnes/[id]/route';
import {
  DELETE as deletePhone,
  PATCH as updatePhone,
} from '$app/api/personnes/[id]/telephones/[phoneId]/route';
import { POST as addPhone } from '$app/api/personnes/[id]/telephones/route';
import { GET as listPeople, POST as create } from '$app/api/personnes/route';
import { PERMISSIONS } from '$constants/permissions.constants';
import type {
  PersonDetail,
  PersonMutationResponse,
} from '$features/persons/types/person.types';
import { encryptTotpSecret, generateTotpSecret } from '$server/mfa';

const connection = vi.hoisted(() => ({
  beforeAuditRead: null as (() => Promise<void>) | null,
  client: null as PrismaClient | null,
  cookies: new Map<string, string>(),
}));
vi.mock('server-only', () => ({}));
vi.mock('$env', () => ({
  env: {
    AUDIT_ENCRYPTION_CURRENT_VERSION: 1,
    NODE_ENV: 'test',
  },
}));
// Read from the process environment at use (key rotation, REV-10).
vi.stubEnv('MFA_ENCRYPTION_KEY_V1', Buffer.alloc(32, 13).toString('base64'));
vi.mock('$server/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));
vi.mock('$server/prisma', () => ({
  prisma: new Proxy(
    {},
    {
      get: (_target, key): unknown => {
        if (!connection.client)
          throw new Error('Isolated person detail database not initialized');
        const value: unknown = Reflect.get(connection.client, key);

        return typeof value === 'function'
          ? value.bind(connection.client)
          : value;
      },
    },
  ),
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    delete: (name: string): void => {
      connection.cookies.delete(name);
    },
    get: (name: string): { value: string } | undefined => {
      const value = connection.cookies.get(name);

      return value === undefined ? undefined : { value };
    },
    set: (name: string, value: string): void => {
      connection.cookies.set(name, value);
    },
  })),
  headers: vi.fn(async () => new Headers()),
}));

const target = process.env.PERSON_DETAIL_TEST_DATABASE_URL;
type Context = {
  params: Promise<{
    emailId: string;
    id: string;
    phoneId: string;
    profileId: string;
  }>;
};
type ChildRoute = (request: NextRequest, context: Context) => Promise<Response>;
type Family = {
  add: ChildRoute;
  cap: number;
  key: 'emails' | 'phones' | 'socialProfiles';
  remove: ChildRoute;
  update: ChildRoute;
  value: (index: number) => Record<string, unknown>;
};
const families: Family[] = [
  {
    add: addEmail,
    cap: 10,
    key: 'emails',
    remove: deleteEmail,
    update: updateEmail,
    value: (index) => ({
      email: `contact${index}@example.test`,
      label: 'Personnel',
    }),
  },
  {
    add: addPhone,
    cap: 10,
    key: 'phones',
    remove: deletePhone,
    update: updatePhone,
    value: (index) => ({
      countryCode: 'FR',
      label: 'Mobile',
      phone: `061234${String(index).padStart(4, '0')}`,
    }),
  },
  {
    add: addSocial,
    cap: 20,
    key: 'socialProfiles',
    remove: deleteSocial,
    update: updateSocial,
    value: (index) => ({
      identifier: `contact${index}`,
      label: 'Personnel',
      networkKey: 'discord',
      profileUrl: null,
    }),
  },
];
const context = (id: string, childId = ''): Context => ({
  params: Promise.resolve({
    emailId: childId,
    id,
    phoneId: childId,
    profileId: childId,
  }),
});
const request = (
  body?: unknown,
  method = 'PATCH',
  suffix = '',
  operation?: string,
): NextRequest =>
  new NextRequest(`http://localhost/api/personnes/${suffix}`, {
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    headers: operation ? { 'Idempotency-Key': operation } : {},
    method,
  });
const mutation = async (
  response: Response,
  status = 200,
): Promise<PersonMutationResponse> => {
  const payload = await response.json();
  expect({ body: payload.error, status: response.status }).toEqual({
    body: undefined,
    status,
  });
  expect(response.headers.get('Cache-Control')).toContain('no-store');

  return payload.data as PersonMutationResponse;
};

describe.skipIf(!target)('person detail on fully migrated PostgreSQL', () => {
  let db: PrismaClient;
  const signIn = async (
    overrides: Partial<Prisma.UserCreateInput> = {},
    { passwordProof = true }: { passwordProof?: boolean } = {},
  ): Promise<User> => {
    const existingRoot = overrides.isProtected
      ? await db.user.findFirst({ where: { isProtected: true } })
      : null;
    const user =
      existingRoot ??
      (await db.user.create({
        data: {
          firstName: 'Fiche fictive',
          loginName: 'detail.' + randomUUID().replaceAll('-', '').slice(0, 20),
          mfaEnabledAt: new Date(),
          passwordHash: 'unused-password-fixture',
          permissions: {
            [PERMISSIONS.PERSONS.CREATE]: true,
            [PERMISSIONS.PERSONS.VIEW_CONTACT]: true,
            [PERMISSIONS.PERSONS.UPDATE_CONTACT]: true,
            [PERMISSIONS.PERSONS.DELETE]: true,
            [PERMISSIONS.PERSONS.UPDATE]: true,
            [PERMISSIONS.PERSONS.VIEW]: true,
          },
          ...overrides,
        },
      }));
    await db.totpCredential.upsert({
      create: {
        ...encryptTotpSecret(generateTotpSecret(), user.id),
        userId: user.id,
      },
      update: {},
      where: { userId: user.id },
    });
    const token = randomUUID();
    await db.session.create({
      data: {
        expiresAt: new Date(Date.now() + 3600_000),
        idleExpiresAt: new Date(Date.now() + 1800_000),
        mfaMethod: 'TOTP',
        mfaVerifiedAt: new Date(),
        // Deleting a record requires a recent password (audit DRT-06).
        passwordReauthenticatedAt: passwordProof ? new Date() : null,
        securityVersion: user.securityVersion,
        token: createHash('sha256').update(token).digest('hex'),
        userId: user.id,
      },
    });
    connection.cookies.set('session', token);

    return user;
  };
  const fixture = async (
    extra: Record<string, unknown> = {},
  ): Promise<PersonDetail> =>
    (
      await mutation(
        await create(
          request({ nickname: 'Fiche ' + randomUUID(), ...extra }, 'POST'),
        ),
        201,
      )
    ).person;
  const identity = (
    person: PersonDetail,
    extra: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    birthDate: person.birthDate,
    firstName: person.firstName,
    lastName: person.lastName,
    nickname: person.nickname,
    structureStatus: person.structureStatus,
    version: person.version,
    ...extra,
  });
  const read = async (id: string): Promise<PersonDetail> => {
    const response = await GET(request(undefined, 'GET'), context(id));
    expect(response.status).toBe(200);

    return (await response.json()).data as PersonDetail;
  };
  const auditCount = (id: string): Promise<number> =>
    db.auditLog.count({ where: { entityId: id, entityType: 'PERSON' } });
  const withAuditFailure = async (
    userId: string,
    table: 'AuditLog' | 'AuditFieldChange',
    run: () => Promise<void>,
  ): Promise<void> => {
    if (!/^[a-z0-9]+$/.test(userId))
      throw new Error('Unexpected fixture identifier');
    const name = 'person_detail_failure_' + randomUUID().replaceAll('-', '');
    const predicate =
      table === 'AuditLog'
        ? `NEW."userId" = '${userId}' AND NEW.action IN ('PERSON_UPDATE', 'PERSON_DELETE')`
        : `EXISTS (SELECT 1 FROM "AuditLog" WHERE id = NEW."auditLogId" AND "userId" = '${userId}' AND action = 'PERSON_UPDATE')`;
    await db.$executeRawUnsafe(
      `CREATE FUNCTION "${name}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF ${predicate} THEN RAISE EXCEPTION 'Injected person detail audit failure'; END IF; RETURN NEW; END; $$`,
    );
    try {
      await db.$executeRawUnsafe(
        `CREATE TRIGGER "${name}" BEFORE INSERT ON "${table}" FOR EACH ROW EXECUTE FUNCTION "${name}"()`,
      );
      await run();
    } finally {
      await db.$executeRawUnsafe(
        `DROP TRIGGER IF EXISTS "${name}" ON "${table}"`,
      );
      await db.$executeRawUnsafe(`DROP FUNCTION "${name}"()`);
    }
  };

  beforeAll(async () => {
    if (!target) throw new Error('Missing isolated person detail database');
    const url = new URL(target);
    if (
      !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      url.pathname !== '/person_detail_service_test'
    ) {
      throw new Error('Only local person_detail_service_test is allowed');
    }
    db = new PrismaClient({ datasourceUrl: target });
    connection.client = db;
    const migrations = await db.$queryRaw<
      Array<{ count: number }>
    >`SELECT COUNT(*)::integer AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
    expect(migrations[0]?.count).toBeGreaterThanOrEqual(52);
    vi.stubEnv('AUDIT_ENCRYPTION_CURRENT_VERSION', '1');
    vi.stubEnv(
      'AUDIT_ENCRYPTION_KEY_V1',
      Buffer.alloc(32, 17).toString('base64'),
    );
  });
  beforeEach(() => {
    connection.beforeAuditRead = null;
    connection.client = db;
    connection.cookies.clear();
  });
  afterAll(async () => {
    await db?.$disconnect();
    connection.client = null;
    vi.unstubAllEnvs();
  });

  it('denies anonymous detail, mutation and deletion', async () => {
    const responses = await Promise.all([
      GET(request(undefined, 'GET'), context('unknown')),
      PATCH(request({}), context('unknown')),
      DELETE(request({}, 'DELETE', '', randomUUID()), context('unknown')),
    ]);
    expect(responses.map((response) => response.status)).toEqual([
      401, 401, 401,
    ]);
  });

  it('masks the root author in detail and list while retaining the stored snapshot', async () => {
    const root = await signIn({
      firstName: 'PrivateRootMarker',
      isProtected: true,
      role: 'ADMIN',
    });
    const person = await fixture({ emails: [families[0]?.value(8)] });
    expect(person.lastChange?.actor.loginName).toBe(root.loginName);
    await signIn({
      permissions: {
        [PERMISSIONS.PERSONS.VIEW]: true,
      },
    });
    const detail = await read(person.id);
    expect(detail.lastChange?.actor).toEqual({
      displayName: 'Superadmin',
      loginName: null,
    });
    expect(detail.emails).toEqual([]);
    const list = await listPeople(
      new NextRequest(
        'http://localhost/api/personnes?q=' +
          encodeURIComponent(person.nickname ?? ''),
      ),
    );
    const listed = (await list.json()).data;
    expect(JSON.stringify(listed)).not.toContain(root.loginName);
    expect(JSON.stringify(listed)).not.toContain(root.firstName);
    expect(listed.overview.noContacts).toBeNull();
    expect(listed.items[0].lastModifiedBy).toEqual({
      displayName: 'Superadmin',
      loginName: null,
    });
    const stored = await db.auditLog.findFirstOrThrow({
      where: { entityId: person.id, entityType: 'PERSON' },
    });
    expect(stored.actorLoginNameSnapshot).toBe(root.loginName);
    expect(stored.actorDisplayNameSnapshot).toContain(root.firstName);
  });

  it('separates identity writes and coordinate writes', async () => {
    await signIn();
    const person = await fixture({ emails: [families[0]?.value(9)] });
    await signIn({
      permissions: {
        [PERMISSIONS.PERSONS.VIEW]: true,
        [PERMISSIONS.PERSONS.UPDATE]: true,
      },
    });
    const changed = (
      await mutation(
        await PATCH(
          request(identity(person, { nickname: 'Identity only' })),
          context(person.id),
        ),
      )
    ).person;
    expect(changed.emails).toEqual([]);
    expect(
      (
        await addEmail(
          request(
            { email: 'forbidden@example.test', version: changed.version },
            'POST',
          ),
          context(person.id),
        )
      ).status,
    ).toBe(403);
    const searched = await listPeople(
      new NextRequest(
        'http://localhost/api/personnes?q=' +
          encodeURIComponent(person.emails[0]?.email ?? ''),
      ),
    );
    expect((await searched.json()).data.items).toHaveLength(0);
    expect(
      (
        await listPeople(
          new NextRequest('http://localhost/api/personnes?contacts=missing'),
        )
      ).status,
    ).toBe(403);
    await signIn({
      permissions: {
        [PERMISSIONS.PERSONS.VIEW]: true,
        [PERMISSIONS.PERSONS.VIEW_CONTACT]: true,
        [PERMISSIONS.PERSONS.UPDATE_CONTACT]: true,
      },
    });
    expect(
      (
        await PATCH(
          request(identity(changed, { nickname: 'Not permitted' })),
          context(person.id),
        )
      ).status,
    ).toBe(403);
    const result = await mutation(
      await addEmail(
        request(
          {
            email: 'allowed@example.test',
            label: 'Personnel',
            personVersion: changed.version,
          },
          'POST',
        ),
        context(person.id),
      ),
      201,
    );
    expect(
      result.person.emails.some(
        (email) => email.email === 'allowed@example.test',
      ),
    ).toBe(true);
  });

  it('refuses initial coordinates for a creator without contact write authority', async () => {
    await signIn({
      permissions: {
        [PERMISSIONS.PERSONS.VIEW]: true,
        [PERMISSIONS.PERSONS.CREATE]: true,
      },
    });
    const response = await create(
      request(
        {
          emails: [families[0]?.value(10)],
          nickname: 'Refused initial contact',
        },
        'POST',
      ),
    );
    expect(response.status).toBe(403);
    expect(
      await db.person.count({ where: { nickname: 'Refused initial contact' } }),
    ).toBe(0);
  });

  it.each(
    ['create', 'identity', 'delete', 'email', 'phone', 'social'].flatMap(
      (action) =>
        ['permission', 'session'].map((revoked) => ({ action, revoked })),
    ),
  )(
    'rechecks authority after request preparation ($action / $revoked)',
    async ({ action, revoked }) => {
      const actor = await signIn();
      const person = await fixture();
      const beforeAudits = await auditCount(person.id);
      const nickname = 'Refused ' + randomUUID();
      const payload =
        action === 'create'
          ? { nickname }
          : action === 'identity'
            ? identity(person, { nickname })
            : action === 'delete'
              ? { version: person.version }
              : action === 'email'
                ? {
                    email: 'refused@example.test',
                    label: 'Personnel',
                    personVersion: person.version,
                  }
                : action === 'phone'
                  ? {
                      countryCode: 'FR',
                      label: 'Mobile',
                      personVersion: person.version,
                      phone: '0612345678',
                    }
                  : {
                      identifier: 'refused',
                      label: 'Personnel',
                      networkKey: 'discord',
                      personVersion: person.version,
                    };
      const pendingRequest = request(
        payload,
        action === 'delete'
          ? 'DELETE'
          : action === 'identity'
            ? 'PATCH'
            : 'POST',
        '',
        randomUUID(),
      );
      const stream = pendingRequest.body;
      if (!stream) throw new Error('The test requires a JSON body');
      const reader = stream.getReader();
      const readChunk = reader.read.bind(reader);
      vi.spyOn(stream, 'getReader').mockReturnValue(reader);
      const revoke = vi
        .spyOn(reader, 'read')
        .mockImplementationOnce(async () => {
          if (revoked === 'session') {
            await db.session.deleteMany({ where: { userId: actor.id } });
          } else {
            await db.user.update({
              data: { permissions: { [PERMISSIONS.PERSONS.VIEW]: true } },
              where: { id: actor.id },
            });
          }

          return readChunk();
        });
      const response =
        action === 'create'
          ? await create(pendingRequest)
          : action === 'identity'
            ? await PATCH(pendingRequest, context(person.id))
            : action === 'delete'
              ? await DELETE(pendingRequest, context(person.id))
              : action === 'email'
                ? await addEmail(pendingRequest, context(person.id))
                : action === 'phone'
                  ? await addPhone(pendingRequest, context(person.id))
                  : await addSocial(pendingRequest, context(person.id));
      expect(revoke).toHaveBeenCalled();
      expect(response.status).toBe(revoked === 'session' ? 401 : 403);
      expect(
        await db.person.findUnique({ where: { id: person.id } }),
      ).toMatchObject({ nickname: person.nickname, version: person.version });
      expect(await db.person.count({ where: { nickname } })).toBe(0);
      expect(await auditCount(person.id)).toBe(beforeAudits);
      expect(
        await db.personEmail.count({ where: { personId: person.id } }),
      ).toBe(0);
      expect(
        await db.personPhone.count({ where: { personId: person.id } }),
      ).toBe(0);
      expect(
        await db.personSocialProfile.count({ where: { personId: person.id } }),
      ).toBe(0);
      expect(
        await db.personDeletionTombstone.count({
          where: { personId: person.id },
        }),
      ).toBe(0);
    },
  );

  it('rejects a source expiring while a real person lock blocks the mutation', async () => {
    const actor = await signIn();
    const person = await fixture();
    let release!: () => void;
    let ready!: () => void;
    const acquired = new Promise<void>((resolve) => {
      ready = resolve;
    });
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const blocker = db.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT "id" FROM "Person" WHERE "id" = ${person.id} FOR UPDATE`;
      ready();
      await hold;
    });
    await acquired;
    const expiresAt = new Date(Date.now() + 700);
    await db.session.updateMany({
      data: { expiresAt },
      where: { userId: actor.id },
    });
    let pending: Promise<Response> | undefined;
    try {
      pending = PATCH(
        request(identity(person, { nickname: 'Forbidden after lock' })),
        context(person.id),
      );
      const deadline = Date.now() + 2_000;
      let waiting = false;
      while (Date.now() < deadline) {
        const rows = await db.$queryRaw<Array<{ waiting: boolean }>>`
          SELECT EXISTS (
            SELECT 1 FROM pg_stat_activity
            WHERE datname = current_database() AND wait_event_type = 'Lock'
              AND query LIKE '%Person%' AND pid <> pg_backend_pid()
          ) AS waiting
        `;
        if (rows[0]?.waiting) {
          waiting = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(waiting).toBe(true);
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(0, expiresAt.getTime() - Date.now() + 30)),
      );
    } finally {
      release();
      await blocker;
    }
    expect((await pending)?.status).toBe(401);
    expect(
      await db.person.findUnique({ where: { id: person.id } }),
    ).toMatchObject({ nickname: person.nickname, version: person.version });
    expect(await auditCount(person.id)).toBe(1);
  });

  it('allows a view-only projection but denies all mutations and field values', async () => {
    const actor = await signIn();
    const person = await fixture({
      birthDate: '2000-02-29',
      emails: [families[0]?.value(1)],
    });
    await db.user.update({
      data: { permissions: { [PERMISSIONS.PERSONS.VIEW]: true } },
      where: { id: actor.id },
    });
    const result = await read(person.id);
    expect(result).toMatchObject({
      birthDate: '2000-02-29',
      id: person.id,
      version: 1,
    });
    expect(result.emails).toEqual([]);
    expect(result.phones).toEqual([]);
    expect(result.socialProfiles).toEqual([]);
    expect(result).not.toHaveProperty('normalizedNickname');
    expect(result.lastChange?.actor.loginName).toBe(actor.loginName);
    for (const family of families) {
      for (const route of [family.add, family.update, family.remove]) {
        expect((await route(request({}), context(person.id))).status).toBe(403);
      }
    }
    expect(
      (await PATCH(request(identity(person)), context(person.id))).status,
    ).toBe(403);
    expect(
      (
        await DELETE(
          request({ version: 1 }, 'DELETE', '', randomUUID()),
          context(person.id),
        )
      ).status,
    ).toBe(403);
  });

  it('requires current view permission even with mutation overrides', async () => {
    const actor = await signIn();
    const person = await fixture();
    await db.user.update({
      data: {
        permissions: {
          [PERMISSIONS.PERSONS.DELETE]: true,
          [PERMISSIONS.PERSONS.UPDATE]: true,
          [PERMISSIONS.PERSONS.VIEW]: false,
        },
      },
      where: { id: actor.id },
    });
    expect(
      (await GET(request(undefined, 'GET'), context(person.id))).status,
    ).toBe(403);
    expect(
      (await PATCH(request(identity(person)), context(person.id))).status,
    ).toBe(403);
    expect(
      (
        await DELETE(
          request({ version: 1 }, 'DELETE', '', randomUUID()),
          context(person.id),
        )
      ).status,
    ).toBe(403);
    expect(await auditCount(person.id)).toBe(1);
  });

  it('clears optional names, audits exact values and leaves a no-op unchanged', async () => {
    await signIn();
    const person = await fixture({ firstName: 'Ada', lastName: 'Lovelace' });
    const updated = (
      await mutation(
        await PATCH(
          request(identity(person, { firstName: '', lastName: '' })),
          context(person.id),
        ),
      )
    ).person;
    expect(updated).toMatchObject({
      firstName: null,
      lastName: null,
      version: 2,
    });
    const noOp = (
      await mutation(
        await PATCH(request(identity(updated)), context(person.id)),
      )
    ).person;
    expect(noOp).toMatchObject({ updatedAt: updated.updatedAt, version: 2 });
    expect(await auditCount(person.id)).toBe(2);
  });

  it('rejects missing, stale and future identity versions plus unknown payload keys', async () => {
    await signIn();
    const person = await fixture();
    for (const version of [undefined, 0, -1, 1.5]) {
      expect(
        (
          await PATCH(
            request(identity(person, { version })),
            context(person.id),
          )
        ).status,
      ).toBe(400);
    }
    expect(
      (
        await PATCH(
          request(identity(person, { unexpected: 'ignored?' })),
          context(person.id),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await PATCH(
          request(identity(person, { version: 2 })),
          context(person.id),
        )
      ).status,
    ).toBe(409);
    await mutation(
      await PATCH(
        request(identity(person, { nickname: 'Nouvelle identité' })),
        context(person.id),
      ),
    );
    expect(
      (await PATCH(request(identity(person)), context(person.id))).status,
    ).toBe(409);
    expect(await auditCount(person.id)).toBe(2);
  });

  it('commits only one identity update from the same version', async () => {
    await signIn();
    const person = await fixture();
    const responses = await Promise.all(
      ['Alpha', 'Beta'].map((nickname) =>
        PATCH(request(identity(person, { nickname })), context(person.id)),
      ),
    );
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    expect((await read(person.id)).version).toBe(2);
    expect(await auditCount(person.id)).toBe(2);
  });

  it('reads the identity and its last author from the same committed snapshot', async () => {
    await signIn();
    const person = await fixture();
    let mutationCommitted = false;
    const instrumented = db.$extends({
      query: {
        auditLog: {
          // Preserve the query extension's inferred, selection-dependent result.

          async findFirst({ args, query }) {
            const beforeRead = connection.beforeAuditRead;
            connection.beforeAuditRead = null;
            await beforeRead?.();

            return query(args);
          },
        },
      },
    });
    connection.client = instrumented as unknown as PrismaClient;
    connection.beforeAuditRead = async (): Promise<void> => {
      await mutation(
        await PATCH(
          request(identity(person, { nickname: 'Concurrent writer' })),
          context(person.id),
        ),
      );
      mutationCommitted = true;
    };
    const snapshot = await read(person.id);
    expect(mutationCommitted).toBe(true);
    expect(snapshot).toEqual(person);
    const fresh = await read(person.id);
    expect(fresh).toMatchObject({ nickname: 'Concurrent writer', version: 2 });
    expect(fresh.lastChange?.action).toBe('PERSON_UPDATE');
  });

  it.each(families)(
    'keeps exactly one primary and versions every affected $key record',
    async (family) => {
      await signIn();
      let person = await fixture();
      person = (
        await mutation(
          await family.add(
            request(
              { ...family.value(1), personVersion: person.version },
              'POST',
            ),
            context(person.id),
          ),
          201,
        )
      ).person;
      person = (
        await mutation(
          await family.add(
            request(
              { ...family.value(2), personVersion: person.version },
              'POST',
            ),
            context(person.id),
          ),
          201,
        )
      ).person;
      const first = person[family.key].find((item) => item.isPrimary);
      const second = person[family.key].find((item) => !item.isPrimary);
      if (!first || !second) throw new Error('Missing contact fixture');
      person = (
        await mutation(
          await family.update(
            request({
              ...family.value(2),
              isPrimary: true,
              personVersion: person.version,
              version: second.version,
            }),
            context(person.id, second.id),
          ),
        )
      ).person;
      expect(
        person[family.key]
          .filter((item) => item.isPrimary)
          .map((item) => item.id),
      ).toEqual([second.id]);
      expect(person[family.key].map((item) => item.version)).toEqual([2, 2]);
      expect(
        (
          await family.remove(
            request({ personVersion: person.version, version: 2 }, 'DELETE'),
            context(person.id, second.id),
          )
        ).status,
      ).toBe(409);
      person = (
        await mutation(
          await family.remove(
            request(
              {
                personVersion: person.version,
                replacementPrimaryId: first.id,
                version: 2,
              },
              'DELETE',
            ),
            context(person.id, second.id),
          ),
        )
      ).person;
      expect(person[family.key]).toHaveLength(1);
      expect(person[family.key][0]).toMatchObject({
        id: first.id,
        isPrimary: true,
        version: 3,
      });
      expect(person.version).toBe(5);
      expect(await auditCount(person.id)).toBe(5);
    },
  );

  it.each(families)(
    'rejects foreign children and obsolete child/parent versions for $key',
    async (family) => {
      await signIn();
      const own = await fixture({ [family.key]: [family.value(1)] });
      const foreign = await fixture({ [family.key]: [family.value(2)] });
      const child = own[family.key][0];
      const foreignChild = foreign[family.key][0];
      if (!child || !foreignChild) throw new Error('Missing contact fixture');
      const input = { ...family.value(3), personVersion: 1, version: 1 };
      expect(
        (await family.update(request(input), context(own.id, foreignChild.id)))
          .status,
      ).toBe(404);
      expect(
        (
          await family.remove(
            request({ personVersion: 1, version: 1 }, 'DELETE'),
            context(own.id, foreignChild.id),
          )
        ).status,
      ).toBe(404);
      for (const versions of [
        { personVersion: 2, version: 1 },
        { personVersion: 1, version: 2 },
      ]) {
        expect(
          (
            await family.update(
              request({ ...input, ...versions }),
              context(own.id, child.id),
            )
          ).status,
        ).toBe(409);
      }
      expect(await auditCount(own.id)).toBe(1);
      expect((await read(foreign.id)).version).toBe(1);
    },
  );

  it.each(families)(
    'enforces the $key capacity when two additions race',
    async (family) => {
      await signIn();
      const person = await fixture({
        [family.key]: Array.from({ length: family.cap - 1 }, (_, index) =>
          family.value(index),
        ),
      });
      const responses = await Promise.all(
        [family.cap, family.cap + 1].map((index) =>
          family.add(
            request({ ...family.value(index), personVersion: 1 }, 'POST'),
            context(person.id),
          ),
        ),
      );
      expect(responses.map((response) => response.status).sort()).toEqual([
        201, 409,
      ]);
      const updated = await read(person.id);
      expect(updated[family.key]).toHaveLength(family.cap);
      expect(updated[family.key].filter((item) => item.isPrimary)).toHaveLength(
        1,
      );
      expect(
        (
          await family.add(
            request(
              { ...family.value(99), personVersion: updated.version },
              'POST',
            ),
            context(person.id),
          )
        ).status,
      ).toBe(400);
      expect(await auditCount(person.id)).toBe(2);
    },
  );

  it.each(families)(
    'allows a shared $key value without disclosing the other person',
    async (family) => {
      await signIn();
      const other = await fixture({ [family.key]: [family.value(1)] });
      const person = await fixture();
      const result = await mutation(
        await family.add(
          request({ ...family.value(1), personVersion: 1 }, 'POST'),
          context(person.id),
        ),
        201,
      );
      expect(result.duplicateWarning).toEqual({
        duplicateFound: true,
        fields: [
          family.key === 'emails'
            ? 'email'
            : family.key === 'phones'
              ? 'phone'
              : 'identifier',
        ],
      });
      expect(JSON.stringify(result)).not.toContain(other.id);
    },
  );

  it('moves a primary social profile between networks and promotes the source replacement', async () => {
    await signIn();
    const person = await fixture({
      socialProfiles: [
        { identifier: 'discord-a', label: 'Personnel', networkKey: 'discord' },
        { identifier: 'discord-b', label: 'Personnel', networkKey: 'discord' },
        { identifier: 'insta-a', label: 'Personnel', networkKey: 'instagram' },
      ],
    });
    const source = person.socialProfiles.find(
      (profile) => profile.networkKey === 'discord' && profile.isPrimary,
    );
    if (!source) throw new Error('Missing social fixture');
    const updated = (
      await mutation(
        await updateSocial(
          request({
            identifier: 'insta-b',
            isPrimary: true,
            label: 'Professionnel',
            networkKey: 'instagram',
            personVersion: 1,
            profileUrl: null,
            version: source.version,
          }),
          context(person.id, source.id),
        ),
      )
    ).person;
    expect(
      updated.socialProfiles
        .filter((profile) => profile.isPrimary)
        .map((profile) => profile.networkKey)
        .sort(),
    ).toEqual(['discord', 'instagram']);
    expect(
      updated.socialProfiles.every((profile) => profile.version === 2),
    ).toBe(true);
  });

  it('keeps changed field values encrypted in storage', async () => {
    await signIn();
    let person = await fixture();
    for (const nickname of ['Premier', 'Deuxième', 'Troisième', 'Quatrième']) {
      person = (
        await mutation(
          await PATCH(
            request(identity(person, { nickname })),
            context(person.id),
          ),
        )
      ).person;
    }
    const stored = await db.auditFieldChange.findMany({
      where: { entityId: person.id, fieldKey: 'nickname' },
    });
    expect(
      stored.every(
        (change) =>
          change.valueMode === 'ENCRYPTED' &&
          change.beforeValue === null &&
          change.afterValue === null &&
          change.valuesCiphertext !== null,
      ),
    ).toBe(true);
  });

  it.each(['AuditLog', 'AuditFieldChange'] as const)(
    'rolls back identity and primary changes when %s fails',
    async (table) => {
      const actor = await signIn();
      const person = await fixture({
        emails: [{ email: 'before@example.test', label: 'Personnel' }],
      });
      await withAuditFailure(actor.id, table, async () => {
        expect(
          (
            await PATCH(
              request(identity(person, { nickname: 'Must roll back' })),
              context(person.id),
            )
          ).status,
        ).toBe(500);
        expect(
          (
            await addEmail(
              request(
                {
                  email: 'rollback@example.test',
                  isPrimary: true,
                  label: 'Professionnel',
                  personVersion: 1,
                },
                'POST',
              ),
              context(person.id),
            )
          ).status,
        ).toBe(500);
      });
      expect(await read(person.id)).toEqual(person);
      expect(await auditCount(person.id)).toBe(1);
    },
  );

  it('refuses a deletion without a recent password and deletes nothing', async () => {
    await signIn({}, { passwordProof: false });
    const person = await fixture();
    const response = await DELETE(
      request({ version: person.version }, 'DELETE', '', randomUUID()),
      context(person.id),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe(
      'PASSWORD_REAUTHENTICATION_REQUIRED',
    );
    expect(await read(person.id)).toEqual(person);
  });

  it('deletes the person and children, purges field values, keeps a minimal audit and replays safely', async () => {
    await signIn();
    const person = await fixture({
      emails: [families[0]?.value(1)],
      phones: [families[1]?.value(1)],
      socialProfiles: [families[2]?.value(1)],
    });
    const operation = randomUUID();
    expect(
      (
        await DELETE(
          request({ version: 2 }, 'DELETE', '', operation),
          context(person.id),
        )
      ).status,
    ).toBe(409);
    expect(
      await db.auditFieldChange.count({ where: { entityId: person.id } }),
    ).toBeGreaterThan(0);
    const responses = await Promise.all(
      [1, 2].map(() =>
        DELETE(
          request({ version: 1 }, 'DELETE', '', operation),
          context(person.id),
        ),
      ),
    );
    expect(responses.map((response) => response.status)).toEqual([204, 204]);
    expect(await db.person.findUnique({ where: { id: person.id } })).toBeNull();
    expect(await db.personEmail.count({ where: { personId: person.id } })).toBe(
      0,
    );
    expect(await db.personPhone.count({ where: { personId: person.id } })).toBe(
      0,
    );
    expect(
      await db.personSocialProfile.count({ where: { personId: person.id } }),
    ).toBe(0);
    expect(
      await db.auditFieldChange.count({ where: { entityId: person.id } }),
    ).toBe(0);
    expect(
      await db.auditLog.count({
        where: { action: 'PERSON_DELETE', entityId: person.id },
      }),
    ).toBe(1);
    const audit = await db.auditLog.findFirstOrThrow({
      where: { action: 'PERSON_DELETE', entityId: person.id },
    });
    expect(JSON.stringify(audit)).not.toContain(person.nickname);
    expect(
      await db.personDeletionTombstone.findUnique({
        where: { personId: person.id },
      }),
    ).toMatchObject({ deletionOperationId: operation });
    expect(
      (await GET(request(undefined, 'GET'), context(person.id))).status,
    ).toBe(404);
  });

  it('rolls back deletion, field purge and tombstone when the deletion audit fails', async () => {
    const actor = await signIn();
    const person = await fixture({ emails: [families[0]?.value(1)] });
    const fieldCount = await db.auditFieldChange.count({
      where: { entityId: person.id },
    });
    await withAuditFailure(actor.id, 'AuditLog', async () => {
      expect(
        (
          await DELETE(
            request({ version: 1 }, 'DELETE', '', randomUUID()),
            context(person.id),
          )
        ).status,
      ).toBe(500);
    });
    expect(await read(person.id)).toEqual(person);
    expect(
      await db.auditFieldChange.count({ where: { entityId: person.id } }),
    ).toBe(fieldCount);
    expect(
      await db.personDeletionTombstone.findUnique({
        where: { personId: person.id },
      }),
    ).toBeNull();
  });

  it('refuses a deletion operation key reused for another person without deleting that person', async () => {
    await signIn();
    const first = await fixture();
    const second = await fixture();
    const operation = randomUUID();
    expect(
      (
        await DELETE(
          request({ version: 1 }, 'DELETE', '', operation),
          context(first.id),
        )
      ).status,
    ).toBe(204);
    expect(
      (
        await DELETE(
          request({ version: 1 }, 'DELETE', '', operation),
          context(second.id),
        )
      ).status,
    ).toBe(409);
    expect(await read(second.id)).toEqual(second);
    expect(await auditCount(second.id)).toBe(1);
    expect(
      await db.auditFieldChange.count({ where: { entityId: second.id } }),
    ).toBeGreaterThan(0);
  });
});
