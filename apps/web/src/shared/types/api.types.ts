export enum RoutesApi {
  contactEmail = '/api/auth/contact-email',
  login = '/api/auth/login',
  logout = '/api/auth/logout',
  me = '/api/auth/me',
  mfa = '/api/auth/mfa',
  mfaChallenge = '/api/auth/mfa/challenge',
  mfaRecoveryCodes = '/api/auth/mfa/recovery-codes',
  mfaSetup = '/api/auth/mfa/setup',
  mfaVerify = '/api/auth/mfa/verify',
  users = '/api/users',
}

export enum ErrorCode {
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  PASSWORD_CHANGE_REQUIRED = 'PASSWORD_CHANGE_REQUIRED',
  PASSWORD_REAUTHENTICATION_REQUIRED = 'PASSWORD_REAUTHENTICATION_REQUIRED',
  CRITICAL_REAUTHENTICATION_REQUIRED = 'CRITICAL_REAUTHENTICATION_REQUIRED',
  REAUTHENTICATION_REQUIRED = 'REAUTHENTICATION_REQUIRED',
  RATE_LIMITED = 'RATE_LIMITED',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  PERSON_VERSION_CONFLICT = 'PERSON_VERSION_CONFLICT',
  PRIMARY_CONFLICT = 'PRIMARY_CONFLICT',
  PERSON_FEATURE_NOT_CONFIGURED = 'PERSON_FEATURE_NOT_CONFIGURED',
  PARTNER_CHANNEL_ALREADY_EXISTS = 'PARTNER_CHANNEL_ALREADY_EXISTS',
  PARTNER_CHANNEL_LIMIT_REACHED = 'PARTNER_CHANNEL_LIMIT_REACHED',
  PARTNER_CHANNEL_NOT_FOUND = 'PARTNER_CHANNEL_NOT_FOUND',
  PARTNER_CHANNEL_VERSION_CONFLICT = 'PARTNER_CHANNEL_VERSION_CONFLICT',
  PARTNER_CONTACT_ALREADY_ACTIVE = 'PARTNER_CONTACT_ALREADY_ACTIVE',
  PARTNER_CONTACT_LIMIT_REACHED = 'PARTNER_CONTACT_LIMIT_REACHED',
  PARTNER_CONTACT_REOPEN_FORBIDDEN = 'PARTNER_CONTACT_REOPEN_FORBIDDEN',
  PARTNER_CONTACT_VERSION_CONFLICT = 'PARTNER_CONTACT_VERSION_CONFLICT',
  PARTNER_DEPENDENCY_CONFLICT = 'PARTNER_DEPENDENCY_CONFLICT',
  PARTNER_FEATURE_NOT_CONFIGURED = 'PARTNER_FEATURE_NOT_CONFIGURED',
  PARTNER_VERSION_CONFLICT = 'PARTNER_VERSION_CONFLICT',
}

export type ApiSuccessResponse<T> = {
  data: T;
  success: true;
};

export type ApiErrorResponse = {
  error: {
    code: ErrorCode;
    details?: Record<string, string[]>;
    message: string;
  };
  success: false;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type PaginationMeta = {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
};

export type CursorPaginationMeta = {
  hasMore: boolean;
  limit: number;
  nextCursor: string | null;
  snapshotAt: string;
};
