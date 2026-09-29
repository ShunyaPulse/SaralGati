import { test } from 'node:test';
import assert from 'node:assert/strict';

import { elderPreferencesSchema, habitRuleSchema, heartbeatSchema } from './validations';

const firstMessage = (result: { success: boolean; error?: { issues: Array<{ message: string }> } }) =>
  result.success ? '' : result.error!.issues[0]?.message;

test('an older companion APK that sends no coordinates still checks in', () => {
  const parsed = heartbeatSchema.safeParse({ battery_level: 84, phone_model: 'Pixel 6', os_version: 'Android 14' });
  assert.equal(parsed.success, true);
  assert.equal(parsed.data!.latitude, undefined);
  assert.equal(parsed.data!.longitude, undefined);
});

test('a complete fix is accepted', () => {
  const parsed = heartbeatSchema.safeParse({ latitude: 28.6139, longitude: 77.209, location_accuracy_m: 12.5 });
  assert.equal(parsed.success, true);
  assert.equal(parsed.data!.latitude, 28.6139);
  assert.equal(parsed.data!.location_accuracy_m, 12.5);
});

test('half a fix is rejected instead of being stored as a position', () => {
  for (const body of [
    { latitude: 28.6139 },
    { longitude: 77.209 },
    { latitude: 28.6139, longitude: null },
    { latitude: null, longitude: 77.209 },
  ]) {
    const parsed = heartbeatSchema.safeParse(body);
    assert.equal(parsed.success, false, JSON.stringify(body));
    assert.equal(firstMessage(parsed), 'latitude and longitude must be sent together');
  }
});

test('impossible coordinates and accuracy are rejected', () => {
  assert.equal(heartbeatSchema.safeParse({ latitude: 91, longitude: 20 }).success, false);
  assert.equal(heartbeatSchema.safeParse({ latitude: -91, longitude: 20 }).success, false);
  assert.equal(heartbeatSchema.safeParse({ latitude: 20, longitude: 181 }).success, false);
  assert.equal(heartbeatSchema.safeParse({ latitude: 20, longitude: -181 }).success, false);
  assert.equal(heartbeatSchema.safeParse({ latitude: 20, longitude: 20, location_accuracy_m: -1 }).success, false);
  assert.equal(heartbeatSchema.safeParse({ latitude: 20, longitude: 20, location_accuracy_m: 200_000 }).success, false);
  assert.equal(heartbeatSchema.safeParse({ latitude: '28.6139', longitude: 77.209 }).success, false, 'strings are not coordinates');
});

test('a safe zone needs a usable centre', () => {
  const base = { elder_id: '3f1b3f26-2f6f-4a4b-9a2b-3a3f5f0c4c10', rule_type: 'location_trigger' as const };

  assert.equal(
    habitRuleSchema.safeParse({ ...base, rule_payload: { latitude: 28.6139, longitude: 77.209, radius_m: 500, label: 'Ghar' } })
      .success,
    true
  );

  // The on-device miner writes short keys and no radius; defaults must apply.
  assert.equal(habitRuleSchema.safeParse({ ...base, rule_payload: { lat: 28.6139, lng: 77.209 } }).success, true);

  for (const payload of [{}, { latitude: 28.6139 }, { label: 'Ghar' }, { lat: 999, lng: 77.209 }, { lat: 28.6, lng: 300 }]) {
    const parsed = habitRuleSchema.safeParse({ ...base, rule_payload: payload });
    assert.equal(parsed.success, false, JSON.stringify(payload));
    assert.match(firstMessage(parsed), /latitude and longitude/);
  }
});

test('the safe-zone email preference only accepts a real boolean', () => {
  assert.deepEqual(elderPreferencesSchema.parse({ safe_zone_email_enabled: false }), {
    safe_zone_email_enabled: false,
  });
  assert.equal(elderPreferencesSchema.parse({ safe_zone_email_enabled: true }).safe_zone_email_enabled, true);

  // A string or an omission must not be coerced: `"false"` is truthy and would
  // leave the elder unmuted while the switch in the UI reads as off.
  for (const body of [{}, { safe_zone_email_enabled: 'false' }, { safe_zone_email_enabled: 0 }, null]) {
    assert.equal(elderPreferencesSchema.safeParse(body).success, false, JSON.stringify(body));
  }
});

test('non-location rules are untouched by the geofence rule', () => {
  const parsed = habitRuleSchema.safeParse({
    elder_id: '3f1b3f26-2f6f-4a4b-9a2b-3a3f5f0c4c10',
    rule_type: 'app_trigger',
    rule_payload: { app_package: 'com.whatsapp' },
  });
  assert.equal(parsed.success, true);
  assert.equal(parsed.data!.confidence, 0.5);
  assert.equal(parsed.data!.is_active, true);
});
