import 'server-only';

import { AuditAction, Prisma } from '@prisma/client';

import { prisma } from '$server/prisma';
import type { UserType } from '$types/auth.types';

import { PARTNER_LIMITS } from '../partner.constants';
import {
  type CreatePartnerChannelInput,
  createPartnerChannelSchema,
  type DeletePartnerChannelInput,
  type UpdatePartnerChannelInput,
} from '../schemas/partner.schemas';
import type { PartnerDetail } from '../types/partner.types';
import { createPartnerAudit } from './partner-audit';
import { lockPartnerForIndependentMutation } from './partner-concurrency';
import {
  loadPartnerDetail,
  resolvePartnerId,
} from './partner-detail.repository';
import { partnerErrors } from './partner-errors';
import { normalizePartnerChannel } from './partner-normalization';

type ChannelDraft = {
  countryCode?: string;
  isPrimary: boolean;
  label: string;
  type: 'EMAIL' | 'PHONE';
  value: string;
};

type NormalizedChannelData = {
  isPrimary: boolean;
  label: string;
  normalizedValue: string;
  type: 'EMAIL' | 'PHONE';
  value: string;
};

const channelData = (input: ChannelDraft): NormalizedChannelData => {
  const parsed = createPartnerChannelSchema.parse(input);

  return {
    isPrimary: parsed.isPrimary,
    label: parsed.label,
    normalizedValue: normalizePartnerChannel(parsed),
    type: parsed.type,
    value: parsed.value,
  };
};

const rethrowPartnerChannelConstraint = (error: unknown): never => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    throw partnerErrors.channelAlreadyExists();
  }
  throw error;
};

const lockAndTouchPartner = async (
  transaction: Prisma.TransactionClient,
  input: { actorId: string; partnerId: string },
): Promise<string> => {
  const partnerId = await resolvePartnerId(transaction, input.partnerId);
  await lockPartnerForIndependentMutation(transaction, partnerId);
  await transaction.partnerOrganization.update({
    data: {
      updatedById: input.actorId,
      version: { increment: 1 },
    },
    where: { id: partnerId },
  });

  return partnerId;
};

export const addPartnerChannel = async (
  partnerId: string,
  input: CreatePartnerChannelInput,
  actor: UserType,
  canViewPersons: boolean,
): Promise<PartnerDetail> => {
  try {
    return await prisma.$transaction(async (transaction) => {
      const organizationId = await lockAndTouchPartner(transaction, {
        actorId: actor.id,
        partnerId,
      });
      const channels =
        await transaction.partnerOrganizationContactChannel.findMany({
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: { id: true, isPrimary: true, type: true },
          where: { organizationId },
        });
      if (channels.length >= PARTNER_LIMITS.channels) {
        throw partnerErrors.channelLimitReached();
      }
      const hasChannelOfType = channels.some(({ type }) => type === input.type);
      const data = channelData({
        countryCode: input.countryCode,
        isPrimary: input.isPrimary || !hasChannelOfType,
        label: input.label,
        type: input.type,
        value: input.value,
      });
      const previousPrimary = data.isPrimary
        ? (channels.find(
            ({ isPrimary, type }) => isPrimary && type === data.type,
          ) ?? null)
        : null;
      if (previousPrimary) {
        await transaction.partnerOrganizationContactChannel.updateMany({
          data: { isPrimary: false, version: { increment: 1 } },
          where: {
            id: previousPrimary.id,
            isPrimary: true,
            organizationId,
          },
        });
      }
      const created =
        await transaction.partnerOrganizationContactChannel.create({
          data: { ...data, organizationId },
          select: { id: true },
        });
      await createPartnerAudit(transaction, {
        action: AuditAction.PARTNER_CONTACTS_UPDATE,
        actor,
        description: 'Coordonnée générale ajoutée',
        entityId: organizationId,
        metadata: {
          changedFields: ['type', 'label', 'value', 'isPrimary'],
          changedSections: ['contacts'],
          changeKind: 'created',
          channelType: data.type,
          partnerChannelId: created.id,
        },
        tabKey: 'contacts',
      });

      return loadPartnerDetail(transaction, organizationId, canViewPersons);
    });
  } catch (error) {
    return rethrowPartnerChannelConstraint(error);
  }
};

export const updatePartnerChannel = async (
  partnerId: string,
  channelId: string,
  input: UpdatePartnerChannelInput,
  actor: UserType,
  canViewPersons: boolean,
): Promise<PartnerDetail> => {
  try {
    return await prisma.$transaction(async (transaction) => {
      const organizationId = await lockAndTouchPartner(transaction, {
        actorId: actor.id,
        partnerId,
      });
      const channel =
        await transaction.partnerOrganizationContactChannel.findFirst({
          where: { id: channelId, organizationId },
        });
      if (!channel) throw partnerErrors.channelNotFound();
      if (channel.version !== input.channelVersion) {
        throw partnerErrors.channelVersionConflict();
      }
      const data = channelData({
        countryCode: input.countryCode,
        isPrimary: input.isPrimary,
        label: input.label,
        type: channel.type,
        value: input.value,
      });
      const peers =
        await transaction.partnerOrganizationContactChannel.findMany({
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: { id: true, isPrimary: true },
          where: {
            id: { not: channel.id },
            organizationId,
            type: channel.type,
          },
        });
      const effectivePrimary = peers.length === 0 ? true : data.isPrimary;
      const replacement =
        channel.isPrimary && !effectivePrimary ? (peers[0] ?? null) : null;
      const changedFields = [
        ...(channel.label !== data.label ? ['label'] : []),
        ...(channel.value !== data.value ? ['value'] : []),
        ...(channel.isPrimary !== effectivePrimary ? ['isPrimary'] : []),
      ];
      if (effectivePrimary && !channel.isPrimary) {
        await transaction.partnerOrganizationContactChannel.updateMany({
          data: { isPrimary: false, version: { increment: 1 } },
          where: {
            id: { not: channel.id },
            isPrimary: true,
            organizationId,
            type: channel.type,
          },
        });
      }
      const updated =
        await transaction.partnerOrganizationContactChannel.updateMany({
          data: {
            isPrimary: effectivePrimary,
            label: data.label,
            normalizedValue: data.normalizedValue,
            value: data.value,
            version: { increment: 1 },
          },
          where: {
            id: channel.id,
            organizationId,
            version: input.channelVersion,
          },
        });
      if (updated.count !== 1) throw partnerErrors.channelVersionConflict();
      if (replacement) {
        const promoted =
          await transaction.partnerOrganizationContactChannel.updateMany({
            data: { isPrimary: true, version: { increment: 1 } },
            where: {
              id: replacement.id,
              isPrimary: false,
              organizationId,
            },
          });
        if (promoted.count !== 1) {
          throw partnerErrors.channelVersionConflict();
        }
      }
      await createPartnerAudit(transaction, {
        action: AuditAction.PARTNER_CONTACTS_UPDATE,
        actor,
        description: 'Coordonnée générale modifiée',
        entityId: organizationId,
        metadata: {
          changedFields,
          changedSections: ['contacts'],
          changeKind: 'updated',
          channelType: channel.type,
          partnerChannelId: channel.id,
        },
        tabKey: 'contacts',
      });

      return loadPartnerDetail(transaction, organizationId, canViewPersons);
    });
  } catch (error) {
    return rethrowPartnerChannelConstraint(error);
  }
};

export const deletePartnerChannel = async (
  partnerId: string,
  channelId: string,
  input: DeletePartnerChannelInput,
  actor: UserType,
  canViewPersons: boolean,
): Promise<PartnerDetail> =>
  prisma.$transaction(async (transaction) => {
    const organizationId = await lockAndTouchPartner(transaction, {
      actorId: actor.id,
      partnerId,
    });
    const channel =
      await transaction.partnerOrganizationContactChannel.findFirst({
        where: { id: channelId, organizationId },
      });
    if (!channel) throw partnerErrors.channelNotFound();
    if (channel.version !== input.channelVersion) {
      throw partnerErrors.channelVersionConflict();
    }
    const replacement = channel.isPrimary
      ? await transaction.partnerOrganizationContactChannel.findFirst({
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: { id: true },
          where: {
            id: { not: channel.id },
            organizationId,
            type: channel.type,
          },
        })
      : null;
    const deleted =
      await transaction.partnerOrganizationContactChannel.deleteMany({
        where: {
          id: channel.id,
          organizationId,
          version: input.channelVersion,
        },
      });
    if (deleted.count !== 1) throw partnerErrors.channelVersionConflict();
    if (replacement) {
      const promoted =
        await transaction.partnerOrganizationContactChannel.updateMany({
          data: { isPrimary: true, version: { increment: 1 } },
          where: {
            id: replacement.id,
            isPrimary: false,
            organizationId,
          },
        });
      if (promoted.count !== 1) throw partnerErrors.channelVersionConflict();
    }
    await createPartnerAudit(transaction, {
      action: AuditAction.PARTNER_CONTACTS_UPDATE,
      actor,
      description: 'Coordonnée générale supprimée',
      entityId: organizationId,
      metadata: {
        changedFields: ['deleted'],
        changedSections: ['contacts'],
        changeKind: 'deleted',
        channelType: channel.type,
        partnerChannelId: channel.id,
      },
      tabKey: 'contacts',
    });

    return loadPartnerDetail(transaction, organizationId, canViewPersons);
  });
