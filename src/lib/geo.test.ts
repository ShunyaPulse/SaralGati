import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_GEOFENCE_RADIUS_M,
  LOCATION_STALE_MS,
  MAX_GEOFENCE_RADIUS_M,
  MIN_GEOFENCE_RADIUS_M,
  asCoordinate,
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
