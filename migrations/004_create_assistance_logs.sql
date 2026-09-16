-- Migration: Create assistance_logs table
CREATE TABLE IF NOT EXISTS assistance_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id    UUID NOT NULL REFERENCES elder_profiles(id) ON DELETE CASCADE,
  event_type  VARCHAR(50) NOT NULL CHECK (event_type IN ('screen_confusion', 'wrong_tap', 'drop_off', 'stuck_loop', 'emergency', 'battery_low')),
  screen_name VARCHAR(255),
  app_package VARCHAR(255),
  duration_ms INTEGER,
  metadata    JSONB,
  resolved    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assistance_logs_elder_id ON assistance_logs(elder_id);
CREATE INDEX IF NOT EXISTS idx_assistance_logs_event_type ON assistance_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_assistance_logs_created_at ON assistance_logs(created_at DESC);
