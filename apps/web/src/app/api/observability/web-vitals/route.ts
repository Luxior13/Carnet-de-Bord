import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuth } from '$server/api-auth';
import { parseJsonBody } from '$server/api-response';
import { logger } from '$server/logger';

const metricSchema = z
  .object({
    delta: z.number().finite(),
    id: z.string().min(1).max(128),
    name: z.enum(['CLS', 'FCP', 'FID', 'INP', 'LCP', 'TTFB']),
    navigationType: z.string().min(1).max(64),
    rating: z.enum(['good', 'needs-improvement', 'poor']),
    value: z.number().finite().nonnegative(),
  })
  .strict();

const payloadSchema = z
  .object({
    metrics: z.array(metricSchema).min(1).max(10),
  })
  .strict();

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;

  const body = await parseJsonBody(request);
  if (!body.success) return body.response;
  const parsed = payloadSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Mesures Web Vitals invalides',
        },
        success: false,
      },
      { status: 400 },
    );
  }

  logger.info('Client Web Vitals', {
    action: 'WEB_VITALS_REPORT',
    metadata: { metrics: parsed.data.metrics },
    userId: auth.user.id,
  });

  return new NextResponse(null, { status: 204 });
}
