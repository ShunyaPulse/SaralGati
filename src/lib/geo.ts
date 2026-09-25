export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface Geofence extends GeoPoint {
  radius_m: number;
  label: string;
}

/** How long a reported fix is still worth showing as a live position. */
export const LOCATION_STALE_MS = 15 * 60 * 1000;

export const MIN_GEOFENCE_RADIUS_M = 50;
export const MAX_GEOFENCE_RADIUS_M = 20_000;
export const DEFAULT_GEOFENCE_RADIUS_M = 500;

/**
 * `habit_rules` writers put the fence name in `assistance_logs.screen_name`
 * (VARCHAR(255)) when the elder walks out, so an unbounded label from a mined
 * payload would make the alert insert fail and the caregiver would never hear
 * about the exit. The dashboard editor caps input at the same length.
 */
export const MAX_GEOFENCE_LABEL_LEN = 60;

/**
 * A GPS fix is a circle, not a point: fixes reported from indoors routinely
 * carry 50-200 m of error. Without a margin, a fence alerted the family every
 * few minutes while the elder sat at home, which is exactly how families learn
 * to ignore an alert. The margin is the accuracy the phone reported, capped so a
 * single bad fix can never more than double the distance that counts as an exit.
 */
export const MAX_FENCE_ACCURACY_MARGIN_M = 250;

/** Repeats of the same "left the safe zone" alert are suppressed for this long. */
export const GEOFENCE_ALERT_COOLDOWN_MS = 30 * 60 * 1000;

const EARTH_RADIUS_M = 6_371_000;

/**
 * Coordinates arrive from a JSON body, so they can be numbers, numeric strings,
 * `null`, or garbage. Anything that is not a finite number in range is rejected
 * rather than coerced - `Number('')` is `0`, which would silently place the elder
 * in the Atlantic.
 */
export function asCoordinate(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function isValidLatitude(value: unknown): boolean {
  const lat = asCoordinate(value);
  return lat !== null && lat >= -90 && lat <= 90;
}

export function isValidLongitude(value: unknown): boolean {
  const lng = asCoordinate(value);
  return lng !== null && lng >= -180 && lng <= 180;
}

export function toGeoPoint(latitude: unknown, longitude: unknown): GeoPoint | null {
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) return null;
  return { latitude: asCoordinate(latitude)!, longitude: asCoordinate(longitude)! };
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance in metres between two fixes. */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Read a safe-zone definition out of a `habit_rules.rule_payload`. The Android
 * miner writes free-form JSON into that column, so anything that is not a usable
 * circle is ignored instead of producing a corrupt fence.
 */
export function parseGeofence(payload: unknown): Geofence | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const record = payload as Record<string, unknown>;
  const center = toGeoPoint(record.latitude ?? record.lat, record.longitude ?? record.lng);
  if (!center) return null;

  const rawRadius = asCoordinate(record.radius_m ?? record.radius);
  const radius_m = Math.min(
    MAX_GEOFENCE_RADIUS_M,
    Math.max(MIN_GEOFENCE_RADIUS_M, rawRadius ?? DEFAULT_GEOFENCE_RADIUS_M)
  );

  const rawLabel = typeof record.label === 'string' ? record.label.trim() : '';

  return {
    ...center,
    radius_m,
    label: rawLabel ? rawLabel.slice(0, MAX_GEOFENCE_LABEL_LEN) : 'Safe zone',
  };
}

/** Reported accuracy in metres, clamped to a sane debounce margin. */
export function fenceAccuracyMarginM(accuracyM: number | null | undefined): number {
  if (typeof accuracyM !== 'number' || !Number.isFinite(accuracyM) || accuracyM <= 0) return 0;
  return Math.min(Math.round(accuracyM), MAX_FENCE_ACCURACY_MARGIN_M);
}

/** Distance in metres from a point to the centre of a fence, rounded. */
export function distanceToFenceCenterM(point: GeoPoint, fence: Geofence): number {
  return Math.round(haversineMeters(point, fence));
}

/**
 * Whether a fix sits outside the fence. `marginM` widens the fence by the fix's
 * own accuracy (never by more than its radius), so borderline noise does not
 * count as leaving.
 */
export function isOutsideGeofence(point: GeoPoint, fence: Geofence, marginM = 0): boolean {
  const margin =
    Number.isFinite(marginM) && marginM > 0 ? Math.min(marginM, fence.radius_m) : 0;
  return haversineMeters(point, fence) > fence.radius_m + margin;
}

/**
 * True only when the elder moved *out* of a fence between two consecutive fixes.
 *
 * `previous` must exist and be inside: without that, saving a fence while the
 * elder is already away would fire an alert the moment the caregiver created it,
 * and a phone left outside would alert on every single heartbeat.
 *
 * The accuracy margin is applied to the outgoing fix only. Requiring the *previous*
 * fix to be far inside as well would suppress genuine exits that start near the
 * edge, and the cost of that mistake - a missed wander - is far worse than one
 * extra alert.
 */
export function isFenceExit(
  previous: GeoPoint | null,
  next: GeoPoint,
  fence: Geofence,
  marginM = 0
): boolean {
  if (!previous) return false;
  return !isOutsideGeofence(previous, fence) && isOutsideGeofence(next, fence, marginM);
}

/**
 * A keyless map link. The dashboard deliberately does not embed a map SDK: this
 * keeps the caregiver page free of third-party API keys and trackers, and Google
 * Maps only receives the coordinate when the caregiver actually clicks.
 */
export function mapsUrl(point: GeoPoint): string {
  return `https://www.google.com/maps?q=${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`;
}

/**
 * True when the stored fix is recent enough to call the position live. The elder
 * can be online (fresh heartbeat) while the location is hours old, so the two
 * signals are evaluated separately.
 */
export function isLocationFresh(
  locationUpdatedAt: string | Date | null | undefined,
  now: number = Date.now(),
  maxAgeMs: number = LOCATION_STALE_MS
): boolean {
  if (!locationUpdatedAt) return false;
  const updated = new Date(locationUpdatedAt).getTime();
  if (Number.isNaN(updated)) return false;
  return now - updated <= maxAgeMs;
}

