import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  type PasswordLoginResult,
  startPasswordLogin,
} from '$features/auth/server/login.service';
import { apiErrors, apiSuccess, parseJsonBody } from '$server/api-response';
import { getClientIp } from '$server/request-context';
import { serviceErrorResponse } from '$server/service-error';
import type { ApiErrorResponse, ApiSuccessResponse } from '$types/api.types';
import { isPasswordWithinLengthLimit } from '$utils/password.utils';
import { loginNameSchema } from '$utils/zod.utils';

const loginSchema = z
  .object({
    loginName: loginNameSchema,
    password: z
      .string()
      .min(1, 'Mot de passe requis')
      .refine(isPasswordWithinLengthLimit, {
        message: 'Mot de passe trop long',
      }),
    rememberMe: z.boolean().optional().default(false),
  })
  .strict();

/** First login step: password, then an MFA (or MFA setup) challenge. */
export async function POST(
  request: NextRequest,
): Promise<
  NextResponse<ApiSuccessResponse<PasswordLoginResult> | ApiErrorResponse>
> {
  try {
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const validation = loginSchema.safeParse(parsedBody.data);
    if (!validation.success) {
      return apiErrors.validation(
        'Données invalides',
        validation.error.flatten().fieldErrors,
      );
    }

    return apiSuccess(
      await startPasswordLogin({
        ...validation.data,
        clientIp: getClientIp(request.headers),
      }),
    );
  } catch (error) {
    return serviceErrorResponse(error, { action: 'LOGIN', request });
  }
}
