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
const MAX_LOG_DEPTH = 5;
const MAX_LOG_ARRAY_LENGTH = 50;
const MAX_LOG_STRING_LENGTH = 4_000;

const sanitizeLogValue = (value: unknown, depth = 0): unknown => {
  if (depth >= MAX_LOG_DEPTH) return '[max-depth]';
  if (typeof value === 'string') return value.slice(0, MAX_LOG_STRING_LENGTH);
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

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ''}`;
  }

  return String(error);
}

function log(level: LogLevel, message: string, context?: LogContext): void {
  const timestamp = new Date().toISOString();
  const logEntry: Record<string, unknown> = {
    level,
    message,
    timestamp,
  };

  if (context?.action) logEntry.action = context.action;
  if (context?.method) logEntry.method = context.method;
  if (context?.path) logEntry.path = context.path;
  if (context?.requestId) logEntry.requestId = context.requestId;
  if (context?.status) logEntry.status = context.status;
  if (context?.userId) logEntry.userId = context.userId;
  if (context?.metadata) {
    logEntry.metadata = sanitizeLogValue(context.metadata);
  }
  if (context?.error !== undefined) logEntry.error = formatError(context.error);

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
      ...(context?.action ? { action: context.action } : {}),
      ...(context?.method ? { method: context.method } : {}),
      ...(context?.path ? { path: context.path } : {}),
      ...(context?.requestId ? { requestId: context.requestId } : {}),
      ...(context?.status ? { status: context.status } : {}),
      ...(context?.userId ? { userId: context.userId } : {}),
      ...(context?.metadata
        ? { metadata: sanitizeLogValue(context.metadata) }
        : {}),
    };
    switch (level) {
      case 'error':
        console.error(
          prefix,
          message,
          context?.error || '',
          developmentContext,
        );
        break;
      case 'warn':
        console.warn(prefix, message, developmentContext);
        break;
      case 'info':
        console.info(prefix, message, developmentContext);
        break;
      default:
        console.log(prefix, message, developmentContext);
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
