import 'server-only';

import type { NotificationSeverity, Prisma } from '@prisma/client';

import { prisma } from '$server/prisma';
import { isKnownInternalPageHref } from '$utils/internal-href.utils';

type NotificationWriteClient = Pick<
  Prisma.TransactionClient,
  'notification' | 'notificationRecipient'
>;

export type CreateNotificationInput = {
  body: string;
  createdById?: string | null;
  dedupeKey?: string | null;
  expiresAt?: Date | null;
  href?: string | null;
  recipientUserIds: readonly string[];
  severity?: NotificationSeverity;
  title: string;
  type: string;
};

const NOTIFICATION_DEDUPE_COMPONENT_PATTERN = /^[a-z0-9][a-z0-9._:-]*$/;
const NOTIFICATION_DEDUPE_NAMESPACE_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;
const NOTIFICATION_DEDUPE_COMPONENT_MAX_LENGTH = 160;
const NOTIFICATION_DEDUPE_NAMESPACE_MAX_LENGTH = 80;
const NOTIFICATION_DEDUPE_KEY_MAX_LENGTH =
  NOTIFICATION_DEDUPE_NAMESPACE_MAX_LENGTH +
  1 +
  NOTIFICATION_DEDUPE_COMPONENT_MAX_LENGTH;

type StoredNotificationIdentity = {
  body: string;
  createdById: string | null;
  dedupeKey: string | null;
  expiresAt: Date | null;
  href: string | null;
  id: string;
  severity: NotificationSeverity;
  title: string;
  type: string;
};

export class NotificationDedupeConflictError extends Error {
  constructor() {
    super('Notification dedupe key belongs to a different payload or author');
    this.name = 'NotificationDedupeConflictError';
  }
}

export const isValidNotificationDedupeComponent = (value: string): boolean =>
  value.length > 0 &&
  value.length <= NOTIFICATION_DEDUPE_COMPONENT_MAX_LENGTH &&
  NOTIFICATION_DEDUPE_COMPONENT_PATTERN.test(value);

export const buildNotificationDedupeKey = (
  namespace: string,
  key: string,
): string => {
  if (
    namespace.length === 0 ||
    namespace.length > NOTIFICATION_DEDUPE_NAMESPACE_MAX_LENGTH ||
    !NOTIFICATION_DEDUPE_NAMESPACE_PATTERN.test(namespace) ||
    !isValidNotificationDedupeComponent(key)
  ) {
    throw new TypeError('Invalid notification dedupe namespace or key');
  }

  return `${namespace}:${key}`;
};

export const buildHumanNotificationDedupeKey = (
  actorUserId: string,
  key: string,
): string => buildNotificationDedupeKey(`human.${actorUserId}`, key);

const isCanonicalNotificationDedupeKey = (value: string): boolean => {
  if (value.length > NOTIFICATION_DEDUPE_KEY_MAX_LENGTH) return false;

  const separatorIndex = value.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex === value.length - 1) return false;

  const namespace = value.slice(0, separatorIndex);
  const key = value.slice(separatorIndex + 1);

  return (
    namespace.length <= NOTIFICATION_DEDUPE_NAMESPACE_MAX_LENGTH &&
    NOTIFICATION_DEDUPE_NAMESPACE_PATTERN.test(namespace) &&
    isValidNotificationDedupeComponent(key)
  );
};

const datesEqual = (left: Date | null, right: Date | null): boolean =>
  left === null
    ? right === null
    : right !== null && left.getTime() === right.getTime();

const hasSameNotificationIdentity = (
  stored: StoredNotificationIdentity,
  expected: Omit<StoredNotificationIdentity, 'id'>,
): boolean =>
  stored.body === expected.body &&
  stored.createdById === expected.createdById &&
  stored.dedupeKey === expected.dedupeKey &&
  datesEqual(stored.expiresAt, expected.expiresAt) &&
  stored.href === expected.href &&
  stored.severity === expected.severity &&
  stored.title === expected.title &&
  stored.type === expected.type;

const normalizeRecipientIds = (userIds: readonly string[]): string[] => [
  ...new Set(userIds.map((userId) => userId.trim()).filter(Boolean)),
];

export const createNotification = async (
  input: CreateNotificationInput,
  client: NotificationWriteClient = prisma,
): Promise<{ id: string; recipientCount: number }> => {
  const recipientUserIds = normalizeRecipientIds(input.recipientUserIds);
  if (recipientUserIds.length === 0) {
    throw new Error('A notification requires at least one recipient');
  }
  if (recipientUserIds.length > 1_000) {
    throw new Error('A notification fan-out is limited to 1000 recipients');
  }
  if (
    input.href !== null &&
    input.href !== undefined &&
    !isKnownInternalPageHref(input.href)
  ) {
    throw new TypeError('Notification href must target a known internal page');
  }
  if (
    input.dedupeKey !== null &&
    input.dedupeKey !== undefined &&
    !isCanonicalNotificationDedupeKey(input.dedupeKey)
  ) {
    throw new TypeError('Notification dedupe key must be namespaced');
  }

  const notificationData = {
    body: input.body,
    createdById: input.createdById ?? null,
    dedupeKey: input.dedupeKey ?? null,
    expiresAt: input.expiresAt ?? null,
    href: input.href ?? null,
    severity: input.severity ?? ('INFO' as const),
    title: input.title,
    type: input.type,
  } satisfies Prisma.NotificationUncheckedCreateInput;
  let notificationId: string;

  if (input.dedupeKey) {
    const notification = await client.notification.upsert({
      create: notificationData,
      select: {
        body: true,
        createdById: true,
        dedupeKey: true,
        expiresAt: true,
        href: true,
        id: true,
        severity: true,
        title: true,
        type: true,
      },
      update: {},
      where: { dedupeKey: input.dedupeKey },
    });

    if (!hasSameNotificationIdentity(notification, notificationData)) {
      throw new NotificationDedupeConflictError();
    }
    notificationId = notification.id;
  } else {
    const notification = await client.notification.create({
      data: notificationData,
      select: { id: true },
    });
    notificationId = notification.id;
  }

  const recipients = await client.notificationRecipient.createMany({
    data: recipientUserIds.map((userId) => ({
      notificationId,
      userId,
    })),
    skipDuplicates: true,
  });

  return { id: notificationId, recipientCount: recipients.count };
};
