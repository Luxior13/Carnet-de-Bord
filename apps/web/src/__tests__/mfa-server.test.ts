import { generate } from 'otplib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cookieStore: {
    get: vi.fn(),
    set: vi.fn(),
  },
  prisma: {
    $transaction: vi.fn(),
    mfaLoginChallenge: { upsert: vi.fn() },
    rateLimit: { deleteMany: vi.fn() },
  },
  transaction: {
    $queryRaw: vi.fn(),
    mfaLoginChallenge: {
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
    },
    totpEnrollment: { deleteMany: vi.fn() },
  },
}));

vi.mock('server-only', () => ({}));

vi.mock('$env', () => ({
  env: {
    MFA_ENCRYPTION_KEY_V1: Buffer.alloc(32, 7).toString('base64'),
    NODE_ENV: 'test',
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mocks.cookieStore),
}));

vi.mock('$server/prisma', () => ({
  prisma: mocks.prisma,
}));

import {
  consumeVerifiedMfaProof,
  decryptTotpSecret,
  deleteCurrentMfaChallenge,
  encryptTotpSecret,
  findMatchingRecoveryCode,
  generateRecoveryCodes,
  generateTotpSecret,
  MfaReplayDetectedError,
  normalizeRecoveryCode,
  verifyTotpCode,
} from '$server/mfa';

describe('MFA server helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof mocks.transaction) => unknown) =>
        callback(mocks.transaction),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('encrypts a TOTP secret and binds authenticated encryption to the user', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const encrypted = encryptTotpSecret(secret, 'user-1');

    expect(encrypted.secretCiphertext).not.toContain(secret);
    expect(decryptTotpSecret(encrypted, 'user-1')).toBe(secret);
    expect(() => decryptTotpSecret(encrypted, 'user-2')).toThrow();
  });

  it('accepts the adjacent TOTP window and rejects replayed time steps', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-14T20:00:45.000Z'));
    const secret = generateTotpSecret();
    const epoch = Math.floor(Date.now() / 1000);
    const commonOptions = {
      algorithm: 'sha1' as const,
      digits: 6 as const,
      period: 30,
      secret,
    };
    const currentCode = await generate({ ...commonOptions, epoch });
    const previousCode = await generate({
      ...commonOptions,
      epoch: epoch - 30,
    });

    const currentTimeStep = await verifyTotpCode(secret, currentCode);
    const previousTimeStep = await verifyTotpCode(secret, previousCode);

    expect(currentTimeStep).toBe(BigInt(Math.floor(epoch / 30)));
    if (currentTimeStep === null) throw new Error('Expected a valid TOTP');
    expect(previousTimeStep).toBe(currentTimeStep - 1n);
    await expect(
      verifyTotpCode(secret, currentCode, currentTimeStep),
    ).resolves.toBeNull();
  });

  it('creates exact 120-bit recovery codes whose hashes are bound to one user', () => {
    const generatedCodes = generateRecoveryCodes('user-1');
    const storedCodes = generatedCodes.map((recoveryCode, index) => ({
      codeHash: recoveryCode.codeHash,
      id: `recovery-${index}`,
      salt: recoveryCode.salt,
    }));
    const firstCode = generatedCodes[0];

    expect(generatedCodes).toHaveLength(10);
    expect(new Set(generatedCodes.map(({ plaintext }) => plaintext)).size).toBe(
      10,
    );
    expect(firstCode?.plaintext.split('-')).toHaveLength(6);
    expect(normalizeRecoveryCode(firstCode?.plaintext ?? '')).toMatch(
      /^[A-Z2-7]{24}$/,
    );
    expect(
      findMatchingRecoveryCode(
        firstCode?.plaintext ?? '',
        storedCodes,
        'user-1',
      ),
    ).toBe('recovery-0');
    expect(
      findMatchingRecoveryCode(
        firstCode?.plaintext ?? '',
        storedCodes,
        'user-2',
      ),
    ).toBeNull();
    expect(
      findMatchingRecoveryCode(
        ((): string => {
          const normalizedCode = normalizeRecoveryCode(
            firstCode?.plaintext ?? '',
          );
          const replacement = normalizedCode.endsWith('A') ? 'B' : 'A';

          return `${normalizedCode.slice(0, -1)}${replacement}`;
        })(),
        storedCodes,
        'user-1',
      ),
    ).toBeNull();
  });

  it('atomically consumes a recovery code only once', async () => {
    const authenticatedAt = new Date('2026-07-14T20:00:00.000Z');
    const updateMany = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const transaction = {
      mfaRecoveryCode: { updateMany },
    } as unknown as Parameters<typeof consumeVerifiedMfaProof>[0];
    const consumption = {
      authenticatedAt,
      credentialUpdatedAt: new Date('2026-07-10T12:00:00.000Z'),
      proof: {
        method: 'RECOVERY_CODE' as const,
        recoveryCodeId: 'recovery-1',
      },
      userId: 'user-1',
    };

    await expect(
      consumeVerifiedMfaProof(transaction, consumption),
    ).resolves.toBeUndefined();
    expect(updateMany).toHaveBeenCalledWith({
      data: { usedAt: authenticatedAt },
      where: {
        id: 'recovery-1',
        usedAt: null,
        userId: 'user-1',
      },
    });
    await expect(
      consumeVerifiedMfaProof(transaction, consumption),
    ).rejects.toBeInstanceOf(MfaReplayDetectedError);
  });

  it('uses a credential timestamp CAS when consuming a TOTP time step', async () => {
    const authenticatedAt = new Date('2026-07-14T20:00:00.000Z');
    const credentialUpdatedAt = new Date('2026-07-10T12:00:00.000Z');
    const updateMany = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const transaction = {
      totpCredential: { updateMany },
    } as unknown as Parameters<typeof consumeVerifiedMfaProof>[0];
    const consumption = {
      authenticatedAt,
      credentialUpdatedAt,
      proof: { method: 'TOTP' as const, timeStep: 5_945_120n },
      userId: 'user-1',
    };

    await expect(
      consumeVerifiedMfaProof(transaction, consumption),
    ).resolves.toBeUndefined();
    expect(updateMany).toHaveBeenCalledWith({
      data: {
        lastUsedAt: authenticatedAt,
        lastUsedTimeStep: 5_945_120n,
        updatedAt: authenticatedAt,
      },
      where: {
        OR: [
          { lastUsedTimeStep: null },
          { lastUsedTimeStep: { lt: 5_945_120n } },
        ],
        updatedAt: credentialUpdatedAt,
        userId: 'user-1',
      },
    });
    await expect(
      consumeVerifiedMfaProof(transaction, consumption),
    ).rejects.toBeInstanceOf(MfaReplayDetectedError);
  });

  it('removes the exact pending enrollment when a setup challenge is cancelled', async () => {
    const staleExpiresAt = new Date('2026-07-14T20:05:00.000Z');
    const currentExpiresAt = new Date('2026-07-14T20:10:00.000Z');
    mocks.cookieStore.get.mockReturnValue({ value: 'raw-challenge-token' });
    mocks.transaction.mfaLoginChallenge.findUnique
      .mockResolvedValueOnce({
        expiresAt: staleExpiresAt,
        purpose: 'SETUP',
        userId: 'user-1',
      })
      .mockResolvedValueOnce({
        expiresAt: currentExpiresAt,
        purpose: 'SETUP',
        userId: 'user-1',
      });
    mocks.transaction.mfaLoginChallenge.deleteMany.mockResolvedValue({
      count: 1,
    });
    mocks.transaction.totpEnrollment.deleteMany.mockResolvedValue({ count: 1 });
    mocks.transaction.$queryRaw.mockResolvedValue([{ id: 'user-1' }]);

    await deleteCurrentMfaChallenge();

    expect(mocks.transaction.mfaLoginChallenge.deleteMany).toHaveBeenCalledWith(
      {
        where: {
          tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
          userId: 'user-1',
        },
      },
    );
    expect(mocks.transaction.$queryRaw).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.totpEnrollment.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: currentExpiresAt, userId: 'user-1' },
    });
    expect(mocks.cookieStore.set).toHaveBeenCalledWith(
      'mfa-challenge',
      '',
      expect.objectContaining({ maxAge: 0, path: '/api/auth/mfa' }),
    );
  });
});
