import 'server-only';

import { Prisma } from '@prisma/client';

import {
  buildCursorPaginationMeta,
  decodeKeysetCursor,
  hashCursorFilters,
} from '$server/cursor-pagination';
import { prisma } from '$server/prisma';

import { PERSON_AUDIT_KEYS } from '../person.constants';
import type {
  PersonListSort,
  PersonsListResponse,
  PersonSummary,
} from '../types/person.types';
import { buildPersonSearchFragments } from './person-search';

type PersonListRow = {
  createdAt: Date;
  emailCount: number;
  firstName: string | null;
  id: string;
  lastModifiedByDisplayName: string | null;
  lastModifiedByLoginName: string | null;
  lastName: string | null;
  matchedByContact: boolean;
  nickname: string | null;
  phoneCount: number;
  socialProfileCount: number;
  sortName: string;
  structureStatus: 'IN_STRUCTURE' | 'OUTSIDE_STRUCTURE';
  totalCount: bigint;
  updatedAt: Date;
  version: number;
};

const toPersonSummary = (person: PersonListRow): PersonSummary => ({
  contactCounts: {
    emails: person.emailCount,
    phones: person.phoneCount,
    socialProfiles: person.socialProfileCount,
  },
  createdAt: person.createdAt.toISOString(),
  firstName: person.firstName,
  id: person.id,
  lastModifiedBy:
    person.lastModifiedByDisplayName || person.lastModifiedByLoginName
      ? {
          displayName:
            person.lastModifiedByDisplayName ??
            person.lastModifiedByLoginName ??
            'Compte indisponible',
          loginName: person.lastModifiedByLoginName,
        }
      : null,
  lastName: person.lastName,
  matchedByContact: person.matchedByContact,
  nickname: person.nickname,
  structureStatus: person.structureStatus,
  updatedAt: person.updatedAt.toISOString(),
  version: person.version,
});

export const listPersons = async (input: {
  contacts?: 'missing';
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
    ...(input.contacts ? { contacts: input.contacts } : {}),
    // Identity ignores accents/case, but contact identifiers and URL paths
    // do not share that normalization. Bind the cursor to the full input.
    q: input.q.trim(),
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
  const contactsClause =
    input.contacts === 'missing'
      ? Prisma.sql`AND NOT EXISTS (SELECT 1 FROM "PersonEmail" e WHERE e."personId" = p."id")
        AND NOT EXISTS (SELECT 1 FROM "PersonPhone" ph WHERE ph."personId" = p."id")
        AND NOT EXISTS (SELECT 1 FROM "PersonSocialProfile" sp WHERE sp."personId" = p."id")`
      : Prisma.empty;
  // Person stores UTC timestamps without a zone; Prisma binds Date parameters
  // as timestamptz. Convert the parameters, not the indexed columns.
  const snapshotClause =
    sort === 'created'
      ? Prisma.sql`p."createdAt" <= (${snapshotAt} AT TIME ZONE 'UTC')`
      : Prisma.sql`p."updatedAt" <= (${snapshotAt} AT TIME ZONE 'UTC')`;
  const cursorClause = !cursor
    ? Prisma.empty
    : sort === 'name'
      ? Prisma.sql`AND (
          p."sortName" > ${cursor.sortValue}
          OR (p."sortName" = ${cursor.sortValue} AND p."id" > ${cursor.id})
        )`
      : sort === 'updated' && cursorDate
        ? Prisma.sql`AND (
            p."updatedAt" < (${cursorDate} AT TIME ZONE 'UTC')
            OR (p."updatedAt" = (${cursorDate} AT TIME ZONE 'UTC') AND p."id" < ${cursor.id})
          )`
        : cursorDate
          ? Prisma.sql`AND (
              p."createdAt" < (${cursorDate} AT TIME ZONE 'UTC')
              OR (p."createdAt" = (${cursorDate} AT TIME ZONE 'UTC') AND p."id" < ${cursor.id})
            )`
          : Prisma.empty;
  const orderClause =
    sort === 'name'
      ? Prisma.sql`p."sortName" ASC, p."id" ASC`
      : sort === 'updated'
        ? Prisma.sql`p."updatedAt" DESC, p."id" DESC`
        : Prisma.sql`p."createdAt" DESC, p."id" DESC`;

  // Count the filtered snapshot before applying the cursor. The LEFT JOIN
  // also returns the total when a cursor points beyond the last remaining row.
  const queryRows = await prisma.$queryRaw<
    { [Key in keyof PersonListRow]: PersonListRow[Key] | null }[]
  >(Prisma.sql`
    WITH filtered AS NOT MATERIALIZED (
      SELECT p.* FROM "Person" p
      WHERE ${snapshotClause}
        ${statusClause}
        ${contactsClause}
        ${searchClause}
    ), totals AS (
      SELECT COUNT(*) AS "totalCount" FROM filtered
    )
    SELECT p.*, totals."totalCount"
    FROM totals
    LEFT JOIN LATERAL (
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
      last_change."actorDisplayNameSnapshot" AS "lastModifiedByDisplayName",
      last_change."actorLoginNameSnapshot" AS "lastModifiedByLoginName",
      (SELECT COUNT(*)::integer FROM "PersonEmail" email_count
        WHERE email_count."personId" = p."id") AS "emailCount",
      (SELECT COUNT(*)::integer FROM "PersonPhone" phone_count
        WHERE phone_count."personId" = p."id") AS "phoneCount",
      (SELECT COUNT(*)::integer FROM "PersonSocialProfile" social_count
        WHERE social_count."personId" = p."id") AS "socialProfileCount",
      CASE WHEN ${normalizedQuery} <> '' THEN (
        ${contactSearchClause}
      ) ELSE FALSE END AS "matchedByContact"
    FROM filtered p
    LEFT JOIN LATERAL (
      SELECT
        audit."actorDisplayNameSnapshot",
        audit."actorLoginNameSnapshot"
      FROM "AuditLog" audit
      WHERE audit."entityType" = ${PERSON_AUDIT_KEYS.entityType}
        AND audit."entityId" = p."id"
      ORDER BY audit."createdAt" DESC, audit."id" DESC
      LIMIT 1
    ) last_change ON TRUE
    WHERE TRUE ${cursorClause}
    ORDER BY ${orderClause}
    LIMIT ${input.limit + 1}
    ) p ON TRUE
    ORDER BY ${orderClause}
  `);
  const total = Number(queryRows[0]?.totalCount ?? 0);
  const rows = queryRows.filter((row): row is PersonListRow => row.id !== null);
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

  const [inStructureCount, outsideStructureCount, noContactsCount] =
    await Promise.all([
      prisma.person.count({ where: { structureStatus: 'IN_STRUCTURE' } }),
      prisma.person.count({ where: { structureStatus: 'OUTSIDE_STRUCTURE' } }),
      prisma.person.count({
        where: {
          AND: [
            { emails: { none: {} } },
            { phones: { none: {} } },
            { socialProfiles: { none: {} } },
          ],
        },
      }),
    ]);

  return {
    items: paginated.items.map(toPersonSummary),
    overview: {
      inStructure: inStructureCount,
      noContacts: noContactsCount,
      outsideStructure: outsideStructureCount,
      total: inStructureCount + outsideStructureCount,
    },
    pagination: { ...paginated.pagination, total },
  };
};
