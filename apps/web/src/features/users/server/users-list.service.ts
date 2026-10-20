import 'server-only';

import { Prisma, type User } from '@prisma/client';

import { prisma } from '$server/prisma';
import type { UsersListResponse } from '$types/auth.types';

import { buildUserSearchPredicate } from './users-list-search';

export type UserListSort = 'created' | 'name' | 'recent';
export type UserListStatus = 'active' | 'inactive' | 'pending';
export type UserListVisibility = {
  canViewContact: boolean;
  canViewSecurity: boolean;
  isProtected: boolean;
};
export type UserListInput = {
  limit: number;
  loginName?: string;
  role: 'ADMIN' | 'SUPERADMIN' | 'USER' | null;
  search: string;
  skip: number;
  sort: UserListSort;
  status: UserListStatus | null;
};

type UserListRecord = Pick<
  User,
  | 'contactEmail'
  | 'contactEmailVerifiedAt'
  | 'createdAt'
  | 'failedLoginAttempts'
  | 'firstName'
  | 'id'
  | 'isActive'
  | 'isProtected'
  | 'lastLoginAt'
  | 'lastName'
  | 'lockedUntil'
  | 'loginName'
  | 'mfaEnabledAt'
  | 'mustChangePassword'
  | 'passwordChangedAt'
  | 'role'
>;
type UserListRow = Omit<UserListRecord, 'id'> & {
  id: string | null;
  total: number;
};
type UserStatsRow = {
  active: number;
  admins: number;
  inactive: number;
  pendingPasswordChange: number | null;
  protected: number;
  total: number;
  users: number;
};

const userOrder = (sort: UserListSort, protectedFirst: boolean): Prisma.Sql => {
  const first = protectedFirst
    ? Prisma.sql`"isProtected" DESC, `
    : Prisma.empty;
  const order =
    sort === 'recent'
      ? Prisma.sql`"lastLoginAt" DESC NULLS LAST, "createdAt" DESC, "id" ASC`
      : sort === 'created'
        ? Prisma.sql`"createdAt" DESC, "id" ASC`
        : Prisma.sql`"lastName" ASC, "firstName" ASC, "createdAt" DESC, "id" ASC`;

  return Prisma.sql`${first}${order}`;
};

const roleCondition = (role: NonNullable<UserListInput['role']>): Prisma.Sql =>
  role === 'SUPERADMIN'
    ? Prisma.sql`"isProtected" = true`
    : Prisma.sql`"role"::text = ${role} AND "isProtected" = false`;

const statusCondition = (
  status: UserListStatus,
  visibility: UserListVisibility,
): Prisma.Sql => {
  if (status === 'active') return Prisma.sql`"isActive" = true`;
  if (status === 'inactive') return Prisma.sql`"isActive" = false`;

  // A delegated viewer never counts nor lists the protected root as pending.
  return visibility.isProtected
    ? Prisma.sql`"mustChangePassword" = true`
    : Prisma.sql`"mustChangePassword" = true AND "isProtected" = false`;
};

/**
 * Criteria shared by the page and its counters. Role and status stay apart so
 * each facet can be counted under the other one, the search and the scope.
 */
const buildUserFilters = (
  input: UserListInput,
  visibility: UserListVisibility,
): {
  base: Prisma.Sql[];
  role: Prisma.Sql | null;
  status: Prisma.Sql | null;
} => {
  const base = [Prisma.sql`"deletedAt" IS NULL`];
  if (input.loginName !== undefined) {
    base.push(Prisma.sql`"loginName" = ${input.loginName}`);
    if (!visibility.isProtected) base.push(Prisma.sql`"isProtected" = false`);
  }
  if (input.search)
    base.push(buildUserSearchPredicate(input.search, visibility));

  return {
    base,
    role: input.role ? roleCondition(input.role) : null,
    status: input.status ? statusCondition(input.status, visibility) : null,
  };
};

export const buildUsersPageQuery = (
  input: UserListInput,
  visibility: UserListVisibility,
): Prisma.Sql => {
  const { base, role, status } = buildUserFilters(input, visibility);
  const filters = [
    ...base,
    ...(role ? [role] : []),
    ...(status ? [status] : []),
  ];
  const order = userOrder(input.sort, !visibility.isProtected);

  // Total and page share one statement snapshot. Matching identities stay in
  // PostgreSQL; only the requested page crosses the application boundary.
  return Prisma.sql`
    WITH filtered AS MATERIALIZED (
      SELECT "id", "isProtected", "lastName", "firstName", "lastLoginAt", "createdAt"
      FROM "User" WHERE ${Prisma.join(filters, ' AND ')}
    ), page AS (
      SELECT "id"
      FROM filtered ORDER BY ${order} LIMIT ${input.limit} OFFSET ${input.skip}
    )
    SELECT totals.total, u."id", u."loginName", u."firstName", u."lastName",
      u."contactEmail", u."contactEmailVerifiedAt", u."createdAt", u."role",
      u."isActive", u."isProtected", u."lastLoginAt", u."failedLoginAttempts",
      u."lockedUntil", u."mfaEnabledAt", u."mustChangePassword", u."passwordChangedAt"
    FROM (SELECT COUNT(*)::integer AS total FROM filtered) totals
    LEFT JOIN page ON true
    LEFT JOIN "User" u ON u."id" = page."id"
    ORDER BY ${order}
  `;
};

/**
 * Faceted counters of the quick filters: each status count applies the search
 * and the selected role, each role count the search and the selected status,
 * so every number equals the result its filter would show.
 */
export const buildUsersStatsQuery = (
  input: UserListInput,
  visibility: UserListVisibility,
): Prisma.Sql => {
  const { base, role, status } = buildUserFilters(input, visibility);
  const count = (condition: Prisma.Sql, facet: Prisma.Sql | null): Prisma.Sql =>
    Prisma.sql`COUNT(*) FILTER (WHERE ${condition}${facet ? Prisma.sql` AND ${facet}` : Prisma.empty})::integer`;

  return Prisma.sql`
    SELECT ${count(Prisma.sql`true`, role)} AS total,
      ${count(statusCondition('active', visibility), role)} AS active,
      ${count(statusCondition('inactive', visibility), role)} AS inactive,
      ${count(roleCondition('SUPERADMIN'), status)} AS protected,
      ${count(roleCondition('ADMIN'), status)} AS admins,
      ${count(roleCondition('USER'), status)} AS users,
      ${
        visibility.canViewSecurity
          ? count(statusCondition('pending', visibility), role)
          : Prisma.sql`NULL::integer`
      } AS "pendingPasswordChange"
    FROM "User" WHERE ${Prisma.join(base, ' AND ')}
  `;
};

export const listUsers = async (
  input: UserListInput,
  visibility: UserListVisibility,
): Promise<{
  stats: UsersListResponse['stats'];
  total: number;
  users: UserListRecord[];
}> => {
  const [rows, statRows] = await Promise.all([
    prisma.$queryRaw<UserListRow[]>(buildUsersPageQuery(input, visibility)),
    prisma.$queryRaw<UserStatsRow[]>(buildUsersStatsQuery(input, visibility)),
  ]);
  const stats = statRows[0];
  if (!stats) throw new Error('Missing users aggregate row');

  return {
    stats: {
      active: stats.active,
      byRole: {
        ADMIN: stats.admins,
        SUPERADMIN: stats.protected,
        USER: stats.users,
      },
      inactive: stats.inactive,
      pendingPasswordChange: stats.pendingPasswordChange,
      total: stats.total,
    },
    total: rows[0]?.total ?? 0,
    // The SQL count envelope is intentionally excluded from each user record.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    users: rows.flatMap(({ id, total: _total, ...user }) =>
      id === null ? [] : [{ ...user, id }],
    ),
  };
};
