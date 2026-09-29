import type { NextRequest } from 'next/server';

import { toResponse } from '@/server/http';
import { checkFraud } from '@/server/agent/fraudCheck';

/**
 * POST /api/v1/agent/fraud-check - real-time scam verdict for one screen.
 * Logic: src/server/agent/fraudCheck.ts.
 */
export async function POST(req: NextRequest) {
  return toResponse(await checkFraud(req));
}
