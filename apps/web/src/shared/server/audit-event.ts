import 'server-only';

import {
  AuditAction,
  AuditEventKind,
  AuditOutcome,
  AuditSeverity,
  AuditStream,
  type UserRole,
} from '@repo/database';

export const AUDIT_EVENT_VERSION = 1;

export type AuditEventClassification = Readonly<{
  eventKind: AuditEventKind;
  outcome: AuditOutcome;
  severity: AuditSeverity;
  stream: AuditStream;
}>;

export type AuditIdentitySnapshot = Readonly<{
  displayName: string;
  loginName: string;
  role: UserRole;
}>;

type AuditSnapshotSource = {
  firstName: string;
  lastName: string;
  loginName: string;
  role: UserRole;
};

const activity = (
  stream: AuditStream,
  severity: AuditSeverity = AuditSeverity.INFO,
): AuditEventClassification => ({
  eventKind: AuditEventKind.ACTIVITY,
  outcome: AuditOutcome.SUCCESS,
  severity,
  stream,
});

const connection = (
  outcome: AuditOutcome,
  severity: AuditSeverity = AuditSeverity.INFO,
): AuditEventClassification => ({
  eventKind: AuditEventKind.CONNECTION,
  outcome,
  severity,
  stream: AuditStream.AUTHENTICATION,
});

const AUDIT_EVENT_CLASSIFICATIONS = {
  [AuditAction.ACCOUNT_LOCKED]: connection(
    AuditOutcome.FAILURE,
    AuditSeverity.WARNING,
  ),
  [AuditAction.AUDIT_EXPORT]: activity(
    AuditStream.SYSTEM,
    AuditSeverity.CRITICAL,
  ),
  [AuditAction.BACKGROUND_JOB_UPDATE]: activity(
    AuditStream.SYSTEM,
    AuditSeverity.WARNING,
  ),
  [AuditAction.LOGIN_FAILED]: connection(
    AuditOutcome.FAILURE,
    AuditSeverity.WARNING,
  ),
  [AuditAction.LOGIN_SUCCESS]: connection(AuditOutcome.SUCCESS),
  [AuditAction.LOGOUT]: connection(AuditOutcome.NEUTRAL),
  [AuditAction.MFA_DISABLED]: activity(
    AuditStream.SECURITY,
    AuditSeverity.WARNING,
  ),
  [AuditAction.MFA_ENABLED]: activity(AuditStream.SECURITY),
  [AuditAction.MFA_RECOVERY_CODE_USED]: activity(
    AuditStream.SECURITY,
    AuditSeverity.WARNING,
  ),
  [AuditAction.MFA_RECOVERY_CODES_REGENERATED]: activity(
    AuditStream.SECURITY,
    AuditSeverity.WARNING,
  ),
  [AuditAction.MFA_RESET]: activity(
    AuditStream.SECURITY,
    AuditSeverity.CRITICAL,
  ),
  [AuditAction.NOTIFICATION_SEND]: activity(AuditStream.SYSTEM),
  [AuditAction.PASSWORD_CHANGE]: activity(AuditStream.SECURITY),
  [AuditAction.PASSWORD_RESET]: activity(
    AuditStream.SECURITY,
    AuditSeverity.WARNING,
  ),
  [AuditAction.PERMISSION_UPDATE]: activity(
    AuditStream.AUTHORIZATION,
    AuditSeverity.CRITICAL,
  ),
  [AuditAction.SESSION_INVALIDATE]: activity(
    AuditStream.SECURITY,
    AuditSeverity.WARNING,
  ),
  [AuditAction.STEP_UP_FAILED]: {
    eventKind: AuditEventKind.ACTIVITY,
    outcome: AuditOutcome.FAILURE,
    severity: AuditSeverity.WARNING,
    stream: AuditStream.SECURITY,
  },
  [AuditAction.STEP_UP_SUCCESS]: activity(AuditStream.SECURITY),
  [AuditAction.SYSTEM_SETTING_UPDATE]: activity(
    AuditStream.SYSTEM,
    AuditSeverity.CRITICAL,
  ),
  [AuditAction.USER_ACTIVATE]: activity(AuditStream.IDENTITY),
  [AuditAction.USER_CREATE]: activity(AuditStream.IDENTITY),
  [AuditAction.USER_DEACTIVATE]: activity(
    AuditStream.IDENTITY,
    AuditSeverity.WARNING,
  ),
  [AuditAction.USER_DELETE]: activity(
    AuditStream.IDENTITY,
    AuditSeverity.CRITICAL,
  ),
  [AuditAction.USER_UPDATE]: activity(AuditStream.IDENTITY),
} as const satisfies Record<AuditAction, AuditEventClassification>;

export const getAuditEventClassification = (
  action: AuditAction,
): AuditEventClassification => {
  // Prisma guarantees action belongs to the closed AuditAction enum and the
  // satisfies clause above guarantees a corresponding classification.
  // eslint-disable-next-line security/detect-object-injection
  return AUDIT_EVENT_CLASSIFICATIONS[action];
};

export const toAuditIdentitySnapshot = (
  user: AuditSnapshotSource,
): AuditIdentitySnapshot => {
  const displayName = `${user.firstName.trim()} ${user.lastName.trim()}`.trim();

  return {
    displayName: displayName || user.loginName,
    loginName: user.loginName,
    role: user.role,
  };
};
