import { NextResponse } from 'next/server';

import { prisma } from '$server/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      database: 'connected',
      latency: Date.now() - start,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
