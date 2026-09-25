import { z } from 'zod';

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

export const habitRuleSchema = z.object({
  elder_id: z.string().uuid(),
  rule_type: z.enum(['frequent_contact', 'app_trigger', 'time_routine', 'location_trigger']),
  rule_payload: z.record(z.string(), z.any()),
  confidence: z.number().min(0).max(1).default(0.5),
  is_active: z.boolean().default(true),
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
