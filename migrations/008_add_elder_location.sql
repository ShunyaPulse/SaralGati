-- Migration: Live location tracking
--
-- The companion app reports its last known fix with the heartbeat. Only the most
-- recent fix is kept: a caregiver needs "where is my parent right now", and a
-- per-minute history table would grow unbounded without a retention job.
--
-- `location_updated_at` is deliberately separate from `last_heartbeat`: a phone
-- can be online and still have no usable fix (location permission denied, GPS
-- off indoors), and the dashboard must be able to say "location is 3 hours old"
-- instead of pretending the position is live.

ALTER TABLE elder_profiles
  ADD COLUMN IF NOT EXISTS last_lat            DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS last_lng            DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_accuracy_m DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- Guard the column range at the database level too, so a future writer cannot
-- store an impossible coordinate that the map link would happily render.
ALTER TABLE elder_profiles
  DROP CONSTRAINT IF EXISTS elder_profiles_last_lat_range,
  DROP CONSTRAINT IF EXISTS elder_profiles_last_lng_range,
  DROP CONSTRAINT IF EXISTS elder_profiles_location_accuracy_range;

ALTER TABLE elder_profiles
  ADD CONSTRAINT elder_profiles_last_lat_range
    CHECK (last_lat IS NULL OR (last_lat >= -90 AND last_lat <= 90)),
  ADD CONSTRAINT elder_profiles_last_lng_range
    CHECK (last_lng IS NULL OR (last_lng >= -180 AND last_lng <= 180)),
  ADD CONSTRAINT elder_profiles_location_accuracy_range
    CHECK (location_accuracy_m IS NULL OR location_accuracy_m >= 0);
