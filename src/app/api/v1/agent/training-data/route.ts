import type { NextRequest } from 'next/server';

import { toResponse } from '@/server/http';
import { exportTrainingData } from '@/server/agent/trainingData';

/**
 * GET /api/v1/agent/training-data - flywheel-only SFT/DPO/fraud export.
 * Logic: src/server/agent/trainingData.ts.
 */
export async function GET(req: NextRequest) {
  return toResponse(await exportTrainingData(req));
}
