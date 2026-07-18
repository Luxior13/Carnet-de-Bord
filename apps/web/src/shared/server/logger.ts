/**
 * Server-side logger utility
 *
 * Centralizes logging for API routes with structured output.
 * In production, this could be extended to send logs to external services.
 */
/* eslint-disable no-console */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = {
  action?: string;
  error?: unknown;
  metadata?: Record<string, unknown>;
  method?: string;
  path?: string;
  requestId?: string;
  status?: number;
  userId?: string;
};

const SENSITIVE_LOG_KEY_PATTERN =
  /authorization|cookie|password|recovery.?code|secret|token/i;
const INLINE_SECRET_PATTERN =
  /(access.?key|api.?key|authorization|cookie|credential|otp|passphrase|password|private.?key|recovery.?code|refresh.?token|secret|seed|token|totp)(\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi;
const URL_CREDENTIAL_PATTERN = /\b([a-z][\w+.-]*:\/\/)[^/\s:@]+:[^@\s/]+@/gi;
const BEARER_TOKEN_PATTERN = /\bBearer\s+[\w.~+/=-]+/gi;
const MAX_LOG_DEPTH = 5;
const MAX_LOG_ARRAY_LENGTH = 50;
const MAX_LOG_STRING_LENGTH = 4_000;

const sanitizeLogString = (value: string): string =>
  value
    .slice(0, MAX_LOG_STRING_LENGTH * 2)
    .replace(URL_CREDENTIAL_PATTERN, '$1[redacted]@')
    .replace(BEARER_TOKEN_PATTERN, 'Bearer [redacted]')
    .replace(INLINE_SECRET_PATTERN, '$1$2[redacted]')
    .slice(0, MAX_LOG_STRING_LENGTH);

const sanitizeLogValue = (value: unknown, depth = 0): unknown => {
  if (depth >= MAX_LOG_DEPTH) return '[max-depth]';
  if (typeof value === 'string') return sanitizeLogString(value);
  if (
    value === null ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_LOG_ARRAY_LENGTH)
      .map((item) => sanitizeLogValue(item, depth + 1));
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        SENSITIVE_LOG_KEY_PATTERN.test(key)
          ? '[redacted]'
          : sanitizeLogValue(nestedValue, depth + 1),
      ]),
    );
  }

  return String(value).slice(0, MAX_LOG_STRING_LENGTH);
};

function formatError(error: unknown, includeStack: boolean): string {
  if (error instanceof Error) {
    const summary = `${error.name}: ${sanitizeLogString(error.message)}`;

    return includeStack && error.stack
      ? `${summary}\n${sanitizeLogString(error.stack)}`
      : summary;
  }

  return sanitizeLogString(String(error));
}

function log(level: LogLevel, message: string, context?: LogContext): void {
  const timestamp = new Date().toISOString();
  const sanitizedMessage = sanitizeLogString(message);
  const formattedError =
    context?.error === undefined
      ? undefined
      : formatError(context.error, process.env.NODE_ENV !== 'production');
  const logEntry: Record<string, unknown> = {
    level,
    message: sanitizedMessage,
    timestamp,
  };

  if (context?.action) logEntry.action = sanitizeLogString(context.action);
  if (context?.method) logEntry.method = sanitizeLogString(context.method);
  if (context?.path) logEntry.path = sanitizeLogString(context.path);
  if (context?.requestId) {
    logEntry.requestId = sanitizeLogString(context.requestId);
  }
  if (context?.status) logEntry.status = context.status;
  if (context?.userId) logEntry.userId = sanitizeLogString(context.userId);
  if (context?.metadata) {
    logEntry.metadata = sanitizeLogValue(context.metadata);
  }
  if (formattedError !== undefined) logEntry.error = formattedError;

  // In development, use colored console output
  // In production, output JSON for log aggregation services
  if (process.env.NODE_ENV === 'production') {
    const output = JSON.stringify(logEntry);
    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  } else {
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const developmentContext = {
      ...(context?.action ? { action: sanitizeLogString(context.action) } : {}),
      ...(context?.method ? { method: sanitizeLogString(context.method) } : {}),
      ...(context?.path ? { path: sanitizeLogString(context.path) } : {}),
      ...(context?.requestId
        ? { requestId: sanitizeLogString(context.requestId) }
        : {}),
      ...(context?.status ? { status: context.status } : {}),
      ...(context?.userId ? { userId: sanitizeLogString(context.userId) } : {}),
      ...(context?.metadata
        ? { metadata: sanitizeLogValue(context.metadata) }
        : {}),
    };
    switch (level) {
      case 'error':
        console.error(
          prefix,
          sanitizedMessage,
          formattedError ?? '',
          developmentContext,
        );
        break;
      case 'warn':
        console.warn(prefix, sanitizedMessage, developmentContext);
        break;
      case 'info':
        console.info(prefix, sanitizedMessage, developmentContext);
        break;
      default:
        console.log(prefix, sanitizedMessage, developmentContext);
    }
  }
}

export const logger = {
  debug: (message: string, context?: LogContext): void =>
    log('debug', message, context),
  error: (message: string, context?: LogContext): void =>
    log('error', message, context),
  info: (message: string, context?: LogContext): void =>
    log('info', message, context),
  warn: (message: string, context?: LogContext): void =>
    log('warn', message, context),
};
