import type { NextRequest } from 'next/server';

import { toResponse } from '@/server/http';
import { explainScreen } from '@/server/agent/explain';

/**
 * POST /api/v1/agent/explain - describe the current screen to the elder.
 * Logic: src/server/agent/explain.ts.
 */
export async function POST(req: NextRequest) {
  return toResponse(await explainScreen(req));
}
