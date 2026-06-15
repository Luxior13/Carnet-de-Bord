/**
 * Server-side logger utility
 *
 * Centralizes logging for API routes with structured output.
 * In production, this could be extended to send logs to external services.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = {
  action?: string;
  error?: unknown;
  metadata?: Record<string, unknown>;
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
    switch (level) {
      case 'error':
        console.error(
          prefix,
          message,
          context?.error || '',
          context?.metadata || '',
        );
        break;
      case 'warn':
        console.warn(prefix, message, context?.metadata || '');
        break;
      case 'info':
        console.info(prefix, message, context?.metadata || '');
        break;
      default:
        console.log(prefix, message, context?.metadata || '');
    }
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) =>
    log('debug', message, context),
  error: (message: string, context?: LogContext) =>
    log('error', message, context),
  info: (message: string, context?: LogContext) =>
    log('info', message, context),
  warn: (message: string, context?: LogContext) =>
    log('warn', message, context),
};
