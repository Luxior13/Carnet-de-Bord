import { afterEach, describe, expect, it, vi } from 'vitest';

import { isPersonEnvironmentConfigured } from '$features/persons/server/person-readiness';

vi.mock('server-only', () => ({}));

const AES_256_KEY = Buffer.alloc(32, 7).toString('base64');

const configurePersonEnvironment = (): void => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('AUDIT_ENCRYPTION_CURRENT_VERSION', '1');
  vi.stubEnv('AUDIT_ENCRYPTION_KEY_V1', AES_256_KEY);
};

describe('person environment readiness', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('fails closed when an audit key required by the durable inventory is missing', () => {
    configurePersonEnvironment();
    vi.stubEnv('AUDIT_ENCRYPTION_KEY_V2', '');

    expect(isPersonEnvironmentConfigured([1, 2])).toBe(false);
  });

  it('accepts the same inventory once every historical audit key is present', () => {
    configurePersonEnvironment();
    vi.stubEnv('AUDIT_ENCRYPTION_KEY_V2', AES_256_KEY);

    expect(isPersonEnvironmentConfigured([1, 2])).toBe(true);
  });
});
