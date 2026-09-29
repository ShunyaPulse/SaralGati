import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_GEOFENCE_RADIUS_M,
  LOCATION_STALE_MS,
  MAX_FENCE_ACCURACY_MARGIN_M,
  MAX_GEOFENCE_LABEL_LEN,
  MAX_GEOFENCE_RADIUS_M,
  MIN_GEOFENCE_RADIUS_M,
  asCoordinate,
  fenceAccuracyMarginM,
  distanceToFenceCenterM,
  haversineMeters,
  isFenceExit,
  isLocationFresh,
  isOutsideGeofence,
  isValidLatitude,
  isValidLongitude,
  mapsUrl,
  parseGeofence,
  toGeoPoint,
} from './geo';

const DELHI = { latitude: 28.6139, longitude: 77.209 };
const NOIDA = { latitude: 28.5355, longitude: 77.391 };

test('asCoordinate rejects blanks and non-finite values instead of coercing to 0', () => {
  assert.equal(asCoordinate(''), null);
  assert.equal(asCoordinate('   '), null);
  assert.equal(asCoordinate(null), null);
  assert.equal(asCoordinate(undefined), null);
  assert.equal(asCoordinate({}), null);
  assert.equal(asCoordinate('abc'), null);
  assert.equal(asCoordinate(NaN), null);
  assert.equal(asCoordinate(Infinity), null);
  assert.equal(asCoordinate(0), 0);
  assert.equal(asCoordinate('28.61'), 28.61);
});

test('latitude and longitude ranges are enforced', () => {
  assert.equal(isValidLatitude(90), true);
  assert.equal(isValidLatitude(-90), true);
  assert.equal(isValidLatitude(90.01), false);
  assert.equal(isValidLongitude(180), true);
  assert.equal(isValidLongitude(-180), true);
  assert.equal(isValidLongitude(180.01), false);
  assert.equal(isValidLatitude(null), false);
});

test('toGeoPoint needs both halves of a fix', () => {
  assert.deepEqual(toGeoPoint(28.6139, 77.209), DELHI);
  assert.equal(toGeoPoint(28.6139, null), null);
  assert.equal(toGeoPoint(undefined, 77.209), null);
  assert.deepEqual(toGeoPoint('28.6139', '77.209'), DELHI, 'numeric strings parse');
  assert.equal(toGeoPoint('', 77.209), null, 'a blank half is not a fix');
  assert.deepEqual(toGeoPoint('28.6139', 77.209), DELHI);
});

test('haversineMeters matches known distances', () => {
  // Delhi -> Mumbai is ~1150 km.
  const delhiToMumbai = haversineMeters(DELHI, { latitude: 19.076, longitude: 72.8777 });
  assert.ok(delhiToMumbai > 1_140_000 && delhiToMumbai < 1_160_000, `got ${delhiToMumbai}`);

  // Delhi -> Noida is ~20 km.
  const delhiToNoida = haversineMeters(DELHI, NOIDA);
  assert.ok(delhiToNoida > 18_000 && delhiToNoida < 22_000, `got ${delhiToNoida}`);

  assert.equal(Math.round(haversineMeters(DELHI, DELHI)), 0);
});

test('parseGeofence reads the mined payload shape and applies defaults', () => {
  assert.deepEqual(parseGeofence({ latitude: 28.6139, longitude: 77.209, radius_m: 300, label: 'Ghar' }), {
    latitude: 28.6139,
    longitude: 77.209,
    radius_m: 300,
    label: 'Ghar',
  });

  // Short keys are what the on-device habit miner tends to emit.
  assert.deepEqual(parseGeofence({ lat: 28.6139, lng: 77.209 }), {
    latitude: 28.6139,
    longitude: 77.209,
    radius_m: DEFAULT_GEOFENCE_RADIUS_M,
    label: 'Safe zone',
  });

  // A blank label must not become an empty heading in the caregiver UI.
  assert.equal(parseGeofence({ lat: 1, lng: 2, label: '   ' })?.label, 'Safe zone');
});

test('parseGeofence clamps silly radii and ignores unusable payloads', () => {
  assert.equal(parseGeofence({ lat: 1, lng: 2, radius_m: 5 })?.radius_m, MIN_GEOFENCE_RADIUS_M);
  assert.equal(parseGeofence({ lat: 1, lng: 2, radius_m: 9_999_999 })?.radius_m, MAX_GEOFENCE_RADIUS_M);
  assert.equal(parseGeofence({ lat: 1, lng: 2, radius_m: 'not a number' })?.radius_m, DEFAULT_GEOFENCE_RADIUS_M);

  assert.equal(parseGeofence(null), null);
  assert.equal(parseGeofence('28,77'), null);
  assert.equal(parseGeofence([1, 2]), null);
  assert.equal(parseGeofence({}), null);
  assert.equal(parseGeofence({ lat: 999, lng: 2 }), null);
  assert.equal(parseGeofence({ lat: 1, lng: 181 }), null);
});

test('an over-long fence label is truncated so the alert insert cannot fail', () => {
  // The label is copied into assistance_logs.screen_name on every exit; an
  // unbounded mined label would make that insert (VARCHAR(255)) throw and the
  // caregiver would never be told about the exit at all.
  const parsed = parseGeofence({ lat: 1, lng: 2, label: 'G'.repeat(400) });
  assert.equal(parsed?.label.length, MAX_GEOFENCE_LABEL_LEN);
  assert.equal(parseGeofence({ lat: 1, lng: 2, label: 'Ghar' })?.label, 'Ghar');
});

test('fenceAccuracyMarginM caps the debounce and rejects junk', () => {
  assert.equal(fenceAccuracyMarginM(35.4), 35);
  assert.equal(fenceAccuracyMarginM(0), 0, 'an exact fix gets no margin');
  assert.equal(fenceAccuracyMarginM(-5), 0);
  assert.equal(fenceAccuracyMarginM(null), 0);
  assert.equal(fenceAccuracyMarginM(undefined), 0);
  assert.equal(fenceAccuracyMarginM(NaN), 0);
  assert.equal(fenceAccuracyMarginM(Infinity), 0);
  assert.equal(fenceAccuracyMarginM(10_000), MAX_FENCE_ACCURACY_MARGIN_M);
});

test('the accuracy margin debounces a fix sitting on the fence edge', () => {
  const fence = { ...DELHI, radius_m: 1000, label: 'Ghar' };
  // ~1050 m north of the centre: outside the 1000 m circle, inside its noise band.
  const justOutside = { latitude: DELHI.latitude + 0.00945, longitude: DELHI.longitude };
  const distance = haversineMeters(justOutside, DELHI);
  assert.ok(distance > 1000 && distance < 1100, `expected ~1050 m, got ${distance}`);

  assert.equal(isOutsideGeofence(justOutside, fence), true);
  assert.equal(isOutsideGeofence(justOutside, fence, fenceAccuracyMarginM(120)), false);
  assert.equal(isFenceExit(DELHI, justOutside, fence, fenceAccuracyMarginM(120)), false, 'noise is not an exit');
  assert.equal(isFenceExit(DELHI, justOutside, fence, fenceAccuracyMarginM(5)), true, 'a precise fix is believed');
  assert.equal(isFenceExit(DELHI, NOIDA, fence, fenceAccuracyMarginM(120)), true, 'a real walk out still fires');
});

test('the margin can never more than double the exit distance', () => {
  const smallFence = { ...DELHI, radius_m: MIN_GEOFENCE_RADIUS_M, label: 'Gate' };
  // ~80 m out: outside a 50 m fence, inside the 100 m one the margin may reach.
  const nearPoint = { latitude: DELHI.latitude + 0.00072, longitude: DELHI.longitude };
  const distance = haversineMeters(nearPoint, DELHI);
  assert.ok(distance > 50 && distance < 100, `expected 50-100 m, got ${distance}`);
  assert.equal(isOutsideGeofence(nearPoint, smallFence, fenceAccuracyMarginM(250)), false);
  // A garbage margin must never silently swallow every exit either.
  assert.equal(isOutsideGeofence(nearPoint, smallFence, NaN), true);
});

test('isOutsideGeofence treats the radius as the boundary', () => {
  const fence = { ...DELHI, radius_m: 1000, label: 'Ghar' };
  assert.equal(isOutsideGeofence({ latitude: 28.6139, longitude: 77.209 }, fence), false);
  assert.equal(isOutsideGeofence({ latitude: 28.6145, longitude: 77.2095 }, fence), false);
  assert.equal(isOutsideGeofence(NOIDA, fence), true);
});

test('isFenceExit fires only on an inside -> outside transition', () => {
  const fence = { ...DELHI, radius_m: 1000, label: 'Ghar' };
  const inside = { latitude: 28.6145, longitude: 77.2095 };
  const outside = NOIDA;

  assert.equal(isFenceExit(inside, outside, fence), true, 'walked out');
  assert.equal(isFenceExit(inside, inside, fence), false, 'stayed home');
  assert.equal(isFenceExit(outside, outside, fence), false, 'still away, no repeat');
  assert.equal(isFenceExit(outside, inside, fence), false, 'came back');
  assert.equal(isFenceExit(null, outside, fence), false, 'first fix after creating the fence');
  assert.equal(isFenceExit(null, inside, fence), false, 'first fix inside');
});

test('distanceToFenceCenterM is rounded metres, not degrees', () => {
  const fence = { ...DELHI, radius_m: 1000, label: 'Ghar' };
  const distance = distanceToFenceCenterM(NOIDA, fence);
  assert.equal(distance, Math.round(haversineMeters(NOIDA, DELHI)));
  assert.ok(distance > 10_000);
});

test('mapsUrl is keyless and pins to 6 decimals', () => {
  assert.equal(mapsUrl({ latitude: 28.6139, longitude: 77.209 }), 'https://www.google.com/maps?q=28.613900,77.209000');
  assert.ok(!mapsUrl(DELHI).includes('key='));
});

test('isLocationFresh separates a live fix from a stale one', () => {
  const now = Date.parse('2026-01-01T12:00:00.000Z');
  assert.equal(isLocationFresh(new Date(now - 60_000), now), true);
  assert.equal(isLocationFresh(new Date(now - LOCATION_STALE_MS), now), true);
  assert.equal(isLocationFresh(new Date(now - LOCATION_STALE_MS - 1000), now), false);
  assert.equal(isLocationFresh(null, now), false);
  assert.equal(isLocationFresh(undefined, now), false);
  assert.equal(isLocationFresh('not a date', now), false);
  assert.equal(isLocationFresh(new Date(now - 1000).toISOString(), now), true);
});
