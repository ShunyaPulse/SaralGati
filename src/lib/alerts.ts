import { mapsUrl, toGeoPoint, type GeoPoint, type Geofence } from './geo';

/** `metadata.kind` the heartbeat route writes for a "left the safe zone" alert. */
export const GEOFENCE_EXIT_KIND = 'geofence_exit';

/**
 * The shape every alert renderer needs. `AssistanceLog` satisfies it, and keeping
 * it structural lets the feed, the timeline and the dashboard share one set of
 * labels instead of each re-deriving them from `event_type` on its own.
 */
export interface AlertLike {
  event_type: string;
  screen_name?: string | null;
  metadata?: Record<string, any> | null;
}

function metadata(alert: AlertLike): Record<string, any> {
  const value = alert.metadata;
  return value && typeof value === 'object' ? (value as Record<string, any>) : {};
}

export function isGeofenceExitAlert(alert: AlertLike): boolean {
  return metadata(alert).kind === GEOFENCE_EXIT_KIND;
}

/** "stuck_loop" -> "Stuck loop"; the stored enum value is not for caregivers to read. */
function humanizeEventType(eventType: string): string {
  const words = String(eventType || '').replace(/_/g, ' ').trim();
  if (!words) return 'Activity';
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Headline for one alert.
 *
 * A safe-zone exit has to be stored as `event_type = 'emergency'` - it is the
 * only row type the CHECK constraint in migrations/004 accepts for it - so
 * rendering the raw enum told the caregiver "Emergency" with no hint that it was
 * a wander, or which zone was left. `screen_name` carries the fence label on
 * those rows, which is why it is the fallback for older alerts written before
 * `fence_label` existed.
 */
export function alertTitle(alert: AlertLike): string {
  if (isGeofenceExitAlert(alert)) {
    const label = metadata(alert).fence_label || alert.screen_name;
    return label ? `Left safe zone "${label}"` : 'Left the safe zone';
  }
  if (alert.event_type === 'battery_low') return 'Battery low';
  return humanizeEventType(alert.event_type);
}

/**
 * One-line explanation, or `null` when the producer left none. The distance is
 * preferred over the stored sentence for safe-zone exits because the title
 * already names the zone - repeating it wasted the only line of context the
 * caregiver gets.
 */
export function alertDescription(alert: AlertLike): string | null {
  const data = metadata(alert);

  if (isGeofenceExitAlert(alert)) {
    const distance = data.distance_m;
    if (typeof distance === 'number' && Number.isFinite(distance)) {
      return `${Math.round(distance)} m from the centre of the zone.`;
    }
  }

  const description = typeof data.description === 'string' ? data.description.trim() : '';
  if (description) return description;

  // Battery alerts were logged with the level but no sentence. The level alone
  // already answers "why did this fire?".
  if (alert.event_type === 'battery_low' && typeof data.battery === 'number') {
    return `The phone battery dropped to ${Math.round(data.battery)}%.`;
  }

  return null;
}

/** Where the elder was when the alert fired. Only safe-zone exits carry a fix. */
export function alertPoint(alert: AlertLike): GeoPoint | null {
  if (!isGeofenceExitAlert(alert)) return null;
  const data = metadata(alert);
  return toGeoPoint(data.latitude, data.longitude);
}

/** Keyless Google Maps link for an alert that carries coordinates. */
export function alertMapUrl(alert: AlertLike): string | null {
  const point = alertPoint(alert);
  return point ? mapsUrl(point) : null;
}

export interface SafeZoneExitEmailInput {
  elderName: string;
  fence: Geofence;
  /** Rounded metres between the fix and the zone centre. */
  distanceM: number;
  point: GeoPoint;
  at?: Date;
}

/** The audience reads the clock in IST, so an ISO timestamp would just confuse. */
function formatIst(at: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(at);
}

/**
 * Subject and body of the "your parent left the safe zone" email.
 *
 * The dashboard alert only reaches a caregiver who opens the dashboard, which is
 * the wrong shape for a wander. Kept pure - and out of the nodemailer module - so
 * it can be unit tested and so client components can import this file safely.
 */
export function safeZoneExitEmail(input: SafeZoneExitEmailInput): {
  subject: string;
  text: string;
} {
  const { elderName, fence, distanceM, point } = input;
  const at = input.at ?? new Date();

  return {
    subject: `Safe zone alert: ${elderName} left "${fence.label}"`,
    text: [
      `${elderName} is outside the safe zone "${fence.label}".`,
      '',
      `Time: ${formatIst(at)} (IST)`,
      `Distance from the zone centre: about ${Math.round(distanceM)} m (zone radius ${fence.radius_m} m)`,
      `Where: ${mapsUrl(point)}`,
      '',
      'Open the SaralGati dashboard to see the live position and to resolve this alert.',
      'This is an automated message.',
    ].join('\n'),
  };
}
