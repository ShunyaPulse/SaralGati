import type { NextRequest } from 'next/server';

import { toResponse } from '@/server/http';
import { askForGuidance } from '@/server/agent/ask';

/**
 * POST /api/v1/agent/ask - the companion asks how to get unstuck.
 * Logic: src/server/agent/ask.ts.
 */
export async function POST(req: NextRequest) {
  return toResponse(await askForGuidance(req));
}
