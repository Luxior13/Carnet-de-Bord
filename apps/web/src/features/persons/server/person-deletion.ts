import 'server-only';

import { prisma } from '$server/prisma';
import type { UserType } from '$types/auth.types';

import { assertPersonAuditConfigured, createPersonAudit } from './person-audit';
import { personErrors } from './person-errors';
import { isPersonEnvironmentConfigured } from './person-readiness';

const PERSON_FEATURE_READY_CACHE_MS = 5_000;

let personFeatureReadyUntil = 0;
let personFeatureReadyPromise: Promise<void> | null = null;

const performPersonFeatureReadinessCheck = async (): Promise<void> => {
  assertPersonAuditConfigured();
  const auditEncryptionKeyVersions =
    await prisma.auditEncryptionKeyVersion.findMany({
      orderBy: { version: 'asc' },
      select: { version: true },
    });
  if (
    !isPersonEnvironmentConfigured(
      auditEncryptionKeyVersions.map(({ version }) => version),
    )
  ) {
    throw personErrors.featureNotConfigured();
  }
};

export const assertPersonFeatureReady = async (): Promise<void> => {
  if (process.env.NODE_ENV !== 'test' && personFeatureReadyUntil > Date.now()) {
    return;
  }
  if (personFeatureReadyPromise) return personFeatureReadyPromise;

  personFeatureReadyPromise = performPersonFeatureReadinessCheck()
    .then(() => {
      if (process.env.NODE_ENV !== 'test') {
        personFeatureReadyUntil = Date.now() + PERSON_FEATURE_READY_CACHE_MS;
      }
    })
    .finally(() => {
      personFeatureReadyPromise = null;
    });

  return personFeatureReadyPromise;
};

export const deletePerson = async (input: {
  actor: UserType;
  idempotencyKey: string;
  personId: string;
  version: number;
}): Promise<void> => {
  await assertPersonFeatureReady();

  await prisma.$transaction(async (transaction) => {
    const tombstone = await transaction.personDeletionTombstone.findUnique({
      select: { personId: true },
      where: { personId: input.personId },
    });
    if (tombstone) return;

    const lockedRows = await transaction.$queryRaw<
      Array<{ id: string; version: number }>
    >`
      SELECT person."id", person."version"
      FROM "public"."Person" person
      WHERE person."id" = ${input.personId}
      FOR UPDATE
    `;
    const person = lockedRows[0];
    if (!person) {
      const concurrentTombstone =
        await transaction.personDeletionTombstone.findUnique({
          select: { personId: true },
          where: { personId: input.personId },
        });
      if (concurrentTombstone) return;
      throw personErrors.notFound();
    }
    if (person.version !== input.version) throw personErrors.versionConflict();

    await transaction.$queryRaw<Array<{ deletedCount: bigint }>>`
      SELECT "public"."purge_person_audit_field_changes"(${input.personId}) AS "deletedCount"
    `;
    const deleted = await transaction.person.deleteMany({
      where: { id: input.personId, version: input.version },
    });
    if (deleted.count !== 1) throw personErrors.versionConflict();

    await transaction.personDeletionTombstone.create({
      data: {
        deletionOperationId: input.idempotencyKey,
        personId: input.personId,
      },
    });
    await createPersonAudit(transaction, {
      action: 'PERSON_DELETE',
      actor: input.actor,
      description: 'Fiche supprimée définitivement',
      entityId: input.personId,
      metadata: { irreversible: true },
      outcome: 'SUCCESS',
    });
  });
};
