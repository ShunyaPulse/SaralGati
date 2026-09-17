import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { invalidatePattern } from '@/lib/redis';

import { validateDeviceToken } from '@/lib/agent-auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateDeviceToken(request);
    const { id: elderId } = await params;
    
    if (!auth.isAuthenticated || auth.elderId !== elderId) {
      return NextResponse.json({ success: false, error: 'Unauthorized device' }, { status: 401 });
    }
    
    // For the mobile companion app, it sends a simple JSON body
    const body = await request.json();
    const batteryLevel = typeof body.battery_level === 'number' ? body.battery_level : null;

    // 1. Update elder's battery and online status
    const updatedElder = await queryOne(
      `UPDATE elder_profiles 
       SET battery_status = $1, last_heartbeat = NOW()
       WHERE id = $2 RETURNING id, caregiver_id`,
      [batteryLevel, elderId]
    );

    if (!updatedElder) {
      return NextResponse.json({ success: false, error: 'Elder not found' }, { status: 404 });
    }

    // 2. If battery is critically low (< 15%), we can log a battery_low alert (optional silent alert)
    if (batteryLevel !== null && batteryLevel < 15) {
      // Check if we recently alerted for this to avoid spamming
      const recentAlert = await queryOne(
        `SELECT id FROM assistance_logs 
         WHERE elder_id = $1 AND event_type = 'battery_low' 
         AND created_at > NOW() - INTERVAL '2 hours'`,
        [elderId]
      );
      
      if (!recentAlert) {
        await queryOne(
          `INSERT INTO assistance_logs (
            elder_id, event_type, screen_name, app_package, duration_ms, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [elderId, 'battery_low', 'System', 'android', 0, JSON.stringify({ battery: batteryLevel, severity: 'medium' })]
        );
      }
    }

    // 3. Invalidate Redis cache so caregiver dashboard shows "Online" immediately
    await invalidatePattern(`elders:${updatedElder.caregiver_id}*`);

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error processing heartbeat:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
