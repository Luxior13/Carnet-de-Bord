/**
 * Browser-safe mirrors of the persisted Prisma enums used by shared UI/API
 * contracts. Keep this module dependency-free; the web contract test enforces
 * exact parity with the generated Prisma values.
 */
export const AuditAction = {
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  AUDIT_EXPORT: 'AUDIT_EXPORT',
  BACKGROUND_JOB_UPDATE: 'BACKGROUND_JOB_UPDATE',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  MFA_DISABLED: 'MFA_DISABLED',
  MFA_ENABLED: 'MFA_ENABLED',
  MFA_RECOVERY_CODE_USED: 'MFA_RECOVERY_CODE_USED',
  MFA_RECOVERY_CODES_REGENERATED: 'MFA_RECOVERY_CODES_REGENERATED',
  MFA_RESET: 'MFA_RESET',
  NOTIFICATION_SEND: 'NOTIFICATION_SEND',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PASSWORD_RESET: 'PASSWORD_RESET',
  PERMISSION_UPDATE: 'PERMISSION_UPDATE',
  PERSON_CREATE: 'PERSON_CREATE',
  PERSON_DELETE: 'PERSON_DELETE',
  PERSON_UPDATE: 'PERSON_UPDATE',
  SESSION_INVALIDATE: 'SESSION_INVALIDATE',
  STEP_UP_FAILED: 'STEP_UP_FAILED',
  STEP_UP_SUCCESS: 'STEP_UP_SUCCESS',
  SYSTEM_SETTING_UPDATE: 'SYSTEM_SETTING_UPDATE',
  USER_ACTIVATE: 'USER_ACTIVATE',
  USER_CREATE: 'USER_CREATE',
  USER_DEACTIVATE: 'USER_DEACTIVATE',
  USER_DELETE: 'USER_DELETE',
  USER_UPDATE: 'USER_UPDATE',
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const AuditCategory = {
  AUTH: 'AUTH',
  PERMISSION: 'PERMISSION',
  PERSON: 'PERSON',
  SYSTEM: 'SYSTEM',
  USER: 'USER',
} as const;

export type AuditCategory = (typeof AuditCategory)[keyof typeof AuditCategory];

export const AuditEventKind = {
  ACTIVITY: 'ACTIVITY',
  CONNECTION: 'CONNECTION',
} as const;

export type AuditEventKind =
  (typeof AuditEventKind)[keyof typeof AuditEventKind];

export const AuditOutcome = {
  FAILURE: 'FAILURE',
  NEUTRAL: 'NEUTRAL',
  SUCCESS: 'SUCCESS',
} as const;

export type AuditOutcome = (typeof AuditOutcome)[keyof typeof AuditOutcome];

export const AuditSeverity = {
  CRITICAL: 'CRITICAL',
  INFO: 'INFO',
  WARNING: 'WARNING',
} as const;

export type AuditSeverity = (typeof AuditSeverity)[keyof typeof AuditSeverity];

export const AuditStream = {
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  IDENTITY: 'IDENTITY',
  SECURITY: 'SECURITY',
  SYSTEM: 'SYSTEM',
} as const;

export type AuditStream = (typeof AuditStream)[keyof typeof AuditStream];

export const NotificationSeverity = {
  CRITICAL: 'CRITICAL',
  INFO: 'INFO',
  SUCCESS: 'SUCCESS',
  WARNING: 'WARNING',
} as const;

export type NotificationSeverity =
  (typeof NotificationSeverity)[keyof typeof NotificationSeverity];

export const UserRole = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
