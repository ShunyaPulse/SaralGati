import { test } from 'node:test';
import assert from 'node:assert/strict';

import { STORABLE_RULE_TYPES, planSyncedHabits } from './habits';

test('the synced types are the only ones the schema can store', () => {
  // migrations/003 CHECK constraint.
  assert.deepEqual([...STORABLE_RULE_TYPES], [
    'frequent_contact',
    'app_trigger',
    'time_routine',
    'location_trigger',
  ]);
});

test('the companion app preference is skipped instead of aborting the sync', () => {
  const plan = planSyncedHabits([{ type: 'device_preference', payload: { font_scale: 1.3 } }]);

  assert.deepEqual(plan.storable, [], 'nothing storable in the payload');
  assert.deepEqual(plan.skippedRuleTypes, ['device_preference']);
  // The important part: an unsupported payload claims ownership of no rule type,
  // so the DELETE that replaces a device's habits can touch nothing.
  assert.deepEqual(plan.ownedRuleTypes, []);
});

test('a sync only owns the rule types it sends', () => {
  const plan = planSyncedHabits([
    { type: 'app_trigger', payload: { package: 'com.whatsapp' } },
    { type: 'app_trigger', payload: { package: 'com.phonepe' } },
    { type: 'time_routine', payload: { hour: 8 } },
  ]);

  assert.equal(plan.storable.length, 3);
  assert.deepEqual(plan.ownedRuleTypes, ['app_trigger', 'time_routine']);
  // Safety-critical: a caregiver's safe zone is a location_trigger row, and this
  // sync does not send that type, so it must never appear in the delete scope.
  assert.ok(!plan.ownedRuleTypes.includes('location_trigger'));
  assert.deepEqual(plan.skippedRuleTypes, []);
});

test('an empty payload deletes nothing', () => {
  const plan = planSyncedHabits([]);
  assert.deepEqual(plan.storable, []);
  assert.deepEqual(plan.ownedRuleTypes, []);
  assert.deepEqual(plan.skippedRuleTypes, []);
});

test('mixed and duplicated payloads keep the device order and dedupe the types', () => {
  const plan = planSyncedHabits([
    { type: 'device_preference', payload: {} },
    { type: 'frequent_contact', payload: { name: 'Rahul' } },
    { type: 'frequent_contact', payload: { name: 'Rahul' } },
    { type: 'nonsense', payload: {} },
  ]);

  assert.equal(plan.storable.length, 2, 'duplicate habits still reach the ON CONFLICT guard');
  assert.deepEqual(plan.ownedRuleTypes, ['frequent_contact']);
  assert.deepEqual(plan.skippedRuleTypes, ['device_preference', 'nonsense']);
});
