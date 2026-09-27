-- Migration: remember which language every self-learning interaction teaches
--
-- The companion offers "Everything in English", so the guidance produced for a
-- screen is either Hindi/Hinglish or English. The flywheel had no way to tell
-- the two apart: /api/v1/agent/training-data rebuilt every exported sample with
-- a hardcoded Hinglish instruction, so an English answer was exported as an
-- example of "answer in Hinglish". The fine-tuned LoRA therefore never learned
-- English guidance, and on English requests it lost arbitration to the general
-- model - the elder's screen grounding was thrown away exactly when they had
-- asked for English.
--
-- Every row captured before this migration was Hinglish, so 'hi' is both the
-- correct default and a safe fallback for an older companion that does not send
-- the field yet.

ALTER TABLE model_interactions
  ADD COLUMN IF NOT EXISTS guidance_lang VARCHAR(5) NOT NULL DEFAULT 'hi';

-- An index rather than a CHECK constraint: a future third language (or an
-- unknown value from a newer app build) must never fail an insert.
CREATE INDEX IF NOT EXISTS idx_model_interactions_guidance_lang
  ON model_interactions(guidance_lang);
