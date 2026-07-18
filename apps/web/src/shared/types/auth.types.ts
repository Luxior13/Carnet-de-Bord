import {
  type AuditAction,
  type AuditCategory,
  type UserRole,
} from '@repo/database';

import { type PermissionsData } from '$constants/permissions.constants';

// Session type
export type SessionType = {
  criticalMfaVerifiedAt: Date | null;
  expiresAt: Date;
  idleExpiresAt: Date;
  lastSeenAt: Date;
  mfaVerifiedAt: Date | null;
  passwordReauthenticatedAt: Date | null;
  rememberMe: boolean;
  securityVersion: number;
  token: string;
  userId: string;
};

// User type for client (without sensitive data)
export type UserType = {
  contactEmail: string | null;
  contactEmailVerifiedAt: Date | null;
  createdAt: Date;
  /** Non-sensitive readiness flag for receiving critical delegated access. */
  criticalAccessReady?: boolean;
  failedLoginAttempts: number;
  firstName: string;
  id: string;
  identityDetailsVisible?: boolean;
  isActive: boolean;
  isProtected: boolean;
  lastLoginAt: Date | null;
  lastName: string;
  lockedUntil: Date | null;
  loginName: string;
  mfaEnabledAt: Date | null;
  mustChangePassword: boolean;
  passwordChangedAt: Date | null;
  permissions: PermissionsData | null;
  role: UserRole;
  securityDetailsVisible?: boolean;
  updatedAt?: Date | string;
};

export type UserSessionInfo = {
  createdAt: Date | string;
  expiresAt: Date | string;
  id: string;
  idleExpiresAt: Date | string;
  ipAddress: string | null;
  lastSeenAt: Date | string;
  rememberMe: boolean;
  userAgent: string | null;
};

// Full user type (server-side)
export type ServerUserType = UserType & {
  deletedAt: Date | null;
  passwordHash: string;
};

// Auth response type for client
export type AuthApiResponseType = UserType | null;

// Server auth response type
export type ServerAuthResponseType = {
  session: SessionType | null;
  user: UserType | null;
};

// Login credentials
export type LoginCredentials = {
  loginName: string;
  password: string;
  rememberMe?: boolean;
};

export type AuthSessionResponse = {
  expiresAt: string;
  idleExpiresAt: string;
  lastSeenAt: string;
  rememberMe: boolean;
};

export type AuthenticatedLoginData = {
  mustChangePassword: boolean;
  session: AuthSessionResponse;
  status: 'authenticated';
  user: UserType;
};

export type PendingMfaLoginData = {
  challengeExpiresAt: string;
  status: 'mfa_required' | 'mfa_setup_required';
};

export type LoginResponseData = PendingMfaLoginData;

export type LoginResult = PendingMfaLoginData;

export type MfaStatus = {
  enabledAt: string | null;
  recoveryCodesRemaining: number;
  required: boolean;
};

export type MfaSetupStartData = {
  expiresAt: string;
  manualKey: string;
  qrCodeDataUrl: string;
  replacing: boolean;
};

export type MfaSetupConfirmationData = {
  mustChangePassword?: boolean;
  recoveryCodes: string[];
  session?: AuthSessionResponse;
  status?: 'authenticated';
  user: UserType;
};

export type MfaRecoveryCodesRegenerationRequest = {
  currentPassword: string;
  currentTotpCode: string;
};

// Password change request
export type PasswordChangeRequest = {
  currentPassword?: string;
  newPassword: string;
};

// User creation request (admin only)
export type CreateUserRequest = {
  contactEmail?: string | null;
  firstName: string;
  lastName: string;
  loginName: string;
  role: UserRole;
};

// User update request
export type UpdateUserRequest = {
  contactEmail?: string | null;
  expectedUpdatedAt?: string;
  firstName?: string;
  isActive?: boolean;
  lastName?: string;
  loginName?: string;
  permissions?: PermissionsData | null;
  permissionScope?: 'access' | 'account';
  role?: UserRole;
};

// User statistics
export type UserStatsType = {
  active: number;
  byRole: Record<UserRole, number>;
  inactive: number;
  neverLoggedIn: number;
  newThisWeek: number;
  pendingPasswordChange: number | null;
  recentLogins: number;
  total: number;
};

// Pagination info
export type PaginationInfo = {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
};

// Users list response
export type UsersListResponse = {
  pagination?: PaginationInfo;
  securityDetailsVisible: boolean;
  stats: UserStatsType;
  users: UserType[];
};

// Audit log entry
export type AuditLogEntry = {
  action: AuditAction;
  category: AuditCategory;
  createdAt: Date;
  description: string;
  id: string;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  targetUserId: string | null;
  userAgent: string | null;
  userId: string | null;
};

// User audit stats
export type UserAuditStats = {
  failedLogins: number;
  failedLoginsCapped: boolean;
  successfulLogins: number;
  successfulLoginsCapped: boolean;
  totalActions: number;
  totalActionsCapped: boolean;
};
