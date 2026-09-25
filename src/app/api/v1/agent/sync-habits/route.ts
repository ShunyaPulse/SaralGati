import { NextResponse } from 'next/server';
import { validateDeviceToken } from '@/lib/agent-auth';
import { queryOne, transaction } from '@/lib/db';
import { cacheDelete, invalidatePattern, rateLimiter } from '@/lib/redis';
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

    // Process habits
    let syncedCount = 0;
    
    await transaction(async (client) => {
      // Clear old habits before syncing to prevent duplicate explosion
      await client.query('DELETE FROM habit_rules WHERE elder_id = $1', [elderId]);
      for (const habit of validatedData.habits) {
        // Extract generic habit type
        const ruleType = habit.type;
        
        // We will just store the entire payload in the rule_payload JSONB field
        // with a default confidence
        await client.query(`
          INSERT INTO habit_rules (
            elder_id, rule_type, rule_payload, confidence, updated_at
          ) VALUES ($1, $2, $3, $4, NOW())
        `, [
          elderId,
          ruleType,
          habit.payload ? JSON.stringify(habit.payload) : '{}',
          0.8 // default confidence
        ]);
        syncedCount++;
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

    return NextResponse.json({ success: true, synced: syncedCount });
  } catch (error: any) {
    console.error('Error syncing habits:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: 'Validation Error', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
