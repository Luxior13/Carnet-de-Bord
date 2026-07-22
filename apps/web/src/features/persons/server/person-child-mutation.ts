import 'server-only';

import { Prisma } from '@prisma/client';

import type { UserType } from '$types/auth.types';

import { createPersonAudit, type PersonAuditChange } from './person-audit';

export const childFieldChange = (input: {
  after: unknown | null;
  before: unknown | null;
  changeType: 'CREATE' | 'DELETE' | 'UPDATE';
  fieldKey: string;
  recordId: string;
  sectionKey: string;
  sensitive: boolean;
}): PersonAuditChange => input;

export const auditContactMutation = async (
  transaction: Prisma.TransactionClient,
  input: {
    actor: UserType;
    changes: PersonAuditChange[];
    description: string;
    personId: string;
  },
): Promise<void> => {
  await createPersonAudit(transaction, {
    action: 'PERSON_UPDATE',
    actor: input.actor,
    changes: input.changes,
    description: input.description,
    entityId: input.personId,
  });
};
