import { NextResponse } from 'next/server';
import { validateDeviceToken } from '@/lib/agent-auth';
import { queryOne } from '@/lib/db';
import { deduplicateAlert, invalidatePattern } from '@/lib/redis';
import { reportStuckSchema } from '@/lib/validations';

export async function POST(request: Request) {
  try {
    const authResult = await validateDeviceToken(request);
    
    if (!authResult.isAuthenticated || !authResult.elderId || !authResult.caregiverId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { elderId, caregiverId } = authResult;
    const body = await request.json();
    const validatedData = reportStuckSchema.parse(body);

    const isDuplicate = await deduplicateAlert(elderId, validatedData.screen_name || 'unknown');
    if (isDuplicate) {
      return NextResponse.json({ success: true, deduplicated: true });
    }

    const duration_ms = validatedData.duration_ms || 0;
    const isHighPriority = duration_ms > 120000; // 2 minutes

    // Determine severity
    const severity = isHighPriority ? 'HIGH' : 'MEDIUM';
    
    const metadata = {
      loop_count: validatedData.loop_count,
      severity
    };

    // Insert into assistance logs
    await queryOne(`
      INSERT INTO assistance_logs (
        elder_id, event_type, screen_name, app_package, duration_ms, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
    `, [
      elderId,
      'stuck_loop',
      validatedData.screen_name,
      validatedData.app_package,
      duration_ms,
      JSON.stringify(metadata)
    ]);

    // Update elder heartbeat
    await queryOne(`
      UPDATE elder_profiles 
      SET last_heartbeat = NOW()
      WHERE id = $1
    `, [elderId]);

    // Invalidate alerts cache for the caregiver
    await invalidatePattern(`alerts:${caregiverId}*`);

    // In a real system, trigger a push notification to caregiver if isHighPriority

    return NextResponse.json({ 
      success: true, 
      alert_triggered: isHighPriority 
    });
  } catch (error: any) {
    console.error('Error reporting stuck loop:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: 'Validation Error', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
