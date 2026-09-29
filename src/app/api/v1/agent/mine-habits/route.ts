import type { NextRequest } from 'next/server';

import { toResponse } from '@/server/http';
import { mineHabits } from '@/server/agent/mineHabits';

/**
 * POST /api/v1/agent/mine-habits - flywheel-only habit mining over verified
 * interactions. Logic: src/server/agent/mineHabits.ts.
 */
export async function POST(req: NextRequest) {
  return toResponse(await mineHabits(req));
}
