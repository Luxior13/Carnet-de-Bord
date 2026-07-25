import 'server-only';

import {
  AuditAction,
  type PartnerOrganizationStatus,
  Prisma,
} from '@prisma/client';

import {
  buildCursorPaginationMeta,
  decodeKeysetCursor,
  hashCursorFilters,
} from '$server/cursor-pagination';
import { prisma } from '$server/prisma';
import type { UserType } from '$types/auth.types';

import { PARTNER_STATUS_TRANSITIONS } from '../partner.constants';
import type {
  CreatePartnerFollowUpInput,
  CreatePartnerInput,
  UpdatePartnerFollowUpInput,
  UpdatePartnerInput,
  UpdatePartnerStatusInput,
} from '../schemas/partner.schemas';
import type {
  PartnerActivityItem,
  PartnerDetail,
  PartnerListSort,
  PartnerMutationResponse,
  PartnersListResponse,
  PartnerStatus,
  PartnerSummary,
} from '../types/partner.types';
import { createPartnerAudit } from './partner-audit';
import {
  lockPartnerForIndependentMutation,
  touchPartner,
} from './partner-concurrency';
import {
  getPartnerDetail,
  loadPartnerDetail,
  personReference,
  requirePartner,
  resolvePartnerId,
} from './partner-detail.repository';
import { partnerErrors } from './partner-errors';
import { PARTNER_FOLLOW_UP_EDIT_WINDOW_MS } from './partner-follow-up-policy';
import {
  fromCivilDate,
  normalizePartnerChannel,
  normalizePartnerSearchValue,
  normalizePartnerWebsite,
  toCivilDate,
} from './partner-normalization';
import {
  createPartnerTimelineEvent,
  getPartnerActorSnapshot,
} from './partner-timeline.service';

export {
  addPartnerChannel,
  deletePartnerChannel,
  updatePartnerChannel,
} from './partner-channel.service';
export {
  addPartnerContact,
  updatePartnerContact,
} from './partner-contact.service';

export const getPartner = async (
  partnerId: string,
  canViewPersons: boolean,
): Promise<PartnerDetail> => getPartnerDetail(partnerId, canViewPersons);

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
  channels: CreatePartnerInput['channels'],
): Array<{
  isPrimary: boolean;
  label: string;
  normalizedValue: string;
  type: 'EMAIL' | 'PHONE';
  value: string;
}> =>
  primaryChannels(channels).map((channel) => ({
    isPrimary: channel.isPrimary,
    label: channel.label,
    normalizedValue: normalizePartnerChannel(channel),
    type: channel.type,
    value: channel.value,
  }));

const assertTransition = (
  before: PartnerOrganizationStatus,
  after: PartnerOrganizationStatus,
): void => {
  const allowedTransitions = PARTNER_STATUS_TRANSITIONS[
    before
  ] as readonly PartnerStatus[];
  if (!allowedTransitions.includes(after)) {
    throw partnerErrors.invalidTransition();
  }
};

const assertPeriodDateOrder = (
  startedOn: Date | null,
  endedOn: Date | null,
): void => {
  if (startedOn && endedOn && endedOn.getTime() < startedOn.getTime()) {
    throw partnerErrors.dependencyConflict(
      'La date de fin ne peut pas précéder la date de début',
    );
  }
};

const touchPartnerForIndependentMutation = async (
  transaction: Prisma.TransactionClient,
  input: { actorId: string; id: string },
): Promise<void> => {
  await transaction.partnerOrganization.update({
    data: { updatedById: input.actorId },
    where: { id: input.id },
  });
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
        where: canViewPersons
          ? { closedAt: null, isPrimary: true }
          : { id: '__hidden_without_persons_view__' },
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
        throw partnerErrors.dependencyConflict('Interlocuteur introuvable');
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
    });
    await createPartnerAudit(transaction, {
      action: AuditAction.PARTNER_CREATE,
      actor,
      description: 'Partenaire créé',
      entityId: created.id,
      metadata: { categories: input.categories, status: input.status },
    });
    const createdPeriod =
      input.status === 'ACTIVE' || input.status === 'ENDED'
        ? await transaction.partnerRelationshipPeriod.findFirst({
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            select: { id: true },
            where: { organizationId: created.id },
          })
        : null;
    await createPartnerTimelineEvent(transaction, {
      actor,
      occurredAt: created.createdAt,
      organizationId: created.id,
      payload: {
        closingNote: null,
        endedOn: input.status === 'ENDED' ? input.endedOn : null,
        startedOn:
          input.status === 'ACTIVE' || input.status === 'ENDED'
            ? input.startedOn
            : null,
        status: input.status,
      },
      periodId: createdPeriod?.id ?? null,
      type: 'RELATIONSHIP_CREATED',
    });

    return loadPartnerDetail(transaction, created.id, canViewPersons);
  });

  return {
    ...(duplicates.length
      ? { duplicateWarning: { duplicateFound: true, names: duplicates } }
      : {}),
    partner,
  };
};

export const updatePartner = async (
  partnerId: string,
  input: UpdatePartnerInput,
  actor: UserType,
  canViewPersons: boolean,
): Promise<PartnerDetail> =>
  prisma.$transaction(async (transaction) => {
    const existing = await requirePartner(
      transaction,
      partnerId,
      canViewPersons,
    );
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
    await createPartnerAudit(transaction, {
      action: AuditAction.PARTNER_UPDATE,
      actor,
      description: 'Informations du partenaire modifiées',
      entityId: existing.id,
      metadata: { changedSections: ['information'] },
      tabKey: 'information',
    });

    return loadPartnerDetail(transaction, existing.id, canViewPersons);
  });

export const updatePartnerStatus = async (
  partnerId: string,
  input: UpdatePartnerStatusInput,
  actor: UserType,
  canViewPersons: boolean,
): Promise<PartnerDetail> =>
  prisma.$transaction(async (transaction) => {
    const existing = await requirePartner(
      transaction,
      partnerId,
      canViewPersons,
    );
    assertTransition(existing.status, input.status);
    const statusChanged = existing.status !== input.status;
    const closesActivePeriod =
      existing.status === 'ACTIVE' && input.status !== 'ACTIVE';
    const currentPeriod =
      existing.status === 'ACTIVE'
        ? await transaction.partnerRelationshipPeriod.findFirst({
            orderBy: { createdAt: 'desc' },
            where: { closedAt: null, organizationId: existing.id },
          })
        : existing.status === 'ENDED'
          ? await transaction.partnerRelationshipPeriod.findFirst({
              orderBy: { createdAt: 'desc' },
              where: { closedAt: { not: null }, organizationId: existing.id },
            })
          : null;
    const periodChanged =
      !statusChanged &&
      ((input.status === 'ACTIVE' &&
        fromCivilDate(currentPeriod?.startedOn ?? null) !== input.startedOn) ||
        (input.status === 'ENDED' &&
          (fromCivilDate(currentPeriod?.startedOn ?? null) !==
            input.startedOn ||
            fromCivilDate(currentPeriod?.endedOn ?? null) !== input.endedOn ||
            (currentPeriod?.closingNote ?? null) !== input.closingNote)));
    const eventOccurredAt = new Date();
    let eventPeriodId = currentPeriod?.id ?? null;
    if (!statusChanged && !periodChanged) {
      return loadPartnerDetail(transaction, existing.id, canViewPersons);
    }

    await touchPartner(transaction, {
      actorId: actor.id,
      id: existing.id,
      version: input.version,
    });
    if (statusChanged) {
      await transaction.partnerOrganization.update({
        data: { status: input.status },
        where: { id: existing.id },
      });
    }

    if (statusChanged && input.status === 'ACTIVE') {
      const period = await transaction.partnerRelationshipPeriod.create({
        data: {
          organizationId: existing.id,
          startedOn: toCivilDate(input.startedOn),
        },
      });
      eventPeriodId = period.id;
      await createPartnerAudit(transaction, {
        action: AuditAction.PARTNER_PERIOD_CREATE,
        actor,
        description: 'Période de relation créée',
        entityId: existing.id,
        tabKey: 'information',
      });
    } else if (statusChanged && closesActivePeriod) {
      const openPeriod = currentPeriod;
      if (!openPeriod) {
        throw partnerErrors.dependencyConflict(
          'Aucune période active ne peut être terminée',
        );
      }
      const endedOn = toCivilDate(input.endedOn);
      assertPeriodDateOrder(openPeriod.startedOn, endedOn);
      await transaction.partnerRelationshipPeriod.update({
        data: {
          closedAt: new Date(),
          closingNote: input.closingNote,
          endedOn,
          version: { increment: 1 },
        },
        where: { id: openPeriod.id },
      });
      await createPartnerAudit(transaction, {
        action: AuditAction.PARTNER_PERIOD_UPDATE,
        actor,
        description:
          input.status === 'DISCUSSION'
            ? 'Période clôturée avant la reprise des échanges'
            : 'Période de relation terminée',
        entityId: existing.id,
        tabKey: 'information',
      });
    } else if (periodChanged && currentPeriod) {
      const startedOn = toCivilDate(input.startedOn);
      const endedOn =
        input.status === 'ENDED' ? toCivilDate(input.endedOn) : null;
      assertPeriodDateOrder(startedOn, endedOn);
      await transaction.partnerRelationshipPeriod.update({
        data: {
          startedOn,
          ...(input.status === 'ENDED'
            ? { closingNote: input.closingNote, endedOn }
            : {}),
          version: { increment: 1 },
        },
        where: { id: currentPeriod.id },
      });
    } else if (periodChanged) {
      throw partnerErrors.dependencyConflict(
        'La période de relation à corriger est introuvable',
      );
    }

    if (statusChanged) {
      await createPartnerAudit(transaction, {
        action: AuditAction.PARTNER_STATUS_UPDATE,
        actor,
        description: 'Statut du partenaire modifié',
        entityId: existing.id,
        metadata: {
          changedSections: ['follow-up'],
          fromStatus: existing.status,
          toStatus: input.status,
        },
        tabKey: 'follow-up',
      });
      await createPartnerTimelineEvent(transaction, {
        actor,
        occurredAt: eventOccurredAt,
        organizationId: existing.id,
        payload: {
          closingNote: closesActivePeriod ? input.closingNote : null,
          endedOn: closesActivePeriod ? input.endedOn : null,
          fromStatus: existing.status,
          startedOn:
            input.status === 'ACTIVE'
              ? input.startedOn
              : closesActivePeriod
                ? fromCivilDate(currentPeriod?.startedOn ?? null)
                : null,
          toStatus: input.status,
        },
        periodId: eventPeriodId,
        type: 'STATUS_CHANGED',
      });
    } else {
      await createPartnerAudit(transaction, {
        action: AuditAction.PARTNER_PERIOD_UPDATE,
        actor,
        description: 'Période de relation corrigée',
        entityId: existing.id,
        metadata: { changedSections: ['information'] },
        tabKey: 'information',
      });
      await createPartnerTimelineEvent(transaction, {
        actor,
        occurredAt: eventOccurredAt,
        organizationId: existing.id,
        payload: {
          closingNote: input.status === 'ENDED' ? input.closingNote : null,
          endedOn: input.status === 'ENDED' ? input.endedOn : null,
          previousClosingNote: currentPeriod?.closingNote ?? null,
          previousEndedOn: fromCivilDate(currentPeriod?.endedOn ?? null),
          previousStartedOn: fromCivilDate(currentPeriod?.startedOn ?? null),
          startedOn: input.startedOn,
          status: input.status,
        },
        periodId: eventPeriodId,
        type: 'PERIOD_CORRECTED',
      });
    }

    return loadPartnerDetail(transaction, existing.id, canViewPersons);
  });

export const addPartnerFollowUp = async (
  partnerId: string,
  input: CreatePartnerFollowUpInput,
  actor: UserType,
  canViewPersons: boolean,
): Promise<PartnerDetail> =>
  prisma.$transaction(async (transaction) => {
    const partner = await requirePartner(
      transaction,
      partnerId,
      canViewPersons,
    );
    const authorSnapshot = getPartnerActorSnapshot(actor);
    if (input.partnerContactId) {
      const contact = await transaction.partnerContact.findFirst({
        select: { id: true },
        where: {
          id: input.partnerContactId,
          organizationId: partner.id,
        },
      });
      if (!contact)
        throw partnerErrors.dependencyConflict('Interlocuteur invalide');
    }
    await touchPartnerForIndependentMutation(transaction, {
      actorId: actor.id,
      id: partner.id,
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
        authorDisplayNameSnapshot: authorSnapshot.actorDisplayNameSnapshot,
        authorId: actor.id,
        authorLoginNameSnapshot: authorSnapshot.actorLoginNameSnapshot,
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

    return loadPartnerDetail(transaction, partner.id, canViewPersons);
  });

export const updatePartnerFollowUp = async (
  partnerId: string,
  entryId: string,
  input: UpdatePartnerFollowUpInput,
  actor: UserType,
  canViewPersons: boolean,
): Promise<PartnerDetail> =>
  prisma.$transaction(async (transaction) => {
    const partner = await requirePartner(
      transaction,
      partnerId,
      canViewPersons,
    );
    await lockPartnerForIndependentMutation(transaction, partner.id);
    const entry = await transaction.partnerFollowUpEntry.findFirst({
      select: {
        action: { select: { completedAt: true } },
        authorId: true,
        createdAt: true,
        id: true,
        timelineEvents: {
          select: { id: true },
          take: 1,
          where: { type: 'ACTION_COMPLETED' },
        },
      },
      where: { id: entryId, organizationId: partner.id },
    });
    if (!entry) throw partnerErrors.notFound();
    if (entry.authorId !== actor.id) throw partnerErrors.followUpForbidden();
    if (entry.action?.completedAt || entry.timelineEvents.length > 0) {
      throw partnerErrors.followUpActionLocked();
    }
    const now = new Date();
    if (
      now.getTime() >=
      entry.createdAt.getTime() + PARTNER_FOLLOW_UP_EDIT_WINDOW_MS
    ) {
      throw partnerErrors.followUpEditExpired();
    }
    if (input.partnerContactId) {
      const contact = await transaction.partnerContact.findFirst({
        select: { id: true },
        where: {
          id: input.partnerContactId,
          organizationId: partner.id,
        },
      });
      if (!contact)
        throw partnerErrors.dependencyConflict('Interlocuteur invalide');
    }
    const updated = await transaction.partnerFollowUpEntry.updateMany({
      data: {
        ...(input.partnerContactId !== undefined
          ? { partnerContactId: input.partnerContactId }
          : {}),
        text: input.text,
        version: { increment: 1 },
      },
      where: {
        id: entryId,
        organizationId: partner.id,
        version: input.entryVersion,
      },
    });
    if (updated.count !== 1) throw partnerErrors.followUpVersionConflict();
    await touchPartnerForIndependentMutation(transaction, {
      actorId: actor.id,
      id: partner.id,
    });
    await createPartnerAudit(transaction, {
      action: AuditAction.PARTNER_FOLLOW_UP_UPDATE,
      actor,
      description: 'Entrée de suivi corrigée',
      entityId: partner.id,
      tabKey: 'follow-up',
    });

    return loadPartnerDetail(transaction, partner.id, canViewPersons);
  });

export const deletePartnerFollowUp = async (
  partnerId: string,
  entryId: string,
  version: number,
  actor: UserType,
  canViewPersons: boolean,
): Promise<PartnerDetail> =>
  prisma.$transaction(async (transaction) => {
    const partner = await requirePartner(
      transaction,
      partnerId,
      canViewPersons,
    );
    const entry = await transaction.partnerFollowUpEntry.findFirst({
      select: { action: { select: { id: true } }, id: true },
      where: { id: entryId, organizationId: partner.id },
    });
    if (!entry) throw partnerErrors.notFound();
    if (entry.action) {
      throw partnerErrors.dependencyConflict(
        'Une note liée à une action appartient à l’historique métier et ne peut plus être supprimée. Corrigez-la si nécessaire.',
      );
    }
    await touchPartner(transaction, {
      actorId: actor.id,
      id: partner.id,
      version,
    });
    const deleted = await transaction.partnerFollowUpEntry.deleteMany({
      where: { id: entryId, organizationId: partner.id },
    });
    if (!deleted.count) throw partnerErrors.versionConflict();
    await createPartnerAudit(transaction, {
      action: AuditAction.PARTNER_FOLLOW_UP_DELETE,
      actor,
      description: 'Entrée de suivi supprimée',
      entityId: partner.id,
      tabKey: 'follow-up',
    });

    return loadPartnerDetail(transaction, partner.id, canViewPersons);
  });

export const setPartnerActionCompleted = async (
  partnerId: string,
  entryId: string,
  input: { actionVersion: number; completed: boolean },
  actor: UserType,
  canViewPersons: boolean,
): Promise<PartnerDetail> =>
  prisma.$transaction(async (transaction) => {
    const partner = await requirePartner(
      transaction,
      partnerId,
      canViewPersons,
    );
    await lockPartnerForIndependentMutation(transaction, partner.id);
    const entry = await transaction.partnerFollowUpEntry.findFirst({
      include: { action: true },
      where: { id: entryId, organizationId: partner.id },
    });
    if (!entry?.action) throw partnerErrors.notFound();
    if (Boolean(entry.action.completedAt) === input.completed) {
      return loadPartnerDetail(transaction, partner.id, canViewPersons);
    }
    const completedAt = input.completed ? new Date() : null;
    const eventOccurredAt = completedAt ?? new Date();
    const completerSnapshot = input.completed
      ? getPartnerActorSnapshot(actor)
      : null;
    const updated = await transaction.partnerFollowUpAction.updateMany({
      data: {
        completedAt,
        completedByDisplayNameSnapshot:
          completerSnapshot?.actorDisplayNameSnapshot ?? null,
        completedById: input.completed ? actor.id : null,
        completedByLoginNameSnapshot:
          completerSnapshot?.actorLoginNameSnapshot ?? null,
        version: { increment: 1 },
      },
      where: { id: entry.action.id, version: input.actionVersion },
    });
    if (updated.count !== 1) throw partnerErrors.versionConflict();
    await touchPartnerForIndependentMutation(transaction, {
      actorId: actor.id,
      id: partner.id,
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
    await createPartnerTimelineEvent(transaction, {
      actionId: entry.action.id,
      actor,
      followUpEntryId: entry.id,
      occurredAt: eventOccurredAt,
      organizationId: partner.id,
      payload: input.completed
        ? {
            completedAt: eventOccurredAt.toISOString(),
            description: entry.action.description,
            dueOn: fromCivilDate(entry.action.dueOn),
          }
        : {
            description: entry.action.description,
            dueOn: fromCivilDate(entry.action.dueOn),
          },
      type: input.completed ? 'ACTION_COMPLETED' : 'ACTION_REOPENED',
    });

    return loadPartnerDetail(transaction, partner.id, canViewPersons);
  });

export const getPartnerActivity = async (
  partnerId: string,
): Promise<PartnerActivityItem[]> => {
  const canonicalId = await resolvePartnerId(prisma, partnerId);
  const rows = await prisma.auditLog.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 100,
    where: { entityId: canonicalId, entityType: 'PARTNER' },
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
    const canonicalId = await resolvePartnerId(transaction, input.partnerId);
    await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "public"."PartnerOrganization"
      WHERE "id" = ${canonicalId}
      FOR UPDATE
    `);
    const partner = await transaction.partnerOrganization.findUnique({
      select: {
        _count: { select: { followUps: true, timelineEvents: true } },
        contacts: { select: { id: true }, take: 1 },
        id: true,
        periods: { select: { id: true }, take: 1 },
        version: true,
      },
      where: { id: canonicalId },
    });
    if (!partner) throw partnerErrors.notFound();
    if (partner.version !== input.version) {
      throw partnerErrors.versionConflict();
    }
    if (
      partner.periods.length ||
      partner.contacts.length ||
      partner._count.followUps > 0 ||
      partner._count.timelineEvents > 1
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
