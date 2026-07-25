import 'server-only';

import { PARTNER_FOLLOW_UP_EDIT_WINDOW_MINUTES } from '../partner.constants';
import type { PartnerFollowUp } from '../types/partner.types';

export const PARTNER_FOLLOW_UP_EDIT_WINDOW_MS =
  PARTNER_FOLLOW_UP_EDIT_WINDOW_MINUTES * 60 * 1000;

export const buildPartnerFollowUpEditPolicy = (input: {
  authorId: string | null;
  canManage: boolean;
  createdAt: Date;
  currentUserId: string;
  hasCompletedActionEvent: boolean;
  now: Date;
}): PartnerFollowUp['editPolicy'] => {
  const isAuthor = input.authorId === input.currentUserId;
  if (!isAuthor || input.hasCompletedActionEvent) {
    return { canEdit: false, editableUntil: null, remainingMs: 0 };
  }

  const editableUntil = new Date(
    input.createdAt.getTime() + PARTNER_FOLLOW_UP_EDIT_WINDOW_MS,
  );
  const remainingMs = Math.max(
    0,
    editableUntil.getTime() - input.now.getTime(),
  );

  return {
    canEdit: input.canManage && remainingMs > 0,
    editableUntil: editableUntil.toISOString(),
    remainingMs,
  };
};
