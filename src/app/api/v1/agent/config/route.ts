import type { NextRequest } from 'next/server';

import { toResponse } from '@/server/http';
import { getAgentConfig } from '@/server/agent/config';

/**
 * GET /api/v1/agent/config - guidance strings, emergency contact and habit
 * shortcuts for the paired elder. Logic: src/server/agent/config.ts.
 */
export async function GET(request: NextRequest) {
  return toResponse(await getAgentConfig(request));
}
