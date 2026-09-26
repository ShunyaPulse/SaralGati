-- Migration: Fraud sentinel training table for the self-learning flywheel
--
-- The anti-fraud sentinel (src/lib/fraudSentinel.ts) is a deterministic rule
-- engine, so it never "learns" from its own live decisions. This table is the
-- feedback surface: the cloud flywheel asks Gemini for synthetic scam screens
-- with a ground-truth threat_level/threat_category, calls /api/v1/agent/fraud-check,
-- and records every verdict here against that ground truth. Verified cases are
-- then exported as SFT/DPO samples for the LoRA flywheel (type=fraud in
-- /api/v1/agent/training-data), so the model inherits the same scam signal the
-- rules already catch.
--
-- Only derived signals are stored - the raw screen text and messages are pruned
-- to the triggering signals + a hash, so a training row never becomes a second
-- copy of an elder's private screen.

CREATE TABLE IF NOT EXISTS fraud_training_cases (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id            UUID REFERENCES elder_profiles(id) ON DELETE SET NULL,
  app_package         VARCHAR(255),
  screen_hash         VARCHAR(64),
  input_signals       JSONB NOT NULL,        -- pruned ui_elements / urls / messages the sentinel scored
  verdict             JSONB NOT NULL,        -- full FraudSentinelVerdict JSON returned by the engine
  predicted_level     VARCHAR(20) NOT NULL,  -- SAFE | SUSPICIOUS | DANGEROUS | CRITICAL
  predicted_category  VARCHAR(50),
  expected_level      VARCHAR(20),           -- Gemini ground truth (NULL = unlabelled live capture)
  expected_category   VARCHAR(50),
  is_correct          BOOLEAN,               -- NULL while unlabelled
  source              VARCHAR(50) DEFAULT 'flywheel', -- 'flywheel' | 'device'
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_training_cases_screen_hash ON fraud_training_cases(screen_hash);
CREATE INDEX IF NOT EXISTS idx_fraud_training_cases_expected_level ON fraud_training_cases(expected_level);
CREATE INDEX IF NOT EXISTS idx_fraud_training_cases_is_correct ON fraud_training_cases(is_correct);
CREATE INDEX IF NOT EXISTS idx_fraud_training_cases_created_at ON fraud_training_cases(created_at DESC);
