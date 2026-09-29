import type { NextRequest } from 'next/server';

import { toResponse } from '@/server/http';
import { createElder, listElders } from '@/server/elders/elders';

/**
 * GET /api/elders - the caregiver's elder profiles.
 * POST /api/elders - create one.
 * Logic: src/server/elders/elders.ts.
 */
export async function GET() {
  return toResponse(await listElders());
}

export async function POST(request: NextRequest) {
  return toResponse(await createElder(request));
}
