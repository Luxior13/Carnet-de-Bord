import 'server-only';

import { prisma } from '$server/prisma';
import { UserActionAuthorizationError } from '$server/user-action-authorization';
import { ErrorCode } from '$types/api.types';

import {
  isAllowedPersonHistoryField,
  PERSON_AUDIT_KEYS,
} from '../person.constants';
import { getPersonCapabilities } from '../person.permissions';
import type { PersonFieldHistoryResponse } from '../types/person.types';
import { requirePersonDetailRecord } from './person-core.service';
import {
  type PersonReader,
  projectPersonAuditActor,
  requirePersonRead,
} from './person-visibility';

export const getPersonFieldHistory = async (
  personId: string,
  input: { fieldKey: string; recordId?: string | null; sectionKey: string },
  reader: PersonReader,
): Promise<PersonFieldHistoryResponse> => {
  const recordId = input.recordId ?? null;
  if (
    !isAllowedPersonHistoryField(input.sectionKey, input.fieldKey, recordId)
  ) {
    throw new RangeError('INVALID_PERSON_HISTORY_FIELD');
  }
  requirePersonRead(
    reader,
    input.sectionKey === 'contacts' || input.sectionKey === 'social',
  );
  if (!getPersonCapabilities(reader).canViewProvenance) {
    throw new UserActionAuthorizationError(
      ErrorCode.FORBIDDEN,
      'Vous ne pouvez pas consulter la provenance.',
      403,
    );
  }
  await requirePersonDetailRecord(prisma, personId);
  // Only the latest author, action and date are used. Never load/decrypt values.
  const changes = await prisma.auditFieldChange.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: {
      auditLog: {
        select: {
          actorDisplayNameSnapshot: true,
          actorLoginNameSnapshot: true,
          user: { select: { id: true, isProtected: true } },
        },
      },
      changeType: true,
      createdAt: true,
      id: true,
    },
    take: 1,
    where: {
      entityId: personId,
      entityType: PERSON_AUDIT_KEYS.entityType,
      fieldKey: input.fieldKey,
      recordId,
      sectionKey: input.sectionKey,
    },
  });

  return {
    items: changes.map((change) => ({
      action: change.changeType,
      actor: projectPersonAuditActor(change.auditLog, reader),
      at: change.createdAt.toISOString(),
      id: change.id,
    })),
  };
};
