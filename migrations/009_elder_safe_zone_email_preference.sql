-- Migration: per-elder preference for safe-zone exit emails
--
-- A safe-zone exit raises a dashboard alert *and* emails the caregiver. Some
-- families want the mail (they may not have the dashboard open) and some find it
-- noise next to the dashboard alert, so the choice belongs to the caregiver and
-- belongs to one elder - a caregiver watching two parents may want mail for one
-- and not the other.
--
-- `NOT NULL DEFAULT true` keeps the current behaviour for every existing row, so
-- applying this migration cannot silently mute anyone. The dashboard alert is not
-- affected by this column; muting only stops the email.
--
-- The heartbeat reads the column through `to_jsonb()` (see the heartbeat route)
-- so a deployment that runs ahead of this migration still checks in normally
-- instead of failing every device with a 500.

ALTER TABLE elder_profiles
  ADD COLUMN IF NOT EXISTS safe_zone_email_enabled BOOLEAN NOT NULL DEFAULT true;
