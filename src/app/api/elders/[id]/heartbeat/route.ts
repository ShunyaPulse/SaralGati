import type { NextRequest } from 'next/server';

import { toResponse } from '@/server/http';
import { recordHeartbeat } from '@/server/elders/heartbeat';

/**
 * POST /api/elders/:id/heartbeat - telemetry, battery and safe-zone checking.
 * Logic: src/server/elders/heartbeat.ts.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return toResponse(await recordHeartbeat(request, id));
}
