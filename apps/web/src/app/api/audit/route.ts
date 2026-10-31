import type { NextRequest, NextResponse } from 'next/server';

import { PERMISSIONS } from '$constants/permissions.constants';
import { readJournalQuery } from '$features/audit/audit-journal.types';
import {
  listJournalEvents,
  traceJournalView,
} from '$features/audit/server/audit-journal.service';
import { requireAuth, requirePermission } from '$server/api-auth';
import {
  apiErrors,
  apiSuccess,
  withPrivateNoStore,
} from '$server/api-response';

/**
 * Activity journal, read only (rebuilt on 30 October 2026). Unknown or
 * malformed filters fall back to their defaults, like the other lists; the
 * reader's rights decide what each event shows.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const permission = requirePermission(auth.user, PERMISSIONS.AUDIT.VIEW);
  if (!permission.success) return permission.response;

  const searchParams = request.nextUrl.searchParams;
  try {
    // No journal is shown without its own trace being written first.
    await traceJournalView(auth.user);

    return withPrivateNoStore(
      apiSuccess(
        await listJournalEvents(
          auth.user,
          readJournalQuery(searchParams),
          searchParams.get('asOf'),
        ),
      ),
    );
  } catch (error) {
    return apiErrors.internal('AUDIT_JOURNAL', error, request);
  }
}
