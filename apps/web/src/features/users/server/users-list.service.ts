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

export const buildUsersPageQuery = (
  input: UserListInput,
  visibility: UserListVisibility,
): Prisma.Sql => {
  const filters = [Prisma.sql`"deletedAt" IS NULL`];
  if (input.loginName !== undefined) {
    filters.push(Prisma.sql`"loginName" = ${input.loginName}`);
    if (!visibility.isProtected)
      filters.push(Prisma.sql`"isProtected" = false`);
  }
  if (input.search)
    filters.push(buildUserSearchPredicate(input.search, visibility));
  if (input.role === 'SUPERADMIN')
    filters.push(Prisma.sql`"isProtected" = true`);
  else if (input.role)
    filters.push(
      Prisma.sql`"role"::text = ${input.role} AND "isProtected" = false`,
    );
  if (input.status === 'active') filters.push(Prisma.sql`"isActive" = true`);
  else if (input.status === 'inactive')
    filters.push(Prisma.sql`"isActive" = false`);
  else if (input.status === 'pending') {
    filters.push(Prisma.sql`"mustChangePassword" = true`);
    if (!visibility.isProtected)
      filters.push(Prisma.sql`"isProtected" = false`);
  }
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

export const buildUsersStatsQuery = (
  visibility: UserListVisibility,
): Prisma.Sql =>
  Prisma.sql`
    SELECT COUNT(*)::integer AS total,
      COUNT(*) FILTER (WHERE "isActive")::integer AS active,
      COUNT(*) FILTER (WHERE NOT "isActive")::integer AS inactive,
      COUNT(*) FILTER (WHERE "isProtected")::integer AS protected,
      COUNT(*) FILTER (WHERE "role" = 'ADMIN' AND NOT "isProtected")::integer AS admins,
      COUNT(*) FILTER (WHERE "role" = 'USER' AND NOT "isProtected")::integer AS users,
      ${
        visibility.canViewSecurity
          ? Prisma.sql`COUNT(*) FILTER (WHERE "mustChangePassword"${visibility.isProtected ? Prisma.empty : Prisma.sql` AND NOT "isProtected"`})::integer`
          : Prisma.sql`NULL::integer`
      } AS "pendingPasswordChange"
    FROM "User" WHERE "deletedAt" IS NULL
  `;

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
    prisma.$queryRaw<UserStatsRow[]>(buildUsersStatsQuery(visibility)),
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
