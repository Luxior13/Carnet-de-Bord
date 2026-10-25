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

import { POST } from '$app/api/personnes/route';
import { PERMISSIONS } from '$constants/permissions.constants';
import { decryptPersonAuditValues } from '$features/persons/server/person-audit';
import { encryptTotpSecret, generateTotpSecret } from '$server/mfa';

const connection = vi.hoisted(() => ({
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
          throw new Error('Isolated person creation database not initialized');
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

const target = process.env.PERSON_CREATION_TEST_DATABASE_URL;

describe.skipIf(!target)('person creation on fully migrated PostgreSQL', () => {
  let db: PrismaClient;
  const uniqueNickname = (): string => 'Création ' + randomUUID();
  const request = (body: unknown): NextRequest =>
    new NextRequest('http://localhost/api/personnes', {
      body: JSON.stringify(body),
      method: 'POST',
    });
  const signIn = async (
    overrides: Partial<Prisma.UserCreateInput> = {},
  ): Promise<User> => {
    const user = await db.user.create({
      data: {
        firstName: 'Création fictive',
        loginName: 'creation.' + randomUUID().replaceAll('-', '').slice(0, 20),
        mfaEnabledAt: new Date(),
        passwordHash: 'unused-password-fixture',
        permissions: {
          [PERMISSIONS.PERSONS.CREATE]: true,
          [PERMISSIONS.PERSONS.VIEW_CONTACT]: true,
          [PERMISSIONS.PERSONS.UPDATE_CONTACT]: true,
          [PERMISSIONS.PERSONS.VIEW]: true,
        },
        ...overrides,
      },
    });
    await db.totpCredential.create({
      data: {
        ...encryptTotpSecret(generateTotpSecret(), user.id),
        userId: user.id,
      },
    });
    const token = randomUUID();
    await db.session.create({
      data: {
        expiresAt: new Date(Date.now() + 3600_000),
        idleExpiresAt: new Date(Date.now() + 1800_000),
        mfaMethod: 'TOTP',
        mfaVerifiedAt: new Date(),
        passwordReauthenticatedAt: new Date(),
        securityVersion: user.securityVersion,
        token: createHash('sha256').update(token).digest('hex'),
        userId: user.id,
      },
    });
    connection.cookies.set('session', token);

    return user;
  };
  const withAuditFailure = async (
    userId: string,
    table: 'AuditLog' | 'AuditFieldChange',
    run: () => Promise<void>,
  ): Promise<void> => {
    if (!/^[a-z0-9]+$/.test(userId))
      throw new Error('Unexpected fixture identifier');
    const name = 'person_creation_failure_' + randomUUID().replaceAll('-', '');
    const predicate =
      table === 'AuditLog'
        ? `NEW."userId" = '${userId}' AND NEW.action = 'PERSON_CREATE'`
        : `EXISTS (SELECT 1 FROM "AuditLog" WHERE id = NEW."auditLogId" AND "userId" = '${userId}' AND action = 'PERSON_CREATE')`;
    await db.$executeRawUnsafe(
      `CREATE FUNCTION "${name}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF ${predicate} THEN RAISE EXCEPTION 'Injected person audit failure'; END IF; RETURN NEW; END; $$`,
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
    if (!target) throw new Error('Missing isolated person creation database');
    const url = new URL(target);
    if (
      !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      url.pathname !== '/person_creation_service_test'
    ) {
      throw new Error('Only local person_creation_service_test is allowed');
    }
    db = new PrismaClient({ datasourceUrl: target });
    connection.client = db;
    const migrations = await db.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::integer AS count FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
    `;
    expect(migrations[0]?.count).toBeGreaterThanOrEqual(52);
    vi.stubEnv('AUDIT_ENCRYPTION_CURRENT_VERSION', '1');
    vi.stubEnv(
      'AUDIT_ENCRYPTION_KEY_V1',
      Buffer.alloc(32, 17).toString('base64'),
    );
  });
  beforeEach(() => {
    connection.cookies.clear();
  });
  afterAll(async () => {
    await db?.$disconnect();
    connection.client = null;
    vi.unstubAllEnvs();
  });

  it('rejects anonymous creation before writing any person', async () => {
    const nickname = uniqueNickname();
    const response = await POST(request({ nickname }));
    expect(response.status).toBe(401);
    expect(await db.person.count({ where: { nickname } })).toBe(0);
  });

  it('rejects an identity that disappears during search normalization before SQL', async () => {
    await signIn();
    const response = await POST(request({ nickname: '\u0301' }));
    expect(response.status).toBe(400);
    expect(await db.person.count({ where: { nickname: '\u0301' } })).toBe(0);
  });

  it.each([
    { [PERMISSIONS.PERSONS.VIEW]: true },
    { [PERMISSIONS.PERSONS.CREATE]: true, [PERMISSIONS.PERSONS.VIEW]: false },
  ])(
    'enforces creation and its view dependency with a real session (%j)',
    async (permissions) => {
      await signIn({ permissions });
      const nickname = uniqueNickname();
      const response = await POST(request({ nickname }));
      expect(response.status).toBe(403);
      expect(await db.person.count({ where: { nickname } })).toBe(0);
    },
  );

  it('honors withdrawn creation permission on the next request', async () => {
    const actor = await signIn();
    await db.user.update({
      data: { permissions: { [PERMISSIONS.PERSONS.VIEW]: true } },
      where: { id: actor.id },
    });
    const nickname = uniqueNickname();
    expect((await POST(request({ nickname }))).status).toBe(403);
    expect(await db.person.count({ where: { nickname } })).toBe(0);
  });

  it.each(['disabled', 'security-version', 'temporary-password'] as const)(
    'rejects a %s session for creation',
    async (state) => {
      const actor = await signIn();
      await db.user.update({
        data:
          state === 'disabled'
            ? { isActive: false }
            : state === 'security-version'
              ? { securityVersion: { increment: 1 } }
              : { mustChangePassword: true },
        where: { id: actor.id },
      });
      const nickname = uniqueNickname();
      expect((await POST(request({ nickname }))).status).toBe(
        state === 'temporary-password' ? 403 : 401,
      );
      expect(await db.person.count({ where: { nickname } })).toBe(0);
    },
  );

  it('creates a normalized nickname-only person and encrypted audit, without creating an account', async () => {
    const actor = await signIn();
    const nickname = 'Éloïse ' + randomUUID();
    const accountsBefore = await db.user.count();
    const response = await POST(request({ nickname: '  ' + nickname + '  ' }));
    expect(response.status).toBe(201);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    const body = await response.json();
    const person = await db.person.findUniqueOrThrow({
      where: { id: body.data.person.id },
    });
    expect(person).toMatchObject({
      birthDate: null,
      firstName: null,
      lastName: null,
      nickname,
      normalizedNickname: nickname
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase(),
      structureStatus: 'OUTSIDE_STRUCTURE',
      version: 1,
    });
    expect(body.data.person).toMatchObject({
      emails: [],
      phones: [],
      socialProfiles: [],
      version: 1,
    });
    expect(body.data.person).not.toHaveProperty('normalizedNickname');
    expect(body.data.duplicateWarning).toEqual({ duplicateFound: false });
    expect(await db.user.count()).toBe(accountsBefore);
    const audit = await db.auditLog.findFirstOrThrow({
      where: { action: 'PERSON_CREATE', entityId: person.id },
    });
    expect(audit).toMatchObject({
      description: 'Fiche créée',
      entityType: 'PERSON',
      userId: actor.id,
    });
    expect(JSON.stringify(audit.metadata)).not.toContain(nickname);
    const changes = await db.auditFieldChange.findMany({
      where: { auditLogId: audit.id },
    });
    expect(changes).toHaveLength(2);
    const identity = changes.find((change) => change.fieldKey === 'nickname');
    if (
      !identity?.valuesAuthTag ||
      !identity.valuesCiphertext ||
      !identity.valuesIv ||
      !identity.valueKeyVersion
    )
      throw new Error('Encrypted nickname audit missing');
    expect(identity).toMatchObject({
      afterValue: null,
      beforeValue: null,
      valueMode: 'ENCRYPTED',
    });
    expect(
      decryptPersonAuditValues({
        ...identity,
        valueKeyVersion: identity.valueKeyVersion,
        valuesAuthTag: identity.valuesAuthTag,
        valuesCiphertext: identity.valuesCiphertext,
        valuesIv: identity.valuesIv,
      }),
    ).toEqual({ after: nickname, before: null });
    expect(
      changes.find((change) => change.fieldKey === 'structureStatus'),
    ).toMatchObject({ afterValue: '"OUTSIDE_STRUCTURE"', valueMode: 'PLAIN' });
  });

  it('accepts civil identity without a nickname and preserves its civil birth date', async () => {
    await signIn();
    const response = await POST(
      request({
        birthDate: '2000-02-29',
        firstName: '  Élise  ',
        lastName: '  Martin  ',
        structureStatus: 'IN_STRUCTURE',
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.person).toMatchObject({
      birthDate: '2000-02-29',
      firstName: 'Élise',
      lastName: 'Martin',
      nickname: null,
      structureStatus: 'IN_STRUCTURE',
    });
    const stored = await db.person.findUniqueOrThrow({
      where: { id: body.data.person.id },
    });
    expect(stored.birthDate?.toISOString()).toBe('2000-02-29T00:00:00.000Z');
  });

  it('rejects invalid identities, dates, unknown fields and collection limits without a partial person', async () => {
    await signIn();
    const count = await db.person.count();
    const payloads = [
      {},
      { firstName: 'Seul' },
      { nickname: ' ' },
      { nickname: 'x'.repeat(81) },
      { birthDate: '2026-02-30', nickname: uniqueNickname() },
      { birthDate: '2999-01-01', nickname: uniqueNickname() },
      { isProtected: true, nickname: uniqueNickname() },
      {
        emails: Array.from({ length: 11 }, (_, index) => ({
          email: `contact${index}@example.test`,
          label: 'Fictif',
        })),
        nickname: uniqueNickname(),
      },
    ];
    for (const payload of payloads)
      expect((await POST(request(payload))).status).toBe(400);
    expect(await db.person.count()).toBe(count);
  });

  it('keeps two intentional homonyms distinct, including a repeated or concurrent submission', async () => {
    await signIn();
    const nickname = uniqueNickname();
    const replies = await Promise.all([
      POST(request({ nickname })),
      POST(request({ nickname })),
    ]);
    expect(replies.map((response) => response.status)).toEqual([201, 201]);
    const bodies = await Promise.all(
      replies.map((response) => response.json()),
    );
    expect(bodies[0].data.person.id).not.toBe(bodies[1].data.person.id);
    expect(bodies.map((body) => body.data.duplicateWarning)).toEqual([
      { duplicateFound: false },
      { duplicateFound: false },
    ]);
    expect(await db.person.count({ where: { nickname } })).toBe(2);
    expect(
      await db.auditLog.count({
        where: {
          action: 'PERSON_CREATE',
          entityId: { in: bodies.map((body) => body.data.person.id) },
        },
      }),
    ).toBe(2);
  });

  it('normalizes initial contacts, assigns primaries and reports shared coordinates without revealing another person', async () => {
    await signIn();
    const email = randomUUID() + '@example.test';
    const payload = {
      emails: [{ email: email.toUpperCase(), label: 'Personnel' }],
      phones: [
        { countryCode: 'FR', label: 'Portable', phone: '06 12 34 56 78' },
      ],
      socialProfiles: [
        { identifier: randomUUID(), label: 'Jeu', networkKey: 'discord' },
      ],
    };
    const firstResponse = await POST(
      request({ ...payload, nickname: uniqueNickname() }),
    );
    expect(firstResponse.status).toBe(201);
    const first = (await firstResponse.json()).data.person;
    const response = await POST(
      request({ ...payload, nickname: uniqueNickname() }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.person.emails[0]).toMatchObject({
      email: email.toUpperCase(),
      isPrimary: true,
    });
    expect(body.data.person.phones[0]).toMatchObject({
      countryCode: 'FR',
      isPrimary: true,
    });
    expect(body.data.person.socialProfiles[0]).toMatchObject({
      isPrimary: true,
    });
    const stored = await db.personEmail.findFirstOrThrow({
      where: { personId: body.data.person.id },
    });
    expect(stored.normalizedEmail).toBe(email);
    expect(body.data.duplicateWarning).toMatchObject({
      duplicateFound: true,
      fields: [
        'emails.0.email',
        'phones.0.phone',
        'socialProfiles.0.identifier',
      ],
    });
    expect(JSON.stringify(body.data.duplicateWarning)).not.toContain(first.id);
  });

  it('keeps duplicate warning field indexes aligned with interleaved input networks', async () => {
    await signIn();
    const identifier = randomUUID();
    const existing = await POST(
      request({
        nickname: uniqueNickname(),
        socialProfiles: [
          { identifier, label: 'Fictif', networkKey: 'instagram' },
        ],
      }),
    );
    expect(existing.status).toBe(201);
    const response = await POST(
      request({
        nickname: uniqueNickname(),
        socialProfiles: [
          { identifier: randomUUID(), label: 'Premier', networkKey: 'discord' },
          { identifier, label: 'Partagé', networkKey: 'instagram' },
          {
            identifier: randomUUID(),
            isPrimary: true,
            label: 'Principal',
            networkKey: 'discord',
          },
        ],
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.duplicateWarning.fields).toEqual([
      'socialProfiles.1.identifier',
    ]);
    const selected = body.data.person.socialProfiles.find(
      (profile: { label: string }) => profile.label === 'Principal',
    );
    expect(selected).toMatchObject({ isPrimary: true, networkKey: 'discord' });
  });

  it.each(['AuditLog', 'AuditFieldChange'] as const)(
    'rolls back identity, contacts and audit when %s fails, then allows an explicit retry',
    async (table) => {
      const actor = await signIn();
      const nickname = uniqueNickname();
      const email = randomUUID() + '@example.test';
      const payload = { emails: [{ email, label: 'Fictif' }], nickname };
      const auditCount = await db.auditLog.count({
        where: { userId: actor.id },
      });
      const fieldHistoryCount = await db.auditFieldChange.count();
      await withAuditFailure(actor.id, table, async () => {
        expect((await POST(request(payload))).status).toBe(500);
        expect(await db.person.count({ where: { nickname } })).toBe(0);
        expect(
          await db.personEmail.count({ where: { normalizedEmail: email } }),
        ).toBe(0);
        expect(await db.auditLog.count({ where: { userId: actor.id } })).toBe(
          auditCount,
        );
        expect(await db.auditFieldChange.count()).toBe(fieldHistoryCount);
      });
      expect((await POST(request(payload))).status).toBe(201);
      expect(await db.person.count({ where: { nickname } })).toBe(1);
    },
  );

  it('fails closed without the required audit key', async () => {
    await signIn();
    const nickname = uniqueNickname();
    vi.stubEnv('AUDIT_ENCRYPTION_KEY_V1', '');
    try {
      expect((await POST(request({ nickname }))).status).toBe(503);
      expect(await db.person.count({ where: { nickname } })).toBe(0);
    } finally {
      vi.stubEnv(
        'AUDIT_ENCRYPTION_KEY_V1',
        Buffer.alloc(32, 17).toString('base64'),
      );
    }
  });
});
