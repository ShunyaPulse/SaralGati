-- Migration: Create elder_profiles table
CREATE TABLE IF NOT EXISTS elder_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  elder_name       VARCHAR(255) NOT NULL,
  phone_model      VARCHAR(255),
  os_version       VARCHAR(50),
  battery_status   INTEGER CHECK (battery_status >= 0 AND battery_status <= 100),
  emergency_contact VARCHAR(20),
  preferred_lang   VARCHAR(10) DEFAULT 'hi' CHECK (preferred_lang IN ('hi', 'en', 'hinglish')),
  device_token     VARCHAR(512),
  last_heartbeat   TIMESTAMPTZ,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_elder_profiles_caregiver_id ON elder_profiles(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_elder_profiles_device_token ON elder_profiles(device_token);
