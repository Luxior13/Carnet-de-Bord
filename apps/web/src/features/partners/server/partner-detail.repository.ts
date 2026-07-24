import 'server-only';

import type { Prisma, PrismaClient } from '@prisma/client';

import { formatPersonDisplayName } from '$features/persons/person.utils';
import { prisma } from '$server/prisma';

import type {
  PartnerActor,
  PartnerContact,
  PartnerContactPerson,
  PartnerDetail,
} from '../types/partner.types';
import { partnerErrors } from './partner-errors';
import { fromCivilDate } from './partner-normalization';

type PartnerClient = Prisma.TransactionClient | PrismaClient;

const PARTNER_FOLLOW_UP_INCLUDE = {
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
} as const satisfies Prisma.PartnerFollowUpEntryInclude;

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
    include: PARTNER_FOLLOW_UP_INCLUDE,
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
type PartnerFollowUpRecord = Prisma.PartnerFollowUpEntryGetPayload<{
  include: typeof PARTNER_FOLLOW_UP_INCLUDE;
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

export const personReference = (
  person: {
    firstName: string | null;
    id: string;
    lastName: string | null;
    nickname: string | null;
  } | null,
  canViewPersons: boolean,
): PartnerContactPerson | null =>
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

const mapFollowUp = (
  entry: PartnerFollowUpRecord,
  canViewPersons: boolean,
): PartnerDetail['followUps'][number] => ({
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
});

const mapPartnerDetail = (
  partner: PartnerDetailRecord,
  canViewPersons: boolean,
  openActionEntries: PartnerFollowUpRecord[],
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
  followUps: partner.followUps.map((entry) =>
    mapFollowUp(entry, canViewPersons),
  ),
  id: partner.id,
  name: partner.name,
  normalizedName: partner.normalizedName,
  openActions: openActionEntries.map((entry) =>
    mapFollowUp(entry, canViewPersons),
  ),
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

export const requirePartner = async (
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

export const loadPartnerDetail = async (
  client: PartnerClient,
  partnerId: string,
  canViewPersons: boolean,
): Promise<PartnerDetail> => {
  const partner = await requirePartner(client, partnerId);
  const openActionEntries = await client.partnerFollowUpEntry.findMany({
    include: PARTNER_FOLLOW_UP_INCLUDE,
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    where: {
      action: { is: { completedAt: null } },
      organizationId: partner.id,
    },
  });

  return mapPartnerDetail(partner, canViewPersons, openActionEntries);
};

export const getPartnerDetail = (
  partnerId: string,
  canViewPersons: boolean,
): Promise<PartnerDetail> =>
  loadPartnerDetail(prisma, partnerId, canViewPersons);
