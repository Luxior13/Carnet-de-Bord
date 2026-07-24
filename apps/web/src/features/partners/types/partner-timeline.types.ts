import type {
  PartnerActor,
  PartnerFollowUp,
  PartnerStatus,
} from './partner.types';

export const PARTNER_TIMELINE_EVENT_TYPES = [
  'RELATIONSHIP_CREATED',
  'STATUS_CHANGED',
  'PERIOD_CORRECTED',
  'ACTION_COMPLETED',
  'ACTION_REOPENED',
  'ACTION_UPDATED',
] as const;

export type PartnerTimelineEventType =
  (typeof PARTNER_TIMELINE_EVENT_TYPES)[number];

export type PartnerTimelineEventPayloadMap = {
  ACTION_COMPLETED: {
    completedAt: string;
    description: string;
    dueOn: string | null;
  };
  ACTION_REOPENED: {
    description: string;
    dueOn: string | null;
  };
  ACTION_UPDATED: {
    description: string;
    dueOn: string | null;
    previousDescription: string;
    previousDueOn: string | null;
  };
  PERIOD_CORRECTED: {
    closingNote: string | null;
    endedOn: string | null;
    previousClosingNote: string | null;
    previousEndedOn: string | null;
    previousStartedOn: string | null;
    startedOn: string | null;
    status: PartnerStatus;
  };
  RELATIONSHIP_CREATED: {
    closingNote: string | null;
    endedOn: string | null;
    source?: 'migration';
    startedOn: string | null;
    status: PartnerStatus;
  };
  STATUS_CHANGED: {
    closingNote: string | null;
    endedOn: string | null;
    fromStatus: PartnerStatus;
    startedOn: string | null;
    toStatus: PartnerStatus;
  };
};

type PartnerTimelineEventBase<TType extends PartnerTimelineEventType> = {
  actor: PartnerActor;
  createdAt: string;
  eventType: TType;
  formatVersion: number;
  id: `event:${string}`;
  kind: 'EVENT';
  occurredAt: string;
  payload: PartnerTimelineEventPayloadMap[TType];
  refs: {
    actionId: string | null;
    followUpEntryId: string | null;
    periodId: string | null;
  };
};

export type PartnerTimelineEventItem = {
  [TType in PartnerTimelineEventType]: PartnerTimelineEventBase<TType>;
}[PartnerTimelineEventType];

export type PartnerTimelineNoteItem = {
  createdAt: string;
  followUp: PartnerFollowUp;
  id: `note:${string}`;
  kind: 'NOTE';
  occurredAt: string;
};

export type PartnerTimelineItem =
  PartnerTimelineEventItem | PartnerTimelineNoteItem;

export type PartnerTimelineResponse = {
  items: PartnerTimelineItem[];
  openActions: PartnerFollowUp[];
  pagination: {
    hasMore: boolean;
    limit: number;
    nextCursor: string | null;
    snapshotAt: string;
  };
};
