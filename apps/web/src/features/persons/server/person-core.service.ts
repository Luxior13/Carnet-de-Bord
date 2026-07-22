import 'server-only';

import { Prisma, type PrismaClient } from '@prisma/client';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

import {
  buildCursorPaginationMeta,
  decodeKeysetCursor,
  hashCursorFilters,
} from '$server/cursor-pagination';
import { prisma } from '$server/prisma';
import type { UserType } from '$types/auth.types';

import { PERSON_AUDIT_KEYS } from '../person.constants';
import { calculateCivilAge, serializeCivilDate } from '../person.utils';
import type {
  CreatePersonInput,
  UpdatePersonInput,
} from '../schemas/person.schemas';
import type {
  PersonDetail,
  PersonDuplicateWarning,
  PersonEmailItem,
  PersonListSort,
  PersonPhoneItem,
  PersonsListResponse,
  PersonSocialProfileItem,
  PersonSummary,
} from '../types/person.types';
import { createPersonAudit, type PersonAuditChange } from './person-audit';
import { getCreationDuplicateWarnings } from './person-duplicate-detection';
import { personErrors } from './person-errors';
import {
  hashPersonNormalizedUrl,
  normalizePersonEmail,
  normalizePersonSocialIdentifier,
  normalizePersonSocialUrl,
  personIdentityData,
} from './person-normalization';
import { buildPersonSearchFragments } from './person-search';

type PersonClient = Prisma.TransactionClient | PrismaClient;

const PERSON_DETAIL_INCLUDE = {
  emails: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
  phones: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
  socialProfiles: {
    orderBy: [
      { networkKey: 'asc' },
      { isPrimary: 'desc' },
      { createdAt: 'asc' },
    ],
  },
} as const satisfies Prisma.PersonInclude;

type PersonDetailRecord = Prisma.PersonGetPayload<{
  include: typeof PERSON_DETAIL_INCLUDE;
}>;

type PersonListRow = {
  createdAt: Date;
  emailCount: number;
  firstName: string | null;
  id: string;
  lastName: string | null;
  matchedByContact: boolean;
  nickname: string | null;
  phoneCount: number;
  socialProfileCount: number;
  sortName: string;
  structureStatus: 'IN_STRUCTURE' | 'OUTSIDE_STRUCTURE';
  updatedAt: Date;
  version: number;
};

const toEmailItem = (
  email: PersonDetailRecord['emails'][number],
): PersonEmailItem => ({
  createdAt: email.createdAt.toISOString(),
  email: email.email,
  id: email.id,
  isPrimary: email.isPrimary,
  label: email.label,
  updatedAt: email.updatedAt.toISOString(),
  version: email.version,
});

const toPhoneItem = (
  phone: PersonDetailRecord['phones'][number],
): PersonPhoneItem => ({
  countryCode:
    parsePhoneNumberFromString(phone.normalizedPhone)?.country ?? 'FR',
  createdAt: phone.createdAt.toISOString(),
  id: phone.id,
  isPrimary: phone.isPrimary,
  label: phone.label,
  phone: phone.phone,
  updatedAt: phone.updatedAt.toISOString(),
  version: phone.version,
});

const toSocialProfileItem = (
  profile: PersonDetailRecord['socialProfiles'][number],
): PersonSocialProfileItem => ({
  createdAt: profile.createdAt.toISOString(),
  id: profile.id,
  identifier: profile.identifier,
  isPrimary: profile.isPrimary,
  label: profile.label,
  networkKey: profile.networkKey,
  profileUrl: profile.profileUrl,
  updatedAt: profile.updatedAt.toISOString(),
  version: profile.version,
});

const toPersonSummary = (person: PersonListRow): PersonSummary => ({
  contactCounts: {
    emails: person.emailCount,
    phones: person.phoneCount,
    socialProfiles: person.socialProfileCount,
  },
  createdAt: person.createdAt.toISOString(),
  firstName: person.firstName,
  id: person.id,
  lastName: person.lastName,
  matchedByContact: person.matchedByContact,
  nickname: person.nickname,
  structureStatus: person.structureStatus,
  updatedAt: person.updatedAt.toISOString(),
  version: person.version,
});

const getLastPersonChange = async (client: PersonClient, personId: string) => {
  const audit = await client.auditLog.findFirst({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: {
      action: true,
      actorDisplayNameSnapshot: true,
      actorLoginNameSnapshot: true,
      createdAt: true,
    },
    where: {
      entityId: personId,
      entityType: PERSON_AUDIT_KEYS.entityType,
    },
  });
  if (!audit) return null;

  return {
    action: audit.action,
    actor: {
      displayName:
        audit.actorDisplayNameSnapshot ??
        audit.actorLoginNameSnapshot ??
        'Compte indisponible',
      loginName: audit.actorLoginNameSnapshot,
    },
    at: audit.createdAt.toISOString(),
  };
};

export const mapPersonDetail = async (
  client: PersonClient,
  person: PersonDetailRecord,
): Promise<PersonDetail> => {
  const birthDate = serializeCivilDate(person.birthDate);
  const age = calculateCivilAge(birthDate);

  return {
    age,
    birthDate,
    createdAt: person.createdAt.toISOString(),
    emails: person.emails.map(toEmailItem),
    firstName: person.firstName,
    id: person.id,
    isAdult: age === null ? null : age >= 18,
    lastChange: await getLastPersonChange(client, person.id),
    lastName: person.lastName,
    nickname: person.nickname,
    phones: person.phones.map(toPhoneItem),
    socialProfiles: person.socialProfiles.map(toSocialProfileItem),
    structureStatus: person.structureStatus,
    updatedAt: person.updatedAt.toISOString(),
    version: person.version,
  };
};

export const touchPerson = async (
  transaction: Prisma.TransactionClient,
  personId: string,
  version: number,
): Promise<void> => {
  const touched = await transaction.person.updateMany({
    data: { version: { increment: 1 } },
    where: { id: personId, version },
  });
  if (touched.count !== 1) throw personErrors.versionConflict();
};

export const requirePersonDetailRecord = async (
  client: PersonClient,
  personId: string,
): Promise<PersonDetailRecord> => {
  const person = await client.person.findUnique({
    include: PERSON_DETAIL_INCLUDE,
    where: { id: personId },
  });
  if (!person) throw personErrors.notFound();

  return person;
};

const normalizeInitialPrimary = <T extends { isPrimary: boolean }>(
  items: readonly T[],
): T[] => {
  const selectedIndex = items.findIndex((item) => item.isPrimary);
  const primaryIndex = selectedIndex >= 0 ? selectedIndex : 0;

  return items.map((item, index) => ({
    ...item,
    isPrimary: index === primaryIndex,
  }));
};

const normalizeInitialSocialPrimaries = <
  T extends { isPrimary: boolean; networkKey: string },
>(
  items: readonly T[],
): T[] => {
  const byNetwork = new Map<string, T[]>();
  for (const item of items) {
    const group = byNetwork.get(item.networkKey) ?? [];
    group.push(item);
    byNetwork.set(item.networkKey, group);
  }

  return [...byNetwork.values()].flatMap(normalizeInitialPrimary);
};

export const listPersons = async (input: {
  cursor?: string;
  limit: number;
  q: string;
  sort?: PersonListSort;
  structureStatus?: 'IN_STRUCTURE' | 'OUTSIDE_STRUCTURE';
}): Promise<PersonsListResponse> => {
  const sort = input.sort ?? 'name';
  const { contactSearchClause, normalizedQuery, searchClause } =
    buildPersonSearchFragments(input.q);
  const filterHash = hashCursorFilters({
    q: normalizedQuery,
    sort,
    structureStatus: input.structureStatus ?? null,
  });
  const cursor = input.cursor
    ? decodeKeysetCursor(input.cursor, { filterHash, resource: 'persons' })
    : null;
  if (input.cursor && !cursor) throw new RangeError('INVALID_CURSOR');

  const snapshotAt = cursor ? new Date(cursor.snapshotAt) : new Date();
  const cursorDate =
    cursor && sort !== 'name' ? new Date(cursor.sortValue) : null;
  if (cursorDate && Number.isNaN(cursorDate.getTime())) {
    throw new RangeError('INVALID_CURSOR');
  }

  const statusClause = input.structureStatus
    ? Prisma.sql`AND p."structureStatus" = ${input.structureStatus}::"PersonStructureStatus"`
    : Prisma.empty;
  const snapshotClause =
    sort === 'created'
      ? Prisma.sql`p."createdAt" <= ${snapshotAt}`
      : Prisma.sql`p."updatedAt" <= ${snapshotAt}`;
  const cursorClause = !cursor
    ? Prisma.empty
    : sort === 'name'
      ? Prisma.sql`AND (
          p."sortName" > ${cursor.sortValue}
          OR (p."sortName" = ${cursor.sortValue} AND p."id" > ${cursor.id})
        )`
      : sort === 'updated' && cursorDate
        ? Prisma.sql`AND (
            p."updatedAt" < ${cursorDate}
            OR (p."updatedAt" = ${cursorDate} AND p."id" < ${cursor.id})
          )`
        : cursorDate
          ? Prisma.sql`AND (
              p."createdAt" < ${cursorDate}
              OR (p."createdAt" = ${cursorDate} AND p."id" < ${cursor.id})
            )`
          : Prisma.empty;
  const orderClause =
    sort === 'name'
      ? Prisma.sql`p."sortName" ASC, p."id" ASC`
      : sort === 'updated'
        ? Prisma.sql`p."updatedAt" DESC, p."id" DESC`
        : Prisma.sql`p."createdAt" DESC, p."id" DESC`;

  const rows = await prisma.$queryRaw<PersonListRow[]>(Prisma.sql`
    SELECT
      p."id",
      p."nickname",
      p."firstName",
      p."lastName",
      p."sortName",
      p."structureStatus",
      p."version",
      p."createdAt",
      p."updatedAt",
      (SELECT COUNT(*)::integer FROM "PersonEmail" email_count
        WHERE email_count."personId" = p."id") AS "emailCount",
      (SELECT COUNT(*)::integer FROM "PersonPhone" phone_count
        WHERE phone_count."personId" = p."id") AS "phoneCount",
      (SELECT COUNT(*)::integer FROM "PersonSocialProfile" social_count
        WHERE social_count."personId" = p."id") AS "socialProfileCount",
      CASE WHEN ${normalizedQuery} <> '' THEN (
        ${contactSearchClause}
      ) ELSE FALSE END AS "matchedByContact"
    FROM "Person" p
    WHERE ${snapshotClause}
      ${statusClause}
      ${searchClause}
      ${cursorClause}
    ORDER BY ${orderClause}
    LIMIT ${input.limit + 1}
  `);
  const paginated = buildCursorPaginationMeta(
    rows,
    input.limit,
    snapshotAt,
    (person) => ({
      filterHash,
      id: person.id,
      resource: 'persons',
      snapshotAt: snapshotAt.toISOString(),
      sortValue:
        sort === 'name'
          ? person.sortName
          : sort === 'updated'
            ? person.updatedAt.toISOString()
            : person.createdAt.toISOString(),
    }),
  );

  return {
    items: paginated.items.map(toPersonSummary),
    pagination: paginated.pagination,
  };
};

export const getPerson = async (personId: string): Promise<PersonDetail> => {
  const person = await requirePersonDetailRecord(prisma, personId);

  return mapPersonDetail(prisma, person);
};

export const createPerson = async (
  input: CreatePersonInput,
  actor: UserType,
): Promise<{
  duplicateWarning: PersonDuplicateWarning;
  person: PersonDetail;
}> =>
  prisma.$transaction(async (transaction) => {
    const emails = normalizeInitialPrimary(input.emails);
    const phones = normalizeInitialPrimary(input.phones);
    const socialProfiles = normalizeInitialSocialPrimaries(
      input.socialProfiles,
    ).map((profile) => {
      const normalizedIdentifier = profile.identifier
        ? normalizePersonSocialIdentifier(profile.identifier)
        : null;
      const normalizedProfileUrl = profile.profileUrl
        ? normalizePersonSocialUrl(profile.profileUrl)
        : null;

      return {
        ...profile,
        normalizedIdentifier,
        normalizedProfileUrl,
        normalizedProfileUrlHash: normalizedProfileUrl
          ? hashPersonNormalizedUrl(normalizedProfileUrl)
          : null,
      };
    });
    const { emailWarnings, phoneWarnings, socialWarnings } =
      await getCreationDuplicateWarnings(transaction, {
        emails,
        phones,
        socialProfiles,
      });
    const duplicateFields = [
      ...emailWarnings.flatMap((warning, index) =>
        warning.duplicateFound ? [`emails.${index}.email`] : [],
      ),
      ...phoneWarnings.flatMap((warning, index) =>
        warning.duplicateFound ? [`phones.${index}.phone`] : [],
      ),
      ...socialWarnings.flatMap((warning, index) =>
        (warning.fields ?? []).map(
          (field) => `socialProfiles.${index}.${field}`,
        ),
      ),
    ];
    const person = await transaction.person.create({
      data: {
        ...personIdentityData(input),
        emails: {
          create: emails.map((email) => ({
            email: email.email,
            isPrimary: email.isPrimary,
            label: email.label,
            normalizedEmail: normalizePersonEmail(email.email),
          })),
        },
        phones: {
          create: phones.map((phone) => ({
            isPrimary: phone.isPrimary,
            label: phone.label,
            normalizedPhone: phone.normalizedPhone,
            phone: phone.phone,
          })),
        },
        socialProfiles: {
          create: socialProfiles.map((profile) => ({
            identifier: profile.identifier,
            isPrimary: profile.isPrimary,
            label: profile.label,
            networkKey: profile.networkKey,
            normalizedIdentifier: profile.normalizedIdentifier,
            normalizedProfileUrl: profile.normalizedProfileUrl,
            normalizedProfileUrlHash: profile.normalizedProfileUrlHash,
            profileUrl: profile.profileUrl,
          })),
        },
      },
      include: PERSON_DETAIL_INCLUDE,
    });
    const duplicateMatches: NonNullable<PersonDuplicateWarning['matches']> = [
      ...emailWarnings.flatMap((warning, index) => {
        if (!warning.duplicateFound) return [];
        const source = emails.at(index);
        const record = source
          ? person.emails.find(
              (email) =>
                email.normalizedEmail === normalizePersonEmail(source.email),
            )
          : null;

        return record
          ? [{ fieldKey: 'email' as const, recordId: record.id }]
          : [];
      }),
      ...phoneWarnings.flatMap((warning, index) => {
        if (!warning.duplicateFound) return [];
        const source = phones.at(index);
        const record = source
          ? person.phones.find(
              (phone) => phone.normalizedPhone === source.normalizedPhone,
            )
          : null;

        return record
          ? [{ fieldKey: 'phone' as const, recordId: record.id }]
          : [];
      }),
      ...socialWarnings.flatMap((warning, index) => {
        const source = socialProfiles.at(index);
        if (!source) return [];
        const record = person.socialProfiles.find(
          (profile) =>
            profile.networkKey === source.networkKey &&
            ((source.normalizedIdentifier &&
              profile.normalizedIdentifier === source.normalizedIdentifier) ||
              (source.normalizedProfileUrlHash &&
                source.normalizedProfileUrl &&
                profile.normalizedProfileUrlHash ===
                  source.normalizedProfileUrlHash &&
                profile.normalizedProfileUrl === source.normalizedProfileUrl)),
        );
        if (!record) return [];

        return (warning.fields ?? [])
          .filter(
            (fieldKey): fieldKey is 'identifier' | 'profileUrl' =>
              fieldKey === 'identifier' || fieldKey === 'profileUrl',
          )
          .map((fieldKey) => ({ fieldKey, recordId: record.id }));
      }),
    ];
    const changes: PersonAuditChange[] = [
      ...(['nickname', 'firstName', 'lastName', 'birthDate'] as const).flatMap(
        (fieldKey) => {
          const value =
            fieldKey === 'birthDate' ? input.birthDate : input[fieldKey];

          return value
            ? [
                {
                  after: value,
                  before: null,
                  changeType: 'CREATE' as const,
                  fieldKey,
                  sectionKey: PERSON_AUDIT_KEYS.sections.identity,
                  sensitive: true,
                },
              ]
            : [];
        },
      ),
      {
        after: input.structureStatus,
        before: null,
        changeType: 'CREATE',
        fieldKey: 'structureStatus',
        sectionKey: PERSON_AUDIT_KEYS.sections.structure,
        sensitive: false,
      },
      ...person.emails.flatMap((email) => [
        {
          after: email.email,
          before: null,
          changeType: 'CREATE' as const,
          fieldKey: 'email',
          recordId: email.id,
          sectionKey: PERSON_AUDIT_KEYS.sections.contacts,
          sensitive: true,
        },
        {
          after: email.label,
          before: null,
          changeType: 'CREATE' as const,
          fieldKey: 'label',
          recordId: email.id,
          sectionKey: PERSON_AUDIT_KEYS.sections.contacts,
          sensitive: true,
        },
        {
          after: email.isPrimary,
          before: null,
          changeType: 'CREATE' as const,
          fieldKey: 'isPrimary',
          recordId: email.id,
          sectionKey: PERSON_AUDIT_KEYS.sections.contacts,
          sensitive: false,
        },
      ]),
      ...person.phones.flatMap((phone) => [
        {
          after: phone.phone,
          before: null,
          changeType: 'CREATE' as const,
          fieldKey: 'phone',
          recordId: phone.id,
          sectionKey: PERSON_AUDIT_KEYS.sections.contacts,
          sensitive: true,
        },
        {
          after: phone.label,
          before: null,
          changeType: 'CREATE' as const,
          fieldKey: 'label',
          recordId: phone.id,
          sectionKey: PERSON_AUDIT_KEYS.sections.contacts,
          sensitive: true,
        },
        {
          after: phone.isPrimary,
          before: null,
          changeType: 'CREATE' as const,
          fieldKey: 'isPrimary',
          recordId: phone.id,
          sectionKey: PERSON_AUDIT_KEYS.sections.contacts,
          sensitive: false,
        },
      ]),
      ...person.socialProfiles.flatMap((profile) =>
        (
          [
            'networkKey',
            'identifier',
            'profileUrl',
            'label',
            'isPrimary',
          ] as const
        ).flatMap((fieldKey) => {
          const value = profile[fieldKey];

          return value === null
            ? []
            : [
                {
                  after: value,
                  before: null,
                  changeType: 'CREATE' as const,
                  fieldKey,
                  recordId: profile.id,
                  sectionKey: PERSON_AUDIT_KEYS.sections.social,
                  sensitive:
                    fieldKey !== 'networkKey' && fieldKey !== 'isPrimary',
                },
              ];
        }),
      ),
    ];
    await createPersonAudit(transaction, {
      action: 'PERSON_CREATE',
      actor,
      changes,
      description: 'Fiche créée',
      entityId: person.id,
    });
    const refreshed = await requirePersonDetailRecord(transaction, person.id);

    return {
      duplicateWarning: {
        duplicateFound: duplicateFields.length > 0,
        ...(duplicateFields.length > 0 ? { fields: duplicateFields } : {}),
        ...(duplicateMatches.length > 0 ? { matches: duplicateMatches } : {}),
      },
      person: await mapPersonDetail(transaction, refreshed),
    };
  });

export const updatePerson = async (
  personId: string,
  input: UpdatePersonInput,
  actor: UserType,
): Promise<PersonDetail> =>
  prisma.$transaction(async (transaction) => {
    const current = await requirePersonDetailRecord(transaction, personId);
    const fields = [
      [
        'nickname',
        current.nickname,
        input.nickname,
        true,
        PERSON_AUDIT_KEYS.sections.identity,
      ],
      [
        'firstName',
        current.firstName,
        input.firstName,
        true,
        PERSON_AUDIT_KEYS.sections.identity,
      ],
      [
        'lastName',
        current.lastName,
        input.lastName,
        true,
        PERSON_AUDIT_KEYS.sections.identity,
      ],
      [
        'birthDate',
        serializeCivilDate(current.birthDate),
        input.birthDate,
        true,
        PERSON_AUDIT_KEYS.sections.identity,
      ],
      [
        'structureStatus',
        current.structureStatus,
        input.structureStatus,
        false,
        PERSON_AUDIT_KEYS.sections.structure,
      ],
    ] as const;
    const changes = fields.flatMap(
      ([fieldKey, before, after, sensitive, sectionKey]) =>
        before === after
          ? []
          : [
              {
                after: after ?? null,
                before: before ?? null,
                changeType: 'UPDATE' as const,
                fieldKey,
                sectionKey,
                sensitive,
              },
            ],
    );
    if (current.version !== input.version) {
      throw personErrors.versionConflict();
    }
    if (changes.length === 0) return mapPersonDetail(transaction, current);

    const updatedIdentity = await transaction.person.updateMany({
      data: {
        ...personIdentityData(input),
        version: { increment: 1 },
      },
      where: { id: personId, version: input.version },
    });
    if (updatedIdentity.count !== 1) throw personErrors.versionConflict();
    await createPersonAudit(transaction, {
      action: 'PERSON_UPDATE',
      actor,
      changes,
      description: 'Identité de la fiche modifiée',
      entityId: personId,
    });
    const updated = await requirePersonDetailRecord(transaction, personId);

    return mapPersonDetail(transaction, updated);
  });
