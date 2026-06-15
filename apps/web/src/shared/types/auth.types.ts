import {
  type AuditAction,
  type AuditCategory,
  type UserRole,
} from '@repo/database';

import { type PermissionsData } from '$constants/permissions.constants';

// Session type
export type SessionType = {
  expiresAt: Date;
  rememberMe: boolean;
  token: string;
  userId: string;
};

// User type for client (without sensitive data)
export type UserType = {
  createdAt: Date;
  email: string;
  firstName: string;
  id: string;
  isActive: boolean;
  isProtected: boolean;
  lastLoginAt: Date | null;
  lastName: string;
  mustChangePassword: boolean;
  passwordChangedAt: Date | null;
  permissions: PermissionsData | null;
  role: UserRole;
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
  email: string;
  password: string;
  rememberMe?: boolean;
};

// Password change request
export type PasswordChangeRequest = {
  currentPassword?: string;
  newPassword: string;
};

// User creation request (admin only)
export type CreateUserRequest = {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
};

// User update request
export type UpdateUserRequest = {
  email?: string;
  firstName?: string;
  isActive?: boolean;
  lastName?: string;
  permissions?: PermissionsData | null;
  role?: UserRole;
};

// User statistics
export type UserStatsType = {
  active: number;
  byRole: Record<UserRole, number>;
  inactive: number;
  neverLoggedIn: number;
  newThisWeek: number;
  pendingPasswordChange: number;
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
  userAgent: string | null;
  userId: string | null;
};

// User audit stats
export type UserAuditStats = {
  failedLogins: number;
  successfulLogins: number;
  totalActions: number;
};
