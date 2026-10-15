import { type NextRequest, NextResponse } from 'next/server';

/** No current page consumes account activity or its CSV export. Fail closed. */
export const GET: (
  _request: NextRequest,
  _context: { params: Promise<{ id: string }> },
) => Promise<NextResponse> = async () => {
  return NextResponse.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: "Cette fonction n'est plus disponible.",
      },
      success: false,
    },
    { headers: { 'Cache-Control': 'private, no-store' }, status: 410 },
  );
};
