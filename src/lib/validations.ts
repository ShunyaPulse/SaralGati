import { z } from 'zod';

import { parseGeofence } from './geo';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const elderProfileSchema = z.object({
  elder_name: z.string().min(2, 'Elder name is required'),
  phone_model: z.string().optional(),
  os_version: z.string().optional(),
  emergency_contact: z.string().optional(),
  preferred_lang: z.enum(['hi', 'en', 'hinglish']).default('hi'),
});

/**
 * Body of PATCH /api/elders/[id]: the toggles a caregiver flips on their own,
 * separately from the profile form. Kept apart from `elderProfileSchema` because
 * that one is a full replace - a mute switch must not have to resend (and cannot
 * be trusted to preserve) the elder's name, language and emergency contact.
 */
export const elderPreferencesSchema = z.object({
  safe_zone_email_enabled: z.boolean(),
});

/**
 * Companion heartbeat. Coordinates are optional - the phone may not have the
 * location permission, may be indoors with the GPS off, or may be an older APK
 * that never sent them. Both halves must arrive together: a lone latitude is a
 * client bug, not a position, and storing it would move the caregiver's map.
 */
export const heartbeatSchema = z
  .object({
    battery_level: z.number().min(0).max(100).nullish(),
    phone_model: z.string().max(120).nullish(),
    os_version: z.string().max(60).nullish(),
    latitude: z.number().min(-90).max(90).nullish(),
    longitude: z.number().min(-180).max(180).nullish(),
    location_accuracy_m: z.number().min(0).max(100_000).nullish(),
  })
  .superRefine((value, ctx) => {
    const hasLat = value.latitude !== null && value.latitude !== undefined;
    const hasLng = value.longitude !== null && value.longitude !== undefined;
    if (hasLat !== hasLng) {
      ctx.addIssue({ code: 'custom', message: 'latitude and longitude must be sent together' });
    }
  });

export const syncHabitsSchema = z.object({
  device_token: z.string(),
  habits: z.array(z.object({
    type: z.string(),
    payload: z.record(z.string(), z.any()),
  })),
  battery_level: z.number().min(0).max(100),
  timestamp: z.string().datetime(),
});

export const reportStuckSchema = z.object({
  device_token: z.string(),
  screen_name: z.string(),
  app_package: z.string(),
  duration_ms: z.number(),
  loop_count: z.number().optional(),
});

export const habitRuleSchema = z
  .object({
    elder_id: z.string().uuid(),
    rule_type: z.enum(['frequent_contact', 'app_trigger', 'time_routine', 'location_trigger']),
    rule_payload: z.record(z.string(), z.any()),
    confidence: z.number().min(0).max(1).default(0.5),
    is_active: z.boolean().default(true),
  })
  .superRefine((rule, ctx) => {
    // A safe zone with no usable centre is silently ignored by the heartbeat
    // route, so the caregiver would believe a fence is protecting the elder when
    // nothing is ever checked. Reject it at write time instead. `parseGeofence`
    // is the same parser the heartbeat uses, so the two can never disagree.
    if (rule.rule_type !== 'location_trigger') return;
    if (parseGeofence(rule.rule_payload)) return;

    ctx.addIssue({
      code: 'custom',
      path: ['rule_payload'],
      message:
        'location_trigger rule_payload needs a valid latitude and longitude (with an optional radius_m between 50 and 20000 metres and a label)',
    });
  });

/**
 * Body of POST /api/alerts, sent by the paired Android companion.
 * `sos_trigger` is the client's name for an emergency and is normalised to
 * `emergency` in the route. Anything else is rejected here instead of reaching
 * the database, where the CHECK constraint on event_type (migrations/004)
 * surfaced as an opaque 500 instead of a fixable 400.
 */
export const androidAlertSchema = z.object({
  elder_id: z.string().uuid('elder_id must be a valid UUID'),
  event_type: z
    .enum(['screen_confusion', 'wrong_tap', 'drop_off', 'stuck_loop', 'emergency', 'battery_low', 'sos_trigger'])
    .default('emergency'),
  description: z.string().trim().max(500).optional(),
  // The Android client sends severity in upper case, so normalise before matching
  // instead of 400-ing traffic the app already sends today.
  severity: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.enum(['low', 'medium', 'high', 'critical']))
    .default('critical'),
  // Only http(s): a scheme like `javascript:` parses as a valid URL but would be
  // a stored-XSS payload the moment anything renders it.
  screenshot_url: z
    .url({ protocol: /^https?$/, error: 'screenshot_url must be an http(s) URL' })
    .max(2048)
    .optional(),
  screen_name: z.string().trim().max(200).optional(),
  app_package: z.string().trim().max(200).optional(),
});

export const alertFilterSchema = z.object({
  elder_id: z.string().uuid().optional(),
  event_type: z.string().optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});
