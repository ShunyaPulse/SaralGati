-- Migration: Create model_interactions table for continuous learning feedback loop
CREATE TABLE IF NOT EXISTS model_interactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id            UUID REFERENCES elder_profiles(id) ON DELETE SET NULL,
  app_package         VARCHAR(255) NOT NULL,
  screen_hash         VARCHAR(64) NOT NULL,
  question            TEXT NOT NULL,
  ui_elements         JSONB NOT NULL,
  suggested_index     INTEGER,
  explanation         TEXT,
  source              VARCHAR(50),
  model_used          VARCHAR(100),
  feedback_status     VARCHAR(50) DEFAULT 'pending', -- 'pending', 'verified', 'rejected', 'timeout'
  actual_tapped_index INTEGER,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_interactions_screen_hash ON model_interactions(screen_hash);
CREATE INDEX IF NOT EXISTS idx_model_interactions_feedback_status ON model_interactions(feedback_status);
CREATE INDEX IF NOT EXISTS idx_model_interactions_created_at ON model_interactions(created_at DESC);
