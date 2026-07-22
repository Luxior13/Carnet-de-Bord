import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import {
  handlePersonApiError,
  withPrivateNoStore,
  zodErrorDetails,
} from '$features/persons/server/person-api';
import { PersonDomainError } from '$features/persons/server/person-errors';
import { ErrorCode } from '$types/api.types';

const mocks = vi.hoisted(() => ({
  loggerError: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('$server/logger', () => ({
  logger: {
    error: mocks.loggerError,
  },
}));

const responseBody = async (
  response: Response,
): Promise<{
  error: {
    code: ErrorCode;
    details?: Record<string, string[]>;
    message: string;
  };
  success: false;
}> =>
  (await response.json()) as {
    error: {
      code: ErrorCode;
      details?: Record<string, string[]>;
      message: string;
    };
    success: false;
  };

describe('person API error mapping', () => {
  it.each([
    ['PERSON_NOT_FOUND', 404, ErrorCode.NOT_FOUND],
    ['PERSON_VERSION_CONFLICT', 409, ErrorCode.PERSON_VERSION_CONFLICT],
    ['PRIMARY_CONFLICT', 409, ErrorCode.PRIMARY_CONFLICT],
    [
      'PERSON_FEATURE_NOT_CONFIGURED',
      503,
      ErrorCode.PERSON_FEATURE_NOT_CONFIGURED,
    ],
  ] as const)('maps %s to a stable response', async (code, status, apiCode) => {
    const response = await handlePersonApiError(
      'PERSON_TEST',
      new PersonDomainError(code, 'Safe public message'),
    );

    expect(response.status).toBe(status);
    expect(await responseBody(response)).toMatchObject({
      error: { code: apiCode, message: 'Safe public message' },
      success: false,
    });
  });

  it.each([
    ['INVALID_CURSOR', 'Curseur'],
    ['INVALID_PERSON_HISTORY_FIELD', 'historique'],
    ['PERSON_EMAIL_LIMIT', '10'],
    ['PERSON_PHONE_LIMIT', '10'],
    ['PERSON_SOCIAL_PROFILE_LIMIT', '20'],
    ['UNKNOWN_RANGE_ERROR', 'invalides'],
  ])(
    'maps range error %s to validation without exposing internals',
    async (code, fragment) => {
      const response = await handlePersonApiError(
        'PERSON_TEST',
        new RangeError(code),
      );
      const body = await responseBody(response);

      expect(response.status).toBe(400);
      expect(body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(body.error.message.toLowerCase()).toContain(
        fragment.toLowerCase(),
      );
    },
  );

  it('maps a Prisma unique conflict and only that known database error to 409', async () => {
    const uniqueError = new Prisma.PrismaClientKnownRequestError('duplicate', {
      clientVersion: '6.19.3',
      code: 'P2002',
    });
    const response = await handlePersonApiError('PERSON_CREATE', uniqueError);

    expect(response.status).toBe(409);
    expect((await responseBody(response)).error.code).toBe(ErrorCode.CONFLICT);
  });

  it('returns a generic 500 and correlates logs without leaking the thrown message', async () => {
    const response = await handlePersonApiError(
      'PERSON_UPDATE',
      new Error('database-password=must-never-leak'),
      new Request('http://localhost/api/personnes/person-1', {
        headers: { 'x-request-id': '123e4567-e89b-42d3-a456-426614174000' },
        method: 'PATCH',
      }),
    );
    const body = await responseBody(response);

    expect(response.status).toBe(500);
    expect(body.error).toEqual({
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Erreur serveur',
    });
    expect(JSON.stringify(body)).not.toContain('database-password');
    expect(response.headers.get('x-request-id')).toBe(
      '123e4567-e89b-42d3-a456-426614174000',
    );
    expect(mocks.loggerError).toHaveBeenCalledOnce();
  });

  it('groups all Zod issues by their precise API field path', () => {
    const parsed = z
      .object({
        emails: z.array(z.object({ email: z.string().email() })),
        version: z.number().positive(),
      })
      .safeParse({ emails: [{ email: 'invalid' }], version: 0 });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(zodErrorDetails(parsed.error)).toEqual({
        'emails.0.email': [expect.any(String)],
        version: [expect.any(String)],
      });
    }
  });

  it('applies private no-store consistently to error responses too', async () => {
    const response = withPrivateNoStore(
      await handlePersonApiError(
        'PERSON_GET',
        new PersonDomainError('PERSON_NOT_FOUND', 'Introuvable'),
      ),
    );

    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Pragma')).toBe('no-cache');
  });
});
