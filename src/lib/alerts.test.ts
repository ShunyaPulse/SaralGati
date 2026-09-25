import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  alertDescription,
  alertMapUrl,
  alertPoint,
  alertTitle,
  isGeofenceExitAlert,
  safeZoneExitEmail,
} from './alerts';

/** The row the heartbeat route inserts when an elder crosses a fence. */
const GEOFENCE_ALERT = {
  event_type: 'emergency',
  screen_name: 'Ghar',
  metadata: {
    kind: 'geofence_exit',
    description: 'Left the safe zone "Ghar" (620 m from its centre)',
    severity: 'high',
    fence_label: 'Ghar',
    distance_m: 620,
    latitude: 28.5355,
    longitude: 77.391,
  },
};

test('a safe-zone exit is named after the zone, not the emergency enum', () => {
  assert.equal(isGeofenceExitAlert(GEOFENCE_ALERT), true);
  assert.equal(alertTitle(GEOFENCE_ALERT), 'Left safe zone "Ghar"');
  assert.equal(alertDescription(GEOFENCE_ALERT), '620 m from the centre of the zone.');
  assert.deepEqual(alertPoint(GEOFENCE_ALERT), { latitude: 28.5355, longitude: 77.391 });
  assert.equal(alertMapUrl(GEOFENCE_ALERT), 'https://www.google.com/maps?q=28.535500,77.391000');
});

test('older safe-zone alerts without fence_label fall back to screen_name', () => {
  const legacy = {
    event_type: 'emergency',
    screen_name: 'Bazaar',
    metadata: { kind: 'geofence_exit', severity: 'high', latitude: 1, longitude: 2 },
  };
  assert.equal(alertTitle(legacy), 'Left safe zone "Bazaar"');
  // No distance was recorded, and the stored sentence is dropped as redundant.
  assert.equal(alertDescription(legacy), null);
});

test('a safe-zone alert with no usable fix gets no map link', () => {
  const noFix = {
    event_type: 'emergency',
    screen_name: 'Ghar',
    metadata: { kind: 'geofence_exit', latitude: 999, longitude: 77 },
  };
  assert.equal(alertPoint(noFix), null);
  assert.equal(alertMapUrl(noFix), null);
  assert.equal(alertTitle(noFix), 'Left safe zone "Ghar"');
});

test('the underlying "emergency" event type does not become a bare headline', () => {
  // A companion SOS has no geofence metadata and must still not be mislabelled.
  assert.equal(alertTitle({ event_type: 'emergency', metadata: { description: 'SOS pressed' } }), 'Emergency');
  assert.equal(alertDescription({ event_type: 'emergency', metadata: { description: 'SOS pressed' } }), 'SOS pressed');
});

test('other alerts are humanised and keep the producer description', () => {
  assert.equal(alertTitle({ event_type: 'stuck_loop' }), 'Stuck loop');
  assert.equal(alertTitle({ event_type: 'screen_confusion' }), 'Screen confusion');
  assert.equal(alertDescription({ event_type: 'wrong_tap', metadata: { description: 'Tapped Pay twice' } }), 'Tapped Pay twice');
  assert.equal(alertDescription({ event_type: 'wrong_tap' }), null);
  assert.equal(alertTitle({ event_type: '', metadata: null }), 'Activity');
});

test('a battery alert explains itself from the recorded level', () => {
  const battery = { event_type: 'battery_low', metadata: { battery: 12, severity: 'medium' } };
  assert.equal(alertTitle(battery), 'Battery low');
  assert.equal(alertDescription(battery), 'The phone battery dropped to 12%.');
  assert.equal(alertMapUrl(battery), null);
});

test('the safe-zone exit email names the elder, the zone and where it happened', () => {
  const { subject, text } = safeZoneExitEmail({
    elderName: 'Suresh Kumar',
    fence: { latitude: 28.6139, longitude: 77.209, radius_m: 500, label: 'Ghar' },
    distanceM: 742.4,
    point: { latitude: 28.5355, longitude: 77.391 },
    at: new Date('2026-09-25T14:05:00.000Z'),
  });

  assert.equal(subject, 'Safe zone alert: Suresh Kumar left "Ghar"');
  assert.match(text, /Suresh Kumar is outside the safe zone "Ghar"/);
  assert.match(text, /about 742 m \(zone radius 500 m\)/);
  assert.match(text, /https:\/\/www\.google\.com\/maps\?q=28\.535500,77\.391000/);
  // Rendered on the family's clock, not the server's.
  assert.match(text, /IST/);
  assert.ok(!text.includes('2026-09-25T14:05:00.000Z'), 'no raw ISO timestamp in the body');
});

test('malformed metadata never throws', () => {
  const junk = { event_type: 'emergency', metadata: 'not an object' as any };
  assert.equal(isGeofenceExitAlert(junk), false);
  assert.equal(alertTitle(junk), 'Emergency');
  assert.equal(alertDescription(junk), null);
});
