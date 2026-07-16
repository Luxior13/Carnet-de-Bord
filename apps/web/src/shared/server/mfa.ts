import 'server-only';

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

import type {
  MfaChallengePurpose,
  MfaRecoveryCode,
  Prisma,
  TotpCredential,
  TotpEnrollment,
} from '@prisma/client';
import { cookies } from 'next/headers';
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';

import { env } from '$env';

import { prisma } from './prisma';

export const MFA_CHALLENGE_COOKIE_NAME = 'mfa-challenge';
export const MFA_CHALLENGE_DURATION_MS = 5 * 60 * 1000;
export const MFA_ENROLLMENT_DURATION_MS = 10 * 60 * 1000;
export const MFA_TOTP_PERIOD_SECONDS = 30;
export const MFA_TOTP_CODE_PATTERN = /^\d{6}$/;

const MFA_CHALLENGE_COOKIE_PATH = '/api/auth/mfa';
const MFA_ENCRYPTION_KEY_VERSION = 1;
const MFA_ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const MFA_SECRET_AAD_PREFIX = 'team-control:totp-secret:v1:';
const MFA_RECOVERY_HASH_PREFIX = 'team-control:mfa-recovery:v1:';
const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_RANDOM_BYTES = 15;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export type EncryptedTotpSecret = {
  secretAuthTag: string;
  secretCiphertext: string;
  secretIv: string;
  secretKeyVersion: number;
};

type StoredEncryptedTotpSecret = Pick<
  TotpCredential | TotpEnrollment,
  'secretAuthTag' | 'secretCiphertext' | 'secretIv' | 'secretKeyVersion'
>;

export type GeneratedRecoveryCode = {
  codeHash: string;
  plaintext: string;
  salt: string;
};

export type VerifiedMfaProof =
  | { method: 'RECOVERY_CODE'; recoveryCodeId: string }
  | { method: 'TOTP'; timeStep: bigint };

export class InvalidMfaChallengeError extends Error {
  constructor() {
    super('MFA challenge is invalid, expired or already consumed');
    this.name = 'InvalidMfaChallengeError';
  }
}

export class MfaReplayDetectedError extends Error {
  constructor() {
    super('MFA proof was already consumed');
    this.name = 'MfaReplayDetectedError';
  }
}

const getEncryptionKey = (version: number): Buffer => {
  if (version !== MFA_ENCRYPTION_KEY_VERSION) {
    throw new Error(`Unsupported MFA encryption key version: ${version}`);
  }

  const key = Buffer.from(env.MFA_ENCRYPTION_KEY_V1, 'base64');
  if (key.length !== 32) {
    throw new Error('MFA encryption key must contain exactly 32 bytes');
  }

  return key;
};

const getSecretAdditionalData = (userId: string): Buffer =>
  Buffer.from(`${MFA_SECRET_AAD_PREFIX}${userId}`, 'utf8');

export const encryptTotpSecret = (
  secret: string,
  userId: string,
): EncryptedTotpSecret => {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    MFA_ENCRYPTION_ALGORITHM,
    getEncryptionKey(MFA_ENCRYPTION_KEY_VERSION),
    iv,
  );
  cipher.setAAD(getSecretAdditionalData(userId));
  const ciphertext = Buffer.concat([
    cipher.update(secret, 'utf8'),
    cipher.final(),
  ]);

  return {
    secretAuthTag: cipher.getAuthTag().toString('base64'),
    secretCiphertext: ciphertext.toString('base64'),
    secretIv: iv.toString('base64'),
    secretKeyVersion: MFA_ENCRYPTION_KEY_VERSION,
  };
};

export const decryptTotpSecret = (
  encryptedSecret: StoredEncryptedTotpSecret,
  userId: string,
): string => {
  const decipher = createDecipheriv(
    MFA_ENCRYPTION_ALGORITHM,
    getEncryptionKey(encryptedSecret.secretKeyVersion),
    Buffer.from(encryptedSecret.secretIv, 'base64'),
  );
  decipher.setAAD(getSecretAdditionalData(userId));
  decipher.setAuthTag(Buffer.from(encryptedSecret.secretAuthTag, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedSecret.secretCiphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
};

export const generateTotpSecret = (): string => generateSecret({ length: 20 });

export const createTotpProvisioningData = async (
  secret: string,
  loginName: string,
): Promise<{ manualKey: string; qrCodeDataUrl: string }> => {
  const uri = generateURI({
    algorithm: 'sha1',
    digits: 6,
    issuer: 'Team Control',
    label: loginName,
    period: MFA_TOTP_PERIOD_SECONDS,
    secret,
  });
  const qrCodeDataUrl = await QRCode.toDataURL(uri, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 256,
  });

  return { manualKey: secret, qrCodeDataUrl };
};

export const verifyTotpCode = async (
  secret: string,
  code: string,
  lastUsedTimeStep?: bigint | null,
): Promise<bigint | null> => {
  if (!MFA_TOTP_CODE_PATTERN.test(code)) return null;

  const afterTimeStep =
    lastUsedTimeStep === null || lastUsedTimeStep === undefined
      ? undefined
      : Number(lastUsedTimeStep);
  const result = await verify({
    algorithm: 'sha1',
    digits: 6,
    epochTolerance: MFA_TOTP_PERIOD_SECONDS,
    ...(afterTimeStep === undefined ? {} : { afterTimeStep }),
    period: MFA_TOTP_PERIOD_SECONDS,
    secret,
    token: code,
  });

  return result.valid && 'timeStep' in result ? BigInt(result.timeStep) : null;
};

const encodeBase32 = (value: Uint8Array): string => {
  let accumulator = 0;
  let bits = 0;
  let result = '';

  for (const byte of value) {
    accumulator = (accumulator << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      bits -= 5;
      result += BASE32_ALPHABET[(accumulator >>> bits) & 31] ?? '';
    }
  }

  if (bits > 0) {
    result += BASE32_ALPHABET[(accumulator << (5 - bits)) & 31] ?? '';
  }

  return result;
};

export const normalizeRecoveryCode = (code: string): string =>
  code.toUpperCase().replace(/[\s-]/g, '');

const hashRecoveryCode = (
  normalizedCode: string,
  salt: string,
  userId: string,
): string =>
  createHash('sha256')
    .update(
      `${MFA_RECOVERY_HASH_PREFIX}${salt}\0${userId}\0${normalizedCode}`,
      'utf8',
    )
    .digest('hex');

export const generateRecoveryCodes = (
  userId: string,
): GeneratedRecoveryCode[] =>
  Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const compactCode = encodeBase32(randomBytes(RECOVERY_CODE_RANDOM_BYTES));
    const plaintext = compactCode.match(/.{1,4}/g)?.join('-') ?? compactCode;
    const salt = randomBytes(16).toString('hex');

    return {
      codeHash: hashRecoveryCode(compactCode, salt, userId),
      plaintext,
      salt,
    };
  });

export const findMatchingRecoveryCode = (
  code: string,
  recoveryCodes: Pick<MfaRecoveryCode, 'codeHash' | 'id' | 'salt'>[],
  userId: string,
): string | null => {
  const normalizedCode = normalizeRecoveryCode(code);
  if (!/^[A-Z2-7]{24}$/.test(normalizedCode)) return null;

  let matchingId: string | null = null;
  for (const recoveryCode of recoveryCodes) {
    const candidateHash = Buffer.from(
      hashRecoveryCode(normalizedCode, recoveryCode.salt, userId),
      'hex',
    );
    const storedHash = Buffer.from(recoveryCode.codeHash, 'hex');
    const matches =
      candidateHash.length === storedHash.length &&
      timingSafeEqual(candidateHash, storedHash);

    if (matches) matchingId = recoveryCode.id;
  }

  return matchingId;
};

export const verifyMfaProof = async (data: {
  code: string;
  credential: TotpCredential;
  recoveryCodes: Pick<MfaRecoveryCode, 'codeHash' | 'id' | 'salt'>[];
  userId: string;
}): Promise<VerifiedMfaProof | null> => {
  if (MFA_TOTP_CODE_PATTERN.test(data.code)) {
    const timeStep = await verifyTotpCode(
      decryptTotpSecret(data.credential, data.userId),
      data.code,
      data.credential.lastUsedTimeStep,
    );

    return timeStep === null ? null : { method: 'TOTP', timeStep };
  }

  const recoveryCodeId = findMatchingRecoveryCode(
    data.code,
    data.recoveryCodes,
    data.userId,
  );

  return recoveryCodeId ? { method: 'RECOVERY_CODE', recoveryCodeId } : null;
};

export const consumeVerifiedMfaProof = async (
  transaction: Prisma.TransactionClient,
  data: {
    authenticatedAt: Date;
    credentialUpdatedAt: Date;
    proof: VerifiedMfaProof;
    userId: string;
  },
): Promise<void> => {
  if (data.proof.method === 'TOTP') {
    const credentialUpdate = await transaction.totpCredential.updateMany({
      data: {
        lastUsedAt: data.authenticatedAt,
        lastUsedTimeStep: data.proof.timeStep,
        updatedAt: data.authenticatedAt,
      },
      where: {
        OR: [
          { lastUsedTimeStep: null },
          { lastUsedTimeStep: { lt: data.proof.timeStep } },
        ],
        updatedAt: data.credentialUpdatedAt,
        userId: data.userId,
      },
    });

    if (credentialUpdate.count !== 1) throw new MfaReplayDetectedError();

    return;
  }

  const recoveryCodeUpdate = await transaction.mfaRecoveryCode.updateMany({
    data: { usedAt: data.authenticatedAt },
    where: {
      id: data.proof.recoveryCodeId,
      usedAt: null,
      userId: data.userId,
    },
  });

  if (recoveryCodeUpdate.count !== 1) throw new MfaReplayDetectedError();
};

export const generateMfaChallengeToken = (): string =>
  randomBytes(32).toString('base64url');

export const hashMfaChallengeToken = (token: string): string =>
  createHash('sha256').update(token, 'utf8').digest('hex');

export const setMfaChallengeCookie = async (
  token: string,
  expiresAt: Date,
): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.set(MFA_CHALLENGE_COOKIE_NAME, token, {
    expires: expiresAt,
    httpOnly: true,
    path: MFA_CHALLENGE_COOKIE_PATH,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
  });
};

export const clearMfaChallengeCookie = async (): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.set(MFA_CHALLENGE_COOKIE_NAME, '', {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: MFA_CHALLENGE_COOKIE_PATH,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
  });
};

export const getMfaChallengeToken = async (): Promise<string | null> => {
  const cookieStore = await cookies();

  return cookieStore.get(MFA_CHALLENGE_COOKIE_NAME)?.value ?? null;
};

export const createMfaChallenge = async (data: {
  credentialUpdatedAt?: Date | null;
  purpose: MfaChallengePurpose;
  rememberMe: boolean;
  securityVersion: number;
  userId: string;
}): Promise<{ expiresAt: Date; token: string; tokenHash: string }> => {
  const token = generateMfaChallengeToken();
  const tokenHash = hashMfaChallengeToken(token);
  const expiresAt = new Date(Date.now() + MFA_CHALLENGE_DURATION_MS);

  await prisma.mfaLoginChallenge.upsert({
    create: {
      credentialUpdatedAt: data.credentialUpdatedAt ?? null,
      expiresAt,
      purpose: data.purpose,
      rememberMe: data.rememberMe,
      securityVersion: data.securityVersion,
      tokenHash,
      userId: data.userId,
    },
    update: {
      attempts: 0,
      credentialUpdatedAt: data.credentialUpdatedAt ?? null,
      expiresAt,
      purpose: data.purpose,
      rememberMe: data.rememberMe,
      securityVersion: data.securityVersion,
      tokenHash,
    },
    where: { userId: data.userId },
  });
  await setMfaChallengeCookie(token, expiresAt);

  return { expiresAt, token, tokenHash };
};

export const deleteCurrentMfaChallenge = async (): Promise<void> => {
  const token = await getMfaChallengeToken();

  if (token) {
    const tokenHash = hashMfaChallengeToken(token);
    await prisma.$transaction(async (transaction) => {
      const challenge = await transaction.mfaLoginChallenge.findUnique({
        select: { expiresAt: true, purpose: true, userId: true },
        where: { tokenHash },
      });
      if (!challenge) return;

      // Setup takes this same per-user row lock before replacing an enrollment
      // and challenge. Once acquired, either the old token is still current or
      // a concurrent replacement has committed and the delete below is a no-op.
      const lockedUsers = await transaction.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "User"
        WHERE "id" = ${challenge.userId}
        FOR UPDATE
      `;
      if (lockedUsers.length !== 1) return;

      // A mandatory MFA bootstrap may reuse this token while extending its
      // enrollment. Re-read after the lock so cleanup follows the committed
      // challenge deadline rather than the stale pre-lock snapshot.
      const currentChallenge = await transaction.mfaLoginChallenge.findUnique({
        select: { expiresAt: true, purpose: true, userId: true },
        where: { tokenHash },
      });
      if (!currentChallenge || currentChallenge.userId !== challenge.userId) {
        return;
      }

      const deletedChallenge = await transaction.mfaLoginChallenge.deleteMany({
        where: { tokenHash, userId: currentChallenge.userId },
      });

      // A setup seed is useful only while its challenge is active. The shared
      // deadline identifies the matching enrollment while the row lock keeps
      // a concurrent replacement out of this critical section.
      if (
        deletedChallenge.count === 1 &&
        currentChallenge.purpose === 'SETUP'
      ) {
        await transaction.totpEnrollment.deleteMany({
          where: {
            expiresAt: currentChallenge.expiresAt,
            userId: currentChallenge.userId,
          },
        });
      }
    });
  }

  await clearMfaChallengeCookie();
};
