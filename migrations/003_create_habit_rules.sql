-- Migration: Create habit_rules table
CREATE TABLE IF NOT EXISTS habit_rules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id     UUID NOT NULL REFERENCES elder_profiles(id) ON DELETE CASCADE,
  rule_type    VARCHAR(50) NOT NULL CHECK (rule_type IN ('frequent_contact', 'app_trigger', 'time_routine', 'location_trigger')),
  rule_payload JSONB NOT NULL,
  confidence   REAL DEFAULT 0.5,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_habit_rules_elder_id ON habit_rules(elder_id);
CREATE INDEX IF NOT EXISTS idx_habit_rules_rule_type ON habit_rules(rule_type);
