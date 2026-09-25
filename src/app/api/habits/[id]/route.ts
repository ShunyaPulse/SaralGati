import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { cacheDelete } from '@/lib/redis';
import { HabitRule, ApiResponse } from '@/types';
import { z } from 'zod';

const updateHabitSchema = z.object({
  confidence: z.number().min(0).max(1).optional(),
  is_active: z.boolean().optional(),
  rule_payload: z.record(z.string(), z.any()).optional(),
});

/** Load a habit rule only if it belongs to one of the caregiver's elders. */
async function findOwnedRule(ruleId: string, caregiverId: string): Promise<HabitRule | null> {
  return queryOne<HabitRule>(
    `SELECT hr.*
     FROM habit_rules hr
     JOIN elder_profiles ep ON hr.elder_id = ep.id
     WHERE hr.id = $1 AND ep.caregiver_id = $2`,
    [ruleId, caregiverId]
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<HabitRule>>> {
  try {
    const { id: ruleId } = await params;
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await findOwnedRule(ruleId, session.user.id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not Found or Unauthorized' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateHabitSchema.parse(body);

    const updatedHabit = await queryOne<HabitRule>(
      `UPDATE habit_rules SET
        confidence = COALESCE($1, confidence),
        is_active = COALESCE($2, is_active),
        rule_payload = COALESCE($3::jsonb, rule_payload),
        updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [
        validatedData.confidence ?? null,
        validatedData.is_active ?? null,
        validatedData.rule_payload ? JSON.stringify(validatedData.rule_payload) : null,
        ruleId,
      ]
    );

    if (!updatedHabit) {
      throw new Error('Update failed');
    }

    // Companion app reads the active rule set from this cache key.
    await cacheDelete(`agent-config:${existing.elder_id}`);

    return NextResponse.json({ success: true, data: updatedHabit });
  } catch (error: any) {
    console.error('Error updating habit rule:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: 'Validation Error', details: error.issues }, { status: 400 });
    }
    // Editing a payload onto a habit the elder already has hits the unique index
    // from migrations/007; that is a conflict, not a server error.
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'Another habit rule with this type and payload already exists' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { id: ruleId } = await params;
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await findOwnedRule(ruleId, session.user.id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not Found or Unauthorized' }, { status: 404 });
    }

    const deleted = await queryOne<{ id: string }>(
      `DELETE FROM habit_rules WHERE id = $1 RETURNING id`,
      [ruleId]
    );

    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Not Found' }, { status: 404 });
    }

    await cacheDelete(`agent-config:${existing.elder_id}`);

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Error deleting habit rule:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
