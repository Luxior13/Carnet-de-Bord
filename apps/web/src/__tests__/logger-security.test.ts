import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { logger } from '$server/logger';

describe('log redaction', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('redacts inline credentials and omits production stacks', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const error = new Error(
      'password=VerySecret postgres://admin:DatabaseSecret@private/db Bearer abc.def.ghi',
    );
    error.stack = `Error: ${error.message}\n    at private/source.ts:12:3`;

    logger.error('Database operation failed token=MessageSecret', {
      action: 'DATABASE_TEST',
      error,
    });

    expect(consoleError).toHaveBeenCalledTimes(1);
    const output = String(consoleError.mock.calls[0]?.[0]);
    expect(output).not.toContain('VerySecret');
    expect(output).not.toContain('DatabaseSecret');
    expect(output).not.toContain('abc.def.ghi');
    expect(output).not.toContain('MessageSecret');
    expect(output).not.toContain('private/source.ts');
    expect(output).toContain('[redacted]');
  });

  it('keeps a useful development stack without exposing credentials', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const error = new Error('password=DevelopmentSecret');
    error.stack = `Error: ${error.message}\n    at local/source.ts:12:3`;

    logger.error('Request failed token=MessageSecret', { error });

    const output = consoleError.mock.calls[0]?.map(String).join(' ') ?? '';
    expect(output).not.toContain('DevelopmentSecret');
    expect(output).not.toContain('MessageSecret');
    expect(output).toContain('local/source.ts');
    expect(output).toContain('[redacted]');
  });
});
