import type { NextRequest } from 'next/server';

import { toResponse } from '@/server/http';
import { syncHabits } from '@/server/agent/syncHabits';

/**
 * POST /api/v1/agent/sync-habits - the companion's periodic habit/battery sync.
 * Logic: src/server/agent/syncHabits.ts.
 */
export async function POST(request: NextRequest) {
  return toResponse(await syncHabits(request));
}
