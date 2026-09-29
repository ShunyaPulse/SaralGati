import { fail, ok, type ServiceResult } from '@/server/http';
import { getAuthSession } from '@/lib/auth/auth';
import { query, queryOne } from '@/lib/data/db';
import { cacheDelete } from '@/lib/data/redis';
import { HabitRule, ApiResponse } from '@/types';
import { habitRuleSchema } from '@/lib/shared/validations';

/** GET /api/habits - every rule for one of the caregiver's elders. */
export async function listHabits(request: Request): Promise<ServiceResult<ApiResponse<HabitRule[]>>> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return fail(401, { success: false, error: 'Unauthorized' });
    }

    const { searchParams } = new URL(request.url);
    const elderId = searchParams.get('elder_id');
    const userId = session.user.id;

    if (!elderId) {
      return fail(400, { success: false, error: 'elder_id is required' });
    }

    // Verify ownership
    const elder = await queryOne(`SELECT id FROM elder_profiles WHERE id = $1 AND caregiver_id = $2`, [elderId, userId]);
    if (!elder) {
      return fail(404, { success: false, error: 'Not Found or Unauthorized' });
    }

    const habits = await query<HabitRule>(
      `SELECT * FROM habit_rules WHERE elder_id = $1 ORDER BY created_at DESC`,
      [elderId]
    );

    return ok({ success: true, data: habits });
  } catch (error) {
    console.error('Error fetching habits:', error);
    return fail(500, { success: false, error: 'Internal Server Error' });
  }
}

/** POST /api/habits - create a habit rule / safe zone for one of the caregiver's elders. */
export async function createHabit(request: Request): Promise<ServiceResult<ApiResponse<HabitRule>>> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return fail(401, { success: false, error: 'Unauthorized' });
    }

    const body = await request.json();
    const validatedData = habitRuleSchema.parse(body);
    const userId = session.user.id;

    // Verify ownership
    const elder = await queryOne(`SELECT id FROM elder_profiles WHERE id = $1 AND caregiver_id = $2`, [validatedData.elder_id, userId]);
    if (!elder) {
      return fail(404, { success: false, error: 'Not Found or Unauthorized' });
    }

    const newHabit = await queryOne<HabitRule>(
      `INSERT INTO habit_rules (
        elder_id, rule_type, rule_payload, confidence, is_active, updated_at
      ) VALUES ($1, $2, $3::jsonb, $4, $5, NOW()) RETURNING *`,
      [
        validatedData.elder_id,
        validatedData.rule_type,
        JSON.stringify(validatedData.rule_payload),
        validatedData.confidence,
        validatedData.is_active,
      ]
    );

    if (!newHabit) {
      throw new Error('Failed to create habit rule');
    }

    // Invalidate config cache for this elder
    await cacheDelete(`agent-config:${validatedData.elder_id}`);

    return fail(201, { success: true, data: newHabit });
  } catch (error: any) {
    console.error('Error creating habit:', error);
    if (error.name === 'ZodError') {
      return fail(400, { success: false, error: 'Validation Error', details: error.issues });
    }
    // Unique index on (elder_id, rule_type, rule_payload) from migrations/007:
    // the elder already has this habit, so report a conflict instead of a 500.
    if (error.code === '23505') {
      return fail(409, { success: false, error: 'This habit already exists for this elder' });
    }
    return fail(500, { success: false, error: 'Internal Server Error' });
  }
}
