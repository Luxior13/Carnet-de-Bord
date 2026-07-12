import type { NextResponse } from 'next/server';

import { createReadinessResponse } from '$server/health';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  return createReadinessResponse();
}
