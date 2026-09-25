/**
 * Shared rules for the device habit sync (POST /api/v1/agent/sync-habits).
 *
 * A sync replaces the habits the *device* owns. It must never widen that to every
 * rule on the elder: the safe zone a caregiver saved in the dashboard is a
 * `location_trigger` row in the same table, and wiping it silently switched off
 * geofence protection minutes after it was set up.
 */

/**
 * Rule types `habit_rules.rule_type` accepts. The CHECK constraint in
 * migrations/003 has allowed exactly these since the table was created, so any
 * other value aborts the insert - and with it the whole sync transaction.
 */
export const STORABLE_RULE_TYPES = [
  'frequent_contact',
  'app_trigger',
  'time_routine',
  'location_trigger',
] as const;

const STORABLE_RULE_TYPE_SET = new Set<string>(STORABLE_RULE_TYPES);

export interface SyncedHabitPlan<T> {
  /** Habits the database can store, in the order the device sent them. */
  storable: T[];
  /** Rule types this sync replaces - exactly the ones it is sending. */
  ownedRuleTypes: string[];
  /** Rule types the schema cannot store; reported back so the device can stop sending them. */
  skippedRuleTypes: string[];
}

const dedupe = (values: string[]): string[] => [...new Set(values)];

export function planSyncedHabits<T extends { type: string }>(habits: T[]): SyncedHabitPlan<T> {
  const storable = habits.filter((habit) => STORABLE_RULE_TYPE_SET.has(habit.type));

  return {
    storable,
    ownedRuleTypes: dedupe(storable.map((habit) => habit.type)),
    skippedRuleTypes: dedupe(
      habits.filter((habit) => !STORABLE_RULE_TYPE_SET.has(habit.type)).map((habit) => habit.type)
    ),
  };
}
