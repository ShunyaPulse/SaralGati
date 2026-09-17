import { NextResponse } from 'next/server';
import { validateDeviceToken } from '@/lib/agent-auth';
import { query, queryOne } from '@/lib/db';
import { cacheDelete, invalidatePattern } from '@/lib/redis';
import { syncHabitsSchema } from '@/lib/validations';

// Basic rate limiting map (In production, use Redis for rate limiting)
const rateLimits = new Map<string, { count: number, resetAt: number }>();

export async function POST(request: Request) {
  try {
    const authResult = await validateDeviceToken(request);
    
    if (!authResult.isAuthenticated || !authResult.elderId || !authResult.caregiverId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { elderId, caregiverId } = authResult;
    
    // Simple Rate Limiting: 60 req/min per device token (using elderId as proxy)
    const now = Date.now();
    const rateLimit = rateLimits.get(elderId) || { count: 0, resetAt: now + 60000 };
    
    if (now > rateLimit.resetAt) {
      rateLimit.count = 1;
      rateLimit.resetAt = now + 60000;
    } else {
      rateLimit.count++;
      if (rateLimit.count > 60) {
        return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
      }
    }
    rateLimits.set(elderId, rateLimit);

    const body = await request.json();
    const validatedData = syncHabitsSchema.parse(body);

    // Process habits
    let syncedCount = 0;
    for (const habit of validatedData.habits) {
      // Extract generic habit type
      const ruleType = habit.type;
      
      // We will just store the entire payload in the rule_payload JSONB field
      // with a default confidence
      await queryOne(`
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
      return NextResponse.json({ success: false, error: 'Validation Error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
