import type {
  AuditAction,
  AuditCategory,
  AuditEventKind,
  AuditOutcome,
  AuditSeverity,
  AuditStream,
  UserRole,
} from '@repo/shared';

export type AuditIdentitySnapshot = {
  displayName: string | null;
  loginName: string | null;
  role: UserRole | null;
};

export type PersonJournalFieldChange = {
  action: string;
  after: unknown | null;
  before: unknown | null;
  fieldKey: string;
  id: string;
  recordId: string | null;
  sectionKey: string;
};

export type SystemActivityJournalLog = {
  action: AuditAction;
  actorLoginName: string | null;
  actorName: string | null;
  actorRole: UserRole | null;
  actorSnapshot: AuditIdentitySnapshot;
  category: AuditCategory;
  createdAt: string;
  description: string;
  entityDisplayName: string | null;
  entityId: string | null;
  entityType: string | null;
  eventKind: AuditEventKind;
  eventVersion: number;
  fieldChanges: PersonJournalFieldChange[];
  id: string;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  outcome: AuditOutcome;
  pageKey: string | null;
  poleKey: string | null;
  requestId: string | null;
  severity: AuditSeverity;
  stream: AuditStream;
  tabKey: string | null;
  targetLoginName: string | null;
  targetName: string | null;
  targetRole: UserRole | null;
  targetSnapshot: AuditIdentitySnapshot;
  targetUserId: string | null;
  userAgent: string | null;
  userId: string | null;
};

export type SystemActivityJournalResponse = {
  logs: SystemActivityJournalLog[];
  nextCursor: string | null;
  pageSize: number;
  sensitiveDetailsVisible: boolean;
  snapshotAt: string;
};
