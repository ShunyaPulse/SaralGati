import type { NextRequest } from 'next/server';

import { toResponse } from '@/server/http';
import { reportStuck } from '@/server/agent/reportStuck';

/**
 * POST /api/v1/agent/report-stuck - the companion reporting a stuck loop.
 * Logic: src/server/agent/reportStuck.ts.
 */
export async function POST(request: NextRequest) {
  return toResponse(await reportStuck(request));
}
