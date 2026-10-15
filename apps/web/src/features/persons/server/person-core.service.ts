import 'server-only';

import type { Prisma, PrismaClient } from '@prisma/client';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

import { PERMISSIONS } from '$constants/permissions.constants';
import { prisma } from '$server/prisma';

import { PERSON_AUDIT_KEYS } from '../person.constants';
import { getPersonCapabilities } from '../person.permissions';
import { calculateCivilAge, serializeCivilDate } from '../person.utils';
import type {
  CreatePersonInput,
  UpdatePersonInput,
} from '../schemas/person.schemas';
import type {
  PersonDetail,
  PersonDuplicateWarning,
  PersonEmailItem,
  PersonLastChange,
  PersonPhoneItem,
  PersonSocialProfileItem,
} from '../types/person.types';
import { createPersonAudit, type PersonAuditChange } from './person-audit';
import { getCreationDuplicateWarnings } from './person-duplicate-detection';
import { personErrors } from './person-errors';
import {
  authorizePersonMutation,
  type PersonMutationActor,
} from './person-mutation-authorization';
import {
  hashPersonNormalizedUrl,
  normalizePersonEmail,
  normalizePersonSocialIdentifier,
  normalizePersonSocialUrl,
  personIdentityData,
} from './person-normalization';
import {
  type PersonReader,
  projectPersonAuditActor,
  requirePersonRead,
} from './person-visibility';

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

const getLastPersonChange = async (
  client: PersonClient,
  personId: string,
  reader: PersonReader,
): Promise<PersonLastChange> => {
  const audit = await client.auditLog.findFirst({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: {
      action: true,
      actorDisplayNameSnapshot: true,
      actorLoginNameSnapshot: true,
      createdAt: true,
      user: { select: { id: true, isProtected: true } },
    },
    where: {
      entityId: personId,
      entityType: PERSON_AUDIT_KEYS.entityType,
    },
  });
  if (!audit) return null;

  return {
    action: audit.action,
    actor: projectPersonAuditActor(audit, reader),
    at: audit.createdAt.toISOString(),
  };
};

export const mapPersonDetail = async (
  client: PersonClient,
  person: PersonDetailRecord,
  reader: PersonReader,
): Promise<PersonDetail> => {
  requirePersonRead(reader);
  const { canViewContact } = getPersonCapabilities(reader);
  const birthDate = serializeCivilDate(person.birthDate);
  const age = calculateCivilAge(birthDate);

  return {
    age,
    birthDate,
    createdAt: person.createdAt.toISOString(),
    emails: canViewContact ? person.emails.map(toEmailItem) : [],
    firstName: person.firstName,
    id: person.id,
    isAdult: age === null ? null : age >= 18,
    lastChange: await getLastPersonChange(client, person.id, reader),
    lastName: person.lastName,
    nickname: person.nickname,
    phones: canViewContact ? person.phones.map(toPhoneItem) : [],
    socialProfiles: canViewContact
      ? person.socialProfiles.map(toSocialProfileItem)
      : [],
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
  const primaryIndices = new Map<string, number>();
  items.forEach((item, index) => {
    const selected = primaryIndices.get(item.networkKey);
    if (
      selected === undefined ||
      (item.isPrimary && !items.at(selected)?.isPrimary)
    ) {
      primaryIndices.set(item.networkKey, index);
    }
  });

  // Duplicate warning paths refer to input indexes, so selecting a primary
  // per network must preserve the original order of interleaved networks.
  return items.map((item, index) => ({
    ...item,
    isPrimary: primaryIndices.get(item.networkKey) === index,
  }));
};

export const getPerson = async (
  personId: string,
  reader: PersonReader,
): Promise<PersonDetail> =>
  prisma.$transaction(
    async (transaction) => {
      requirePersonRead(reader);
      const person = await requirePersonDetailRecord(transaction, personId);

      return mapPersonDetail(transaction, person, reader);
    },
    // Identity, coordinates and provenance must describe the same version.
    { isolationLevel: 'RepeatableRead' },
  );

export const createPerson = async (
  input: CreatePersonInput,
  actor: PersonMutationActor,
): Promise<{
  duplicateWarning: PersonDuplicateWarning;
  person: PersonDetail;
}> =>
  prisma.$transaction(async (transaction) => {
    await authorizePersonMutation(
      transaction,
      actor,
      PERMISSIONS.PERSONS.CREATE,
    );
    if (
      input.emails.length ||
      input.phones.length ||
      input.socialProfiles.length
    ) {
      await authorizePersonMutation(
        transaction,
        actor,
        PERMISSIONS.PERSONS.UPDATE_CONTACT,
      );
    }
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
          // `fieldKey` comes from the closed identity tuple above.
          /* eslint-disable security/detect-object-injection */
          const value =
            fieldKey === 'birthDate' ? input.birthDate : input[fieldKey];
          /* eslint-enable security/detect-object-injection */

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
          // `fieldKey` comes from the closed social-field tuple above.
          // eslint-disable-next-line security/detect-object-injection
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
      person: await mapPersonDetail(transaction, refreshed, actor),
    };
  });

export const updatePerson = async (
  personId: string,
  input: UpdatePersonInput,
  actor: PersonMutationActor,
): Promise<PersonDetail> =>
  prisma.$transaction(async (transaction) => {
    await authorizePersonMutation(
      transaction,
      actor,
      PERMISSIONS.PERSONS.UPDATE,
      personId,
    );
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
    if (changes.length === 0)
      return mapPersonDetail(transaction, current, actor);

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

    return mapPersonDetail(transaction, updated, actor);
  });
