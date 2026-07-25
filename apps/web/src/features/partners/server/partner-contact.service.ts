import 'server-only';

import { AuditAction, Prisma } from '@prisma/client';

import { prisma } from '$server/prisma';
import type { UserType } from '$types/auth.types';

import type {
  CreatePartnerContactInput,
  UpdatePartnerContactInput,
} from '../schemas/partner.schemas';
import type { PartnerDetail } from '../types/partner.types';
import { createPartnerAudit } from './partner-audit';
import { touchPartner } from './partner-concurrency';
import {
  assertPartnerContactCanBeAdded,
  assertPartnerContactCanBeUpdated,
  assertPartnerContactDateOrder,
} from './partner-contact-policy';
import {
  loadPartnerDetail,
  resolvePartnerId,
} from './partner-detail.repository';
import { partnerErrors } from './partner-errors';
import { toCivilDate } from './partner-normalization';

const rethrowPartnerContactConstraint = (error: unknown): never => {
  if (
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2003' || error.code === 'P2004')) ||
    (error instanceof Error &&
      /PartnerContact_selected(?:Email|Phone)_owner_check|PartnerContact_selected(?:Email|Phone)Id_fkey/u.test(
        error.message,
      ))
  ) {
    throw partnerErrors.dependencyConflict(
      'La coordonnée sélectionnée n’est plus disponible sur cette fiche du Répertoire',
    );
  }

  throw error;
};

const assertSelectedCoordinatesBelongToPerson = async (
  transaction: Prisma.TransactionClient,
  input: {
    personId: string;
    selectedEmailId: string | null;
    selectedPhoneId: string | null;
  },
): Promise<void> => {
  if (input.selectedEmailId) {
    const email = await transaction.personEmail.findFirst({
      select: { id: true },
      where: { id: input.selectedEmailId, personId: input.personId },
    });
    if (!email) {
      throw partnerErrors.dependencyConflict(
        'L’email sélectionné n’appartient plus à cette fiche du Répertoire',
      );
    }
  }
  if (input.selectedPhoneId) {
    const phone = await transaction.personPhone.findFirst({
      select: { id: true },
      where: { id: input.selectedPhoneId, personId: input.personId },
    });
    if (!phone) {
      throw partnerErrors.dependencyConflict(
        'Le téléphone sélectionné n’appartient plus à cette fiche du Répertoire',
      );
    }
  }
};

const createPartnerContact = async (
  transaction: Prisma.TransactionClient,
  input: {
    isPrimary: boolean;
    label: string;
    organizationId: string;
    personId: string;
    selectedEmailId: string | null;
    selectedPhoneId: string | null;
    startedOn: string | null;
  },
): Promise<string> => {
  try {
    const contact = await transaction.partnerContact.create({
      data: {
        ...input,
        startedOn: toCivilDate(input.startedOn),
      },
      select: { id: true },
    });

    return contact.id;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw partnerErrors.contactAlreadyActive();
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      throw partnerErrors.dependencyConflict(
        'Cette fiche du Répertoire n’est plus disponible',
      );
    }
    throw error;
  }
};

export const addPartnerContact = async (
  partnerId: string,
  input: CreatePartnerContactInput,
  actor: UserType,
  canViewPersons: boolean,
): Promise<PartnerDetail> => {
  try {
    return await prisma.$transaction(async (transaction) => {
      const partner = { id: await resolvePartnerId(transaction, partnerId) };
      const person = await transaction.person.findUnique({
        select: { id: true },
        where: { id: input.personId },
      });
      if (!person)
        throw partnerErrors.dependencyConflict('Interlocuteur introuvable');
      await assertSelectedCoordinatesBelongToPerson(transaction, {
        personId: input.personId,
        selectedEmailId: input.selectedEmailId ?? null,
        selectedPhoneId: input.selectedPhoneId ?? null,
      });
      await touchPartner(transaction, {
        actorId: actor.id,
        id: partner.id,
        version: input.version,
      });
      const activeContacts = await transaction.partnerContact.findMany({
        select: { id: true, isPrimary: true, personId: true },
        where: { closedAt: null, organizationId: partner.id },
      });
      assertPartnerContactCanBeAdded({
        activeContacts,
        personId: input.personId,
      });
      if (input.isPrimary) {
        await transaction.partnerContact.updateMany({
          data: { isPrimary: false, version: { increment: 1 } },
          where: {
            closedAt: null,
            isPrimary: true,
            organizationId: partner.id,
          },
        });
      }
      const contactId = await createPartnerContact(transaction, {
        isPrimary: input.isPrimary,
        label: input.label,
        organizationId: partner.id,
        personId: input.personId,
        selectedEmailId: input.selectedEmailId ?? null,
        selectedPhoneId: input.selectedPhoneId ?? null,
        startedOn: input.startedOn,
      });
      await createPartnerAudit(transaction, {
        action: AuditAction.PARTNER_CONTACTS_UPDATE,
        actor,
        description: 'Interlocuteur lié à l’organisation',
        entityId: partner.id,
        metadata: {
          changedFields: [
            'person',
            'label',
            'isPrimary',
            'startedOn',
            ...(input.selectedEmailId ? ['selectedEmail'] : []),
            ...(input.selectedPhoneId ? ['selectedPhone'] : []),
          ],
          changedSections: ['contacts'],
          changeKind: 'created',
          partnerContactId: contactId,
          previousPrimaryContactId: input.isPrimary
            ? (activeContacts.find(({ isPrimary }) => isPrimary)?.id ?? null)
            : null,
        },
        tabKey: 'contacts',
      });

      return loadPartnerDetail(transaction, partner.id, canViewPersons);
    });
  } catch (error) {
    return rethrowPartnerContactConstraint(error);
  }
};

export const updatePartnerContact = async (
  partnerId: string,
  contactId: string,
  input: UpdatePartnerContactInput,
  actor: UserType,
  canViewPersons: boolean,
): Promise<PartnerDetail> => {
  try {
    return await prisma.$transaction(async (transaction) => {
      const partner = { id: await resolvePartnerId(transaction, partnerId) };
      const contact = await transaction.partnerContact.findFirst({
        where: { id: contactId, organizationId: partner.id },
      });
      if (!contact) throw partnerErrors.contactVersionConflict();
      if (contact.version !== input.contactVersion) {
        throw partnerErrors.contactVersionConflict();
      }
      if (!contact.personId) {
        throw partnerErrors.dependencyConflict(
          'Une liaison anonymisée ne peut plus être modifiée',
        );
      }
      assertPartnerContactCanBeUpdated({
        close: input.close,
        isClosed: contact.closedAt !== null,
        isPrimary: input.isPrimary,
        updatesSelectedCoordinates:
          input.selectedEmailId !== undefined ||
          input.selectedPhoneId !== undefined,
      });
      const nextStartedOn =
        input.startedOn !== undefined
          ? toCivilDate(input.startedOn)
          : contact.startedOn;
      const nextEndedOn =
        input.close === true ? toCivilDate(input.endedOn) : contact.endedOn;
      const nextSelectedEmailId =
        input.selectedEmailId !== undefined
          ? input.selectedEmailId
          : contact.selectedEmailId;
      const nextSelectedPhoneId =
        input.selectedPhoneId !== undefined
          ? input.selectedPhoneId
          : contact.selectedPhoneId;
      assertPartnerContactDateOrder({
        endedOn: nextEndedOn,
        startedOn: nextStartedOn,
      });
      await assertSelectedCoordinatesBelongToPerson(transaction, {
        personId: contact.personId,
        selectedEmailId: nextSelectedEmailId,
        selectedPhoneId: nextSelectedPhoneId,
      });
      await touchPartner(transaction, {
        actorId: actor.id,
        id: partner.id,
        version: input.version,
      });
      const makesPrimary = input.isPrimary === true && input.close !== true;
      const previousPrimaryContact = makesPrimary
        ? await transaction.partnerContact.findFirst({
            select: { id: true },
            where: {
              closedAt: null,
              id: { not: contact.id },
              isPrimary: true,
              organizationId: partner.id,
            },
          })
        : null;
      if (makesPrimary) {
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
      const updatedContact = await transaction.partnerContact.updateMany({
        data: {
          ...(input.close === true
            ? {
                closedAt: new Date(),
                endedOn: nextEndedOn,
                isPrimary: false,
                selectedEmailId: null,
                selectedPhoneId: null,
              }
            : {}),
          ...(input.isPrimary !== undefined
            ? { isPrimary: input.close ? false : input.isPrimary }
            : {}),
          ...(input.label ? { label: input.label } : {}),
          ...(input.close !== true && input.selectedEmailId !== undefined
            ? { selectedEmailId: input.selectedEmailId }
            : {}),
          ...(input.close !== true && input.selectedPhoneId !== undefined
            ? { selectedPhoneId: input.selectedPhoneId }
            : {}),
          ...(input.startedOn !== undefined
            ? { startedOn: nextStartedOn }
            : {}),
          version: { increment: 1 },
        },
        where: {
          id: contact.id,
          organizationId: partner.id,
          version: input.contactVersion,
        },
      });
      if (updatedContact.count !== 1) {
        throw partnerErrors.contactVersionConflict();
      }
      const changedFields = [
        ...(input.close === true ? ['status'] : []),
        ...(input.label !== undefined ? ['label'] : []),
        ...(input.isPrimary !== undefined ? ['isPrimary'] : []),
        ...(input.startedOn !== undefined ? ['startedOn'] : []),
        ...(input.endedOn !== undefined ? ['endedOn'] : []),
        ...(input.selectedEmailId !== undefined ? ['selectedEmail'] : []),
        ...(input.selectedPhoneId !== undefined ? ['selectedPhone'] : []),
      ];
      await createPartnerAudit(transaction, {
        action: AuditAction.PARTNER_CONTACTS_UPDATE,
        actor,
        description: input.close
          ? 'Liaison avec l’interlocuteur terminée'
          : 'Liaison avec l’interlocuteur modifiée',
        entityId: partner.id,
        metadata: {
          changedFields,
          changedSections: ['contacts'],
          changeKind: input.close ? 'closed' : 'updated',
          partnerContactId: contact.id,
          previousPrimaryContactId: previousPrimaryContact?.id ?? null,
        },
        tabKey: 'contacts',
      });

      return loadPartnerDetail(transaction, partner.id, canViewPersons);
    });
  } catch (error) {
    return rethrowPartnerContactConstraint(error);
  }
};
