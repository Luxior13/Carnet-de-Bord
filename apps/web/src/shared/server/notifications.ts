import 'server-only';

import type { NotificationSeverity, Prisma } from '@prisma/client';

import { prisma } from '$server/prisma';

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
  const notification = input.dedupeKey
    ? await client.notification.upsert({
        create: notificationData,
        update: {},
        where: { dedupeKey: input.dedupeKey },
      })
    : await client.notification.create({ data: notificationData });

  const recipients = await client.notificationRecipient.createMany({
    data: recipientUserIds.map((userId) => ({
      notificationId: notification.id,
      userId,
    })),
    skipDuplicates: true,
  });

  return { id: notification.id, recipientCount: recipients.count };
};
