import type { NextRequest } from 'next/server';

import { toResponse } from '@/server/http';
import { recordFeedback } from '@/server/agent/feedback';

/**
 * POST /api/v1/agent/feedback - what the elder actually tapped, which promotes
 * or evicts a cached answer. Logic: src/server/agent/feedback.ts.
 */
export async function POST(req: NextRequest) {
  return toResponse(await recordFeedback(req));
}
