import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
  Pragma: 'no-cache',
} as const;

export function GET(): NextResponse {
  return NextResponse.json(
    {
      status: 'healthy' as const,
      timestamp: new Date().toISOString(),
    },
    { headers: NO_STORE_HEADERS },
  );
}
