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
  RATE_LIMITED = 'RATE_LIMITED',
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
