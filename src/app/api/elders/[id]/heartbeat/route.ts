import { NextResponse } from 'next/server';
import { z } from 'zod';
import { queryOne } from '@/lib/db';
import { invalidatePattern } from '@/lib/redis';

import { validateDeviceToken } from '@/lib/agent-auth';

const heartbeatSchema = z.object({
  battery_level: z.number().min(0).max(100).nullish(),
  phone_model: z.string().max(120).nullish(),
  os_version: z.string().max(60).nullish(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: elderId } = await params;
    const auth = await validateDeviceToken(request);

    // Only the paired phone may report telemetry for its own elder. This route
    // used to fall back to "any active elder profile whose UUID is passed in the
    // URL", so an unauthenticated caller could forge battery and heartbeat
    // values - and heartbeat is what the caregiver dashboard reads to decide a
    // phone is online. The pairing window still works without that fallback: the
    // app sends its elder id as the bearer token until it has a device token.
    if (!auth.isAuthenticated || auth.elderId !== elderId) {
      return NextResponse.json({ success: false, error: 'Unauthorized device' }, { status: 401 });
    }

    // For the mobile companion app, it sends a JSON body
    const parsedBody = heartbeatSchema.safeParse(
      await request.json().catch(() => ({}))
    );

    if (!parsedBody.success) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const batteryLevel = parsedBody.data.battery_level ?? null;
    const phoneModel = parsedBody.data.phone_model?.trim() || null;
    const osVersion = parsedBody.data.os_version?.trim() || null;

    // 1. Update elder's battery, phone model, OS version, and online status
    const updatedElder = await queryOne<{ id: string; caregiver_id: string }>(
      `UPDATE elder_profiles 
       SET battery_status = COALESCE($1, battery_status),
           phone_model = COALESCE($2, phone_model),
           os_version = COALESCE($3, os_version),
           last_heartbeat = NOW()
       WHERE id = $4 RETURNING id, caregiver_id`,
      [batteryLevel, phoneModel, osVersion, elderId]
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
