import { fail, ok, type ServiceResult } from '@/server/http';
import { getAuthSession } from '@/lib/auth/auth';
import { queryOne } from '@/lib/data/db';
import { cacheDelete } from '@/lib/data/redis';
import { HabitRule, ApiResponse } from '@/types';
import { parseGeofence } from '@/lib/geo/geo';
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

/** PATCH /api/habits/:id - edit a rule's confidence, active flag or payload. */
export async function updateHabit(
  request: Request,
  ruleId: string
): Promise<ServiceResult<ApiResponse<HabitRule>>> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return fail(401, { success: false, error: 'Unauthorized' });
    }

    const existing = await findOwnedRule(ruleId, session.user.id);
    if (!existing) {
      return fail(404, { success: false, error: 'Not Found or Unauthorized' });
    }

    const body = await request.json();
    const validatedData = updateHabitSchema.parse(body);

    // A safe zone edited through this route must satisfy the same rule that
    // POST /api/habits enforces, otherwise the heartbeat route would quietly
    // ignore a fence the caregiver believes is protecting the elder.
    if (existing.rule_type === 'location_trigger' && validatedData.rule_payload) {
      if (!parseGeofence(validatedData.rule_payload)) {
        return fail(400, {
          success: false,
          error:
            'rule_payload needs a valid latitude and longitude (with an optional radius_m between 50 and 20000 metres and a label)',
        });
      }
    }

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

    return ok({ success: true, data: updatedHabit });
  } catch (error: any) {
    console.error('Error updating habit rule:', error);
    if (error.name === 'ZodError') {
      return fail(400, { success: false, error: 'Validation Error', details: error.issues });
    }
    // Editing a payload onto a habit the elder already has hits the unique index
    // from migrations/007; that is a conflict, not a server error.
    if (error.code === '23505') {
      return fail(409, { success: false, error: 'Another habit rule with this type and payload already exists' });
    }
    return fail(500, { success: false, error: 'Internal Server Error' });
  }
}

/** DELETE /api/habits/:id - remove a rule from one of the caregiver's elders. */
export async function deleteHabit(ruleId: string): Promise<ServiceResult<ApiResponse<null>>> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return fail(401, { success: false, error: 'Unauthorized' });
    }

    const existing = await findOwnedRule(ruleId, session.user.id);
    if (!existing) {
      return fail(404, { success: false, error: 'Not Found or Unauthorized' });
    }

    const deleted = await queryOne<{ id: string }>(
      `DELETE FROM habit_rules WHERE id = $1 RETURNING id`,
      [ruleId]
    );

    if (!deleted) {
      return fail(404, { success: false, error: 'Not Found' });
    }

    await cacheDelete(`agent-config:${existing.elder_id}`);

    return ok({ success: true, data: null });
  } catch (error) {
    console.error('Error deleting habit rule:', error);
    return fail(500, { success: false, error: 'Internal Server Error' });
  }
}
