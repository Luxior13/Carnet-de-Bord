import 'server-only';

import type { Prisma } from '@prisma/client';
import { AuditAction, AuditCategory } from '@repo/database';

import { FEATURES } from '$constants/feature-registry.constants';
import { PERMISSIONS } from '$constants/permissions.constants';
import { requiresPasswordForSystemSettingChange } from '$constants/system-setting-catalog.constants';
import {
  SYSTEM_SETTING_DEFINITIONS,
  type SystemSettingKey,
} from '$constants/system-settings.constants';
import { isPrismaUniqueConstraintError } from '$server/api-response';
import { createAuditLogWithHeaders } from '$server/audit-log';
import { prisma } from '$server/prisma';
import { assertRecentPasswordReauthentication } from '$server/sensitive-action';
import { serviceErrors } from '$server/service-error';
import {
  createSystemSetting,
  SystemSettingConflictError,
  updateSystemSetting,
} from '$server/system-settings';
import {
  assertUserActionProof,
  authorizeUserAction,
} from '$server/user-action-authorization';
import type { SessionType, UserType } from '$types/auth.types';
import type { SystemSettingItem } from '$types/platform.types';

const settingChanged = (): Error =>
  serviceErrors.conflict('Ce paramètre a été modifié. Rechargez la page.');

/**
 * Writes a system setting under optimistic versioning (`expectedVersion` 0
 * creates it). An unchanged value answers the current state without writing.
 * A risky change, or replacing an invalid stored value, needs a fresh
 * password proof. Throws `ServiceError` refusals.
 */
export const updateSystemSettingForActor = async (
  { actor, session }: { actor: UserType; session: SessionType | null },
  input: { expectedVersion: number; key: SystemSettingKey; value: number },
): Promise<SystemSettingItem> => {
  const { expectedVersion, key, value } = input;
  // SystemSettingKey is a closed union derived from this object.
  // eslint-disable-next-line security/detect-object-injection
  const definition = SYSTEM_SETTING_DEFINITIONS[key];
  const previous = await prisma.systemSetting.findUnique({
    select: { updatedAt: true, value: true, version: true },
    where: { key },
  });
  if (
    (previous && previous.version !== expectedVersion) ||
    (!previous && expectedVersion !== 0)
  ) {
    throw settingChanged();
  }
  const parsedPreviousValue = previous
    ? definition.schema.safeParse(previous.value)
    : null;
  const isStoredValueInvalid = parsedPreviousValue?.success === false;
  const currentValue =
    parsedPreviousValue?.success === true
      ? parsedPreviousValue.data
      : definition.defaultValue;
  if (
    (!previous && value === definition.defaultValue) ||
    (previous &&
      parsedPreviousValue?.success === true &&
      value === currentValue)
  ) {
    return {
      description: definition.description,
      isStoredValueInvalid: false,
      key,
      updatedAt: previous?.updatedAt.toISOString() ?? new Date(0).toISOString(),
      value: currentValue,
      version: previous?.version ?? 0,
    };
  }
  const requiresPassword =
    isStoredValueInvalid ||
    requiresPasswordForSystemSettingChange(key, currentValue, value);
  if (requiresPassword) assertRecentPasswordReauthentication(session);

  try {
    const setting = await prisma.$transaction(async (transaction) => {
      if (key === 'audit.retentionDays') {
        await transaction.$queryRaw`
          SELECT pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended('system-setting:audit.retentionDays', 0)
          )::text
        `;
      }
      const authorized = await authorizeUserAction(
        transaction,
        { actorId: actor.id, session },
        PERMISSIONS.SETTINGS.UPDATE,
      );
      assertUserActionProof(authorized, requiresPassword ? 'password' : 'none');
      const write = {
        description: definition.description,
        key,
        updatedById: actor.id,
        value: value as Prisma.InputJsonValue,
      };
      let updated: Awaited<ReturnType<typeof createSystemSetting>>;
      if (expectedVersion === 0) {
        try {
          updated = await createSystemSetting(write, transaction);
        } catch (error) {
          // SystemSetting has a single unique constraint: its key. A
          // concurrent first write is therefore a version conflict.
          if (isPrismaUniqueConstraintError(error)) throw settingChanged();
          throw error;
        }
      } else {
        updated = await updateSystemSetting(
          { ...write, expectedVersion },
          transaction,
        );
      }
      await createAuditLogWithHeaders(
        {
          action: AuditAction.SYSTEM_SETTING_UPDATE,
          category: AuditCategory.SYSTEM,
          description: `Paramètre système mis à jour : ${definition.label}`,
          metadata: {
            after: { value: updated.value, version: updated.version },
            before: previous
              ? {
                  ...(isStoredValueInvalid
                    ? { isStoredValueInvalid: true }
                    : {}),
                  value: isStoredValueInvalid ? null : previous.value,
                  version: previous.version,
                }
              : null,
            changes: ['value', 'version'],
            ...FEATURES.systemSettings.audit,
            settingKey: key,
          },
          targetUserId: null,
          userId: actor.id,
        },
        { client: transaction, required: true },
      );

      return updated;
    });

    return {
      ...setting,
      isStoredValueInvalid: false,
      key,
      updatedAt: setting.updatedAt.toISOString(),
    };
  } catch (error) {
    if (error instanceof SystemSettingConflictError) throw settingChanged();
    throw error;
  }
};
