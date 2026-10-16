import { fail, ok, type ServiceResult } from '@/server/http';
import { query, queryOne } from '@/lib/data/db';
import { cacheDelete, cacheGet, cacheSet, deduplicateAlert, invalidatePattern } from '@/lib/data/redis';

import { validateDeviceToken } from '@/lib/auth/agent-auth';
import { heartbeatSchema } from '@/lib/shared/validations';
import { notifySafeZoneExit } from '@/lib/geo/safeZoneAlerts';
import {
  GEOFENCE_ALERT_COOLDOWN_MS,
  distanceToFenceCenterM,
  fenceAccuracyMarginM,
  isFenceExit,
  parseGeofence,
  toGeoPoint,
  type GeoPoint,
  type Geofence,
} from '@/lib/geo/geo';

interface ElderLocationRow {
  id: string;
  caregiver_id: string;
  elder_name: string;
  caregiver_email: string | null;
  email_safe_zone_exits: boolean | null;
  last_lat: number | null;
  last_lng: number | null;
}

/**
 * Active safe zones for one elder, newest first, cached for 5 minutes in Redis/L1
 * and invalidated whenever a habit rule or safe zone is created, edited, or deleted.
 */
async function loadGeofences(elderId: string): Promise<Geofence[]> {
  const cacheKey = `agent-geofences:${elderId}`;
  const cached = await cacheGet<Geofence[]>(cacheKey);
  if (Array.isArray(cached)) {
    return cached;
  }

  const rules = await query<{ rule_payload: unknown }>(
    `SELECT rule_payload FROM habit_rules
      WHERE elder_id = $1 AND rule_type = 'location_trigger' AND is_active = true
      ORDER BY created_at DESC
      LIMIT 5`,
    [elderId]
  );

  const fences = rules
    .map((rule) => parseGeofence(rule.rule_payload))
    .filter((fence): fence is Geofence => fence !== null);

  await cacheSet(cacheKey, fences, 300);
  return fences;
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

  const emailOutcome = await notifySafeZoneExit({
    elderName,
    fence,
    distanceM,
    point,
    caregiverEmail,
    emailPreference,
    at: occurredAt,
  });

  console.log(
    `Safe-zone exit for elder ${elderId} in "${fence.label}": safe-zone email ${emailOutcome}`
  );

  return {
    fence,
    emailAttempted: emailOutcome === 'sent' || emailOutcome === 'failed',
    emailDelivered: emailOutcome === 'sent',
  };
}

/** POST /api/elders/:id/heartbeat - telemetry, battery and safe-zone checking. */
export async function recordHeartbeat(
  request: Request,
  elderId: string
): Promise<ServiceResult> {
  try {
    const auth = await validateDeviceToken(request);

    if (!auth.isAuthenticated || auth.elderId !== elderId) {
      return fail(401, { success: false, error: 'Unauthorized device' });
    }

    const parsedBody = heartbeatSchema.safeParse(
      await request.json().catch(() => ({}))
    );

    if (!parsedBody.success) {
      return fail(400, {
        success: false,
        error: parsedBody.error.issues[0]?.message || 'Invalid payload',
      });
    }

    const batteryLevel = parsedBody.data.battery_level ?? null;
    const phoneModel = parsedBody.data.phone_model?.trim() || null;
    const osVersion = parsedBody.data.os_version?.trim() || null;
    const accuracy =
      typeof parsedBody.data.location_accuracy_m === 'number'
        ? parsedBody.data.location_accuracy_m
        : null;

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
      return fail(404, { success: false, error: 'Elder not found' });
    }

    const point = toGeoPoint(parsedBody.data.latitude, parsedBody.data.longitude);
    const previousPoint = toGeoPoint(previous.last_lat, previous.last_lng);

    // 1. Update elder's battery, phone model, OS version, online status and the
    //    last known location.
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

    // 2. If battery is critically low (< 15%), deduplicate via atomic Redis NX lock (2h)
    //    before touching PostgreSQL assistance_logs.
    let batteryAlertCreated = false;
    if (batteryLevel !== null && batteryLevel < 15) {
      const isDuplicate = await deduplicateAlert(elderId, 'battery_low', 7200);
      if (!isDuplicate) {
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
          batteryAlertCreated = true;
        }
      }
    }

    // 3. Safe zones: alert the caregiver when the elder crosses an active fence.
    let breach: FenceExitResult | null = null;
    if (point) {
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

    // 4. Direct O(1) DEL of `elders:${caregiver_id}` instead of full-keyspace Redis SCAN!
    await cacheDelete(`elders:${previous.caregiver_id}`);
    if (breach || batteryAlertCreated) {
      await invalidatePattern(`alerts:${previous.caregiver_id}*`);
    }

    return ok({
      success: true,
      timestamp: new Date().toISOString(),
      location_tracked: point !== null,
      safe_zone_exit: breach?.fence.label ?? null,
      safe_zone_exit_emailed: breach?.emailAttempted ?? false,
      safe_zone_exit_email_delivered: breach?.emailDelivered ?? false,
    });
  } catch (error) {
    console.error('Error processing heartbeat:', error);
    return fail(500, { success: false, error: 'Internal Server Error' });
  }
}
