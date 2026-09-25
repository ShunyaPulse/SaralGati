import { NextResponse } from 'next/server';
import { validateDeviceToken } from '@/lib/agent-auth';
import { queryOne, transaction } from '@/lib/db';
import { cacheDelete, invalidatePattern, rateLimiter } from '@/lib/redis';
import { planSyncedHabits } from '@/lib/habits';
import { syncHabitsSchema } from '@/lib/validations';

export async function POST(request: Request) {
  try {
    const authResult = await validateDeviceToken(request);
    
    if (!authResult.isAuthenticated || !authResult.elderId || !authResult.caregiverId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { elderId, caregiverId } = authResult;
    
    // Rate limiting: 60 req/min per paired device. This runs in Redis because the
    // in-memory Map it replaced was per-process, so it neither held across Cloud
    // Run instances nor ever evicted an entry for a retired elder.
    const rateLimit = await rateLimiter(`sync-habits:${elderId}`, 60, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json();
    const validatedData = syncHabitsSchema.parse(body);

    // The companion app reports habit kinds beyond the four the schema stores
    // (`device_preference`). Those rows used to abort the insert, which rolled the
    // transaction back and returned a 500 the phone could only log - losing the
    // battery telemetry that follows it. Keep what can be stored and tell the
    // device what was skipped instead of failing the whole sync.
    //
    // `ownedRuleTypes` is what makes the DELETE below safe: it lifts only the rule
    // types the device actually sends. Clearing every rule for the elder - what
    // this route did before - deleted the caregiver's safe zone (a
    // `location_trigger` row created in the dashboard) on the next check-in,
    // silently switching off the geofence protection they had just set up.
    const { storable: storableHabits, ownedRuleTypes, skippedRuleTypes } = planSyncedHabits(
      validatedData.habits
    );

    // Process habits
    let syncedCount = 0;
    
    await transaction(async (client) => {
      // Clear old habits before syncing to prevent duplicate explosion
      if (ownedRuleTypes.length > 0) {
        await client.query(
          'DELETE FROM habit_rules WHERE elder_id = $1 AND rule_type = ANY($2::text[])',
          [elderId, ownedRuleTypes]
        );
      }
      for (const habit of storableHabits) {
        // Extract generic habit type
        const ruleType = habit.type;
        
        // We will just store the entire payload in the rule_payload JSONB field
        // with a default confidence
        // A phone payload can repeat the same habit; the unique index added in
        // migrations/007 would otherwise abort the whole transaction (and with
        // it the battery/heartbeat update below). Skip the repeat instead and
        // only count rows that were really written.
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
          0.8 // default confidence
        ]);
        syncedCount += inserted.rowCount ?? 0;
      }
    });

    // Update elder profile with battery and heartbeat
    await queryOne(`
      UPDATE elder_profiles 
      SET battery_status = $1, last_heartbeat = NOW()
      WHERE id = $2
    `, [validatedData.battery_level || null, elderId]);

    // Invalidate caches
    await cacheDelete(`agent-config:${elderId}`);
    await invalidatePattern(`elders:${caregiverId}*`);

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      // Named so the companion can stop sending the same unusable type for ever.
      ...(skippedRuleTypes.length > 0 ? { skipped_rule_types: skippedRuleTypes } : {}),
    });
  } catch (error: any) {
    console.error('Error syncing habits:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: 'Validation Error', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
