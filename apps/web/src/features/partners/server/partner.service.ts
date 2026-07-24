import 'server-only';

import {
  AuditAction,
  type PartnerOrganizationStatus,
  Prisma,
  type PrismaClient,
} from '@prisma/client';

import { formatPersonDisplayName } from '$features/persons/person.utils';
import {
  buildCursorPaginationMeta,
  decodeKeysetCursor,
  hashCursorFilters,
} from '$server/cursor-pagination';
import { prisma } from '$server/prisma';
import type { UserType } from '$types/auth.types';

import type {
  CreatePartnerContactInput,
  CreatePartnerFollowUpInput,
  CreatePartnerInput,
  UpdatePartnerContactInput,
  UpdatePartnerFollowUpInput,
  UpdatePartnerInput,
} from '../schemas/partner.schemas';
import type {
  PartnerActivityItem,
  PartnerActor,
  PartnerContact,
  PartnerDetail,
  PartnerListSort,
  PartnerMutationResponse,
  PartnersListResponse,
  PartnerStatus,
  PartnerSummary,
} from '../types/partner.types';
import { createPartnerAudit } from './partner-audit';
import { partnerErrors } from './partner-errors';
import {
  fromCivilDate,
  normalizePartnerChannel,
  normalizePartnerSearchValue,
  normalizePartnerWebsite,
  toCivilDate,
} from './partner-normalization';

type PartnerClient = Prisma.TransactionClient | PrismaClient;

const PARTNER_DETAIL_INCLUDE = {
  categories: { orderBy: { category: 'asc' } },
  channels: {
    orderBy: [{ type: 'asc' }, { isPrimary: 'desc' }, { createdAt: 'asc' }],
  },
  contacts: {
    include: {
      person: {
        select: {
          firstName: true,
          id: true,
          lastName: true,
          nickname: true,
        },
      },
    },
    orderBy: [{ closedAt: 'asc' }, { isPrimary: 'desc' }, { createdAt: 'asc' }],
  },
  createdBy: {
    select: { firstName: true, lastName: true, loginName: true },
  },
  followUps: {
    include: {
      action: {
        include: {
          completedBy: {
            select: { firstName: true, lastName: true, loginName: true },
          },
        },
      },
      author: {
        select: { firstName: true, lastName: true, loginName: true },
      },
      partnerContact: {
        include: {
          person: {
            select: {
              firstName: true,
              id: true,
              lastName: true,
              nickname: true,
            },
          },
        },
      },
    },
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    take: 50,
  },
  periods: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] },
  updatedBy: {
    select: { firstName: true, lastName: true, loginName: true },
  },
} as const satisfies Prisma.PartnerOrganizationInclude;

type PartnerDetailRecord = Prisma.PartnerOrganizationGetPayload<{
  include: typeof PARTNER_DETAIL_INCLUDE;
}>;

const actorFromUser = (
  user: {
    firstName: string;
    lastName: string;
    loginName: string;
  } | null,
): PartnerActor | null => {
  if (!user) return null;
  const displayName =
    `${user.firstName.trim()} ${user.lastName.trim()}`.trim() || user.loginName;

  return { displayName, loginName: user.loginName };
};

const personReference = (
  person: {
    firstName: string | null;
    id: string;
    lastName: string | null;
    nickname: string | null;
  } | null,
  canViewPersons: boolean,
) =>
  !person || !canViewPersons
    ? null
    : {
        displayName: formatPersonDisplayName(person),
        id: person.id,
        nickname: person.nickname,
      };

const mapContact = (
  contact: PartnerDetailRecord['contacts'][number],
  canViewPersons: boolean,
): PartnerContact => ({
  closedAt: contact.closedAt?.toISOString() ?? null,
  endedOn: fromCivilDate(contact.endedOn),
  id: contact.id,
  isPrimary: contact.isPrimary,
  label: contact.label,
  person: personReference(contact.person, canViewPersons),
  startedOn: fromCivilDate(contact.startedOn),
  version: contact.version,
});

export const mapPartnerDetail = (
  partner: PartnerDetailRecord,
  canViewPersons: boolean,
): PartnerDetail => ({
  categories: partner.categories.map(({ category }) => category),
  channels: partner.channels.map((channel) => ({
    id: channel.id,
    isPrimary: channel.isPrimary,
    label: channel.label,
    type: channel.type,
    value: channel.value,
    version: channel.version,
  })),
  contacts: partner.contacts.map((contact) =>
    mapContact(contact, canViewPersons),
  ),
  createdAt: partner.createdAt.toISOString(),
  createdBy: actorFromUser(partner.createdBy),
  description: partner.description,
  followUps: partner.followUps.map((entry) => ({
    action: entry.action
      ? {
          completedAt: entry.action.completedAt?.toISOString() ?? null,
          completedBy: actorFromUser(entry.action.completedBy),
          description: entry.action.description,
          dueOn: fromCivilDate(entry.action.dueOn),
          id: entry.action.id,
          version: entry.action.version,
        }
      : null,
    author: actorFromUser(entry.author) ?? {
      displayName: 'Compte indisponible',
      loginName: null,
    },
    contact: personReference(
      entry.partnerContact?.person ?? null,
      canViewPersons,
    ),
    createdAt: entry.createdAt.toISOString(),
    id: entry.id,
    occurredAt: entry.occurredAt.toISOString(),
    text: entry.text,
    updatedAt: entry.updatedAt.toISOString(),
    version: entry.version,
  })),
  id: partner.id,
  name: partner.name,
  normalizedName: partner.normalizedName,
  periods: partner.periods.map((period) => ({
    closedAt: period.closedAt?.toISOString() ?? null,
    closingNote: period.closingNote,
    endedOn: fromCivilDate(period.endedOn),
    id: period.id,
    startedOn: fromCivilDate(period.startedOn),
    version: period.version,
  })),
  status: partner.status,
  updatedAt: partner.updatedAt.toISOString(),
  updatedBy: actorFromUser(partner.updatedBy),
  version: partner.version,
  website: partner.website,
});

const requirePartner = async (
  client: PartnerClient,
  partnerId: string,
): Promise<PartnerDetailRecord> => {
  const redirect = await client.partnerOrganizationMergeRedirect.findUnique({
    select: { targetOrganizationId: true },
    where: { sourceOrganizationId: partnerId },
  });
  const partner = await client.partnerOrganization.findUnique({
    include: PARTNER_DETAIL_INCLUDE,
    where: { id: redirect?.targetOrganizationId ?? partnerId },
  });
  if (!partner) throw partnerErrors.notFound();

  return partner;
};

export const getPartner = async (
  partnerId: string,
  canViewPersons: boolean,
): Promise<PartnerDetail> =>
  mapPartnerDetail(await requirePartner(prisma, partnerId), canViewPersons);

const primaryChannels = <T extends { isPrimary: boolean; type: string }>(
  channels: readonly T[],
): T[] => {
  const seenTypes = new Set<string>();

  return channels.map((channel) => {
    if (seenTypes.has(channel.type)) return { ...channel, isPrimary: false };
    if (channel.isPrimary) {
      seenTypes.add(channel.type);

      return channel;
    }
    const firstOfType = !channels
      .slice(0, channels.indexOf(channel))
      .some((item) => item.type === channel.type);
    if (firstOfType) seenTypes.add(channel.type);

    return { ...channel, isPrimary: firstOfType };
  });
};

const channelCreateData = (
  channels: CreatePartnerInput['channels'] | UpdatePartnerInput['channels'],
) =>
  primaryChannels(channels).map((channel) => ({
    isPrimary: channel.isPrimary,
    label: channel.label,
    normalizedValue: normalizePartnerChannel(channel),
    type: channel.type,
    value: channel.value,
  }));

const allowedTransitions: Record<PartnerStatus, readonly PartnerStatus[]> = {
  ACTIVE: ['ACTIVE', 'ENDED'],
  CLOSED: ['CLOSED', 'DISCUSSION'],
  DISCUSSION: ['DISCUSSION', 'ACTIVE', 'CLOSED'],
  ENDED: ['ENDED', 'DISCUSSION'],
  PROSPECT: ['PROSPECT', 'DISCUSSION', 'CLOSED'],
};

const assertTransition = (
  before: PartnerOrganizationStatus,
  after: PartnerOrganizationStatus,
): void => {
  if (!allowedTransitions[before].includes(after)) {
    throw partnerErrors.invalidTransition();
  }
};

const touchPartner = async (
  transaction: Prisma.TransactionClient,
  input: { actorId: string; id: string; version: number },
): Promise<void> => {
  const result = await transaction.partnerOrganization.updateMany({
    data: { updatedById: input.actorId, version: { increment: 1 } },
    where: { id: input.id, version: input.version },
  });
  if (result.count !== 1) throw partnerErrors.versionConflict();
};

export const listPartners = async (
  input: {
    category?: 'PARTNER' | 'SPONSOR';
    cursor?: string;
    limit: number;
    q: string;
    sort: PartnerListSort;
    status?: PartnerStatus;
  },
  canViewPersons: boolean,
): Promise<PartnersListResponse> => {
  const normalizedQuery = normalizePartnerSearchValue(input.q);
  const filterHash = hashCursorFilters({
    category: input.category ?? null,
    q: normalizedQuery,
    sort: input.sort,
    status: input.status ?? null,
  });
  const cursor = input.cursor
    ? decodeKeysetCursor(input.cursor, {
        filterHash,
        resource: 'partners',
      })
    : null;
  if (input.cursor && !cursor) throw new RangeError('INVALID_CURSOR');
  const snapshotAt = cursor ? new Date(cursor.snapshotAt) : new Date();
  const cursorDate =
    cursor && input.sort === 'updated' ? new Date(cursor.sortValue) : null;
  if (cursorDate && Number.isNaN(cursorDate.getTime())) {
    throw new RangeError('INVALID_CURSOR');
  }
  const andFilters: Prisma.PartnerOrganizationWhereInput[] = [];
  if (normalizedQuery) {
    andFilters.push({
      OR: [
        { normalizedName: { contains: normalizedQuery } },
        { normalizedDomain: { contains: normalizedQuery } },
        {
          channels: {
            some: { normalizedValue: { contains: normalizedQuery } },
          },
        },
        ...(canViewPersons
          ? [
              {
                contacts: {
                  some: {
                    closedAt: null,
                    person: {
                      OR: [
                        {
                          normalizedNickname: {
                            contains: normalizedQuery,
                          },
                        },
                        {
                          normalizedFirstName: {
                            contains: normalizedQuery,
                          },
                        },
                        {
                          normalizedLastName: {
                            contains: normalizedQuery,
                          },
                        },
                      ],
                    },
                  },
                },
              } satisfies Prisma.PartnerOrganizationWhereInput,
            ]
          : []),
      ],
    });
  }
  if (cursor) {
    andFilters.push(
      input.sort === 'name'
        ? {
            OR: [
              { normalizedName: { gt: cursor.sortValue } },
              { id: { gt: cursor.id }, normalizedName: cursor.sortValue },
            ],
          }
        : cursorDate
          ? {
              OR: [
                { updatedAt: { lt: cursorDate } },
                { id: { lt: cursor.id }, updatedAt: cursorDate },
              ],
            }
          : {},
    );
  }

  const rows = await prisma.partnerOrganization.findMany({
    include: {
      categories: { select: { category: true } },
      contacts: {
        include: {
          person: {
            select: {
              firstName: true,
              id: true,
              lastName: true,
              nickname: true,
            },
          },
        },
        take: 1,
        where: { closedAt: null, isPrimary: true },
      },
      followUps: {
        include: { action: true },
        orderBy: [{ action: { dueOn: 'asc' } }, { occurredAt: 'desc' }],
        take: 1,
        where: { action: { completedAt: null } },
      },
    },
    orderBy:
      input.sort === 'name'
        ? [{ normalizedName: 'asc' }, { id: 'asc' }]
        : [{ updatedAt: 'desc' }, { id: 'desc' }],
    take: input.limit + 1,
    where: {
      updatedAt: { lte: snapshotAt },
      ...(input.status ? { status: input.status } : {}),
      ...(input.category
        ? { categories: { some: { category: input.category } } }
        : {}),
      ...(andFilters.length ? { AND: andFilters } : {}),
    },
  });
  const summaries: PartnerSummary[] = rows.map((row) => ({
    categories: row.categories.map(({ category }) => category),
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    name: row.name,
    normalizedName: row.normalizedName,
    openAction: row.followUps[0]?.action
      ? {
          description: row.followUps[0].action.description,
          dueOn: fromCivilDate(row.followUps[0].action.dueOn),
        }
      : null,
    primaryContact: personReference(
      row.contacts[0]?.person ?? null,
      canViewPersons,
    ),
    status: row.status,
    updatedAt: row.updatedAt.toISOString(),
    version: row.version,
    website: row.website,
  }));
  const page = buildCursorPaginationMeta(
    summaries,
    input.limit,
    snapshotAt,
    (item) => ({
      filterHash,
      id: item.id,
      resource: 'partners',
      snapshotAt: snapshotAt.toISOString(),
      sortValue: input.sort === 'name' ? item.normalizedName : item.updatedAt,
    }),
  );

  return { items: page.items, pagination: page.pagination };
};

const findDuplicateNames = async (
  input: CreatePartnerInput,
): Promise<string[]> => {
  const normalizedName = normalizePartnerSearchValue(input.name);
  const { domain } = normalizePartnerWebsite(input.website);
  const normalizedChannels = channelCreateData(input.channels).map(
    ({ normalizedValue }) => normalizedValue,
  );
  const matches = await prisma.partnerOrganization.findMany({
    select: { name: true },
    take: 5,
    where: {
      OR: [
        { normalizedName },
        ...(domain ? [{ normalizedDomain: domain }] : []),
        ...(normalizedChannels.length
          ? [
              {
                channels: {
                  some: { normalizedValue: { in: normalizedChannels } },
                },
              },
            ]
          : []),
      ],
    },
  });

  return [...new Set(matches.map(({ name }) => name))];
};

export const createPartner = async (
  input: CreatePartnerInput,
  actor: UserType,
  canViewPersons: boolean,
): Promise<PartnerMutationResponse> => {
  const duplicates = await findDuplicateNames(input);
  const normalizedName = normalizePartnerSearchValue(input.name);
  const { domain, website } = normalizePartnerWebsite(input.website);
  const partner = await prisma.$transaction(async (transaction) => {
    if (input.contact) {
      const person = await transaction.person.findUnique({
        select: { id: true },
        where: { id: input.contact.personId },
      });
      if (!person)
        throw partnerErrors.dependencyConflict('Contact introuvable');
    }
    const created = await transaction.partnerOrganization.create({
      data: {
        categories: {
          create: [...new Set(input.categories)].map((category) => ({
            category,
          })),
        },
        channels: { create: channelCreateData(input.channels) },
        createdById: actor.id,
        description: input.description,
        name: input.name,
        normalizedDomain: domain,
        normalizedName,
        status: input.status,
        updatedById: actor.id,
        website,
        ...(input.contact
          ? {
              contacts: {
                create: {
                  isPrimary: true,
                  label: input.contact.label,
                  personId: input.contact.personId,
                },
              },
            }
          : {}),
        ...(input.status === 'ACTIVE' || input.status === 'ENDED'
          ? {
              periods: {
                create: {
                  closedAt: input.status === 'ENDED' ? new Date() : null,
                  endedOn:
                    input.status === 'ENDED'
                      ? toCivilDate(input.endedOn)
                      : null,
                  startedOn: toCivilDate(input.startedOn),
                },
              },
            }
          : {}),
      },
      include: PARTNER_DETAIL_INCLUDE,
    });
    await createPartnerAudit(transaction, {
      action: AuditAction.PARTNER_CREATE,
      actor,
      description: 'Partenaire créé',
      entityId: created.id,
      metadata: { categories: input.categories, status: input.status },
    });

    return created;
  });

  return {
    ...(duplicates.length
      ? { duplicateWarning: { duplicateFound: true, names: duplicates } }
      : {}),
    partner: mapPartnerDetail(partner, canViewPersons),
  };
};

export const updatePartner = async (
  partnerId: string,
  input: UpdatePartnerInput,
  actor: UserType,
  canViewPersons: boolean,
): Promise<PartnerDetail> =>
  prisma.$transaction(async (transaction) => {
    const existing = await requirePartner(transaction, partnerId);
    assertTransition(existing.status, input.status);
    const { domain, website } = normalizePartnerWebsite(input.website);
    await touchPartner(transaction, {
      actorId: actor.id,
      id: existing.id,
      version: input.version,
    });
    await transaction.partnerOrganization.update({
      data: {
        description: input.description,
        name: input.name,
        normalizedDomain: domain,
        normalizedName: normalizePartnerSearchValue(input.name),
        status: input.status,
        website,
      },
      where: { id: existing.id },
    });
    await transaction.partnerOrganizationCategory.deleteMany({
      where: { organizationId: existing.id },
    });
    await transaction.partnerOrganizationCategory.createMany({
      data: [...new Set(input.categories)].map((category) => ({
        category,
        organizationId: existing.id,
      })),
    });
    await transaction.partnerOrganizationContactChannel.deleteMany({
      where: { organizationId: existing.id },
    });
    if (input.channels.length) {
      await transaction.partnerOrganizationContactChannel.createMany({
        data: channelCreateData(input.channels).map((channel) => ({
          ...channel,
          organizationId: existing.id,
        })),
      });
    }

    if (existing.status !== input.status && input.status === 'ACTIVE') {
      await transaction.partnerRelationshipPeriod.create({
        data: {
          organizationId: existing.id,
          startedOn: toCivilDate(input.startedOn),
        },
      });
    } else if (existing.status !== input.status && input.status === 'ENDED') {
      const openPeriod = await transaction.partnerRelationshipPeriod.findFirst({
        orderBy: { createdAt: 'desc' },
        where: { closedAt: null, organizationId: existing.id },
      });
      if (!openPeriod) {
        throw partnerErrors.dependencyConflict(
          'Aucune période active ne peut être terminée',
        );
      }
      await transaction.partnerRelationshipPeriod.update({
        data: {
          closedAt: new Date(),
          closingNote: input.closingNote,
          endedOn: toCivilDate(input.endedOn),
          version: { increment: 1 },
        },
        where: { id: openPeriod.id },
      });
    } else if (input.status === 'ACTIVE') {
      const openPeriod = await transaction.partnerRelationshipPeriod.findFirst({
        where: { closedAt: null, organizationId: existing.id },
      });
      if (openPeriod) {
        await transaction.partnerRelationshipPeriod.update({
          data: {
            startedOn: toCivilDate(input.startedOn),
            version: { increment: 1 },
          },
          where: { id: openPeriod.id },
        });
      }
    }

    await createPartnerAudit(transaction, {
      action:
        existing.status === input.status
          ? AuditAction.PARTNER_UPDATE
          : AuditAction.PARTNER_STATUS_UPDATE,
      actor,
      description:
        existing.status === input.status
          ? 'Informations du partenaire modifiées'
          : 'Statut du partenaire modifié',
      entityId: existing.id,
      metadata: {
        changedSections: ['information'],
        ...(existing.status !== input.status
          ? { fromStatus: existing.status, toStatus: input.status }
          : {}),
      },
      tabKey: 'information',
    });

    return mapPartnerDetail(
      await requirePartner(transaction, existing.id),
      canViewPersons,
    );
  });

export const addPartnerContact = async (
  partnerId: string,
  input: CreatePartnerContactInput,
  actor: UserType,
  canViewPersons: boolean,
): Promise<PartnerDetail> =>
  prisma.$transaction(async (transaction) => {
    const partner = await requirePartner(transaction, partnerId);
    const person = await transaction.person.findUnique({
      select: { id: true },
      where: { id: input.personId },
    });
    if (!person) throw partnerErrors.dependencyConflict('Contact introuvable');
    await touchPartner(transaction, {
      actorId: actor.id,
      id: partner.id,
      version: input.version,
    });
    if (input.isPrimary) {
      await transaction.partnerContact.updateMany({
        data: { isPrimary: false, version: { increment: 1 } },
        where: { closedAt: null, isPrimary: true, organizationId: partner.id },
      });
    }
    await transaction.partnerContact.create({
      data: {
        isPrimary: input.isPrimary,
        label: input.label,
        organizationId: partner.id,
        personId: input.personId,
        startedOn: toCivilDate(input.startedOn),
      },
    });
    await createPartnerAudit(transaction, {
      action: AuditAction.PARTNER_CONTACTS_UPDATE,
      actor,
      description: 'Contact ajouté au partenaire',
      entityId: partner.id,
      tabKey: 'contacts',
    });

    return mapPartnerDetail(
      await requirePartner(transaction, partner.id),
      canViewPersons,
    );
  });

export const updatePartnerContact = async (
  partnerId: string,
  contactId: string,
  input: UpdatePartnerContactInput,
  actor: UserType,
  canViewPersons: boolean,
): Promise<PartnerDetail> =>
  prisma.$transaction(async (transaction) => {
    const partner = await requirePartner(transaction, partnerId);
    const contact = await transaction.partnerContact.findFirst({
      where: { id: contactId, organizationId: partner.id },
    });
    if (!contact) throw partnerErrors.notFound();
    await touchPartner(transaction, {
      actorId: actor.id,
      id: partner.id,
      version: input.version,
    });
    if (input.isPrimary) {
      await transaction.partnerContact.updateMany({
        data: { isPrimary: false, version: { increment: 1 } },
        where: {
          closedAt: null,
          id: { not: contact.id },
          isPrimary: true,
          organizationId: partner.id,
        },
      });
    }
    await transaction.partnerContact.update({
      data: {
        ...(input.close === true
          ? {
              closedAt: new Date(),
              endedOn: toCivilDate(input.endedOn),
              isPrimary: false,
            }
          : input.close === false
            ? { closedAt: null, endedOn: null }
            : {}),
        ...(input.isPrimary !== undefined
          ? { isPrimary: input.close ? false : input.isPrimary }
          : {}),
        ...(input.label ? { label: input.label } : {}),
        ...(input.startedOn !== undefined
          ? { startedOn: toCivilDate(input.startedOn) }
          : {}),
        version: { increment: 1 },
      },
      where: { id: contact.id },
    });
    await createPartnerAudit(transaction, {
      action: AuditAction.PARTNER_CONTACTS_UPDATE,
      actor,
      description: input.close
        ? 'Liaison contact terminée'
        : 'Liaison contact modifiée',
      entityId: partner.id,
      tabKey: 'contacts',
    });

    return mapPartnerDetail(
      await requirePartner(transaction, partner.id),
      canViewPersons,
    );
  });

export const addPartnerFollowUp = async (
  partnerId: string,
  input: CreatePartnerFollowUpInput,
  actor: UserType,
  canViewPersons: boolean,
): Promise<PartnerDetail> =>
  prisma.$transaction(async (transaction) => {
    const partner = await requirePartner(transaction, partnerId);
    if (input.partnerContactId) {
      const contact = await transaction.partnerContact.findFirst({
        select: { id: true },
        where: {
          id: input.partnerContactId,
          organizationId: partner.id,
        },
      });
      if (!contact) throw partnerErrors.dependencyConflict('Contact invalide');
    }
    await touchPartner(transaction, {
      actorId: actor.id,
      id: partner.id,
      version: input.version,
    });
    await transaction.partnerFollowUpEntry.create({
      data: {
        action: input.action
          ? {
              create: {
                description: input.action.description,
                dueOn: toCivilDate(input.action.dueOn),
              },
            }
          : undefined,
        authorId: actor.id,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
        organizationId: partner.id,
        partnerContactId: input.partnerContactId ?? null,
        text: input.text,
      },
    });
    await createPartnerAudit(transaction, {
      action: AuditAction.PARTNER_FOLLOW_UP_CREATE,
      actor,
      description: 'Entrée de suivi ajoutée',
      entityId: partner.id,
      metadata: { hasAction: Boolean(input.action) },
      tabKey: 'follow-up',
    });

    return mapPartnerDetail(
      await requirePartner(transaction, partner.id),
      canViewPersons,
    );
  });

export const updatePartnerFollowUp = async (
  partnerId: string,
  entryId: string,
  input: UpdatePartnerFollowUpInput,
  actor: UserType,
  canViewPersons: boolean,
): Promise<PartnerDetail> =>
  prisma.$transaction(async (transaction) => {
    const partner = await requirePartner(transaction, partnerId);
    await touchPartner(transaction, {
      actorId: actor.id,
      id: partner.id,
      version: input.version,
    });
    const updated = await transaction.partnerFollowUpEntry.updateMany({
      data: {
        occurredAt: new Date(input.occurredAt),
        partnerContactId: input.partnerContactId,
        text: input.text,
        version: { increment: 1 },
      },
      where: { id: entryId, organizationId: partner.id },
    });
    if (!updated.count) throw partnerErrors.notFound();
    await createPartnerAudit(transaction, {
      action: AuditAction.PARTNER_FOLLOW_UP_UPDATE,
      actor,
      description: 'Entrée de suivi corrigée',
      entityId: partner.id,
      tabKey: 'follow-up',
    });

    return mapPartnerDetail(
      await requirePartner(transaction, partner.id),
      canViewPersons,
    );
  });

export const deletePartnerFollowUp = async (
  partnerId: string,
  entryId: string,
  version: number,
  actor: UserType,
  canViewPersons: boolean,
): Promise<PartnerDetail> =>
  prisma.$transaction(async (transaction) => {
    const partner = await requirePartner(transaction, partnerId);
    await touchPartner(transaction, {
      actorId: actor.id,
      id: partner.id,
      version,
    });
    const deleted = await transaction.partnerFollowUpEntry.deleteMany({
      where: { id: entryId, organizationId: partner.id },
    });
    if (!deleted.count) throw partnerErrors.notFound();
    await createPartnerAudit(transaction, {
      action: AuditAction.PARTNER_FOLLOW_UP_DELETE,
      actor,
      description: 'Entrée de suivi supprimée',
      entityId: partner.id,
      tabKey: 'follow-up',
    });

    return mapPartnerDetail(
      await requirePartner(transaction, partner.id),
      canViewPersons,
    );
  });

export const setPartnerActionCompleted = async (
  partnerId: string,
  entryId: string,
  input: { completed: boolean; version: number },
  actor: UserType,
  canViewPersons: boolean,
): Promise<PartnerDetail> =>
  prisma.$transaction(async (transaction) => {
    const partner = await requirePartner(transaction, partnerId);
    await touchPartner(transaction, {
      actorId: actor.id,
      id: partner.id,
      version: input.version,
    });
    const entry = await transaction.partnerFollowUpEntry.findFirst({
      include: { action: true },
      where: { id: entryId, organizationId: partner.id },
    });
    if (!entry?.action) throw partnerErrors.notFound();
    await transaction.partnerFollowUpAction.update({
      data: {
        completedAt: input.completed ? new Date() : null,
        completedById: input.completed ? actor.id : null,
        version: { increment: 1 },
      },
      where: { id: entry.action.id },
    });
    await createPartnerAudit(transaction, {
      action: AuditAction.PARTNER_FOLLOW_UP_COMPLETE,
      actor,
      description: input.completed
        ? 'Action de suivi terminée'
        : 'Action de suivi réouverte',
      entityId: partner.id,
      metadata: { completed: input.completed },
      tabKey: 'follow-up',
    });

    return mapPartnerDetail(
      await requirePartner(transaction, partner.id),
      canViewPersons,
    );
  });

export const getPartnerActivity = async (
  partnerId: string,
): Promise<PartnerActivityItem[]> => {
  await requirePartner(prisma, partnerId);
  const rows = await prisma.auditLog.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 100,
    where: { entityId: partnerId, entityType: 'PARTNER' },
  });

  return rows.map((row) => ({
    action: row.action,
    actor: {
      displayName:
        row.actorDisplayNameSnapshot ??
        row.actorLoginNameSnapshot ??
        'Compte indisponible',
      loginName: row.actorLoginNameSnapshot,
    },
    at: row.createdAt.toISOString(),
    description: row.description,
    id: row.id,
  }));
};

export const deletePartner = async (input: {
  actor: UserType;
  idempotencyKey: string;
  partnerId: string;
  version: number;
}): Promise<void> => {
  await prisma.$transaction(async (transaction) => {
    const replay =
      await transaction.partnerOrganizationDeletionTombstone.findFirst({
        where: { deletionOperationId: input.idempotencyKey },
      });
    if (replay) return;
    const partner = await requirePartner(transaction, input.partnerId);
    if (partner.version !== input.version) {
      throw partnerErrors.versionConflict();
    }
    if (
      partner.periods.length ||
      partner.contacts.length ||
      partner.followUps.length
    ) {
      throw partnerErrors.dependencyConflict(
        'Cette fiche possède déjà un historique métier. Terminez la relation ou fusionnez un doublon au lieu de la supprimer.',
      );
    }
    await createPartnerAudit(transaction, {
      action: AuditAction.PARTNER_DELETE,
      actor: input.actor,
      description: 'Fiche partenaire vide supprimée',
      entityId: partner.id,
    });
    await transaction.partnerOrganizationDeletionTombstone.create({
      data: {
        deletionOperationId: input.idempotencyKey,
        organizationId: partner.id,
      },
    });
    await transaction.partnerOrganization.delete({ where: { id: partner.id } });
  });
};
