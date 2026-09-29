import { toResponse } from '@/server/http';
import { resolveAlert } from '@/server/alerts/resolve';

/**
 * PATCH /api/alerts/:id/resolve - mark an alert resolved.
 * Logic: src/server/alerts/resolve.ts.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return toResponse(await resolveAlert(id));
}
