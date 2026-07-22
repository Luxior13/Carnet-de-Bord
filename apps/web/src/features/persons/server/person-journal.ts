import 'server-only';

import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import type { PersonJournalFieldChange } from '$features/audit/system-activity.types';

import {
  decodePlainPersonAuditValues,
  decryptPersonAuditValues,
} from './person-audit';

export const PERSON_JOURNAL_QUERY_SHAPE = {
  entityId: z.string().trim().min(1).max(128).optional(),
  entityType: z.string().trim().min(1).max(40).optional(),
  fieldKey: z.string().trim().min(1).max(100).optional(),
  recordId: z.string().trim().min(1).max(128).optional(),
  sectionKey: z.string().trim().min(1).max(64).optional(),
} as const;

export type PersonJournalQuery = {
  entityId?: string;
  entityType?: string;
  fieldKey?: string;
  recordId?: string;
  sectionKey?: string;
};

export const validatePersonJournalQuery = (
  query: PersonJournalQuery,
  context: z.RefinementCtx,
): void => {
  if (Boolean(query.entityType) !== Boolean(query.entityId)) {
    context.addIssue({
      code: 'custom',
      message: 'entityType et entityId doivent être utilisés ensemble',
      path: ['entityId'],
    });
  }
  if (Boolean(query.sectionKey) !== Boolean(query.fieldKey)) {
    context.addIssue({
      code: 'custom',
      message: 'sectionKey et fieldKey doivent être utilisés ensemble',
      path: ['fieldKey'],
    });
  }
  if ((query.sectionKey || query.recordId) && !query.entityId) {
    context.addIssue({
      code: 'custom',
      message: 'Le filtre de champ exige une entité',
      path: ['entityId'],
    });
  }
};

export const PERSON_AUDIT_FIELD_CHANGE_SELECT = {
  afterValue: true,
  auditLogId: true,
  beforeValue: true,
  changeType: true,
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
} as const satisfies Prisma.AuditFieldChangeSelect;

type PersonJournalFieldChangeRecord = Prisma.AuditFieldChangeGetPayload<{
  select: typeof PERSON_AUDIT_FIELD_CHANGE_SELECT;
}>;

export const decodePersonJournalFieldChanges = (
  changes: readonly PersonJournalFieldChangeRecord[],
): PersonJournalFieldChange[] =>
  changes.map((change) => {
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
      after: values.after,
      before: values.before,
      fieldKey: change.fieldKey,
      id: change.id,
      recordId: change.recordId,
      sectionKey: change.sectionKey,
    };
  });

export const getPersonJournalFilterFields = (
  query: PersonJournalQuery,
): Record<string, string | null> => ({
  entityId: query.entityId ?? null,
  entityType: query.entityType ?? null,
  fieldKey: query.fieldKey ?? null,
  recordId: query.recordId ?? null,
  sectionKey: query.sectionKey ?? null,
});

export const getPersonJournalWhereFilters = (
  query: PersonJournalQuery,
): Prisma.AuditLogWhereInput[] => {
  const filters: Prisma.AuditLogWhereInput[] = [];
  if (query.entityId && query.entityType) {
    filters.push({ entityId: query.entityId, entityType: query.entityType });
  }
  if (query.fieldKey && query.sectionKey) {
    filters.push({
      fieldChanges: {
        some: {
          fieldKey: query.fieldKey,
          recordId: query.recordId ?? null,
          sectionKey: query.sectionKey,
        },
      },
    });
  }

  return filters;
};
