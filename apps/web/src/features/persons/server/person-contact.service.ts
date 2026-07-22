import 'server-only';

import { prisma } from '$server/prisma';
import type { UserType } from '$types/auth.types';

import { PERSON_AUDIT_KEYS, PERSON_LIMITS } from '../person.constants';
import type {
  CreatePersonEmailInput,
  CreatePersonPhoneInput,
  DeletePersonChildInput,
  UpdatePersonEmailInput,
  UpdatePersonPhoneInput,
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
import { normalizePersonEmail } from './person-normalization';

export const addPersonEmail = async (
  personId: string,
  input: CreatePersonEmailInput,
  actor: UserType,
): Promise<{
  duplicateWarning: PersonDuplicateWarning;
  person: PersonDetail;
}> =>
  prisma.$transaction(async (transaction) => {
    const current = await requirePersonDetailRecord(transaction, personId);
    if (current.emails.length >= PERSON_LIMITS.emails) {
      throw new RangeError('PERSON_EMAIL_LIMIT');
    }
    const normalizedEmail = normalizePersonEmail(input.email);
    const duplicateWarning = await getDuplicateWarning(transaction, {
      email: input.email,
      excludePersonId: personId,
    });
    await touchPerson(transaction, personId, input.personVersion);
    const isPrimary = current.emails.length === 0 || input.isPrimary;
    const previousPrimary = isPrimary
      ? (current.emails.find((email) => email.isPrimary) ?? null)
      : null;
    if (previousPrimary) {
      await transaction.personEmail.updateMany({
        data: { isPrimary: false, version: { increment: 1 } },
        where: { id: previousPrimary.id, personId },
      });
    }
    const email = await transaction.personEmail.create({
      data: {
        email: input.email,
        isPrimary,
        label: input.label,
        normalizedEmail,
        personId,
      },
    });
    await auditContactMutation(transaction, {
      actor,
      changes: [
        childFieldChange({
          after: email.email,
          before: null,
          changeType: 'CREATE',
          fieldKey: 'email',
          recordId: email.id,
          sectionKey: PERSON_AUDIT_KEYS.sections.contacts,
          sensitive: true,
        }),
        childFieldChange({
          after: email.label,
          before: null,
          changeType: 'CREATE',
          fieldKey: 'label',
          recordId: email.id,
          sectionKey: PERSON_AUDIT_KEYS.sections.contacts,
          sensitive: true,
        }),
        childFieldChange({
          after: email.isPrimary,
          before: null,
          changeType: 'CREATE',
          fieldKey: 'isPrimary',
          recordId: email.id,
          sectionKey: PERSON_AUDIT_KEYS.sections.contacts,
          sensitive: false,
        }),
        ...(previousPrimary
          ? [
              childFieldChange({
                after: false,
                before: true,
                changeType: 'UPDATE',
                fieldKey: 'isPrimary',
                recordId: previousPrimary.id,
                sectionKey: PERSON_AUDIT_KEYS.sections.contacts,
                sensitive: false,
              }),
            ]
          : []),
      ],
      description: 'Email ajouté à une fiche',
      personId,
    });
    const updated = await requirePersonDetailRecord(transaction, personId);

    return {
      duplicateWarning,
      person: await mapPersonDetail(transaction, updated),
    };
  });

export const updatePersonEmail = async (
  personId: string,
  emailId: string,
  input: UpdatePersonEmailInput,
  actor: UserType,
): Promise<{
  duplicateWarning: PersonDuplicateWarning;
  person: PersonDetail;
}> =>
  prisma.$transaction(async (transaction) => {
    const person = await requirePersonDetailRecord(transaction, personId);
    const current = person.emails.find((email) => email.id === emailId);
    if (!current) throw personErrors.notFound();
    if (person.version !== input.personVersion)
      throw personErrors.versionConflict();
    if (current.version !== input.version) throw personErrors.versionConflict();
    const isPrimary = person.emails.length === 1 ? true : input.isPrimary;
    if (current.isPrimary && !isPrimary) {
      throw personErrors.primaryConflict(
        "Choisissez d'abord un autre email principal",
      );
    }
    if (
      current.email === input.email &&
      current.isPrimary === isPrimary &&
      current.label === input.label
    ) {
      return {
        duplicateWarning: { duplicateFound: false },
        person: await mapPersonDetail(transaction, person),
      };
    }
    const duplicateWarning = await getDuplicateWarning(transaction, {
      email: input.email,
      excludePersonId: personId,
    });
    await touchPerson(transaction, personId, input.personVersion);
    const previousPrimary =
      isPrimary && !current.isPrimary
        ? (person.emails.find((email) => email.isPrimary) ?? null)
        : null;
    if (previousPrimary) {
      await transaction.personEmail.updateMany({
        data: { isPrimary: false, version: { increment: 1 } },
        where: { id: previousPrimary.id, personId },
      });
    }
    const update = await transaction.personEmail.updateMany({
      data: {
        email: input.email,
        isPrimary,
        label: input.label,
        normalizedEmail: normalizePersonEmail(input.email),
        version: { increment: 1 },
      },
      where: { id: emailId, personId, version: input.version },
    });
    if (update.count !== 1) throw personErrors.versionConflict();

    const changes = (
      [
        ['email', current.email, input.email, true],
        ['label', current.label, input.label, true],
        ['isPrimary', current.isPrimary, isPrimary, false],
      ] as const
    ).flatMap(([fieldKey, before, after, sensitive]) =>
      before === after
        ? []
        : [
            childFieldChange({
              after,
              before,
              changeType: 'UPDATE',
              fieldKey,
              recordId: emailId,
              sectionKey: PERSON_AUDIT_KEYS.sections.contacts,
              sensitive,
            }),
          ],
    );
    if (previousPrimary) {
      changes.push(
        childFieldChange({
          after: false,
          before: true,
          changeType: 'UPDATE',
          fieldKey: 'isPrimary',
          recordId: previousPrimary.id,
          sectionKey: PERSON_AUDIT_KEYS.sections.contacts,
          sensitive: false,
        }),
      );
    }
    await auditContactMutation(transaction, {
      actor,
      changes,
      description: 'Email d’une fiche modifié',
      personId,
    });
    const updated = await requirePersonDetailRecord(transaction, personId);

    return {
      duplicateWarning,
      person: await mapPersonDetail(transaction, updated),
    };
  });

export const deletePersonEmail = async (
  personId: string,
  emailId: string,
  input: DeletePersonChildInput,
  actor: UserType,
): Promise<PersonDetail> =>
  prisma.$transaction(async (transaction) => {
    const person = await requirePersonDetailRecord(transaction, personId);
    const current = person.emails.find((email) => email.id === emailId);
    if (!current) throw personErrors.notFound();
    if (current.version !== input.version) throw personErrors.versionConflict();
    const remaining = person.emails.filter((email) => email.id !== emailId);
    const replacement = input.replacementPrimaryId
      ? remaining.find((email) => email.id === input.replacementPrimaryId)
      : null;
    if (current.isPrimary && remaining.length > 0 && !replacement) {
      throw personErrors.primaryConflict(
        'Choisissez le nouvel email principal',
      );
    }
    await touchPerson(transaction, personId, input.personVersion);
    const deleted = await transaction.personEmail.deleteMany({
      where: { id: emailId, personId, version: input.version },
    });
    if (deleted.count !== 1) throw personErrors.versionConflict();
    if (replacement) {
      const promoted = await transaction.personEmail.updateMany({
        data: { isPrimary: true, version: { increment: 1 } },
        where: { id: replacement.id, isPrimary: false, personId },
      });
      if (promoted.count !== 1)
        throw personErrors.primaryConflict(
          'Email principal modifié simultanément',
        );
    }
    await auditContactMutation(transaction, {
      actor,
      changes: [
        ...(['email', 'label', 'isPrimary'] as const).map((fieldKey) =>
          childFieldChange({
            after: null,
            before: current[fieldKey],
            changeType: 'DELETE',
            fieldKey,
            recordId: current.id,
            sectionKey: PERSON_AUDIT_KEYS.sections.contacts,
            sensitive: fieldKey !== 'isPrimary',
          }),
        ),
        ...(replacement
          ? [
              childFieldChange({
                after: true,
                before: false,
                changeType: 'UPDATE',
                fieldKey: 'isPrimary',
                recordId: replacement.id,
                sectionKey: PERSON_AUDIT_KEYS.sections.contacts,
                sensitive: false,
              }),
            ]
          : []),
      ],
      description: 'Email supprimé d’une fiche',
      personId,
    });
    const updated = await requirePersonDetailRecord(transaction, personId);

    return mapPersonDetail(transaction, updated);
  });

export const addPersonPhone = async (
  personId: string,
  input: CreatePersonPhoneInput,
  actor: UserType,
): Promise<{
  duplicateWarning: PersonDuplicateWarning;
  person: PersonDetail;
}> =>
  prisma.$transaction(async (transaction) => {
    const current = await requirePersonDetailRecord(transaction, personId);
    if (current.phones.length >= PERSON_LIMITS.phones) {
      throw new RangeError('PERSON_PHONE_LIMIT');
    }
    const duplicateWarning = await getDuplicateWarning(transaction, {
      excludePersonId: personId,
      normalizedPhone: input.normalizedPhone,
    });
    await touchPerson(transaction, personId, input.personVersion);
    const isPrimary = current.phones.length === 0 || input.isPrimary;
    const previousPrimary = isPrimary
      ? (current.phones.find((phone) => phone.isPrimary) ?? null)
      : null;
    if (previousPrimary) {
      await transaction.personPhone.updateMany({
        data: { isPrimary: false, version: { increment: 1 } },
        where: { id: previousPrimary.id, personId },
      });
    }
    const phone = await transaction.personPhone.create({
      data: {
        isPrimary,
        label: input.label,
        normalizedPhone: input.normalizedPhone,
        personId,
        phone: input.phone,
      },
    });
    await auditContactMutation(transaction, {
      actor,
      changes: [
        childFieldChange({
          after: phone.phone,
          before: null,
          changeType: 'CREATE',
          fieldKey: 'phone',
          recordId: phone.id,
          sectionKey: PERSON_AUDIT_KEYS.sections.contacts,
          sensitive: true,
        }),
        childFieldChange({
          after: phone.label,
          before: null,
          changeType: 'CREATE',
          fieldKey: 'label',
          recordId: phone.id,
          sectionKey: PERSON_AUDIT_KEYS.sections.contacts,
          sensitive: true,
        }),
        childFieldChange({
          after: phone.isPrimary,
          before: null,
          changeType: 'CREATE',
          fieldKey: 'isPrimary',
          recordId: phone.id,
          sectionKey: PERSON_AUDIT_KEYS.sections.contacts,
          sensitive: false,
        }),
        ...(previousPrimary
          ? [
              childFieldChange({
                after: false,
                before: true,
                changeType: 'UPDATE',
                fieldKey: 'isPrimary',
                recordId: previousPrimary.id,
                sectionKey: PERSON_AUDIT_KEYS.sections.contacts,
                sensitive: false,
              }),
            ]
          : []),
      ],
      description: 'Téléphone ajouté à une fiche',
      personId,
    });
    const updated = await requirePersonDetailRecord(transaction, personId);

    return {
      duplicateWarning,
      person: await mapPersonDetail(transaction, updated),
    };
  });

export const updatePersonPhone = async (
  personId: string,
  phoneId: string,
  input: UpdatePersonPhoneInput,
  actor: UserType,
): Promise<{
  duplicateWarning: PersonDuplicateWarning;
  person: PersonDetail;
}> =>
  prisma.$transaction(async (transaction) => {
    const person = await requirePersonDetailRecord(transaction, personId);
    const current = person.phones.find((phone) => phone.id === phoneId);
    if (!current) throw personErrors.notFound();
    if (person.version !== input.personVersion)
      throw personErrors.versionConflict();
    if (current.version !== input.version) throw personErrors.versionConflict();
    const isPrimary = person.phones.length === 1 ? true : input.isPrimary;
    if (current.isPrimary && !isPrimary) {
      throw personErrors.primaryConflict(
        "Choisissez d'abord un autre téléphone principal",
      );
    }
    if (
      current.isPrimary === isPrimary &&
      current.label === input.label &&
      current.normalizedPhone === input.normalizedPhone &&
      current.phone === input.phone
    ) {
      return {
        duplicateWarning: { duplicateFound: false },
        person: await mapPersonDetail(transaction, person),
      };
    }
    const duplicateWarning = await getDuplicateWarning(transaction, {
      excludePersonId: personId,
      normalizedPhone: input.normalizedPhone,
    });
    await touchPerson(transaction, personId, input.personVersion);
    const previousPrimary =
      isPrimary && !current.isPrimary
        ? (person.phones.find((phone) => phone.isPrimary) ?? null)
        : null;
    if (previousPrimary) {
      await transaction.personPhone.updateMany({
        data: { isPrimary: false, version: { increment: 1 } },
        where: { id: previousPrimary.id, personId },
      });
    }
    const update = await transaction.personPhone.updateMany({
      data: {
        isPrimary,
        label: input.label,
        normalizedPhone: input.normalizedPhone,
        phone: input.phone,
        version: { increment: 1 },
      },
      where: { id: phoneId, personId, version: input.version },
    });
    if (update.count !== 1) throw personErrors.versionConflict();

    const changes = (
      [
        ['phone', current.phone, input.phone, true],
        ['label', current.label, input.label, true],
        ['isPrimary', current.isPrimary, isPrimary, false],
      ] as const
    ).flatMap(([fieldKey, before, after, sensitive]) =>
      before === after
        ? []
        : [
            childFieldChange({
              after,
              before,
              changeType: 'UPDATE',
              fieldKey,
              recordId: phoneId,
              sectionKey: PERSON_AUDIT_KEYS.sections.contacts,
              sensitive,
            }),
          ],
    );
    if (previousPrimary) {
      changes.push(
        childFieldChange({
          after: false,
          before: true,
          changeType: 'UPDATE',
          fieldKey: 'isPrimary',
          recordId: previousPrimary.id,
          sectionKey: PERSON_AUDIT_KEYS.sections.contacts,
          sensitive: false,
        }),
      );
    }
    await auditContactMutation(transaction, {
      actor,
      changes,
      description: 'Téléphone d’une fiche modifié',
      personId,
    });
    const updated = await requirePersonDetailRecord(transaction, personId);

    return {
      duplicateWarning,
      person: await mapPersonDetail(transaction, updated),
    };
  });

export const deletePersonPhone = async (
  personId: string,
  phoneId: string,
  input: DeletePersonChildInput,
  actor: UserType,
): Promise<PersonDetail> =>
  prisma.$transaction(async (transaction) => {
    const person = await requirePersonDetailRecord(transaction, personId);
    const current = person.phones.find((phone) => phone.id === phoneId);
    if (!current) throw personErrors.notFound();
    if (current.version !== input.version) throw personErrors.versionConflict();
    const remaining = person.phones.filter((phone) => phone.id !== phoneId);
    const replacement = input.replacementPrimaryId
      ? remaining.find((phone) => phone.id === input.replacementPrimaryId)
      : null;
    if (current.isPrimary && remaining.length > 0 && !replacement) {
      throw personErrors.primaryConflict(
        'Choisissez le nouveau téléphone principal',
      );
    }
    await touchPerson(transaction, personId, input.personVersion);
    const deleted = await transaction.personPhone.deleteMany({
      where: { id: phoneId, personId, version: input.version },
    });
    if (deleted.count !== 1) throw personErrors.versionConflict();
    if (replacement) {
      const promoted = await transaction.personPhone.updateMany({
        data: { isPrimary: true, version: { increment: 1 } },
        where: { id: replacement.id, isPrimary: false, personId },
      });
      if (promoted.count !== 1) {
        throw personErrors.primaryConflict(
          'Téléphone principal modifié simultanément',
        );
      }
    }
    await auditContactMutation(transaction, {
      actor,
      changes: [
        ...(['phone', 'label', 'isPrimary'] as const).map((fieldKey) =>
          childFieldChange({
            after: null,
            before: current[fieldKey],
            changeType: 'DELETE',
            fieldKey,
            recordId: current.id,
            sectionKey: PERSON_AUDIT_KEYS.sections.contacts,
            sensitive: fieldKey !== 'isPrimary',
          }),
        ),
        ...(replacement
          ? [
              childFieldChange({
                after: true,
                before: false,
                changeType: 'UPDATE',
                fieldKey: 'isPrimary',
                recordId: replacement.id,
                sectionKey: PERSON_AUDIT_KEYS.sections.contacts,
                sensitive: false,
              }),
            ]
          : []),
      ],
      description: 'Téléphone supprimé d’une fiche',
      personId,
    });
    const updated = await requirePersonDetailRecord(transaction, personId);

    return mapPersonDetail(transaction, updated);
  });
