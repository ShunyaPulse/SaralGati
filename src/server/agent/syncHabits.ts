import { fail, ok, type ServiceResult } from '@/server/http';
import { validateDeviceToken } from '@/lib/auth/agent-auth';
import { queryOne, transaction } from '@/lib/data/db';
import { cacheDelete, rateLimiter } from '@/lib/data/redis';
import { planSyncedHabits } from '@/lib/data/habits';
import { syncHabitsSchema } from '@/lib/shared/validations';

export async function syncHabits(request: Request): Promise<ServiceResult> {
  try {
    const authResult = await validateDeviceToken(request);
    
    if (!authResult.isAuthenticated || !authResult.elderId || !authResult.caregiverId) {
      return fail(401, { success: false, error: 'Unauthorized' });
    }

    const { elderId, caregiverId } = authResult;
    
    const rateLimit = await rateLimiter(`sync-habits:${elderId}`, 60, 60);
    if (!rateLimit.allowed) {
      return fail(429, { success: false, error: 'Rate limit exceeded' });
    }

    const body = await request.json();
    const validatedData = syncHabitsSchema.parse(body);

    const { storable: storableHabits, ownedRuleTypes, skippedRuleTypes } = planSyncedHabits(
      validatedData.habits
    );

    let syncedCount = 0;
    
    await transaction(async (client) => {
      if (ownedRuleTypes.length > 0) {
        await client.query(
          'DELETE FROM habit_rules WHERE elder_id = $1 AND rule_type = ANY($2::text[])',
          [elderId, ownedRuleTypes]
        );
      }
      for (const habit of storableHabits) {
        const ruleType = habit.type;
        const inserted = await client.query(`
          INSERT INTO habit_rules (
            elder_id, rule_type, rule_payload, confidence, updated_at
          ) VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT DO NOTHING
          RETURNING id
        `, [
          elderId,
          ruleType,
          habit.payload ? JSON.stringify(habit.payload) : '{}',
          0.8
        ]);
        syncedCount += inserted.rowCount ?? 0;
      }
    });

    await queryOne(`
      UPDATE elder_profiles 
      SET battery_status = COALESCE($1, battery_status), last_heartbeat = NOW()
      WHERE id = $2
    `, [validatedData.battery_level ?? null, elderId]);

    // O(1) cache deletes instead of O(N) SCAN
    await cacheDelete(`agent-config:${elderId}`);
    await cacheDelete(`agent-habits:${elderId}`);
    await cacheDelete(`agent-geofences:${elderId}`);
    await cacheDelete(`elders:${caregiverId}`);

    return ok({
      success: true,
      synced: syncedCount,
      ...(skippedRuleTypes.length > 0 ? { skipped_rule_types: skippedRuleTypes } : {}),
    });
  } catch (error: any) {
    console.error('Error syncing habits:', error);
    if (error.name === 'ZodError') {
      return fail(400, { success: false, error: 'Validation Error', details: error.issues });
    }
    return fail(500, { success: false, error: 'Internal Server Error' });
  }
}
