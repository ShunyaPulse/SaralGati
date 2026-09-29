import type { NextRequest } from 'next/server';

import { toResponse } from '@/server/http';
import { deleteHabit, updateHabit } from '@/server/habits/habit';

/**
 * PATCH  /api/habits/:id - edit confidence, active flag or payload.
 * DELETE /api/habits/:id - remove the rule.
 * Logic: src/server/habits/habit.ts.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return toResponse(await updateHabit(request, id));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return toResponse(await deleteHabit(id));
}
