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
  if (context?.metadata) logEntry.metadata = context.metadata;
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
      ...(context?.metadata ? { metadata: context.metadata } : {}),
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
