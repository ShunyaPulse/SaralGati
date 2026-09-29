import type { NextRequest } from 'next/server';

import { toResponse } from '@/server/http';
import { createHabit, listHabits } from '@/server/habits/habits';

/**
 * GET  /api/habits - rules for one elder.
 * POST /api/habits - create a rule / safe zone.
 * Logic: src/server/habits/habits.ts.
 */
export async function GET(request: NextRequest) {
  return toResponse(await listHabits(request));
}

export async function POST(request: NextRequest) {
  return toResponse(await createHabit(request));
}
