import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { invalidatePattern } from '@/lib/redis';

import { validateDeviceToken } from '@/lib/agent-auth';
import { heartbeatSchema } from '@/lib/validations';
import { notifySafeZoneExit } from '@/lib/safeZoneAlerts';
import {
  GEOFENCE_ALERT_COOLDOWN_MS,
  distanceToFenceCenterM,
  fenceAccuracyMarginM,
  isFenceExit,
  parseGeofence,
  toGeoPoint,
  type GeoPoint,
  type Geofence,
} from '@/lib/geo';

interface ElderLocationRow {
  id: string;
  caregiver_id: string;
  elder_name: string;
  caregiver_email: string | null;
  email_safe_zone_exits: boolean | null;
  last_lat: number | null;
  last_lng: number | null;
}

/** Active safe zones for one elder, newest first. Unusable payloads are skipped. */
async function loadGeofences(elderId: string): Promise<Geofence[]> {
  const rules = await query<{ rule_payload: unknown }>(
    `SELECT rule_payload FROM habit_rules
      WHERE elder_id = $1 AND rule_type = 'location_trigger' AND is_active = true
      ORDER BY created_at DESC
      LIMIT 5`,
    [elderId]
  );

  return rules
    .map((rule) => parseGeofence(rule.rule_payload))
    .filter((fence): fence is Geofence => fence !== null);
}

/**
 * Raise a "left the safe zone" alert when two consecutive fixes straddle a fence.
 *
 * The *previous* fix has to be inside the fence. Without that check, saving a
 * fence while the elder is already out - at the market, at a clinic - would fire
 * an alarm the moment the caregiver created it, which is exactly the kind of
 * false positive that trains families to ignore alerts.
 */
interface FenceExitCheck {
  elderId: string;
  elderName: string;
  caregiverEmail: string | null;
  /**
   * Raw `elder_profiles.safe_zone_email_enabled`, or null when it could not be
   * read; the notifier decides, so the mute rule lives in exactly one place.
   */
  emailPreference: boolean | null | undefined;
  point: GeoPoint;
  previous: GeoPoint | null;
  fence: Geofence;
  accuracyMarginM: number;
}

interface FenceExitResult {
  fence: Geofence;
  /** True when the caregiver's mute switch allowed an email to be attempted. */
  emailAttempted: boolean;
  /** True when SMTP accepted the message. */
  emailDelivered: boolean;
}

async function alertOnGeofenceExit({
  elderId,
  elderName,
  caregiverEmail,
  emailPreference,
  point,
  previous,
  fence,
  accuracyMarginM,
}: FenceExitCheck): Promise<FenceExitResult | null> {
  if (!isFenceExit(previous, point, fence, accuracyMarginM)) return null;

  // A phone drifting along the edge of a fence would otherwise notify the family
  // on every heartbeat.
  const cooldownSeconds = Math.round(GEOFENCE_ALERT_COOLDOWN_MS / 1000);
  const recentAlert = await queryOne(
    `SELECT id FROM assistance_logs
      WHERE elder_id = $1
        AND event_type = 'emergency'
        AND metadata->>'kind' = 'geofence_exit'
        AND metadata->>'fence_label' = $2
        AND created_at > NOW() - ($3::int * INTERVAL '1 second')`,
    [elderId, fence.label, cooldownSeconds]
  );

  if (recentAlert) return null;

  const distanceM = distanceToFenceCenterM(point, fence);
  const occurredAt = new Date();

  await queryOne(
    `INSERT INTO assistance_logs (
      elder_id, event_type, screen_name, app_package, duration_ms, metadata
    ) VALUES ($1, 'emergency', $2, 'geo', 0, $3::jsonb)`,
    [
      elderId,
      fence.label,
      JSON.stringify({
        kind: 'geofence_exit',
        description: `Left the safe zone "${fence.label}" (${distanceM} m from its centre)`,
        severity: 'high',
        fence_label: fence.label,
        fence_latitude: fence.latitude,
        fence_longitude: fence.longitude,
        fence_radius_m: fence.radius_m,
        distance_m: distanceM,
        latitude: point.latitude,
        longitude: point.longitude,
        occurred_at: occurredAt.toISOString(),
      }),
    ]
  );

  // The alert row only helps a caregiver who opens the dashboard, so the family
  // is emailed as well - unless this elder is muted. Best-effort by design: the
  // alert is already stored, and a mail failure must never fail the heartbeat
  // that produced it. Muting never suppresses the row above.
  const emailOutcome = await notifySafeZoneExit({
    elderName,
    fence,
    distanceM,
    point,
    caregiverEmail,
    emailPreference,
    at: occurredAt,
  });

  // Logged as well as returned to the device: a fence exit is rare and safety
  // relevant, and "no mail arrived" has to be answerable from the server logs
  // (muted / failed / no recipient are three different answers) instead of only
  // from the phone's copy of the response.
  console.log(
    `Safe-zone exit for elder ${elderId} in "${fence.label}": safe-zone email ${emailOutcome}`
  );

  return {
    fence,
    emailAttempted: emailOutcome === 'sent' || emailOutcome === 'failed',
    emailDelivered: emailOutcome === 'sent',
  };
}

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
      return NextResponse.json(
        { success: false, error: parsedBody.error.issues[0]?.message || 'Invalid payload' },
        { status: 400 }
      );
    }

    const batteryLevel = parsedBody.data.battery_level ?? null;
    const phoneModel = parsedBody.data.phone_model?.trim() || null;
    const osVersion = parsedBody.data.os_version?.trim() || null;
    const accuracy =
      typeof parsedBody.data.location_accuracy_m === 'number'
        ? parsedBody.data.location_accuracy_m
        : null;

    // The previous fix is read before the update so a fence crossing can be
    // detected. RETURNING would only give us the new coordinates.
    // The email preference is read through `to_jsonb` on purpose: referencing the
    // column directly would make every check-in fail with a 500 on a deployment
    // that runs ahead of migrations/009, i.e. silence every elder's telemetry
    // until someone runs the migration. COALESCE keeps the pre-migration default
    // ("mail on") explicit rather than relying on a null.
    const previous = await queryOne<ElderLocationRow>(
      `SELECT ep.id, ep.caregiver_id, ep.elder_name, u.email AS caregiver_email,
              COALESCE((to_jsonb(ep) ->> 'safe_zone_email_enabled')::boolean, true) AS email_safe_zone_exits,
              ep.last_lat, ep.last_lng
         FROM elder_profiles ep
         LEFT JOIN users u ON u.id = ep.caregiver_id
        WHERE ep.id = $1`,
      [elderId]
    );

    if (!previous) {
      return NextResponse.json({ success: false, error: 'Elder not found' }, { status: 404 });
    }

    const point = toGeoPoint(parsedBody.data.latitude, parsedBody.data.longitude);
    const previousPoint = toGeoPoint(previous.last_lat, previous.last_lng);

    // 1. Update elder's battery, phone model, OS version, online status and the
    //    last known location. `location_updated_at` only moves when a fix really
    //    arrived, so the dashboard can tell "online but location unknown" apart
    //    from "position is 4 hours old".
    await queryOne(
      `UPDATE elder_profiles
       SET battery_status = COALESCE($1, battery_status),
           phone_model = COALESCE($2, phone_model),
           os_version = COALESCE($3, os_version),
           last_heartbeat = NOW(),
           last_lat = COALESCE($4, last_lat),
           last_lng = COALESCE($5, last_lng),
           location_accuracy_m = COALESCE($6, location_accuracy_m),
           location_updated_at = CASE WHEN $4 IS NOT NULL AND $5 IS NOT NULL THEN NOW() ELSE location_updated_at END
       WHERE id = $7 RETURNING id`,
      [batteryLevel, phoneModel, osVersion, point?.latitude ?? null, point?.longitude ?? null, accuracy, elderId]
    );

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

    // 3. Safe zones: alert the caregiver when the elder crosses an active fence.
    let breach: FenceExitResult | null = null;
    if (point) {
      // Fences are judged against the accuracy the phone reported for this fix: a
      // 200 m fix must travel further than the radius before a family is woken up,
      // otherwise indoor GPS noise alone would raise a "left home" alert.
      const accuracyMarginM = fenceAccuracyMarginM(accuracy);
      const fences = await loadGeofences(elderId);
      for (const fence of fences) {
        breach = await alertOnGeofenceExit({
          elderId,
          elderName: previous.elder_name,
          caregiverEmail: previous.caregiver_email,
          emailPreference: previous.email_safe_zone_exits,
          point,
          previous: previousPoint,
          fence,
          accuracyMarginM,
        });
        if (breach) break;
      }
    }

    // 4. Invalidate Redis cache so caregiver dashboard shows "Online" immediately
    await invalidatePattern(`elders:${previous.caregiver_id}*`);
    if (breach) {
      await invalidatePattern(`alerts:${previous.caregiver_id}*`);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      location_tracked: point !== null,
      safe_zone_exit: breach?.fence.label ?? null,
      // Reported separately: a muted elder and a misconfigured mail server look
      // identical from the dashboard, and "no mail arrived" needs to be
      // diagnosable from the device's own logs.
      safe_zone_exit_emailed: breach?.emailAttempted ?? false,
      safe_zone_exit_email_delivered: breach?.emailDelivered ?? false,
    });
  } catch (error) {
    console.error('Error processing heartbeat:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
