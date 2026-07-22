import 'server-only';

import { prisma } from '$server/prisma';

import {
  isAllowedPersonHistoryField,
  PERSON_AUDIT_KEYS,
  PERSON_LIMITS,
} from '../person.constants';
import type { PersonFieldHistoryResponse } from '../types/person.types';
import {
  decodePlainPersonAuditValues,
  decryptPersonAuditValues,
} from './person-audit';
import { requirePersonDetailRecord } from './person-core.service';

export const getPersonFieldHistory = async (
  personId: string,
  input: { fieldKey: string; recordId?: string | null; sectionKey: string },
): Promise<PersonFieldHistoryResponse> => {
  const recordId = input.recordId ?? null;
  if (
    !isAllowedPersonHistoryField(input.sectionKey, input.fieldKey, recordId)
  ) {
    throw new RangeError('INVALID_PERSON_HISTORY_FIELD');
  }
  await requirePersonDetailRecord(prisma, personId);

  const changes = await prisma.auditFieldChange.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: {
      afterValue: true,
      auditLog: {
        select: {
          action: true,
          actorDisplayNameSnapshot: true,
          actorLoginNameSnapshot: true,
        },
      },
      auditLogId: true,
      beforeValue: true,
      changeType: true,
      createdAt: true,
      entityId: true,
      fieldKey: true,
      id: true,
      recordId: true,
      sectionKey: true,
      valueKeyVersion: true,
      valueMode: true,
      valuesAuthTag: true,
      valuesCiphertext: true,
      valuesIv: true,
    },
    take: PERSON_LIMITS.fieldHistory,
    where: {
      entityId: personId,
      entityType: PERSON_AUDIT_KEYS.entityType,
      fieldKey: input.fieldKey,
      recordId,
      sectionKey: input.sectionKey,
    },
  });

  return {
    items: changes.map((change) => {
      let values: { after: unknown | null; before: unknown | null } = {
        after: null,
        before: null,
      };
      if (change.valueMode === 'PLAIN') {
        values = decodePlainPersonAuditValues(change);
      } else if (
        change.valueMode === 'ENCRYPTED' &&
        change.valueKeyVersion !== null &&
        change.valuesAuthTag &&
        change.valuesCiphertext &&
        change.valuesIv
      ) {
        values = decryptPersonAuditValues({
          ...change,
          valueKeyVersion: change.valueKeyVersion,
          valuesAuthTag: change.valuesAuthTag,
          valuesCiphertext: change.valuesCiphertext,
          valuesIv: change.valuesIv,
        });
      }

      return {
        action: change.changeType,
        actor: {
          displayName:
            change.auditLog.actorDisplayNameSnapshot ??
            change.auditLog.actorLoginNameSnapshot ??
            'Compte indisponible',
          loginName: change.auditLog.actorLoginNameSnapshot,
        },
        after: values.after,
        at: change.createdAt.toISOString(),
        before: values.before,
        id: change.id,
      };
    }),
  };
};
