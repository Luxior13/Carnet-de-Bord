import 'server-only';

import type { Prisma, PrismaClient } from '@prisma/client';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

import { formatPersonDisplayName } from '$features/persons/person.utils';
import { prisma } from '$server/prisma';

import type {
  PartnerActor,
  PartnerContact,
  PartnerContactPerson,
  PartnerDetail,
  PartnerFollowUp,
} from '../types/partner.types';
import { partnerErrors } from './partner-errors';
import { buildPartnerFollowUpEditPolicy } from './partner-follow-up-policy';
import { fromCivilDate } from './partner-normalization';

type PartnerClient = Prisma.TransactionClient | PrismaClient;

export const PARTNER_FOLLOW_UP_INCLUDE = {
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
  timelineEvents: {
    select: { id: true },
    take: 1,
    where: { type: 'ACTION_COMPLETED' },
  },
} as const satisfies Prisma.PartnerFollowUpEntryInclude;

const PARTNER_DETAIL_INCLUDE = {
  _count: {
    select: {
      followUps: true,
      timelineEvents: true,
    },
  },
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
      selectedEmail: {
        select: {
          email: true,
          id: true,
          isPrimary: true,
          label: true,
          personId: true,
        },
      },
      selectedPhone: {
        select: {
          id: true,
          isPrimary: true,
          label: true,
          personId: true,
          phone: true,
        },
      },
    },
    orderBy: [
      { isPrimary: 'desc' },
      { closedAt: 'desc' },
      { createdAt: 'asc' },
    ],
  },
  createdBy: {
    select: { firstName: true, lastName: true, loginName: true },
  },
  periods: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] },
  updatedBy: {
    select: { firstName: true, lastName: true, loginName: true },
  },
} as const satisfies Prisma.PartnerOrganizationInclude;

const PARTNER_DETAIL_INCLUDE_WITHOUT_PERSONS = {
  ...PARTNER_DETAIL_INCLUDE,
  contacts: {
    ...PARTNER_DETAIL_INCLUDE.contacts,
    // Keep the response shape stable without selecting any liaison or Person
    // row when the caller cannot consult the Répertoire.
    where: { id: '__hidden_without_persons_view__' },
  },
} as const satisfies Prisma.PartnerOrganizationInclude;

type PartnerDetailRecord = Prisma.PartnerOrganizationGetPayload<{
  include: typeof PARTNER_DETAIL_INCLUDE;
}>;
export type PartnerFollowUpRecord = Prisma.PartnerFollowUpEntryGetPayload<{
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

const actorFromSnapshot = (
  displayName: string | null,
  loginName: string | null,
): PartnerActor | null =>
  displayName || loginName
    ? {
        displayName: displayName ?? loginName ?? 'Compte indisponible',
        loginName,
      }
    : null;

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
  selectedEmail:
    contact.closedAt === null &&
    contact.personId &&
    contact.selectedEmail?.personId === contact.personId &&
    canViewPersons
      ? {
          email: contact.selectedEmail.email,
          id: contact.selectedEmail.id,
          isPrimary: contact.selectedEmail.isPrimary,
          label: contact.selectedEmail.label,
        }
      : null,
  selectedPhone:
    contact.closedAt === null &&
    contact.personId &&
    contact.selectedPhone?.personId === contact.personId &&
    canViewPersons
      ? {
          id: contact.selectedPhone.id,
          isPrimary: contact.selectedPhone.isPrimary,
          label: contact.selectedPhone.label,
          phone: contact.selectedPhone.phone,
        }
      : null,
  startedOn: fromCivilDate(contact.startedOn),
  version: contact.version,
});

export const mapPartnerFollowUp = (
  entry: PartnerFollowUpRecord,
  access: {
    canManage: boolean;
    canViewPersons: boolean;
    currentUserId: string;
    now: Date;
  },
): PartnerFollowUp => ({
  action: entry.action
    ? {
        completedAt: entry.action.completedAt?.toISOString() ?? null,
        completedBy:
          actorFromSnapshot(
            entry.action.completedByDisplayNameSnapshot,
            entry.action.completedByLoginNameSnapshot,
          ) ?? actorFromUser(entry.action.completedBy),
        description: entry.action.description,
        dueOn: fromCivilDate(entry.action.dueOn),
        id: entry.action.id,
        version: entry.action.version,
      }
    : null,
  author: actorFromSnapshot(
    entry.authorDisplayNameSnapshot,
    entry.authorLoginNameSnapshot,
  ) ??
    actorFromUser(entry.author) ?? {
      displayName: 'Compte indisponible',
      loginName: null,
    },
  contact: personReference(
    entry.partnerContact?.person ?? null,
    access.canViewPersons,
  ),
  createdAt: entry.createdAt.toISOString(),
  editPolicy: buildPartnerFollowUpEditPolicy({
    authorId: entry.authorId,
    canManage: access.canManage,
    createdAt: entry.createdAt,
    currentUserId: access.currentUserId,
    hasCompletedActionEvent:
      Boolean(entry.action?.completedAt) || entry.timelineEvents.length > 0,
    now: access.now,
  }),
  entryVersion: entry.version,
  id: entry.id,
  occurredAt: entry.occurredAt.toISOString(),
  ...(access.canViewPersons
    ? { partnerContactId: entry.partnerContactId }
    : {}),
  text: entry.text,
  updatedAt: entry.updatedAt.toISOString(),
});

const mapPartnerDetail = (
  partner: PartnerDetailRecord,
  canViewPersons: boolean,
): PartnerDetail => ({
  categories: partner.categories.map(({ category }) => category),
  channels: partner.channels.map((channel) => ({
    countryCode:
      channel.type === 'PHONE'
        ? (parsePhoneNumberFromString(channel.normalizedValue)?.country ?? null)
        : null,
    id: channel.id,
    isPrimary: channel.isPrimary,
    label: channel.label,
    type: channel.type,
    value: channel.value,
    version: channel.version,
  })),
  contacts: canViewPersons
    ? partner.contacts.map((contact) => mapContact(contact, true))
    : [],
  createdAt: partner.createdAt.toISOString(),
  createdBy: actorFromUser(partner.createdBy),
  description: partner.description,
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

export const requirePartner = async (
  client: PartnerClient,
  partnerId: string,
  canViewPersons: boolean,
): Promise<PartnerDetailRecord> => {
  const redirect = await client.partnerOrganizationMergeRedirect.findUnique({
    select: { targetOrganizationId: true },
    where: { sourceOrganizationId: partnerId },
  });
  const partner = await client.partnerOrganization.findUnique({
    include: canViewPersons
      ? PARTNER_DETAIL_INCLUDE
      : PARTNER_DETAIL_INCLUDE_WITHOUT_PERSONS,
    where: { id: redirect?.targetOrganizationId ?? partnerId },
  });
  if (!partner) throw partnerErrors.notFound();

  return partner;
};

export const resolvePartnerId = async (
  client: PartnerClient,
  partnerId: string,
): Promise<string> => {
  const redirect = await client.partnerOrganizationMergeRedirect.findUnique({
    select: { targetOrganizationId: true },
    where: { sourceOrganizationId: partnerId },
  });
  const partner = await client.partnerOrganization.findUnique({
    select: { id: true },
    where: { id: redirect?.targetOrganizationId ?? partnerId },
  });
  if (!partner) throw partnerErrors.notFound();

  return partner.id;
};

export const loadPartnerDetail = async (
  client: PartnerClient,
  partnerId: string,
  canViewPersons: boolean,
): Promise<PartnerDetail> => {
  const partner = await requirePartner(client, partnerId, canViewPersons);

  return mapPartnerDetail(partner, canViewPersons);
};

export const getPartnerDetail = (
  partnerId: string,
  canViewPersons: boolean,
): Promise<PartnerDetail> =>
  loadPartnerDetail(prisma, partnerId, canViewPersons);
