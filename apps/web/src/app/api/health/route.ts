import { NextResponse } from 'next/server';

import { env } from '$env';
import { prisma } from '$server/prisma';

export const dynamic = 'force-dynamic';

type HealthResponse = {
  database: 'connected' | 'disconnected';
  error?: string;
  latency?: number;
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime?: number;
};

export async function GET(): Promise<NextResponse<HealthResponse>> {
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
    const isDevelopment = env.NODE_ENV === 'development';

    return NextResponse.json(
      {
        database: 'disconnected',
        ...(isDevelopment
          ? {
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          : {}),
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
