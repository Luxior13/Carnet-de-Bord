import 'server-only';

import { prisma } from '$server/prisma';
import type { UserType } from '$types/auth.types';

import {
  isSelectablePersonSocialNetwork,
  PERSON_AUDIT_KEYS,
  PERSON_LIMITS,
} from '../person.constants';
import type {
  CreatePersonSocialProfileInput,
  DeletePersonChildInput,
  UpdatePersonSocialProfileInput,
} from '../schemas/person.schemas';
import type {
  PersonDetail,
  PersonDuplicateWarning,
} from '../types/person.types';
import {
  auditContactMutation,
  childFieldChange,
} from './person-child-mutation';
import {
  mapPersonDetail,
  requirePersonDetailRecord,
  touchPerson,
} from './person-core.service';
import { getDuplicateWarning } from './person-duplicate-detection';
import { personErrors } from './person-errors';
import {
  hashPersonNormalizedUrl,
  normalizePersonSocialIdentifier,
  normalizePersonSocialUrl,
} from './person-normalization';

const normalizeSocialInput = (input: {
  identifier?: string | null;
  profileUrl?: string | null;
}) => {
  const normalizedIdentifier = input.identifier
    ? normalizePersonSocialIdentifier(input.identifier)
    : null;
  const normalizedProfileUrl = input.profileUrl
    ? normalizePersonSocialUrl(input.profileUrl)
    : null;

  return {
    normalizedIdentifier,
    normalizedProfileUrl,
    normalizedProfileUrlHash: normalizedProfileUrl
      ? hashPersonNormalizedUrl(normalizedProfileUrl)
      : null,
  };
};

export const addPersonSocialProfile = async (
  personId: string,
  input: CreatePersonSocialProfileInput,
  actor: UserType,
): Promise<{
  duplicateWarning: PersonDuplicateWarning;
  person: PersonDetail;
}> =>
  prisma.$transaction(async (transaction) => {
    const current = await requirePersonDetailRecord(transaction, personId);
    if (current.socialProfiles.length >= PERSON_LIMITS.socialProfiles) {
      throw new RangeError('PERSON_SOCIAL_PROFILE_LIMIT');
    }
    const normalized = normalizeSocialInput(input);
    const duplicateWarning = await getDuplicateWarning(transaction, {
      excludePersonId: personId,
      networkKey: input.networkKey,
      normalizedIdentifier: normalized.normalizedIdentifier,
      normalizedProfileUrl: normalized.normalizedProfileUrl,
      normalizedProfileUrlHash: normalized.normalizedProfileUrlHash,
    });
    await touchPerson(transaction, personId, input.personVersion);
    const sameNetwork = current.socialProfiles.filter(
      (profile) => profile.networkKey === input.networkKey,
    );
    const isPrimary = sameNetwork.length === 0 || input.isPrimary;
    const previousPrimary = isPrimary
      ? (sameNetwork.find((profile) => profile.isPrimary) ?? null)
      : null;
    if (previousPrimary) {
      await transaction.personSocialProfile.updateMany({
        data: { isPrimary: false, version: { increment: 1 } },
        where: { id: previousPrimary.id, personId },
      });
    }
    const profile = await transaction.personSocialProfile.create({
      data: {
        identifier: input.identifier,
        isPrimary,
        label: input.label,
        networkKey: input.networkKey,
        ...normalized,
        personId,
        profileUrl: input.profileUrl,
      },
    });
    const changes = (
      ['networkKey', 'identifier', 'profileUrl', 'label', 'isPrimary'] as const
    ).flatMap((fieldKey) => {
      const value = profile[fieldKey];

      return value === null
        ? []
        : [
            childFieldChange({
              after: value,
              before: null,
              changeType: 'CREATE',
              fieldKey,
              recordId: profile.id,
              sectionKey: PERSON_AUDIT_KEYS.sections.social,
              sensitive: fieldKey !== 'networkKey' && fieldKey !== 'isPrimary',
            }),
          ];
    });
    if (previousPrimary) {
      changes.push(
        childFieldChange({
          after: false,
          before: true,
          changeType: 'UPDATE',
          fieldKey: 'isPrimary',
          recordId: previousPrimary.id,
          sectionKey: PERSON_AUDIT_KEYS.sections.social,
          sensitive: false,
        }),
      );
    }
    await auditContactMutation(transaction, {
      actor,
      changes,
      description: 'Réseau social ajouté à une fiche personne',
      personId,
    });
    const updated = await requirePersonDetailRecord(transaction, personId);

    return {
      duplicateWarning,
      person: await mapPersonDetail(transaction, updated),
    };
  });

export const updatePersonSocialProfile = async (
  personId: string,
  profileId: string,
  input: UpdatePersonSocialProfileInput,
  actor: UserType,
): Promise<{
  duplicateWarning: PersonDuplicateWarning;
  person: PersonDetail;
}> =>
  prisma.$transaction(async (transaction) => {
    const person = await requirePersonDetailRecord(transaction, personId);
    const current = person.socialProfiles.find(
      (profile) => profile.id === profileId,
    );
    if (!current) throw personErrors.notFound();
    if (person.version !== input.personVersion)
      throw personErrors.versionConflict();
    if (current.version !== input.version) throw personErrors.versionConflict();

    const targetNetworkProfiles = person.socialProfiles.filter(
      (profile) =>
        profile.networkKey === input.networkKey && profile.id !== profileId,
    );
    const sourceNetworkProfiles = person.socialProfiles.filter(
      (profile) =>
        profile.networkKey === current.networkKey && profile.id !== profileId,
    );
    const changingNetwork = current.networkKey !== input.networkKey;
    if (changingNetwork && !isSelectablePersonSocialNetwork(input.networkKey)) {
      throw new RangeError('PERSON_SOCIAL_NETWORK_DEPRECATED');
    }
    const isPrimary =
      targetNetworkProfiles.length === 0 ? true : input.isPrimary;
    if (!changingNetwork && current.isPrimary && !isPrimary) {
      throw personErrors.primaryConflict(
        "Choisissez d'abord un autre profil principal pour ce réseau",
      );
    }

    if (
      current.identifier === input.identifier &&
      current.isPrimary === isPrimary &&
      current.label === input.label &&
      current.networkKey === input.networkKey &&
      current.profileUrl === input.profileUrl
    ) {
      return {
        duplicateWarning: { duplicateFound: false },
        person: await mapPersonDetail(transaction, person),
      };
    }

    const normalized = normalizeSocialInput(input);
    const duplicateWarning = await getDuplicateWarning(transaction, {
      excludePersonId: personId,
      networkKey: input.networkKey,
      normalizedIdentifier: normalized.normalizedIdentifier,
      normalizedProfileUrl: normalized.normalizedProfileUrl,
      normalizedProfileUrlHash: normalized.normalizedProfileUrlHash,
    });
    await touchPerson(transaction, personId, input.personVersion);

    const previousTargetPrimary = isPrimary
      ? (targetNetworkProfiles.find((profile) => profile.isPrimary) ?? null)
      : null;
    if (previousTargetPrimary) {
      await transaction.personSocialProfile.updateMany({
        data: { isPrimary: false, version: { increment: 1 } },
        where: { id: previousTargetPrimary.id, personId },
      });
    }
    const sourceReplacement =
      changingNetwork && current.isPrimary
        ? (sourceNetworkProfiles.at(0) ?? null)
        : null;
    const update = await transaction.personSocialProfile.updateMany({
      data: {
        identifier: input.identifier,
        isPrimary,
        label: input.label,
        networkKey: input.networkKey,
        ...normalized,
        profileUrl: input.profileUrl,
        version: { increment: 1 },
      },
      where: { id: profileId, personId, version: input.version },
    });
    if (update.count !== 1) throw personErrors.versionConflict();
    if (sourceReplacement) {
      const promoted = await transaction.personSocialProfile.updateMany({
        data: { isPrimary: true, version: { increment: 1 } },
        where: { id: sourceReplacement.id, isPrimary: false, personId },
      });
      if (promoted.count !== 1) {
        throw personErrors.primaryConflict(
          'Profil principal modifié simultanément',
        );
      }
    }

    const changes = (
      [
        ['networkKey', current.networkKey, input.networkKey, false],
        ['identifier', current.identifier, input.identifier, true],
        ['profileUrl', current.profileUrl, input.profileUrl, true],
        ['label', current.label, input.label, true],
        ['isPrimary', current.isPrimary, isPrimary, false],
      ] as const
    ).flatMap(([fieldKey, before, after, sensitive]) =>
      before === after
        ? []
        : [
            childFieldChange({
              after: after ?? null,
              before: before ?? null,
              changeType: 'UPDATE',
              fieldKey,
              recordId: profileId,
              sectionKey: PERSON_AUDIT_KEYS.sections.social,
              sensitive,
            }),
          ],
    );
    for (const profile of [previousTargetPrimary, sourceReplacement]) {
      if (!profile) continue;
      changes.push(
        childFieldChange({
          after: profile === sourceReplacement,
          before: profile !== sourceReplacement,
          changeType: 'UPDATE',
          fieldKey: 'isPrimary',
          recordId: profile.id,
          sectionKey: PERSON_AUDIT_KEYS.sections.social,
          sensitive: false,
        }),
      );
    }
    await auditContactMutation(transaction, {
      actor,
      changes,
      description: 'Réseau social d’une fiche personne modifié',
      personId,
    });
    const updated = await requirePersonDetailRecord(transaction, personId);

    return {
      duplicateWarning,
      person: await mapPersonDetail(transaction, updated),
    };
  });

export const deletePersonSocialProfile = async (
  personId: string,
  profileId: string,
  input: DeletePersonChildInput,
  actor: UserType,
): Promise<PersonDetail> =>
  prisma.$transaction(async (transaction) => {
    const person = await requirePersonDetailRecord(transaction, personId);
    const current = person.socialProfiles.find(
      (profile) => profile.id === profileId,
    );
    if (!current) throw personErrors.notFound();
    if (current.version !== input.version) throw personErrors.versionConflict();
    const sameNetworkRemaining = person.socialProfiles.filter(
      (profile) =>
        profile.id !== profileId && profile.networkKey === current.networkKey,
    );
    const replacement = input.replacementPrimaryId
      ? sameNetworkRemaining.find(
          (profile) => profile.id === input.replacementPrimaryId,
        )
      : null;
    if (current.isPrimary && sameNetworkRemaining.length > 0 && !replacement) {
      throw personErrors.primaryConflict(
        'Choisissez le nouveau profil principal pour ce réseau',
      );
    }
    await touchPerson(transaction, personId, input.personVersion);
    const deleted = await transaction.personSocialProfile.deleteMany({
      where: { id: profileId, personId, version: input.version },
    });
    if (deleted.count !== 1) throw personErrors.versionConflict();
    if (replacement) {
      const promoted = await transaction.personSocialProfile.updateMany({
        data: { isPrimary: true, version: { increment: 1 } },
        where: { id: replacement.id, isPrimary: false, personId },
      });
      if (promoted.count !== 1) {
        throw personErrors.primaryConflict(
          'Profil principal modifié simultanément',
        );
      }
    }
    await auditContactMutation(transaction, {
      actor,
      changes: [
        ...(
          [
            'networkKey',
            'identifier',
            'profileUrl',
            'label',
            'isPrimary',
          ] as const
        ).flatMap((fieldKey) => {
          const value = current[fieldKey];

          return value === null
            ? []
            : [
                childFieldChange({
                  after: null,
                  before: value,
                  changeType: 'DELETE',
                  fieldKey,
                  recordId: current.id,
                  sectionKey: PERSON_AUDIT_KEYS.sections.social,
                  sensitive:
                    fieldKey !== 'networkKey' && fieldKey !== 'isPrimary',
                }),
              ];
        }),
        ...(replacement
          ? [
              childFieldChange({
                after: true,
                before: false,
                changeType: 'UPDATE',
                fieldKey: 'isPrimary',
                recordId: replacement.id,
                sectionKey: PERSON_AUDIT_KEYS.sections.social,
                sensitive: false,
              }),
            ]
          : []),
      ],
      description: 'Réseau social supprimé d’une fiche personne',
      personId,
    });
    const updated = await requirePersonDetailRecord(transaction, personId);

    return mapPersonDetail(transaction, updated);
  });
