import type { NextRequest } from 'next/server';

import { toResponse } from '@/server/http';
import { issueDeviceToken } from '@/server/elders/deviceToken';

/**
 * POST /api/device-token - mint or rotate the paired phone's bearer token.
 * Logic: src/server/elders/deviceToken.ts.
 */
export async function POST(request: NextRequest) {
  return toResponse(await issueDeviceToken(request));
}
